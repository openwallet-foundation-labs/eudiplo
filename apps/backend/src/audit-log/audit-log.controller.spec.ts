import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { rolesAllow } from "../../test/roles-guard.js";
import { Role } from "../auth/roles/role.enum.js";
import type { TokenPayload } from "../auth/token.decorator.js";
import { AuditLogController } from "./audit-log.controller.js";
import type { AuditLogService } from "./audit-log.service.js";

describe("AuditLogController", () => {
    it.each([
        [[Role.AuditRead], true],
        [[Role.Clients], true],
        [[Role.Users], false],
        [[Role.SessionsRead], false],
        [[Role.TenantAdmin], false],
    ])("lets a client with %j read the audit log: %s", (roles, allowed) => {
        expect(rolesAllow(AuditLogController, "getAuditLogs", roles)).toBe(
            allowed,
        );
    });

    it("reads only the caller's tenant", async () => {
        const service = { listByTenant: vi.fn().mockResolvedValue([]) };
        const controller = new AuditLogController(
            service as unknown as AuditLogService,
        );

        await controller.getAuditLogs(
            {
                entity: { id: "tenant-1" },
                roles: [Role.AuditRead],
            } as unknown as TokenPayload,
            "10",
        );

        expect(service.listByTenant).toHaveBeenCalledExactlyOnceWith(
            "tenant-1",
            10,
        );
        expect(() =>
            controller.getAuditLogs({
                roles: [Role.AuditRead],
            } as unknown as TokenPayload),
        ).toThrow(ForbiddenException);
    });
});
