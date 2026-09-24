// services/membership/src/usecases/apply-membership-lifecycle-reaction-usecase.ts
// -----------------------------------------------------------------------------
// APPLY MEMBERSHIP LIFECYCLE REACTION USE CASE
// -----------------------------------------------------------------------------
// Idempotent bulk orchestration for Identity, Tenant, and Subscription facts.
// -----------------------------------------------------------------------------

import type { RuntimeContext, StateChange } from "@folksdo-engine/runtime";
import { archiveMembership, reactivateMembership, suspendMembership } from "../business-rules";
import { createMembershipEvent, createMembershipOutboxMessage } from "../events";
import type { MembershipState, MembershipSuspensionSource } from "../state";
import { commitMembership } from "./membership-commit";
import type { MembershipMutationDependencies } from "./membership-usecase-contracts";

export interface MembershipLifecycleReactionResult {
    readonly matched: number;
    readonly transitioned: number;
    readonly skipped: number;
}

export interface ApplyMembershipLifecycleReactionUseCase {
    archiveIdentity(identityId: string, reason: string, context: RuntimeContext): Promise<MembershipLifecycleReactionResult>;
    suspendTenant(tenantId: string, reason: string, context: RuntimeContext): Promise<MembershipLifecycleReactionResult>;
    archiveTenant(tenantId: string, reason: string, context: RuntimeContext): Promise<MembershipLifecycleReactionResult>;
    suspendSubscription(tenantId: string, reason: string, context: RuntimeContext): Promise<MembershipLifecycleReactionResult>;
    restoreSubscription(tenantId: string, context: RuntimeContext): Promise<MembershipLifecycleReactionResult>;
}

export function createApplyMembershipLifecycleReactionUseCase(
    dependencies: MembershipMutationDependencies,
): ApplyMembershipLifecycleReactionUseCase {
    return {
        async archiveIdentity(identityId, reason, context) {
            const memberships = await dependencies.readStore.listMembershipsByIdentity(identityId);
            return applyMany(memberships, context, membership => {
                if (membership.status === "archived") return null;
                return archiveTransition(dependencies, membership, reason, context);
            });
        },
        async suspendTenant(tenantId, reason, context) {
            const memberships = await dependencies.readStore.listMembershipsByTenant(tenantId);
            return applyMany(memberships, context, membership => {
                if (membership.status !== "active") return null;
                return suspendTransition(dependencies, membership, reason, "tenant", context);
            });
        },
        async archiveTenant(tenantId, reason, context) {
            const memberships = await dependencies.readStore.listMembershipsByTenant(tenantId);
            return applyMany(memberships, context, membership => {
                if (membership.status === "archived") return null;
                return archiveTransition(dependencies, membership, reason, context);
            });
        },
        async suspendSubscription(tenantId, reason, context) {
            const memberships = await dependencies.readStore.listMembershipsByTenant(tenantId);
            return applyMany(memberships, context, membership => {
                if (membership.status !== "active") return null;
                return suspendTransition(dependencies, membership, reason, "subscription", context);
            });
        },
        async restoreSubscription(tenantId, context) {
            const memberships = await dependencies.readStore.listMembershipsByTenant(tenantId);
            return applyMany(memberships, context, membership => {
                if (membership.status !== "suspended" || membership.suspensionSource !== "subscription") return null;
                return reactivateTransition(dependencies, membership, context);
            });
        },
    };
}

async function applyMany(
    memberships: readonly MembershipState[],
    _context: RuntimeContext,
    transition: (membership: MembershipState) => Promise<void> | null,
): Promise<MembershipLifecycleReactionResult> {
    let transitioned = 0;
    for (const membership of memberships) {
        const operation = transition(membership);
        if (operation) {
            await operation;
            transitioned += 1;
        }
    }
    return {
        matched: memberships.length,
        transitioned,
        skipped: memberships.length - transitioned,
    };
}

async function suspendTransition(
    dependencies: MembershipMutationDependencies,
    current: MembershipState,
    reason: string,
    source: MembershipSuspensionSource,
    context: RuntimeContext,
): Promise<void> {
    const now = dependencies.clock.nowTimestamp();
    const membership = suspendMembership({ membership: current, reason, source, now });
    const payload = {
        membershipId: membership.membershipId,
        identityId: membership.identityId,
        tenantId: membership.tenantId,
        membershipType: membership.membershipType,
        status: membership.status,
        suspensionReason: membership.suspensionReason,
        suspensionSource: membership.suspensionSource,
        suspendedAt: membership.suspendedAt,
        occurredAt: now,
    };
    const contextPayload = {
        identityId: membership.identityId,
        membershipId: membership.membershipId,
        tenantId: membership.tenantId,
        reason: "membership_suspended",
        clearedAt: now,
        occurredAt: now,
    };
    const stateChanges: StateChange[] = [{
        operation: "update",
        collection: dependencies.collections.memberships,
        key: { membershipId: membership.membershipId },
        patch: {
            status: membership.status,
            suspendedAt: membership.suspendedAt,
            suspensionReason: membership.suspensionReason,
            suspensionSource: membership.suspensionSource,
            updatedAt: membership.updatedAt,
        },
    }];
    await commitMembership({
        dependencies, context,
        aggregateType: "membership.membership",
        aggregateId: membership.membershipId,
        stateChanges,
        events: [
            createMembershipEvent({ ids: dependencies.ids, context, aggregateType: "membership.membership", aggregateId: membership.membershipId, eventType: "membership.membership.suspended", occurredAt: now, payload }),
            createMembershipEvent({ ids: dependencies.ids, context, aggregateType: "membership.context", aggregateId: membership.identityId, eventType: "membership.context.cleared", occurredAt: now, payload: contextPayload }),
        ],
        outbox: [createMembershipOutboxMessage({ ids: dependencies.ids, context, subject: dependencies.outboxSubjects.membershipSuspended, occurredAt: now, payload })],
    });
}

async function archiveTransition(
    dependencies: MembershipMutationDependencies,
    current: MembershipState,
    reason: string,
    context: RuntimeContext,
): Promise<void> {
    const now = dependencies.clock.nowTimestamp();
    const membership = archiveMembership({ membership: current, reason, now });
    const payload = {
        membershipId: membership.membershipId,
        identityId: membership.identityId,
        tenantId: membership.tenantId,
        membershipType: membership.membershipType,
        status: membership.status,
        archiveReason: membership.archiveReason,
        archivedAt: membership.archivedAt,
        occurredAt: now,
    };
    const contextPayload = {
        identityId: membership.identityId,
        membershipId: membership.membershipId,
        tenantId: membership.tenantId,
        reason: "membership_archived",
        clearedAt: now,
        occurredAt: now,
    };
    const stateChanges: StateChange[] = [{
        operation: "update",
        collection: dependencies.collections.memberships,
        key: { membershipId: membership.membershipId },
        patch: {
            status: membership.status,
            archivedAt: membership.archivedAt,
            archiveReason: membership.archiveReason,
            suspensionReason: membership.suspensionReason,
            suspensionSource: membership.suspensionSource,
            updatedAt: membership.updatedAt,
        },
    }];
    await commitMembership({
        dependencies, context,
        aggregateType: "membership.membership",
        aggregateId: membership.membershipId,
        stateChanges,
        events: [
            createMembershipEvent({ ids: dependencies.ids, context, aggregateType: "membership.membership", aggregateId: membership.membershipId, eventType: "membership.membership.archived", occurredAt: now, payload }),
            createMembershipEvent({ ids: dependencies.ids, context, aggregateType: "membership.context", aggregateId: membership.identityId, eventType: "membership.context.cleared", occurredAt: now, payload: contextPayload }),
        ],
        outbox: [createMembershipOutboxMessage({ ids: dependencies.ids, context, subject: dependencies.outboxSubjects.membershipArchived, occurredAt: now, payload })],
    });
}

async function reactivateTransition(
    dependencies: MembershipMutationDependencies,
    current: MembershipState,
    context: RuntimeContext,
): Promise<void> {
    const now = dependencies.clock.nowTimestamp();
    const membership = reactivateMembership({ membership: current, now });
    const payload = {
        membershipId: membership.membershipId,
        identityId: membership.identityId,
        tenantId: membership.tenantId,
        membershipType: membership.membershipType,
        status: membership.status,
        restorationSource: "subscription",
        reactivatedAt: membership.reactivatedAt,
        occurredAt: now,
    };
    const stateChanges: StateChange[] = [{
        operation: "update",
        collection: dependencies.collections.memberships,
        key: { membershipId: membership.membershipId },
        patch: {
            status: membership.status,
            reactivatedAt: membership.reactivatedAt,
            suspensionReason: membership.suspensionReason,
            suspensionSource: membership.suspensionSource,
            updatedAt: membership.updatedAt,
        },
    }];
    await commitMembership({
        dependencies, context,
        aggregateType: "membership.membership",
        aggregateId: membership.membershipId,
        stateChanges,
        events: [createMembershipEvent({ ids: dependencies.ids, context, aggregateType: "membership.membership", aggregateId: membership.membershipId, eventType: "membership.membership.reactivated", occurredAt: now, payload })],
        outbox: [createMembershipOutboxMessage({ ids: dependencies.ids, context, subject: dependencies.outboxSubjects.membershipReactivated, occurredAt: now, payload })],
    });
}
