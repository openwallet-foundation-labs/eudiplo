import nx from "@nx/eslint-plugin";

export default [
	...nx.configs["flat/base"],
	...nx.configs["flat/typescript"],
	...nx.configs["flat/javascript"],
	{
		ignores: [
			"**/dist/**",
			"**/build/**",
			"**/node_modules/**",
			"**/coverage/**",
			"**/tmp/**",
			"**/.angular/**",
			"**/generated/**",
			"apps/web/src/app/generated/**",
			"apps/web/.angular/**",
			"**/vite/deps/**",
			"**/cache/**",
		],
	},
	{
		files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
		rules: {
			"@nx/enforce-module-boundaries": [
				"error",
				{
					enforceBuildableLibDependency: true,
					allow: ["^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$"],
					depConstraints: [
						{
							sourceTag: "*",
							onlyDependOnLibsWithTags: ["*"],
						},
					],
				},
			],
		},
	},
	{
		files: [
			"**/*.ts",
			"**/*.tsx",
			"**/*.cts",
			"**/*.mts",
			"**/*.js",
			"**/*.jsx",
			"**/*.cjs",
			"**/*.mjs",
		],
		rules: {
			// Relax some TypeScript rules for generated code and services
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-empty-function": [
				"error",
				{
					allow: ["constructors"],
				},
			],
		},
	},
];
