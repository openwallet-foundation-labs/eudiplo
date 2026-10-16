import { Inject, Injectable } from "@nestjs/common";
import {
    assertMayChangeRoles,
    assertMayManageRoles,
} from "../roles/role-grants.js";
import { CLIENTS_PROVIDER, ClientsProvider } from "./client.provider.js";

/**
 * The authorization check for acting on an existing client, shared by the
 * client API and configuration bundle imports.
 */
@Injectable()
export class ClientAccessService {
    constructor(
        @Inject(CLIENTS_PROVIDER) private readonly clients: ClientsProvider,
    ) {}

    /**
     * Refuses to change, delete or rotate the secret of a client of the tenant
     * that has a role the caller neither holds nor may grant.
     * @returns The client's roles, or `undefined` when the tenant has no such client
     */
    async assertMayManage(
        callerRoles: readonly string[],
        tenantId: string,
        clientId: string,
    ): Promise<string[] | undefined> {
        const roles = await this.clients.getClientRoles(tenantId, clientId);
        if (roles) {
            assertMayManageRoles(callerRoles, roles, `client ${clientId}`);
        }
        return roles;
    }

    /**
     * Refuses to give a new or existing client of the tenant `roles` the
     * caller may not grant; roles the client already has may stay.
     */
    async assertMayAssignRoles(
        callerRoles: readonly string[],
        tenantId: string,
        clientId: string,
        roles: readonly string[],
    ): Promise<void> {
        const current =
            (await this.clients.getClientRoles(tenantId, clientId)) ?? [];
        assertMayChangeRoles(callerRoles, current, roles);
    }
}
