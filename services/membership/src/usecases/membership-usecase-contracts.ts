// services/membership/src/usecases/membership-usecase-contracts.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP USE CASE CONTRACTS
// -----------------------------------------------------------------------------
// Shared dependency contracts for Membership mutation use cases.
//
// Purpose:
//   • expose only Folksdo-owned abstractions to Membership orchestration
//   • keep infrastructure implementation details outside the business layer
//   • centralize shared mutation dependencies
//   • preserve deterministic clock, identifier, storage, and messaging contracts
//
// Boundary:
//   • use cases depend on Folksdo Engine™ public contracts only
//   • MongoDB, NATS, JetStream, and provider-specific types are not exposed here
//   • use-case-specific dependencies should extend these shared contracts
// -----------------------------------------------------------------------------

import type {
    Clock,
} from "@folksdo-engine/foundation";

import type {
    FolksdoEngine,
} from "@folksdo-engine/runtime";

import type {
    MembershipEventIdGenerator,
} from "../events";

import type {
    MembershipCollections,
    MembershipReadStore,
} from "../read-store";

// -----------------------------------------------------------------------------
// ID GENERATION
// -----------------------------------------------------------------------------

export interface MembershipIdGenerator
    extends MembershipEventIdGenerator {
    /**
     * Create a stable Membership aggregate identifier.
     */
    readonly createMembershipId: () => string;

    /**
     * Create a stable invitation aggregate identifier.
     */
    readonly createInvitationId: () => string;
}

// -----------------------------------------------------------------------------
// OUTBOX SUBJECTS
// -----------------------------------------------------------------------------

export interface MembershipOutboxSubjects {
    readonly membershipCreated: string;

    readonly membershipActivated: string;

    readonly membershipSuspended: string;

    readonly membershipReactivated: string;

    readonly membershipArchived: string;

    readonly invitationCreated: string;

    readonly invitationRedeemed: string;

    readonly invitationRevoked: string;

    readonly invitationExpired: string;

    readonly contextChanged: string;

    readonly contextCleared: string;
}

// -----------------------------------------------------------------------------
// MUTATION DEPENDENCIES
// -----------------------------------------------------------------------------

export interface MembershipMutationDependencies {
    /**
     * Folksdo Engine™ mutation boundary.
     *
     * Membership requires only canonical state commit capability.
     */
    readonly engine: Pick<FolksdoEngine, "state">;

    /**
     * Deterministic source of current time.
     */
    readonly clock: Clock;

    /**
     * Membership-owned aggregate, event, and message identifier generation.
     */
    readonly ids: MembershipIdGenerator;

    /**
     * Membership-owned canonical read abstraction.
     */
    readonly readStore: MembershipReadStore;

    /**
     * Membership collection names used to construct Engine state changes.
     */
    readonly collections: MembershipCollections;

    /**
     * Public event-backbone subjects owned by Membership Operations™.
     */
    readonly outboxSubjects: MembershipOutboxSubjects;
}