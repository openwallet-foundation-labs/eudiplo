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
        setupFiles: ["./test/setup-file.ts"],
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
