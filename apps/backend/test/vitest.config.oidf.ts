import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["**/oidf-issuance.e2e-spec.ts"],
        globals: true,
        root: "./",
        setupFiles: ["./test/setup.ts"],
        fileParallelism: false,
        globalSetup: ["./test/oidf/global-setup.ts"],
        coverage: {
            enabled: false,
        },
    },
    plugins: [swc.vite()],
});
