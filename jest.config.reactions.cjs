// jest.config.reactions.cjs
// -----------------------------------------------------------------------------
// IAM REAL EVENT + REACTION CERTIFICATION CONFIGURATION
// -----------------------------------------------------------------------------
// Runs only the asynchronous cross-capability certification suites. The shared
// runtime enables real NATS-backed Folksdo Processing for this Jest process.
// -----------------------------------------------------------------------------

const integration = require("./jest.config.integration.cjs");

module.exports = {
  ...integration,

  testMatch: [
    "<rootDir>/tests/integration/reactions/**/*.integration.test.ts",
  ],

  testPathIgnorePatterns: integration.testPathIgnorePatterns.filter(
    (pattern) => pattern !== "/tests/integration/reactions/",
  ),
};
