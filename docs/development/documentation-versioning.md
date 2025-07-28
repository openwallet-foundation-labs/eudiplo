# Documentation Versioning

This project uses [mike](https://github.com/jimporter/mike) to manage multiple
versions of the documentation.

## Available Versions

- **main**: Always reflects the current state of the main branch
- **latest**: Documentation for the most recent stable release
- **Specific Versions**: Documentation for specific releases (e.g., `1.2.3`)
  accessible via direct URL

## How It Works

### Automatic Deployment

1. **Main Branch Updates**: When code is pushed to `main`, the documentation is
   automatically built and deployed as the `main` version
2. **Releases**: When a new release is published:
    - Documentation is deployed as `latest`
    - `latest` becomes the default/recommended documentation version
    - The specific version (e.g., `1.2.3`) is also available via direct URL
      access

### Version Strategy

- **Version Selector Shows**: `main`, `latest` (clean and simple)
- **Direct Access Available**: You can still access specific versions like
  `/1.2.3/` directly via URL
- **Latest Points To**: The most recent stable release
- **Default**: `latest` is set as the default documentation version

### Version Switching

Users can switch between documentation versions using the version selector in
the top navigation bar of the documentation site.

### Local Development

For local development with versioning:

```bash
# First time setup: Initialize mike with a main version
pnpm run doc:init

# Serve versioned docs locally
pnpm run doc:serve-versions

# Deploy a development version
pnpm run doc:deploy-dev

# Deploy a major version manually (example: version 1)
pnpm run doc:deploy-major 1 latest

# List all deployed versions
pnpm run doc:list-versions

# Delete a specific version (be careful!)
pnpm run doc:delete-version [version-name]
```

**Note**: If you get a 404 error when first running
`pnpm run doc:serve-versions`, you need to run `pnpm run doc:init` first to
initialize mike with at least one version.

### Manual Deployment

You can manually trigger documentation deployment using the GitHub Actions
workflow dispatch feature in the repository's Actions tab.

## Accessing Documentation Versions

Once deployed, the documentation versions are available at:

- **Latest Stable**:
  [https://openwallet-foundation-labs.github.io/eudiplo/latest/](https://openwallet-foundation-labs.github.io/eudiplo/latest/)
  (points to latest major version)
- **Development**:
  [https://openwallet-foundation-labs.github.io/eudiplo/main/](https://openwallet-foundation-labs.github.io/eudiplo/main/)
  (alias: `/latest-dev/`)
- **Major Versions**: `https://openwallet-foundation-labs.github.io/eudiplo/1/`,
  `https://openwallet-foundation-labs.github.io/eudiplo/2/`, etc.
- **Specific Versions**:
  `https://openwallet-foundation-labs.github.io/eudiplo/v1.2.3/` (direct access
  only, not in version selector)
- **Version Selector**: Available in the top navigation, shows only major
  versions + main

## Structure

- Documentation lives in the `docs/` directory
- API documentation is auto-generated from Swagger/OpenAPI specs
- Code documentation is auto-generated using Compodoc
- The site is built using MkDocs with the Material theme
