import { describe, expect, it } from "vitest";
import { rolesAllow } from "../../../test/roles-guard.js";
import { Role } from "../../auth/roles/role.enum.js";
import { KeyChainController } from "./key-chain.controller.js";

describe("KeyChainController role checks", () => {
    it.each([
        "getProviders",
        "getProvidersHealth",
        "getAll",
        "getById",
        "create",
        "import",
        "update",
        "delete",
        "rotate",
    ] as const)(
        "%s accepts keys:manage, issuance:manage and presentation:manage",
        (handler) => {
            const allows = (roles: Role[]) =>
                rolesAllow(KeyChainController, handler, roles);
            expect(allows([Role.Keys])).toBe(true);
            expect(allows([Role.Issuances])).toBe(true);
            expect(allows([Role.Presentations])).toBe(true);
            expect(allows([Role.IssuanceOffer])).toBe(false);
            expect(allows([Role.TenantAdmin])).toBe(false);
        },
    );

    it.each([
        "export",
        "getTenantKmsConfig",
        "updateTenantKmsConfig",
        "deleteTenantKmsConfig",
    ] as const)(
        "%s needs tenant:admin or tenants:manage, also with keys:manage",
        (handler) => {
            const allows = (roles: Role[]) =>
                rolesAllow(KeyChainController, handler, roles);
            expect(allows([Role.Keys])).toBe(false);
            expect(allows([Role.Issuances, Role.Presentations])).toBe(false);
            expect(allows([Role.TenantAdmin])).toBe(true);
            expect(allows([Role.Tenants])).toBe(true);
        },
    );
});
