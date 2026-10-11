import { describe, expect, it } from "vitest";
import { rolesAllow } from "../../../test/roles-guard.js";
import { Secured } from "../secure.decorator.js";
import { Role } from "./role.enum.js";

@Secured([Role.Registrar])
class ExampleController {
    inherited() {}

    @Secured([Role.Issuances, Role.Presentations])
    anyOf() {}

    @Secured([Role.Issuances, Role.Registrar], { match: "all" })
    allOf() {}

    @Secured([])
    anyOfNothing() {}

    @Secured([], { match: "all" })
    allOfNothing() {}
}

class OpenController {
    open() {}
}

describe("RolesGuard", () => {
    it.each([
        [[Role.Issuances], true],
        [[Role.Presentations], true],
        [[Role.Registrar], false],
        [[], false],
    ])("accepts any listed role by default: %j -> %s", (roles, allowed) => {
        expect(rolesAllow(ExampleController, "anyOf", roles)).toBe(allowed);
    });

    it.each([
        [[Role.Issuances, Role.Registrar], true],
        [[Role.Issuances, Role.Registrar, Role.Clients], true],
        [[Role.Issuances], false],
        [[Role.Registrar], false],
        [[], false],
    ])("needs every listed role with match all: %j -> %s", (roles, allowed) => {
        expect(rolesAllow(ExampleController, "allOf", roles)).toBe(allowed);
    });

    it.each(["anyOfNothing", "allOfNothing"] as const)(
        "denies an empty role list: %s",
        (handler) => {
            expect(
                rolesAllow(ExampleController, handler, [Role.Registrar]),
            ).toBe(false);
        },
    );

    it("falls back to the controller roles", () => {
        expect(
            rolesAllow(ExampleController, "inherited", [Role.Registrar]),
        ).toBe(true);
        expect(
            rolesAllow(ExampleController, "inherited", [Role.Issuances]),
        ).toBe(false);
    });

    it("lets a handler without roles through", () => {
        expect(rolesAllow(OpenController, "open", [])).toBe(true);
    });
});
