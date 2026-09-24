// apps/server/tsup.config.ts
// -----------------------------------------------------------------------------
// IAM SERVER BUILD
// -----------------------------------------------------------------------------
import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/main.ts"],
    format: ["cjs"],
    target: "node22",
    outDir: "dist",
    sourcemap: true,
    clean: true,
    bundle: true,
    dts: false,
});
