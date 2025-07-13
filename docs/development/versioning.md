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

## Latest Builds from `main`

Every push to the `main` branch automatically builds a Docker image and
publishes it with the `:latest` tag.

Use this tag for staging or development environments:

```
ghcr.io/cre8/eudiplo:latest
```

> ⚠️ `latest` is always moving and may contain untagged or unreleased features.

## Stable Releases

Stable releases are published via GitHub tags and follow semantic versioning:

```
ghcr.io/cre8/eudiplo:1.2.3
```

These are considered production-ready and immutable.

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
| `latest`               | `main` branch      | Development/Staging  |
| `x.y.z` (e.g. `1.2.3`) | GitHub tag         | Stable Release       |
| `x.y.z-alpha.N`        | GitHub pre-release | Feature Preview / RC |

---
