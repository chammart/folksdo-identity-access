<script setup lang="ts">
import type { ProviderOverview } from "~/types/provider"
import { formatAdminDate } from "~/utils/format-date"
const { data, status, error, refresh } = await useFetch<ProviderOverview>("/api/provider/overview")
const overview = computed(() => data.value)
const ready = computed(() => overview.value?.status.readiness.status === "ready")
const dependencies = computed(() => Object.entries(overview.value?.status.readiness.dependencies ?? {}))
function formatDate(value?: string | null) { return value ? formatAdminDate(value) : "Not supplied" }
function dependencyStatus(value: unknown): string {
  if (typeof value === "string") return value
  if (value && typeof value === "object" && "status" in value) {
    const status = (value as { status?: unknown }).status
    return typeof status === "string" ? status : "Unknown"
  }
  return "Unknown"
}
function dependencyLabel(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (value) => value.toUpperCase())
}
</script>
<template>
  <div class="page-stack">
    <div class="page-heading"><div><p class="eyebrow">MANAGED SERVICE</p><h1>Overview</h1><p>Operational state of the Saiwaly IAM™ service.</p></div><button class="secondary-button" @click="() => refresh()">Refresh</button></div>
    <div v-if="status === 'pending'" class="panel loading-panel">Loading IAM operational state…</div>
    <div v-else-if="error" class="panel error-panel"><strong>Overview unavailable</strong><p>{{ error.statusMessage || 'Saiwaly IAM™ could not be reached.' }}</p><button class="secondary-button" @click="() => refresh()">Try again</button></div>
    <template v-else-if="overview">
      <section class="status-banner" :class="ready ? 'status-banner--good' : 'status-banner--warn'"><div><span class="status-dot"/><div><strong>{{ ready ? 'Saiwaly IAM™ is ready' : 'Saiwaly IAM™ requires attention' }}</strong><p>{{ overview.status.service.environment }} · {{ overview.status.release.releaseId }}</p></div></div><span class="pill">{{ overview.status.health.status }}</span></section>
      <section class="metric-grid">
        <article class="metric-card"><span>Identities</span><strong>{{ overview.metrics.identities.total }}</strong><small>{{ overview.metrics.identities.active }} active · {{ overview.metrics.identities.suspended }} suspended</small></article>
        <article class="metric-card"><span>Active sessions</span><strong>{{ overview.metrics.sessions.active }}</strong><small>{{ overview.metrics.authentication.lifecycleEvents }} authentication lifecycle events</small></article>
        <article class="metric-card"><span>Memberships</span><strong>{{ overview.metrics.memberships.active }}</strong><small>{{ overview.metrics.memberships.total }} total · {{ overview.metrics.invitations.pending }} pending invitations</small></article>
        <article class="metric-card"><span>Active access</span><strong>{{ overview.metrics.authorization.activeRoleAssignments + overview.metrics.authorization.activeDirectAssignments }}</strong><small>{{ overview.metrics.authorization.activeRoleAssignments }} role · {{ overview.metrics.authorization.activeDirectAssignments }} direct</small></article>
      </section>
      <section class="two-column">
        <article class="panel"><div class="panel-heading"><div><p class="eyebrow">SERVICE</p><h2>Runtime status</h2></div><AppIcon name="server"/></div><dl class="detail-list"><div><dt>Service</dt><dd>{{ overview.status.service.id }}</dd></div><div><dt>Environment</dt><dd><span class="pill">{{ overview.status.service.environment }}</span></dd></div><div><dt>Version</dt><dd>{{ overview.status.service.version }}</dd></div><div><dt>Capabilities</dt><dd>{{ overview.status.service.capabilities.join(' · ') }}</dd></div><div><dt>Readiness</dt><dd><span class="pill" :class="ready ? 'pill--good' : 'pill--warn'">{{ overview.status.readiness.status }}</span></dd></div></dl></article>
        <article class="panel"><div class="panel-heading"><div><p class="eyebrow">RELEASE</p><h2>Deployment</h2></div></div><dl class="detail-list"><div><dt>Release</dt><dd>{{ overview.status.release.releaseId }}</dd></div><div><dt>Version</dt><dd>{{ overview.status.release.version }}</dd></div><div><dt>Source revision</dt><dd class="mono">{{ overview.status.release.sourceRevision ?? 'Not supplied' }}</dd></div><div><dt>Certified</dt><dd>{{ formatDate(overview.status.release.certifiedAt) }}</dd></div></dl></article>
      </section>
      <section class="two-column">
        <article class="panel"><div class="panel-heading"><div><p class="eyebrow">DEPENDENCIES</p><h2>Readiness</h2></div></div><div v-if="dependencies.length" class="dependency-list"><div v-for="([name, value]) in dependencies" :key="name"><span>{{ dependencyLabel(name) }}</span><strong>{{ dependencyStatus(value) }}</strong></div></div><p v-else class="muted">No dependency details were returned.</p></article>
        <article class="panel"><div class="panel-heading"><div><p class="eyebrow">PROCESSING</p><h2>Operational signals</h2></div></div><div class="signal-grid"><div><span>Pending / failed outbox</span><strong>{{ overview.status.processing.pendingOutbox }}</strong></div><div><span>Recent projection failures</span><strong>{{ overview.status.processing.recentFailureCount }}</strong></div><div><span>Recorded processing failures</span><strong>{{ overview.metrics.processing.failures }}</strong></div><div><span>Canonical access denials</span><strong>{{ overview.metrics.authorization.denials }}</strong></div></div><p class="muted compact">Counts reflect only facts exposed by the IAM operational contracts; no additional health semantics are inferred.</p></article>
      </section>
      <section class="panel"><div class="panel-heading"><div><p class="eyebrow">RECENT FAILURES</p><h2>Projection processing</h2></div><span class="pill">{{ overview.status.recentOperationalFailures.length }}</span></div><div v-if="overview.status.recentOperationalFailures.length" class="table-wrap"><table><thead><tr><th>Projection</th><th>Event</th><th>Tenant</th><th>Correlation</th><th>Occurred</th></tr></thead><tbody><tr v-for="failure in overview.status.recentOperationalFailures" :key="failure.failureId ?? failure.eventId ?? failure.occurredAt ?? ''"><td>{{ failure.projection ?? '—' }}</td><td>{{ failure.eventType ?? '—' }}</td><td class="mono">{{ failure.tenantId ?? '—' }}</td><td class="mono">{{ failure.correlationId ?? failure.requestId ?? '—' }}</td><td>{{ formatDate(failure.occurredAt) }}</td></tr></tbody></table></div><div v-else class="empty-state"><strong>No recent projection failures</strong><p>The status contract returned no recent operational failure records.</p></div></section>
    </template>
  </div>
</template>
