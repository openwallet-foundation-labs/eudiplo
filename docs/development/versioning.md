# Versioning & Releases

This project follows a structured release strategy that balances stability with
ongoing development.

## Semantic Versioning

We use **[Semantic Versioning](https://semver.org/)** (`MAJOR.MINOR.PATCH`) for
all tagged releases.

- **MAJOR** – breaking changes
- **MINOR** – new features, backwards compatible
- **PATCH** – bug fixes and internal improvements

Example: `1.2.3` means the 3rd patch release of the 2nd minor version of the 1st
major version.

## Development Builds from `main`

Every push to the `main` branch automatically builds a Docker image and
publishes it with the `:main` tag.

Use this tag for development environments:

```
ghcr.io/cre8/eudiplo:main
```

> ⚠️ `main` is always moving and may contain untagged or unreleased features.

## Stable Releases

Stable releases are published via GitHub tags and follow semantic versioning.
Each release creates both a versioned tag and updates the `:latest` tag:

```
ghcr.io/cre8/eudiplo:1.2.3
ghcr.io/cre8/eudiplo:latest
```

The `:latest` tag always points to the most recent stable release and is
recommended for production use.

## Pre-Releases

Optionally, pre-release tags such as `1.3.0-alpha.1` may be published for
testing upcoming features:

```
ghcr.io/cre8/eudiplo:1.3.0-alpha.1
```

## Release Automation

Releases are managed using
[`semantic-release`](https://github.com/semantic-release/semantic-release). It:

- Analyzes commit messages
- Determines the next version
- Updates the changelog
- Publishes a GitHub release
- Pushes Docker images

Make sure to follow the
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
specification when contributing to ensure proper versioning.

## Summary

| Tag                    | Source             | Use Case             |
| ---------------------- | ------------------ | -------------------- |
| `main`                 | `main` branch      | Development          |
| `latest`               | GitHub release     | Production (Latest)  |
| `x.y.z` (e.g. `1.2.3`) | GitHub release     | Specific Version     |
| `x.y.z-alpha.N`        | GitHub pre-release | Feature Preview / RC |

---
