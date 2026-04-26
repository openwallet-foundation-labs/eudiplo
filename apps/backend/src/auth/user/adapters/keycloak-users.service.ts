import KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import { Credentials } from "@keycloak/keycloak-admin-client/lib/utils/auth";
import {
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { decodeJwt } from "jose";
import { Role } from "../../roles/role.enum";
import { CreateUserDto } from "../dto/create-user.dto";
import { ManagedUserDto } from "../dto/managed-user.dto";
import { UpdateUserDto } from "../dto/update-user.dto";
import { UsersProvider } from "../user.provider";

@Injectable()
export class KeycloakUsersProvider extends UsersProvider {
    private kc!: KeycloakAdminClient;

    constructor(private readonly configService: ConfigService) {
        super();
    }

    async onModuleInit() {
        const oidc = this.configService.getOrThrow<string>("OIDC");
        const [baseUrl, realmName] = oidc.split("/realms/");
        this.kc = new KeycloakAdminClient({ baseUrl, realmName });

        const creds: Credentials = {
            grantType: "client_credentials",
            clientId: this.configService.getOrThrow("OIDC_CLIENT_ID"),
            clientSecret: this.configService.getOrThrow("OIDC_CLIENT_SECRET"),
        };

        await this.kc.auth(creds);
        const accessToken = await this.kc.getAccessToken();
        const payload = decodeJwt(accessToken!);
        const refreshMs =
            Math.max(5, payload.exp! - Date.now() / 1000 - 10) * 1000;

        setInterval(async () => {
            try {
                await this.kc.auth(creds);
            } catch {
                // ignore; next interval will retry
            }
        }, refreshMs);
    }

    async getUsers(tenantId: string): Promise<ManagedUserDto[]> {
        const users = await this.kc.users.find({ max: 1000 });
        const tenantUsers = users.filter(
            (user) =>
                !user.serviceAccountClientId &&
                this.getTenantOwnerFromKcUser(user) === tenantId,
        );
        return Promise.all(tenantUsers.map((user) => this.mapUser(user)));
    }

    async getUser(tenantId: string, userId: string): Promise<ManagedUserDto> {
        const user = await this.kc.users.findOne({ id: userId });
        if (!user?.id) {
            throw new NotFoundException(`User '${userId}' not found`);
        }

        this.ensureTenantOwnership(tenantId, user, "viewed");
        return this.mapUser(user);
    }

    async addUser(
        tenantId: string,
        dto: CreateUserDto,
    ): Promise<ManagedUserDto> {
        const existing = (
            await this.kc.users.find({ username: dto.username, exact: true })
        )[0];
        if (existing?.id) {
            throw new ConflictException(
                `User '${dto.username}' already exists`,
            );
        }

        const created = await this.kc.users.create({
            username: dto.username,
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            enabled: dto.enabled ?? true,
            attributes: { tenant_id: [tenantId] },
        });

        const userId =
            created.id ??
            (
                await this.kc.users.find({
                    username: dto.username,
                    exact: true,
                })
            )[0]?.id;
        if (!userId) {
            throw new Error(
                `User '${dto.username}' creation did not return an id`,
            );
        }

        await this.syncRoles(userId, dto.roles ?? []);
        await this.kc.users.resetPassword({
            id: userId,
            credential: {
                temporary: false,
                type: "password",
                value: dto.password,
            },
        });

        return this.getUser(tenantId, userId);
    }

    async updateUser(
        tenantId: string,
        userId: string,
        dto: UpdateUserDto,
    ): Promise<ManagedUserDto> {
        const user = await this.kc.users.findOne({ id: userId });
        if (!user?.id) {
            throw new NotFoundException(`User '${userId}' not found`);
        }

        this.ensureTenantOwnership(tenantId, user, "updated");

        await this.kc.users.update(
            { id: userId },
            {
                email: dto.email ?? user.email,
                firstName: dto.firstName ?? user.firstName,
                lastName: dto.lastName ?? user.lastName,
                enabled: dto.enabled ?? user.enabled,
                attributes: { tenant_id: [tenantId] },
            },
        );

        if (dto.roles) {
            await this.syncRoles(userId, dto.roles);
        }

        if (dto.password) {
            await this.kc.users.resetPassword({
                id: userId,
                credential: {
                    temporary: false,
                    type: "password",
                    value: dto.password,
                },
            });
        }

        return this.getUser(tenantId, userId);
    }

    async removeUser(tenantId: string, userId: string): Promise<void> {
        const user = await this.kc.users.findOne({ id: userId });
        if (!user?.id) {
            return;
        }

        this.ensureTenantOwnership(tenantId, user, "deleted");
        await this.kc.users.del({ id: userId });
    }

    private getTenantOwnerFromKcUser(user: any): string | undefined {
        const attrs = user?.attributes;
        const tenantAttr = attrs?.tenant_id;

        if (Array.isArray(tenantAttr)) {
            return tenantAttr[0];
        }

        if (typeof tenantAttr === "string") {
            return tenantAttr;
        }

        return undefined;
    }

    private ensureTenantOwnership(
        tenantId: string,
        user: any,
        action: string,
    ): void {
        const ownerTenantId = this.getTenantOwnerFromKcUser(user);
        if (!ownerTenantId || ownerTenantId === tenantId) {
            return;
        }

        throw new ConflictException(
            `User '${user.username}' is managed by tenant '${ownerTenantId}' and cannot be ${action} by tenant '${tenantId}'.`,
        );
    }

    private async mapUser(user: any): Promise<ManagedUserDto> {
        const roles = await this.kc.users.listRealmRoleMappings({
            id: user.id!,
        });
        return {
            id: user.id!,
            username: user.username!,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            enabled: user.enabled ?? true,
            roles: roles.map((role) => role.name).filter(Boolean) as Role[],
            tenantId: this.getTenantOwnerFromKcUser(user),
        };
    }

    private async syncRoles(userId: string, nextRoles: Role[]): Promise<void> {
        const allRealmRoles = await this.kc.roles.find();
        const currentRoles = await this.kc.users.listRealmRoleMappings({
            id: userId,
        });

        const desired = nextRoles
            .map((role) =>
                allRealmRoles.find((realmRole) => realmRole.name === role),
            )
            .filter(
                (role): role is NonNullable<typeof role> =>
                    !!role?.id && !!role?.name,
            )
            .map((role) => ({ id: role.id!, name: role.name! }));

        const toRemove = currentRoles
            .filter((role) => !nextRoles.includes(role.name as Role))
            .map((role) => ({ id: role.id!, name: role.name! }));

        const toAdd = desired.filter(
            (role) =>
                !currentRoles.some((current) => current.name === role.name),
        );

        if (toRemove.length > 0) {
            await this.kc.users.delRealmRoleMappings({
                id: userId,
                roles: toRemove,
            });
        }

        if (toAdd.length > 0) {
            await this.kc.users.addRealmRoleMappings({
                id: userId,
                roles: toAdd,
            });
        }
    }
}
