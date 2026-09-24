// services/membership/src/runtime/create-membership-api.ts
// -----------------------------------------------------------------------------
// CREATE MEMBERSHIP API
// -----------------------------------------------------------------------------
// Composes the public Membership Operations™ API and its authorization
// enforcement boundary.
//
// Security chain:
//
//   authenticated Identity
//       ↓
//   Membership Context
//       ↓
//   Access authorization
//       ↓
//   Membership-owned invariants
//       ↓
//   Membership business operation
//
// Boundary:
//   • Membership owns Identity, Membership, Tenant, invitation, and lifecycle
//     invariants
//   • Access Operations™ owns final administrative authorization decisions
//   • Membership consumes authorization only through its provider-neutral port
//   • RuntimeContext.permissions is not an authorization authority
//   • self-service context and invitation operations remain Membership-owned
// -----------------------------------------------------------------------------

import {
    SecurityError,
} from "@folksdo-engine/foundation";

import type {
    RuntimeContext,
} from "@folksdo-engine/runtime";

import type {
    MembershipApi,
} from "../api";

import {
    membershipPermissions,
    type MembershipAccessAuthorizer,
    type MembershipAuthorizationResource,
    type MembershipInvariantGuard,
    type MembershipPermission,
} from "../authorization";

import {
    MembershipAuthorizationDeniedError,
    MembershipAuthorizationUnavailableError,
} from "../errors";

import type {
    ActivateMembershipUseCase,
    ArchiveMembershipUseCase,
    CreateMembershipUseCase,
    CurrentMembershipContextUseCase,
    ExpireInvitationUseCase,
    GetInvitationUseCase,
    GetMembershipUseCase,
    InviteMemberUseCase,
    ListTenantInvitationsUseCase,
    ListMembershipsForProviderUseCase,
    ListTenantMembershipsUseCase,
    ReactivateMembershipUseCase,
    RedeemInvitationUseCase,
    RevokeInvitationUseCase,
    SuspendMembershipUseCase,
    SwitchMembershipContextUseCase,
} from "../usecases";

// -----------------------------------------------------------------------------
// INPUT CONTRACT
// -----------------------------------------------------------------------------

export interface CreateMembershipApiInput {
    readonly accessAuthorizer:
    MembershipAccessAuthorizer;

    readonly invariantGuard:
    MembershipInvariantGuard;

    readonly createMembershipUseCase:
    CreateMembershipUseCase;

    readonly activateMembershipUseCase:
    ActivateMembershipUseCase;

    readonly suspendMembershipUseCase:
    SuspendMembershipUseCase;

    readonly reactivateMembershipUseCase:
    ReactivateMembershipUseCase;

    readonly archiveMembershipUseCase:
    ArchiveMembershipUseCase;

    readonly inviteMemberUseCase:
    InviteMemberUseCase;

    readonly redeemInvitationUseCase:
    RedeemInvitationUseCase;

    readonly revokeInvitationUseCase:
    RevokeInvitationUseCase;

    readonly expireInvitationUseCase:
    ExpireInvitationUseCase;

    readonly getInvitationUseCase:
    GetInvitationUseCase;

    readonly listTenantInvitationsUseCase:
    ListTenantInvitationsUseCase;

    readonly getMembershipUseCase:
    GetMembershipUseCase;

    readonly listTenantMembershipsUseCase:
    ListTenantMembershipsUseCase;

    readonly listMembershipsForProviderUseCase:
    ListMembershipsForProviderUseCase;

    readonly currentMembershipContextUseCase:
    CurrentMembershipContextUseCase;

    readonly switchMembershipContextUseCase:
    SwitchMembershipContextUseCase;
}

// -----------------------------------------------------------------------------
// API COMPOSITION
// -----------------------------------------------------------------------------

export function createMembershipApi(
    input:
        CreateMembershipApiInput,
): MembershipApi {
    return {
        // ---------------------------------------------------------------------
        // MEMBERSHIP LIFECYCLE
        // ---------------------------------------------------------------------

        async createMembership(
            request,
            context,
        ) {
            await authorizeAdministrativeOperation(
                input,
                {
                    permission:
                        membershipPermissions.create,

                    tenantId:
                        request.tenantId,

                    resource: {
                        type:
                            "member",
                    },
                },
                context,
            );

            return input.createMembershipUseCase.execute(
                request,
                context,
            );
        },

        async activateMembership(
            membershipId,
            context,
        ) {
            const authorization =
                await authorizeAdministrativeOperation(
                    input,
                    {
                        permission:
                            membershipPermissions.activate,

                        resource: {
                            type:
                                "member",

                            id:
                                membershipId,
                        },
                    },
                    context,
                );

            const membership =
                await input.invariantGuard.resolveMembership(
                    membershipId,
                );

            input.invariantGuard.assertTenantConsistency(
                authorization.tenantId,
                membership,
            );

            return input.activateMembershipUseCase.execute(
                membershipId,
                context,
            );
        },

        async suspendMembership(
            membershipId,
            request,
            context,
        ) {
            const authorization =
                await authorizeAdministrativeOperation(
                    input,
                    {
                        permission:
                            membershipPermissions.suspend,

                        resource: {
                            type:
                                "member",

                            id:
                                membershipId,
                        },
                    },
                    context,
                );

            const membership =
                await input.invariantGuard.resolveMembership(
                    membershipId,
                );

            input.invariantGuard.assertTenantConsistency(
                authorization.tenantId,
                membership,
            );

            return input.suspendMembershipUseCase.execute(
                membershipId,
                request,
                context,
            );
        },

        async reactivateMembership(
            membershipId,
            context,
        ) {
            const authorization =
                await authorizeAdministrativeOperation(
                    input,
                    {
                        permission:
                            membershipPermissions.reactivate,

                        resource: {
                            type:
                                "member",

                            id:
                                membershipId,
                        },
                    },
                    context,
                );

            const membership =
                await input.invariantGuard.resolveMembership(
                    membershipId,
                );

            input.invariantGuard.assertTenantConsistency(
                authorization.tenantId,
                membership,
            );

            return input.reactivateMembershipUseCase.execute(
                membershipId,
                context,
            );
        },

        async archiveMembership(
            membershipId,
            request,
            context,
        ) {
            const authorization =
                await authorizeAdministrativeOperation(
                    input,
                    {
                        permission:
                            membershipPermissions.archive,

                        resource: {
                            type:
                                "member",

                            id:
                                membershipId,
                        },
                    },
                    context,
                );

            const membership =
                await input.invariantGuard.resolveMembership(
                    membershipId,
                );

            input.invariantGuard.assertTenantConsistency(
                authorization.tenantId,
                membership,
            );

            return input.archiveMembershipUseCase.execute(
                membershipId,
                request,
                context,
            );
        },

        // ---------------------------------------------------------------------
        // INVITATION LIFECYCLE
        // ---------------------------------------------------------------------

        async inviteMember(
            request,
            context,
        ) {
            await authorizeAdministrativeOperation(
                input,
                {
                    permission:
                        membershipPermissions.invite,

                    tenantId:
                        request.tenantId,

                    resource: {
                        type:
                            "member",
                    },
                },
                context,
            );

            return input.inviteMemberUseCase.execute(
                request,
                context,
            );
        },

        async redeemInvitation(
            request,
            context,
        ) {
            // -----------------------------------------------------------------
            // AUTHENTICATED SELF-SERVICE
            // -----------------------------------------------------------------
            // Invitation redemption may create the actor's first Membership.
            // It therefore cannot depend on an active Membership Context.
            // -----------------------------------------------------------------

            input.invariantGuard.assertActorIdentity(
                request.identityId,
                context,
            );

            return input.redeemInvitationUseCase.execute(
                request,
                context,
            );
        },

        async revokeInvitation(
            invitationId,
            context,
        ) {
            const authorization =
                await authorizeAdministrativeOperation(
                    input,
                    {
                        permission:
                            membershipPermissions.revokeInvitation,

                        resource: {
                            type:
                                "invitation",

                            id:
                                invitationId,
                        },
                    },
                    context,
                );

            const invitation =
                await input.invariantGuard.resolveInvitation(
                    invitationId,
                );

            assertInvitationTenantConsistency(
                invitation.targetTenantId,
                authorization.tenantId,
            );

            return input.revokeInvitationUseCase.execute(
                invitationId,
                context,
            );
        },

        async expireInvitation(
            invitationId,
            context,
        ) {
            const authorization =
                await authorizeAdministrativeOperation(
                    input,
                    {
                        permission:
                            membershipPermissions.expireInvitation,

                        resource: {
                            type:
                                "invitation",

                            id:
                                invitationId,
                        },
                    },
                    context,
                );

            const invitation =
                await input.invariantGuard.resolveInvitation(
                    invitationId,
                );

            assertInvitationTenantConsistency(
                invitation.targetTenantId,
                authorization.tenantId,
            );

            return input.expireInvitationUseCase.execute(
                invitationId,
                context,
            );
        },

        async getInvitation(
            invitationId,
            context,
        ) {
            const authorization =
                await authorizeAdministrativeOperation(
                    input,
                    {
                        permission:
                            membershipPermissions.readInvitation,

                        resource: {
                            type:
                                "invitation",

                            id:
                                invitationId,
                        },
                    },
                    context,
                );

            const invitation =
                await input.invariantGuard.resolveInvitation(
                    invitationId,
                );

            assertInvitationTenantConsistency(
                invitation.targetTenantId,
                authorization.tenantId,
            );

            return input.getInvitationUseCase.execute(
                invitationId,
            );
        },

        async listTenantInvitations(
            tenantId,
            request,
            context,
        ) {
            await authorizeAdministrativeOperation(
                input,
                {
                    permission:
                        membershipPermissions.listInvitations,

                    tenantId,

                    resource: {
                        type:
                            "invitation",
                    },
                },
                context,
            );

            return input.listTenantInvitationsUseCase.execute(
                tenantId,
                request,
            );
        },

        // ---------------------------------------------------------------------
        // MEMBERSHIP QUERIES
        // ---------------------------------------------------------------------

        async getMembership(
            membershipId,
            context,
        ) {
            const membership =
                await input.invariantGuard.resolveMembership(
                    membershipId,
                );

            // -----------------------------------------------------------------
            // SELF-SERVICE READ
            // -----------------------------------------------------------------

            if (
                membership.identityId
                === context.actor.actorId
            ) {
                return input.getMembershipUseCase.execute(
                    membershipId,
                    context,
                );
            }

            // -----------------------------------------------------------------
            // ADMINISTRATIVE READ
            // -----------------------------------------------------------------

            await authorizeAdministrativeOperation(
                input,
                {
                    permission:
                        membershipPermissions.read,

                    tenantId:
                        membership.tenantId,

                    resource: {
                        type:
                            "member",

                        id:
                            membership.membershipId,
                    },
                },
                context,
            );

            return input.getMembershipUseCase.execute(
                membershipId,
                context,
            );
        },

        async listTenantMemberships(
            tenantId,
            context,
        ) {
            await authorizeAdministrativeOperation(
                input,
                {
                    permission:
                        membershipPermissions.list,

                    tenantId,

                    resource: {
                        type:
                            "member",
                    },
                },
                context,
            );

            return input.listTenantMembershipsUseCase.execute(
                tenantId,
                context,
            );
        },


        async listMembershipsForProvider(
            request,
            context,
            security,
        ) {
            await authorizeProviderRead(
                input,
                security,
                context,
            );

            return input.listMembershipsForProviderUseCase.execute(
                request,
                context,
            );
        },

        // ---------------------------------------------------------------------
        // ACTIVE MEMBERSHIP CONTEXT
        // ---------------------------------------------------------------------

        async getCurrentContext(
            identityId,
            context,
        ) {
            input.invariantGuard.assertActorIdentity(
                identityId,
                context,
            );

            return input.currentMembershipContextUseCase.execute(
                identityId,
                context,
            );
        },

        async switchMembershipContext(
            identityId,
            request,
            context,
        ) {
            input.invariantGuard.assertActorIdentity(
                identityId,
                context,
            );

            const membership =
                await input.invariantGuard.resolveMembership(
                    request.membershipId,
                );

            input.invariantGuard.assertOwnMembership(
                membership,
                context,
            );

            input.invariantGuard.assertActiveMembership(
                membership,
            );

            return input.switchMembershipContextUseCase.execute(
                identityId,
                request,
                context,
            );
        },
    };
}

// -----------------------------------------------------------------------------
// ADMINISTRATIVE AUTHORIZATION
// -----------------------------------------------------------------------------
// Resolves the authenticated actor's canonical active Membership Context before
// delegating the final authorization decision to Access Operations™.
//
// RuntimeContext.tenant is intentionally not used as Membership's execution
// Tenant authority because authentication currently establishes a provider
// control-plane placeholder there.
// -----------------------------------------------------------------------------

interface AdministrativeAuthorizationInput {
    readonly permission:
    MembershipPermission;

    readonly tenantId?:
    string;

    readonly resource:
    MembershipAuthorizationResource;
}

interface AdministrativeAuthorizationContext {
    readonly membershipId:
    string;

    readonly tenantId:
    string;
}


async function authorizeProviderRead(
    input:
        Pick<CreateMembershipApiInput, "accessAuthorizer">,

    security: {
        readonly scope: {
            readonly type: "platform";
            readonly tenantId: string;
            readonly membershipId: string;
        };
    },

    context:
        RuntimeContext,
): Promise<void> {
    let decision:
        Awaited<
            ReturnType<
                MembershipAccessAuthorizer["authorize"]
            >
        >;

    try {
        decision =
            await input.accessAuthorizer.authorize(
                {
                    permission:
                        membershipPermissions.list,

                    tenantId:
                        security.scope.tenantId,

                    membershipId:
                        security.scope.membershipId,

                    resource: {
                        type:
                            "member",
                    },
                },
                context,
            );
    } catch (error) {
        throw new MembershipAuthorizationUnavailableError(
            error,
        );
    }

    if (!decision.allowed) {
        throw new MembershipAuthorizationDeniedError(
            decision.reasonCode,
            decision.decisionId,
        );
    }
}

async function authorizeAdministrativeOperation(
    input:
        Pick<
            CreateMembershipApiInput,
            "accessAuthorizer"
            | "invariantGuard"
        >,

    authorization:
        AdministrativeAuthorizationInput,

    context:
        RuntimeContext,
): Promise<AdministrativeAuthorizationContext> {
    const membershipContext =
        await input.invariantGuard.resolveCurrentContext(
            context.actor.actorId,
        );

    const activeMembership =
        await input.invariantGuard.resolveMembership(
            membershipContext.activeMembershipId,
        );

    input.invariantGuard.assertOwnMembership(
        activeMembership,
        context,
    );

    input.invariantGuard.assertActiveMembership(
        activeMembership,
    );

    input.invariantGuard.assertTenantConsistency(
        membershipContext.activeTenantId,
        activeMembership,
    );

    const tenantId =
        authorization.tenantId
        ?? membershipContext.activeTenantId;

    input.invariantGuard.assertTenantConsistency(
        tenantId,
        activeMembership,
    );

    let decision:
        Awaited<
            ReturnType<
                MembershipAccessAuthorizer[
                "authorize"
                ]
            >
        >;

    try {
        decision =
            await input.accessAuthorizer.authorize(
                {
                    permission:
                        authorization.permission,

                    tenantId,

                    membershipId:
                        activeMembership.membershipId,

                    resource:
                        authorization.resource,
                },

                context,
            );
    } catch (
    error
    ) {
        throw new MembershipAuthorizationUnavailableError(
            error,
        );
    }

    if (
        !decision.allowed
    ) {
        throw new MembershipAuthorizationDeniedError(
            decision.reasonCode,
            decision.decisionId,
        );
    }

    return {
        membershipId:
            activeMembership.membershipId,

        tenantId,
    };
}

// -----------------------------------------------------------------------------
// INVITATION TENANT INVARIANT
// -----------------------------------------------------------------------------

function assertInvitationTenantConsistency(
    invitationTenantId:
        string,

    authorizedTenantId:
        string,
): void {
    if (
        invitationTenantId
        !== authorizedTenantId
    ) {
        throw new SecurityError(
            "Membership invitation Tenant access was denied.",
            {
                securityType:
                    "authorization",

                reason:
                    "cross_tenant_access_denied",
            },
        );
    }
}