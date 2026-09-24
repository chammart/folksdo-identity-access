// jest.config.e2e.cjs
// -----------------------------------------------------------------------------
// FOLKSDO IAM™ HTTP E2E CERTIFICATION
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
        "<rootDir>/tests/e2e/setup-iam-e2e.ts",
    ],
    testMatch: [
        "<rootDir>/tests/e2e/**/*.e2e.test.ts",
    ],
    testTimeout: 30_000,
};
