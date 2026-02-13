import { codecovVitePlugin } from "@codecov/vite-plugin";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["**/*.e2e-spec.ts"],
        exclude: [],
        globals: true,
        root: "./",
        fileParallelism: false,
        env: {
            // Required environment variables for E2E tests
            JWT_SECRET: "e2e-test-jwt-secret-do-not-use-in-production",
            AUTH_CLIENT_ID: "e2e-test-client",
            AUTH_CLIENT_SECRET: "e2e-test-secret",
            ENCRYPTION_KEY:
                "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        },
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
