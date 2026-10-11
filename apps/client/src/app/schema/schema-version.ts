const NUMBER = String.raw`(0|[1-9]\d*)`;
const IDENTIFIERS = String.raw`[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*`;

/** A SemVer 2.0.0 version, with optional pre-release and build metadata. */
export const SEMVER_REGEX = new RegExp(
  String.raw`^${NUMBER}\.${NUMBER}\.${NUMBER}(?:-${IDENTIFIERS})?(?:\+${IDENTIFIERS})?$`
);

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

/** Major, minor and patch, compared as numbers. */
function compareCore(left: number[], right: number[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/** One pre-release identifier: numeric ones compare as numbers and rank below the others. */
function compareIdentifier(left: string, right: string): number {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);
  if (leftNumeric && rightNumeric) return Number(left) - Number(right);
  if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/** Pre-release identifiers; a release, which has none, ranks above its pre-releases. */
function comparePrerelease(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) return right.length - left.length;
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const difference = compareIdentifier(left[index], right[index]);
    if (difference !== 0) return difference;
  }
  // With equal leading identifiers, more identifiers rank higher.
  return left.length - right.length;
}

/** SemVer precedence of two versions: negative when `left` is older than `right`. */
function compareVersions(left: string, right: string): number {
  const older = parseVersion(left);
  const newer = parseVersion(right);
  return (
    compareCore(older.core, newer.core) || comparePrerelease(older.prerelease, newer.prerelease)
  );
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
