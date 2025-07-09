module.exports = {
    branches: ['main'],
    plugins: [
        '@semantic-release/commit-analyzer', // Analyzes commit messages
        '@semantic-release/release-notes-generator', // Generates changelog
        '@semantic-release/changelog', // Updates CHANGELOG.md
        '@semantic-release/github', // Creates GitHub release
        [
            '@semantic-release/git',
            {
                assets: ['CHANGELOG.md'],
                message:
                    'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
            },
        ],
        [
            '@semantic-release/exec',
            {
                prepareCmd: 'echo "Preparing release ${nextRelease.version}"',
                publishCmd:
                    'docker build -t ghcr.io/your-org/your-app:${nextRelease.version} . && docker push ghcr.io/your-org/your-app:${nextRelease.version}',
            },
        ],
    ],
};
