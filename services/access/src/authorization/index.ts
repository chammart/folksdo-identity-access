// services/access/src/authorization/index.ts
// -----------------------------------------------------------------------------
// ACCESS AUTHORIZATION
// -----------------------------------------------------------------------------
// Public exports for deterministic Access authorization.
//
// Boundary:
//   • exposes Access-owned authorization contracts
//   • exposes effective Permission resolution
//   • exposes Permission precedence rules
//   • exposes deterministic authorization evaluation
//   • contains no infrastructure dependencies
// -----------------------------------------------------------------------------

export * from "./access-administrative-permissions";
export * from "./access-authorization";
export * from "./access-permissions";
export * from "./authorization-decision";
export * from "./authorization-evaluator";
export * from "./authorization-policy-evaluator";
export * from "./billing-administrative-permissions";
export * from "./effective-permission-resolver";
export * from "./onboarding-administrative-permissions";
export * from "./payment-administrative-permissions";
export * from "./platform-audit-administrative-permissions";
export * from "./permission-precedence";
export * from "./subscription-administrative-permissions";
export * from "./tenant-administrative-permissions";
export * from "./usage-administrative-permissions";
export * from "./provider-control-plane-administrative-permissions";
