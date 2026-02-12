import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["**/*.spec.ts"],
        exclude: ["**/*.e2e-spec.ts", "**/node_modules/**"],
        globals: false,
        root: "./",
        setupFiles: ["./vitest.setup.ts"],
    },
    plugins: [swc.vite()],
});
