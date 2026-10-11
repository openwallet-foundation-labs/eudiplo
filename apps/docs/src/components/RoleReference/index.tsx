import React from "react";
import rolesModel from "@site/docs/_generated/roles.json";

interface RoleDoc {
    name: string;
    value: string;
    description: string;
}

interface EndpointDoc {
    method: string;
    path: string;
    roles: string[];
    /** `any`: one of the roles is enough. `all`: the token needs every role. */
    match: "any" | "all";
}

const model = rolesModel as { roles: RoleDoc[]; endpoints: EndpointDoc[] };

/** Whether `role` alone passes the role check of `endpoint`. */
const opens = (endpoint: EndpointDoc, role: string) =>
    endpoint.roles.includes(role) && (endpoint.match === "any" || endpoint.roles.length === 1);

const rowKey = (endpoint: EndpointDoc) => `${endpoint.path}|${endpoint.match}|${endpoint.roles.join(",")}`;

/** Merge endpoints that share a path and role requirement into one row (`GET, POST`). */
function endpointRows(): EndpointDoc[] {
    const rows = new Map<string, EndpointDoc>();
    for (const endpoint of model.endpoints) {
        const key = rowKey(endpoint);
        const row = rows.get(key);
        if (row) {
            row.method = `${row.method}, ${endpoint.method}`;
        } else {
            rows.set(key, { ...endpoint });
        }
    }
    return [...rows.values()];
}

/**
 * Roles and role-protected management endpoints, generated at build time by
 * apps/docs/scripts/generate-roles-docs.ts from the backend's role enum and
 * the @Secured decorators of its controllers.
 */
export default function RoleReference({ table }: { table: "roles" | "endpoints" }): React.ReactElement {
    if (model.roles.length === 0) {
        throw new Error("RoleReference: no roles generated. Run the docs prebuild.");
    }
    if (table === "roles") {
        return (
            <table>
                <thead>
                    <tr>
                        <th>Role</th>
                        <th>Description</th>
                        <th>Endpoints</th>
                    </tr>
                </thead>
                <tbody>
                    {model.roles.map((role) => (
                        <tr key={role.value}>
                            <td>
                                <code>{role.value}</code>
                            </td>
                            <td>{role.description}</td>
                            <td>{model.endpoints.filter((endpoint) => opens(endpoint, role.value)).length}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }
    return (
        <table>
            <thead>
                <tr>
                    <th>Method</th>
                    <th>Path</th>
                    <th>Required roles</th>
                </tr>
            </thead>
            <tbody>
                {endpointRows().map((row) => (
                    <tr key={rowKey(row)}>
                        <td>{row.method}</td>
                        <td>
                            <code>{row.path}</code>
                        </td>
                        <td>
                            {row.roles.length === 0
                                ? "any valid access token"
                                : row.roles.map((role, index) => (
                                      <React.Fragment key={role}>
                                          {index > 0 && (row.match === "all" ? " and " : " or ")}
                                          <code>{role}</code>
                                      </React.Fragment>
                                  ))}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
