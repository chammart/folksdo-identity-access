// services/access/src/runtime/composition/create-access-reaction-registrations.ts
// -----------------------------------------------------------------------------
// CREATE ACCESS REACTION REGISTRATIONS
// -----------------------------------------------------------------------------
// Production registration factory for Access Operations™ reactions.
//
// Purpose:
//   • register every supported upstream business-event subject
//   • adapt reaction operation contracts to existing Access use cases
//   • preserve thin reaction handlers
//   • keep runtime composition free from business rules
//
// Boundary:
//   • performs only application-layer contract adaptation
//   • invokes existing Access-owned use cases
//   • does not query persistence directly
//   • does not execute business rules directly
//   • does not commit state directly
// -----------------------------------------------------------------------------

import {
    createOnSubscriptionCommercialStateChangedReaction,
    createOnUserActivatedReaction,
    createOnMembershipCreatedReaction,
    createOnMembershipActivatedReaction,
    createOnMembershipArchivedReaction,
    createOnMembershipReactivatedReaction,
    createOnMembershipSuspendedReaction,
    createOnTenantActivatedReaction,
    createOnTenantArchivedReaction,
    createOnTenantCreatedReaction,
    createOnTenantReactivatedReaction,
    createOnTenantSuspendedReaction,
    createOnUserArchivedReaction,
    createOnUserDisabledReaction,
    createOnUserRestoredReaction,
    identityUserActivatedSubject,
    identityUserArchivedSubject,
    identityUserDisabledSubject,
    identityUserRestoredSubject,
    membershipCreatedSubject,
    membershipActivatedSubject,
    membershipArchivedSubject,
    membershipReactivatedSubject,
    membershipSuspendedSubject,
    subscriptionCommercialStateSubjects,
    tenantActivatedSubject,
    tenantArchivedSubject,
    tenantCreatedSubject,
    tenantReactivatedSubject,
    tenantSuspendedSubject,
} from "../../reactions";

import type {
    ComposedAccessUseCases,
} from "./compose-access-usecases";

import type {
    AccessReactionRegistration,
} from "./compose-access-reactions";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface CreateAccessReactionRegistrationsInput {
    readonly useCases:
    ComposedAccessUseCases;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createAccessReactionRegistrations(
    input: CreateAccessReactionRegistrationsInput,
): readonly AccessReactionRegistration[] {
    const {
        useCases,
    } = input;

    return [
        {
            subject: identityUserActivatedSubject,
            handler: createOnUserActivatedReaction({
                activateKnownIdentity: {
                    async execute(request) {
                        const result = await useCases.lifecycle.identity.activateAuthorization.execute({
                            identityId: request.identityId,
                            sourceReference: request.context.sourceEventId,
                        });
                        return { changed: result.changed };
                    },
                },
            }),
        },

        {
            subject: membershipCreatedSubject,
            handler: createOnMembershipCreatedReaction({
                recordKnownMembership: {
                    async execute(request) {
                        const result = await useCases.lifecycle.membership.recordAuthorization.execute({
                            membershipId: request.membershipId,
                            identityId: request.identityId,
                            tenantId: request.tenantId,
                            sourceReference: request.context.sourceEventId,
                        });
                        return { changed: result.changed };
                    },
                },
            }),
        },
        // ---------------------------------------------------------------------
        // IDENTITY — USER DISABLED
        // ---------------------------------------------------------------------

        {
            subject:
                identityUserDisabledSubject,

            handler:
                createOnUserDisabledReaction({
                    suspendIdentityAuthorization: {
                        async execute(
                            request,
                        ) {
                            const result =
                                await useCases.lifecycle.identity
                                    .suspendAccess
                                    .execute({
                                        identityId:
                                            request.identityId,

                                        reason:
                                            request.reason,

                                        sourceReference:
                                            request.context
                                                .sourceEventId,
                                    });

                            return {
                                knownFactChanged:
                                    result.changed,

                                affectedAssignmentCount:
                                    result
                                        .suspendedRoleAssignmentCount
                                    + result
                                        .suspendedPermissionAssignmentCount,
                            };
                        },
                    },
                }),
        },

        // ---------------------------------------------------------------------
        // IDENTITY — USER ARCHIVED
        // ---------------------------------------------------------------------

        {
            subject:
                identityUserArchivedSubject,

            handler:
                createOnUserArchivedReaction({
                    archiveIdentityAccess: {
                        async execute(
                            request,
                        ) {
                            const result =
                                await useCases.lifecycle.identity
                                    .archiveAccess
                                    .execute({
                                        identityId:
                                            request.identityId,

                                        reason:
                                            request.reason,

                                        sourceReference:
                                            request.context
                                                .sourceEventId,
                                    });

                            return {
                                knownFactChanged:
                                    result.changed,

                                affectedAssignmentCount:
                                    result
                                        .affectedAssignmentCount,
                            };
                        },
                    },
                }),
        },

        // ---------------------------------------------------------------------
        // IDENTITY — USER RESTORED
        // ---------------------------------------------------------------------

        {
            subject:
                identityUserRestoredSubject,

            handler:
                createOnUserRestoredReaction({
                    restoreIdentityAuthorization: {
                        async execute(
                            request,
                        ) {
                            const result =
                                await useCases.lifecycle.identity
                                    .restoreAuthorization
                                    .execute({
                                        identityId:
                                            request.identityId,

                                        sourceReference:
                                            request.context
                                                .sourceEventId,
                                    });

                            return {
                                knownFactChanged:
                                    result.changed,

                                affectedAssignmentCount:
                                    result
                                        .affectedAssignmentCount,
                            };
                        },
                    },
                }),
        },

        // ---------------------------------------------------------------------
        // MEMBERSHIP — ACTIVATED
        // ---------------------------------------------------------------------

        {
            subject:
                membershipActivatedSubject,

            handler:
                createOnMembershipActivatedReaction({
                    activateMembershipAuthorization: {
                        async execute(
                            request,
                        ) {
                            const result =
                                await useCases.lifecycle.membership
                                    .activateAuthorization
                                    .execute({
                                        membershipId:
                                            request.membershipId,

                                        identityId:
                                            request.identityId,

                                        tenantId:
                                            request.tenantId,

                                        membershipType:
                                            "member",

                                        sourceReference:
                                            request.context
                                                .sourceEventId,
                                    });

                            return {
                                knownFactChanged:
                                    result.changed,

                                affectedAssignmentCount:
                                    result
                                        .affectedAssignmentCount,
                            };
                        },
                    },
                }),
        },

        // ---------------------------------------------------------------------
        // MEMBERSHIP — SUSPENDED
        // ---------------------------------------------------------------------

        {
            subject:
                membershipSuspendedSubject,

            handler:
                createOnMembershipSuspendedReaction({
                    suspendMembershipAuthorization: {
                        async execute(
                            request,
                        ) {
                            const result =
                                await useCases.lifecycle.membership
                                    .suspendAuthorization
                                    .execute({
                                        membershipId:
                                            request.membershipId,

                                        identityId:
                                            request.identityId,

                                        tenantId:
                                            request.tenantId,

                                        membershipType:
                                            "member",

                                        reason:
                                            request.reason,

                                        sourceReference:
                                            request.context
                                                .sourceEventId,
                                    });

                            return {
                                knownFactChanged:
                                    result.changed,

                                affectedAssignmentCount:
                                    result
                                        .affectedAssignmentCount,
                            };
                        },
                    },
                }),
        },

        // ---------------------------------------------------------------------
        // MEMBERSHIP — REACTIVATED
        // ---------------------------------------------------------------------

        {
            subject:
                membershipReactivatedSubject,

            handler:
                createOnMembershipReactivatedReaction({
                    reactivateMembershipAuthorization: {
                        async execute(
                            request,
                        ) {
                            const result =
                                await useCases.lifecycle.membership
                                    .reactivateAuthorization
                                    .execute({
                                        membershipId:
                                            request.membershipId,

                                        identityId:
                                            request.identityId,

                                        tenantId:
                                            request.tenantId,

                                        membershipType:
                                            "member",

                                        sourceReference:
                                            request.context
                                                .sourceEventId,
                                    });

                            return {
                                knownFactChanged:
                                    result.changed,

                                affectedAssignmentCount:
                                    result
                                        .affectedAssignmentCount,
                            };
                        },
                    },
                }),
        },

        // ---------------------------------------------------------------------
        // MEMBERSHIP — ARCHIVED
        // ---------------------------------------------------------------------

        {
            subject:
                membershipArchivedSubject,

            handler:
                createOnMembershipArchivedReaction({
                    archiveMembershipAuthorization: {
                        async execute(
                            request,
                        ) {
                            const result =
                                await useCases.lifecycle.membership
                                    .archiveAuthorization
                                    .execute({
                                        membershipId:
                                            request.membershipId,

                                        identityId:
                                            request.identityId,

                                        tenantId:
                                            request.tenantId,

                                        membershipType:
                                            "member",

                                        reason:
                                            request.reason,

                                        sourceReference:
                                            request.context
                                                .sourceEventId,
                                    });

                            return {
                                knownFactChanged:
                                    result.changed,

                                affectedAssignmentCount:
                                    result
                                        .affectedAssignmentCount,
                            };
                        },
                    },
                }),
        },

        // ---------------------------------------------------------------------
        // TENANT — CREATED
        // ---------------------------------------------------------------------

        {
            subject:
                tenantCreatedSubject,

            handler:
                createOnTenantCreatedReaction({
                    recordKnownTenant: {
                        async execute(
                            request,
                        ) {
                            const result =
                                await useCases.lifecycle.tenant
                                    .provisionAuthorization
                                    .execute({
                                        tenantId:
                                            request.tenantId,

                                        sourceReference:
                                            request.context
                                                .sourceEventId,
                                    });

                            return {
                                changed:
                                    result.changed,
                            };
                        },
                    },
                }),
        },

        // ---------------------------------------------------------------------
        // TENANT — ACTIVATED
        // ---------------------------------------------------------------------

        {
            subject:
                tenantActivatedSubject,

            handler:
                createOnTenantActivatedReaction({
                    activateTenantAuthorization: {
                        async execute(
                            request,
                        ) {
                            const result =
                                await useCases.lifecycle.tenant
                                    .activateAuthorization
                                    .execute({
                                        tenantId:
                                            request.tenantId,

                                        sourceReference:
                                            request.context
                                                .sourceEventId,
                                    });

                            return {
                                knownFactChanged:
                                    result.changed,

                                affectedAuthorizationCount:
                                    result
                                        .affectedAssignmentCount,
                            };
                        },
                    },
                }),
        },

        // ---------------------------------------------------------------------
        // TENANT — SUSPENDED
        // ---------------------------------------------------------------------

        {
            subject:
                tenantSuspendedSubject,

            handler:
                createOnTenantSuspendedReaction({
                    suspendTenantAuthorization: {
                        async execute(
                            request,
                        ) {
                            const result =
                                await useCases.lifecycle.tenant
                                    .suspendAuthorization
                                    .execute({
                                        tenantId:
                                            request.tenantId,

                                        reason:
                                            request.suspensionReason,

                                        sourceReference:
                                            request.context
                                                .sourceEventId,
                                    });

                            return {
                                knownFactChanged:
                                    result.changed,

                                affectedAuthorizationCount:
                                    result
                                        .affectedAssignmentCount,
                            };
                        },
                    },
                }),
        },

        // ---------------------------------------------------------------------
        // TENANT — REACTIVATED
        // ---------------------------------------------------------------------

        {
            subject:
                tenantReactivatedSubject,

            handler:
                createOnTenantReactivatedReaction({
                    reactivateTenantAuthorization: {
                        async execute(
                            request,
                        ) {
                            const result =
                                await useCases.lifecycle.tenant
                                    .reactivateAuthorization
                                    .execute({
                                        tenantId:
                                            request.tenantId,

                                        sourceReference:
                                            request.context
                                                .sourceEventId,
                                    });

                            return {
                                knownFactChanged:
                                    result.changed,

                                affectedAuthorizationCount:
                                    result
                                        .affectedAssignmentCount,
                            };
                        },
                    },
                }),
        },

        // ---------------------------------------------------------------------
        // TENANT — ARCHIVED
        // ---------------------------------------------------------------------

        {
            subject:
                tenantArchivedSubject,

            handler:
                createOnTenantArchivedReaction({
                    archiveTenantAuthorization: {
                        async execute(
                            request,
                        ) {
                            const result =
                                await useCases.lifecycle.tenant
                                    .archiveAuthorization
                                    .execute({
                                        tenantId:
                                            request.tenantId,

                                        reason:
                                            request.archiveReason,

                                        sourceReference:
                                            request.context
                                                .sourceEventId,
                                    });

                            return {
                                knownFactChanged:
                                    result.changed,

                                affectedAuthorizationCount:
                                    result
                                        .affectedAssignmentCount,
                            };
                        },
                    },
                }),
        },

        // ---------------------------------------------------------------------
        // SUBSCRIPTION — COMMERCIAL STATE
        // ---------------------------------------------------------------------

        ...subscriptionCommercialStateSubjects.map(
            (
                subject,
            ): AccessReactionRegistration => ({
                subject,

                handler:
                    createOnSubscriptionCommercialStateChangedReaction({
                        subject,

                        applySubscriptionCommercialState: {
                            async execute(
                                request,
                            ) {
                                const result =
                                    await useCases.lifecycle.subscription
                                        .applyCapabilities
                                        .execute({
                                            tenantId:
                                                request.tenantId,

                                            subscriptionId:
                                                request.subscriptionId,

                                            status:
                                                request.status,

                                            capabilities:
                                                request.capabilities,

                                            effectiveAt:
                                                request.effectiveAt,

                                            expiresAt:
                                                request.expiresAt,

                                            sourceReference:
                                                request.context
                                                    .sourceEventId,
                                        });

                                return {
                                    knownFactChanged:
                                        result.changed,
                                };
                            },
                        },
                    }),
            }),
        ),

    ];
}