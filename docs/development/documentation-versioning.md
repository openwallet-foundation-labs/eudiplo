# Documentation Versioning

This project uses [mike](https://github.com/jimporter/mike) to manage multiple
versions of the documentation.

## Available Versions

- **main** (`latest-dev`): Always reflects the current state of the main branch
- **Latest Release** (`latest`): Documentation for the most recent release
- **Specific Versions**: Documentation for each tagged release (e.g., `1.0.0`,
  `1.1.0`)

## How It Works

### Automatic Deployment

1. **Main Branch Updates**: When code is pushed to `main`, the documentation is
   automatically built and deployed as the `main` version with alias
   `latest-dev`
2. **Releases**: When a new release is published, the documentation is built and
   deployed as the specific version number and tagged as `latest`

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

## Structure

- Documentation lives in the `docs/` directory
- API documentation is auto-generated from Swagger/OpenAPI specs
- Code documentation is auto-generated using Compodoc
- The site is built using MkDocs with the Material theme
