export interface ProviderSession {
  authenticated: boolean
  user?: { userId: string; email: string }
}

export interface IamStatus {
  service: { id: string; environment: string; version: string; capabilities: string[] }
  release: { releaseId: string; version: string; sourceRevision?: string; certifiedAt?: string }
  health: { status: string }
  readiness: { status: string; dependencies: Record<string, unknown> }
  processing: { pendingOutbox: number; recentFailureCount: number }
  recentOperationalFailures: Array<{
    failureId: string | null; projection: string | null; eventId: string | null; eventType: string | null
    occurredAt: string | null; requestId: string | null; correlationId: string | null; tenantId: string | null
  }>
}

export interface IamMetrics {
  scope: { type: "provider" }
  identities: { total: number; active: number; suspended: number }
  authentication: { lifecycleEvents: number }
  sessions: { active: number }
  memberships: { total: number; active: number }
  invitations: { pending: number }
  authorization: { accessLifecycleEvents: number; activeRoleAssignments: number; activeDirectAssignments: number; denials: number }
  processing: { failures: number }
}

export interface ProviderOverview { status: IamStatus; metrics: IamMetrics }
