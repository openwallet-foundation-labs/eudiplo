import { describe, expect, it } from 'vitest';
import { SEMVER_REGEX, compareVersionsDesc, proposeNextVersion } from './schema-version';

describe('compareVersionsDesc', () => {
  it('sorts newest first by SemVer precedence', () => {
    const versions = [
      '1.0.0-alpha',
      '1.0.0',
      '1.0.0-rc.1',
      '1.0.0-alpha.beta',
      '1.0.0-beta.11',
      '1.0.0-beta.2',
      '1.0.0-alpha.1',
      '1.0.0-beta',
      '2.0.0',
      '1.10.0',
      '1.2.0',
    ];

    expect(versions.sort(compareVersionsDesc)).toEqual([
      '2.0.0',
      '1.10.0',
      '1.2.0',
      '1.0.0',
      '1.0.0-rc.1',
      '1.0.0-beta.11',
      '1.0.0-beta.2',
      '1.0.0-beta',
      '1.0.0-alpha.beta',
      '1.0.0-alpha.1',
      '1.0.0-alpha',
    ]);
  });

  it('ignores build metadata', () => {
    expect(compareVersionsDesc('1.0.0+build.1', '1.0.0+build.2')).toBe(0);
  });
});

describe('SEMVER_REGEX', () => {
  it('accepts pre-releases and build metadata, and rejects other strings', () => {
    expect(SEMVER_REGEX.test('1.2.0-rc.1+build.5')).toBe(true);
    expect(SEMVER_REGEX.test('1.2')).toBe(false);
    expect(SEMVER_REGEX.test('01.2.0')).toBe(false);
  });
});

describe('proposeNextVersion', () => {
  it('proposes the next minor after a release and the release after a pre-release', () => {
    expect(proposeNextVersion('1.2.3')).toBe('1.3.0');
    expect(proposeNextVersion('1.2.3+build.7')).toBe('1.3.0');
    expect(proposeNextVersion('1.2.0-rc.1')).toBe('1.2.0');
  });

  it('keeps a version that is not SemVer', () => {
    expect(proposeNextVersion('v2')).toBe('v2');
  });
});
