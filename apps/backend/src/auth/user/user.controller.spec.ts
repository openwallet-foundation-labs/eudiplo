import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "../roles/role.enum.js";
import type { TokenPayload } from "../token.decorator.js";
import { UserController } from "./user.controller.js";
import type { UsersProvider } from "./user.provider.js";

const caller: TokenPayload = {
    roles: [Role.Users, Role.IssuanceOffer],
    entity: { id: "tenant-1" } as TokenPayload["entity"],
};

describe("UserController role grants", () => {
    let users: {
        [K in keyof UsersProvider]: ReturnType<typeof vi.fn>;
    };
    let controller: UserController;

    beforeEach(() => {
        users = {
            getUsers: vi.fn(),
            getUser: vi.fn(),
            getUserRoles: vi.fn().mockResolvedValue([Role.IssuanceOffer]),
            addUser: vi.fn().mockResolvedValue({}),
            updateUser: vi.fn().mockResolvedValue({}),
            removeUser: vi.fn().mockResolvedValue(undefined),
        };
        controller = new UserController(users as unknown as UsersProvider);
    });

    it("creates a user with roles the caller holds", async () => {
        await controller.createUser(
            { username: "alice", roles: [Role.IssuanceOffer] },
            caller,
        );
        expect(users.addUser).toHaveBeenCalledWith("tenant-1", {
            username: "alice",
            roles: [Role.IssuanceOffer],
        });
    });

    it("refuses to create a user with a role the caller does not hold", () => {
        expect(() =>
            controller.createUser(
                { username: "alice", roles: [Role.Registrar] },
                caller,
            ),
        ).toThrow(ForbiddenException);
        expect(users.addUser).not.toHaveBeenCalled();
    });

    it("updates a user whose roles the caller holds", async () => {
        await controller.updateUser(
            "user-1",
            { roles: [Role.IssuanceOffer, Role.Users] },
            caller,
        );
        expect(users.getUserRoles).toHaveBeenCalledWith("tenant-1", "user-1");
        expect(users.updateUser).toHaveBeenCalled();
    });

    it("resets the password of a user whose roles the caller holds", async () => {
        await controller.updateUser(
            "user-1",
            { password: "a-new-password" },
            caller,
        );
        expect(users.updateUser).toHaveBeenCalledWith("tenant-1", "user-1", {
            password: "a-new-password",
        });
    });

    it("refuses to add a role the caller does not hold", async () => {
        await expect(
            controller.updateUser(
                "user-1",
                { roles: [Role.IssuanceOffer, Role.Issuances] },
                caller,
            ),
        ).rejects.toThrow(ForbiddenException);
        expect(users.updateUser).not.toHaveBeenCalled();
    });

    it("lets a tenant:admin caller keep tenant:admin on a user", async () => {
        users.getUserRoles.mockResolvedValue([Role.TenantAdmin]);
        await controller.updateUser(
            "admin",
            { roles: [Role.TenantAdmin], enabled: false },
            { ...caller, roles: [Role.Users, Role.TenantAdmin] },
        );
        expect(users.updateUser).toHaveBeenCalled();
    });

    it("refuses to reset the password of a user with more roles", async () => {
        users.getUserRoles.mockResolvedValue([Role.TenantAdmin]);
        await expect(
            controller.updateUser(
                "admin",
                { password: "a-new-password" },
                caller,
            ),
        ).rejects.toThrow(
            "Cannot manage user admin: it has tenant:admin, which you neither hold nor may grant",
        );
        expect(users.updateUser).not.toHaveBeenCalled();
    });

    it("refuses a user with a Keycloak client role", async () => {
        users.getUserRoles.mockResolvedValue([
            Role.IssuanceOffer,
            "realm-management/realm-admin",
        ]);
        await expect(
            controller.updateUser("operator", { enabled: false }, caller),
        ).rejects.toThrow(ForbiddenException);
    });

    it("answers 404 when changing an unknown user", async () => {
        users.getUserRoles.mockResolvedValue(undefined);
        await expect(
            controller.updateUser("missing", { enabled: false }, caller),
        ).rejects.toThrow(NotFoundException);
        expect(users.updateUser).not.toHaveBeenCalled();
    });

    it("refuses to delete a user with more roles", async () => {
        users.getUserRoles.mockResolvedValue([Role.Registrar]);
        await expect(controller.deleteUser("user-2", caller)).rejects.toThrow(
            ForbiddenException,
        );
        expect(users.removeUser).not.toHaveBeenCalled();
    });

    it("deletes a user whose roles the caller holds", async () => {
        await controller.deleteUser("user-1", caller);
        expect(users.removeUser).toHaveBeenCalledWith("tenant-1", "user-1");
    });

    it("deletes an unknown user as a no-op", async () => {
        users.getUserRoles.mockResolvedValue(undefined);
        await controller.deleteUser("missing", caller);
        expect(users.removeUser).not.toHaveBeenCalled();
    });
});
