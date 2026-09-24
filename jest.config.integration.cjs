// jest.config.integration.cjs
// -----------------------------------------------------------------------------
// FOLKSDO IAM™ INTEGRATION CERTIFICATION CONFIGURATION
// -----------------------------------------------------------------------------
// Selects integration certification only. Infrastructure lifecycle belongs to
// scripts/testing/run-integration-tests.ts.
// -----------------------------------------------------------------------------

const base = require("./jest.config.base.cjs");

module.exports = {
  ...base,

  extensionsToTreatAsEsm: [".ts"],

  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.base.json",
        useESM: true,
      },
    ],
  },

  setupFilesAfterEnv: [
    "<rootDir>/tests/integration/setup-iam-integration.ts",
  ],

  testMatch: [
    "**/tests/integration/**/*.test.ts",
    "**/*.integration.test.ts",
  ],

  testPathIgnorePatterns: [
    ...base.testPathIgnorePatterns,
    "/tests/unit/",
    "/tests/e2e/",
    "/tests/integration/reactions/",
    "\\.unit\\.test\\.ts$",
    "\\.e2e\\.test\\.ts$",
  ],
};
