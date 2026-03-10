# Migration & Upgrade Guide

This section provides step-by-step guidance for upgrading EUDIPLO between versions, with a focus on breaking changes and required actions.

## Upgrade Process

When upgrading EUDIPLO, follow this general process:

1. **Read the release notes** for every version between your current and target version
2. **Check the migration guide** below for your target version
3. **Back up your database** before upgrading
4. **Update environment variables** as documented
5. **Deploy the new version** — database migrations run automatically on startup
6. **Verify** that the service starts correctly and your integrations work

!!! warning "Always upgrade sequentially"
If you are multiple major versions behind, upgrade one major version at a time. Do not skip major versions.

## Version History

| Version | Status             | Notes                                                                                                                                                                 |
| ------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.x     | Archived           | Initial development and protocol testing                                                                                                                              |
| 2.x     | Archived           | First stable release                                                                                                                                                  |
| 3.x     | **Current stable** | Introduced automatic database migrations. Bumped from v2 due to the migration system being flagged as a breaking change, though no user-facing API changes were made. |
| 4.0     | Planned            | Unified Key Chain model (replaces separate Key/Certificate entities)                                                                                                  |

## Migration Guides

| From | To  | Guide                                                                                    |
| ---- | --- | ---------------------------------------------------------------------------------------- |
| 2.x  | 3.0 | No action required — the migration system is backward compatible. Just update and start. |
| 3.x  | 4.0 | [Migrating to v4.0](v4.0.md)                                                             |

## What Can Break Between Versions

### Major Versions (Breaking Changes)

Major versions may include:

- **Database schema changes** — handled automatically by the migration system (see [Database](../architecture/database.md))
- **Environment variable changes** — new required variables, renamed variables, or changed defaults
- **API changes** — modified request/response formats, removed endpoints, changed field names
- **Configuration format changes** — credential configs, issuance configs, or presentation configs with new required fields or changed structure
- **Protocol updates** — changes to OID4VCI/OID4VP behavior to align with spec updates

### Minor Versions

Minor versions add features in a backward-compatible way. However, new optional fields may appear in API responses or configuration objects.

### Patch Versions

Patch versions contain only bug fixes and should never require any migration steps.

## Backward Compatibility Policy

EUDIPLO follows [Semantic Versioning](https://semver.org/):

- **Breaking changes only happen in major versions.** If you experience a breaking change in a minor or patch release, please [report it as a bug](https://github.com/openwallet-foundation-labs/eudiplo/issues/new?template=bug_report.md).
- **Deprecation before removal.** Where feasible, features are deprecated in a minor release before being removed in the next major release.
- **Database migrations are automatic.** Schema changes are handled by the migration system and should not require manual intervention.

## Troubleshooting Upgrades

If you encounter issues after upgrading:

1. **Check the logs** — EUDIPLO logs migration steps and configuration errors on startup
2. **Compare environment variables** — diff your `.env` against the latest `example.env`
3. **Check the migration guide** — the version-specific guide lists all required actions
4. **Open an issue** — if the migration guide doesn't cover your situation, [let us know](https://github.com/openwallet-foundation-labs/eudiplo/issues/new?template=bug_report.md)
