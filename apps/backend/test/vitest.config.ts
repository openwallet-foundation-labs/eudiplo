import { codecovVitePlugin } from "@codecov/vite-plugin";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["**/*.e2e-spec.ts"],
        globals: true,
        root: "./",
        reporters: [
            "default",
            ["junit", { outputFile: "test-report.junit.xml" }],
        ],
        coverage: {
            provider: "v8",
            reporter: ["json", "html"],
            reportsDirectory: "./coverage-e2e",
            exclude: [
                "node_modules/",
                "test/",
                "dist/",
                "**/*.d.ts",
                "**/*.config.ts",
                "**/*.config.js",
                "**/main.ts",
            ],
            include: ["**/src/**/*.ts"],
        },
        fileParallelism: false,
    },
    plugins: [
        swc.vite(), // Put the Codecov vite plugin after all other plugins
        codecovVitePlugin({
            enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
            bundleName: "eudiplo",
            uploadToken: process.env.CODECOV_TOKEN,
        }),
    ],
});
