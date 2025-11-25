import { codecovVitePlugin } from "@codecov/vite-plugin";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["**/oidf*.e2e-spec.ts"],
        globals: true,
        root: "./",
        setupFiles: ["./test/setup.ts"],
        fileParallelism: false,
    },
    plugins: [
        swc.vite(),
        codecovVitePlugin({
            enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
            bundleName: "eudiplo",
            uploadToken: process.env.CODECOV_TOKEN,
        }),
    ],
});
