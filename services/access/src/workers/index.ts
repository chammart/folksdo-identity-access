// services/access/src/workers/index.ts
// -----------------------------------------------------------------------------
// ACCESS WORKERS
// -----------------------------------------------------------------------------
// Public worker boundary for Access Operations™.
//
// Workers are scheduled initiators of internal Access commands.
//
// Workers may:
//   • query Access read-store contracts for due work
//   • invoke existing Access use cases
//   • report execution outcomes through Access observability
//
// Workers must not:
//   • implement Access lifecycle behavior
//   • update MongoDB or another persistence provider directly
//   • emit domain events directly
//   • publish outbox messages directly
//   • own application startup or runtime scheduling
//
// Runtime composition is responsible for:
//   • constructing worker dependencies
//   • injecting the real Access use cases
//   • configuring batch sizes and schedules
//   • starting and stopping scheduled execution
// -----------------------------------------------------------------------------

export * from "./expire-assignments-worker";
export * from "./expire-restrictions-worker";