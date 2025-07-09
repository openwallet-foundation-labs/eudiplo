module.exports = {
    branches: ['main'],
    plugins: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        '@semantic-release/changelog',
        [
            '@codedependant/semantic-release-docker',
            {
                dockerRegistry: 'ghcr.io',
                dockerCacheFrom: 'cre8/eudiplo',
                dockerBuildFlags: {
                    pull: null,
                    target: 'release',
                },
                dockerArgs: {
                    GITHUB_TOKEN: null,
                },
            },
        ],
        '@semantic-release/github',
        [
            '@semantic-release/git',
            {
                assets: ['CHANGELOG.md'],
                message:
                    'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
            },
        ],
    ],
};
