// Provider Admin boundary projection. Persistence identifiers are never part of
// the administration experience even when an upstream read contains them.
export function withoutPersistenceId<T>(value: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value
  const { _id: _ignored, ...publicValue } = value as Record<string, unknown>
  return publicValue as T
}
