// services/membership/src/runtime/create-membership-runtime.ts
// -----------------------------------------------------------------------------
// CREATE MEMBERSHIP RUNTIME
// -----------------------------------------------------------------------------
// Production composition root for Membership Operations™.
//
// Purpose:
//   • compose Membership use cases from explicit dependencies
//   • compose Membership-owned invariant enforcement
//   • compose the public Membership API façade
//   • compose Identity-event reactions
//   • return one Membership-owned runtime to the host
//
// Boundary:
//   • performs dependency composition only
//   • receives authorization through the Membership-owned provider-neutral port
//   • creates Membership-owned invariant enforcement internally
//   • contains no Membership business logic
//   • performs no persistence directly
//   • performs no HTTP registration
//   • performs no event-bus registration
// -----------------------------------------------------------------------------

import type {
    Clock,
} from "@folksdo-engine/foundation";

import type {
    FolksdoEngine,
} from "@folksdo-engine/runtime";

import {
    createMembershipInvariantGuard,
    type MembershipAccessAuthorizer,
} from "../authorization";

import type {
    MembershipCollections,
    MembershipReadStore,
} from "../read-store";

import {
    createActivatePendingMembershipsReaction,
    createMembershipLifecycleReaction,
    createMembershipReactionDispatcher,
    createRedeemInvitationReaction,
} from "../reactions";

import {
    createActivateMembershipUseCase,
    createActivatePendingMembershipsUseCase,
    createApplyMembershipLifecycleReactionUseCase,
    createArchiveMembershipUseCase,
    createCreateMembershipUseCase,
    createCurrentMembershipContextUseCase,
    createExpireInvitationUseCase,
    createGetInvitationUseCase,
    createGetMembershipUseCase,
    createInviteMemberUseCase,
    createListMembershipsForProviderUseCase,
    createListTenantInvitationsUseCase,
    createListTenantMembershipsUseCase,
    createReactivateMembershipUseCase,
    createRedeemInvitationUseCase,
    createRevokeInvitationUseCase,
    createSuspendMembershipUseCase,
    createSwitchMembershipContextUseCase,
    type MembershipIdGenerator,
    type MembershipMutationDependencies,
    type MembershipOutboxSubjects,
} from "../usecases";

import {
    createMembershipApi,
} from "./create-membership-api";

import {
    createInvitationExpirationWorker,
} from "../workers";

import type {
    MembershipRuntime,
} from "./membership-runtime";

// -----------------------------------------------------------------------------
// INPUT CONTRACT
// -----------------------------------------------------------------------------

export interface CreateMembershipRuntimeInput {
    readonly engine:
    Pick<FolksdoEngine, "state">;

    readonly clock:
    Clock;

    readonly ids:
    MembershipIdGenerator;

    readonly readStore:
    MembershipReadStore;

    readonly collections:
    MembershipCollections;

    readonly outboxSubjects:
    MembershipOutboxSubjects;

    /**
     * Provider-neutral authorization boundary supplied by the host.
     *
     * Membership owns this contract but does not construct the authorization
     * provider. In Folksdo Operations™, the host binds it to Access
     * Operations™.
     */
    readonly accessAuthorizer:
    MembershipAccessAuthorizer;

    readonly defaultInvitationTtlMilliseconds:
    number;

    readonly invitationExpirationBatchSize?: number;
}

// -----------------------------------------------------------------------------
// RUNTIME COMPOSITION
// -----------------------------------------------------------------------------

export function createMembershipRuntime(
    input: CreateMembershipRuntimeInput,
): MembershipRuntime {
    const mutationDependencies =
        createMembershipMutationDependencies(
            input,
        );

    // -------------------------------------------------------------------------
    // SHARED USE CASES
    // -------------------------------------------------------------------------
    // These use-case instances are shared by both the public API and reaction
    // handlers. Creating them once preserves a single runtime composition graph.
    // -------------------------------------------------------------------------

    const expireInvitationUseCase =
        createExpireInvitationUseCase(
            mutationDependencies,
        );

    const redeemInvitationUseCase =
        createRedeemInvitationUseCase(
            mutationDependencies,
            expireInvitationUseCase,
        );

    const activatePendingMembershipsUseCase =
        createActivatePendingMembershipsUseCase(
            mutationDependencies,
        );

    // -------------------------------------------------------------------------
    // MEMBERSHIP SECURITY BOUNDARIES
    // -------------------------------------------------------------------------
    // Membership constructs only its own business invariant guard.
    //
    // Final authorization authority is supplied through the provider-neutral
    // MembershipAccessAuthorizer contract and remains outside Membership.
    // -------------------------------------------------------------------------

    const invariantGuard =
        createMembershipInvariantGuard(
            input.readStore,
        );

    // -------------------------------------------------------------------------
    // PUBLIC API
    // -------------------------------------------------------------------------

    const api =
        createMembershipApi({
            accessAuthorizer:
                input.accessAuthorizer,

            invariantGuard,

            createMembershipUseCase:
                createCreateMembershipUseCase(
                    mutationDependencies,
                ),

            activateMembershipUseCase:
                createActivateMembershipUseCase(
                    mutationDependencies,
                ),

            suspendMembershipUseCase:
                createSuspendMembershipUseCase(
                    mutationDependencies,
                ),

            reactivateMembershipUseCase:
                createReactivateMembershipUseCase(
                    mutationDependencies,
                ),

            archiveMembershipUseCase:
                createArchiveMembershipUseCase(
                    mutationDependencies,
                ),

            inviteMemberUseCase:
                createInviteMemberUseCase({
                    ...mutationDependencies,

                    defaultInvitationTtlMilliseconds:
                        input.defaultInvitationTtlMilliseconds,
                }),

            redeemInvitationUseCase,

            revokeInvitationUseCase:
                createRevokeInvitationUseCase(
                    mutationDependencies,
                ),

            expireInvitationUseCase,

            getInvitationUseCase:
                createGetInvitationUseCase(
                    input.readStore,
                ),

            listTenantInvitationsUseCase:
                createListTenantInvitationsUseCase(
                    input.readStore,
                ),

            getMembershipUseCase:
                createGetMembershipUseCase(
                    input.readStore,
                ),

            listTenantMembershipsUseCase:
                createListTenantMembershipsUseCase(
                    input.readStore,
                ),

            listMembershipsForProviderUseCase:
                createListMembershipsForProviderUseCase(
                    input.readStore,
                ),

            currentMembershipContextUseCase:
                createCurrentMembershipContextUseCase(
                    input.readStore,
                ),

            switchMembershipContextUseCase:
                createSwitchMembershipContextUseCase(
                    mutationDependencies,
                ),
        });

    // -------------------------------------------------------------------------
    // REACTIONS
    // -------------------------------------------------------------------------

    const reactions =
        createMembershipReactionDispatcher({
            redeemInvitationReaction:
                createRedeemInvitationReaction(
                    redeemInvitationUseCase,
                ),

            activatePendingMembershipsReaction:
                createActivatePendingMembershipsReaction(
                    activatePendingMembershipsUseCase,
                ),

            membershipLifecycleReaction:
                createMembershipLifecycleReaction(
                    createApplyMembershipLifecycleReactionUseCase(
                        mutationDependencies,
                    ),
                ),
        });

    // -------------------------------------------------------------------------
    // SERVICE RUNTIME
    // -------------------------------------------------------------------------

    return {
        api,
        reactions,

        invitationExpirationWorker:
            createInvitationExpirationWorker({
                readStore:
                    input.readStore,

                expireInvitationUseCase,

                now:
                    () =>
                        input.clock.nowTimestamp(),

                batchSize:
                    input.invitationExpirationBatchSize,
            }),
    };
}

// -----------------------------------------------------------------------------
// MUTATION DEPENDENCIES
// -----------------------------------------------------------------------------
// Builds the dependency contract shared by Membership command use cases.
// Query use cases continue to depend only on the Membership read store.
// -----------------------------------------------------------------------------

function createMembershipMutationDependencies(
    input: CreateMembershipRuntimeInput,
): MembershipMutationDependencies {
    return {
        engine:
            input.engine,

        clock:
            input.clock,

        ids:
            input.ids,

        readStore:
            input.readStore,

        collections:
            input.collections,

        outboxSubjects:
            input.outboxSubjects,
    };
}