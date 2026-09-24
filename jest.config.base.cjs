// jest.config.base.cjs
// -----------------------------------------------------------------------------
// FOLKSDO IAM™ JEST BASE CONFIGURATION
// -----------------------------------------------------------------------------
// Shared Jest mechanics for repository-owned certification commands.
//
// Workspace packages resolve from source so certification works from a clean
// checkout before build artifacts exist.
// -----------------------------------------------------------------------------

module.exports = {
  testEnvironment: "node",

  testPathIgnorePatterns: ["/node_modules/", "/dist/"],

  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.base.json",
      },
    ],
  },

  moduleNameMapper: {
    "^@folksdo-identity-access/identity$":
      "<rootDir>/services/identity/src/index.ts",

    "^@folksdo-identity-access/identity/(.+)$":
      "<rootDir>/services/identity/src/$1/index.ts",

    "^@folksdo-identity-access/membership$":
      "<rootDir>/services/membership/src/index.ts",

    "^@folksdo-identity-access/membership/(.+)$":
      "<rootDir>/services/membership/src/$1/index.ts",

    "^@folksdo-identity-access/access$":
      "<rootDir>/services/access/src/index.ts",

    "^@folksdo-identity-access/access/(.+)$":
      "<rootDir>/services/access/src/$1/index.ts",

    "^@folksdo-platform/runtime$":
      "<rootDir>/../folksdo-platform/packages/runtime/src/index.ts",

    "^@folksdo-engine/(foundation|observability|processing|runtime)$":
      "<rootDir>/../../folksdo-engine/packages/$1/src/index.ts",
  },

  moduleFileExtensions: ["ts", "js", "json"],
};
