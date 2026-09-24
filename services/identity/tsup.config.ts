// services/identity/tsup.config.ts
// -----------------------------------------------------------------------------
// IDENTITY CONTRACTS BUILD
// -----------------------------------------------------------------------------

import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts", "src/events/index.ts", "src/errors/index.ts"],
    format: ["cjs"],
    target: "node22",
    outDir: "dist",
    sourcemap: true,
    clean: true,
    bundle: true,
    dts: false,
});
