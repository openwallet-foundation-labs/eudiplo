#!/usr/bin/env bash
set -euo pipefail

# Inputs expected from semantic-release exec
: "${DOCKER_REGISTRY_USER:?DOCKER_REGISTRY_USER is required}"
: "${DOCKER_REGISTRY_PASSWORD:?DOCKER_REGISTRY_PASSWORD is required}"
: "${DOCKER_RELEASE_VERSION:?DOCKER_RELEASE_VERSION is required}"

REGISTRY="ghcr.io/openwallet-foundation-labs"
BACKEND_IMAGE="eudiplo"
CLIENT_IMAGE="eudiplo-client"
DOCKERFILE="Dockerfile"

# Parse version parts (X.Y.Z)
IFS='.' read -r MAJOR MINOR PATCH <<< "${DOCKER_RELEASE_VERSION}"

log() { printf "[release] %s\n" "$*"; }

login() {
  log "Logging in to GHCR..."
  echo "${DOCKER_REGISTRY_PASSWORD}" | docker login ghcr.io -u "${DOCKER_REGISTRY_USER}" --password-stdin
}

# Build an image for a given target and push tags
# Args: <target> <image-name>
build_and_push() {
  local target="$1" image="$2"
  local fullImageBase="${REGISTRY}/${image}"

  log "Building ${image} from target ${target} (version ${DOCKER_RELEASE_VERSION})"

  docker build \
    -f "${DOCKERFILE}" \
    --target "${target}" \
    -t "${fullImageBase}:latest" \
    -t "${fullImageBase}:${DOCKER_RELEASE_VERSION}" \
    -t "${fullImageBase}:${MAJOR}" \
    -t "${fullImageBase}:${MAJOR}.${MINOR}" \
    .

  log "Pushing tags for ${image}"
  docker push "${fullImageBase}:latest"
  docker push "${fullImageBase}:${DOCKER_RELEASE_VERSION}"
  docker push "${fullImageBase}:${MAJOR}"
  docker push "${fullImageBase}:${MAJOR}.${MINOR}"
}

main() {
  login
  build_and_push "eudiplo" "${BACKEND_IMAGE}"
  build_and_push "client" "${CLIENT_IMAGE}"
  log "Done."
}

main "$@"
