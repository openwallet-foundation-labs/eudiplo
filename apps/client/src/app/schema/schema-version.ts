/** A SemVer 2.0.0 version, with optional pre-release and build metadata. */
export const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function parseVersion(version: string): { core: number[]; prerelease: string[] } {
  const [withoutBuild] = version.split('+');
  const dash = withoutBuild.indexOf('-');
  const core = dash === -1 ? withoutBuild : withoutBuild.slice(0, dash);
  const prerelease = dash === -1 ? '' : withoutBuild.slice(dash + 1);
  return {
    core: core.split('.').map((part) => Number.parseInt(part, 10) || 0),
    prerelease: prerelease ? prerelease.split('.') : [],
  };
}

/** SemVer precedence of two versions: negative when `a` is older than `b`. */
function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);

  for (let index = 0; index < Math.max(left.core.length, right.core.length); index += 1) {
    const difference = (left.core[index] ?? 0) - (right.core[index] ?? 0);
    if (difference !== 0) return difference;
  }

  // A pre-release ranks below the release of the same version.
  if (left.prerelease.length === 0 || right.prerelease.length === 0) {
    return right.prerelease.length - left.prerelease.length;
  }

  for (let index = 0; ; index += 1) {
    const x = left.prerelease[index];
    const y = right.prerelease[index];
    if (x === undefined && y === undefined) return 0;
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;

    const xNumeric = /^\d+$/.test(x);
    const yNumeric = /^\d+$/.test(y);
    if (xNumeric && yNumeric) return Number(x) - Number(y);
    if (xNumeric) return -1;
    if (yNumeric) return 1;
    return x < y ? -1 : 1;
  }
}

/** Sort comparator for versions, newest first, by SemVer precedence. */
export function compareVersionsDesc(a: string, b: string): number {
  return compareVersions(b, a);
}

/**
 * The version to propose after `version`: the release of a pre-release
 * (`1.2.0-rc.1` → `1.2.0`), otherwise the next minor (`1.2.3` → `1.3.0`).
 * Returns `version` itself when it is not SemVer.
 */
export function proposeNextVersion(version: string): string {
  if (!SEMVER_REGEX.test(version)) return version;
  const { core, prerelease } = parseVersion(version);
  const [major, minor, patch] = core;
  return prerelease.length > 0 ? `${major}.${minor}.${patch}` : `${major}.${minor + 1}.0`;
}
