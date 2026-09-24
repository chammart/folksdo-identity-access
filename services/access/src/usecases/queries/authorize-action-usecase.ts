// services/access/src/usecases/queries/authorize-action-usecase.ts
// -----------------------------------------------------------------------------
// AUTHORIZE ACTION USE CASE
// -----------------------------------------------------------------------------
// Determines whether one authenticated Identity, operating through one
// Membership and Tenant context, may perform one protected business action.
//
// Boundary:
//   • does not authenticate the Identity
//   • does not establish or switch Membership context
//   • validates the supplied context against Access-known Membership facts
//   • loads Access-owned Permission, Assignment, Restriction and Policy state
//   • delegates deterministic authorization to the Access evaluator
//   • preserves deny-by-default authorization
//   • returns an auditable provider-neutral authorization result
//   • performs no state mutation, event emission or outbox publication
// -----------------------------------------------------------------------------

import {
    evaluateAuthorization,
} from "../../authorization";

import type {
    AccessAuthorizationRequest,
    AccessPermissionRequest,
} from "../../authorization";

import {
    AuthorizationContextInvalidError,
} from "../../errors";

import {
    toAccessAuthorizationResult,
} from "../shared";

import type {
    AccessAuthorizationResult,
    AccessUseCaseDependencies,
} from "../shared";

// -----------------------------------------------------------------------------
// RESOURCE
// -----------------------------------------------------------------------------

export interface AuthorizeActionResource {
    /**
     * Protected business resource classification.
     *
     * Example:
     * membership
     */
    readonly resourceType: string;

    /**
     * Optional protected resource instance identifier.
     *
     * Example:
     * membership-123
     */
    readonly resourceId?: string;
}

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface AuthorizeActionRequest {
    /**
     * Authenticated global Identity supplied by the host execution context.
     */
    readonly identityId: string;

    /**
     * Membership selected by Membership Operations™ as the active tenant
     * execution context.
     */
    readonly membershipId: string;

    /**
     * Tenant associated with the selected Membership context.
     */
    readonly tenantId: string;

    /**
     * Protected business action requested by the actor.
     */
    readonly permission: AccessPermissionRequest;

    /**
     * Optional Subscription-owned business capability required by the
     * protected action.
     *
     * Subscription capability is a commercial eligibility constraint. It is
     * never interpreted as an Access Permission grant.
     */
    readonly requiredSubscriptionCapability?: string;

    /**
     * Optional resource context used by resource-aware Permission
     * assignments, Restrictions and Authorization Policies.
     */
    readonly resource?: AuthorizeActionResource;
}

// -----------------------------------------------------------------------------
// USE CASE
// -----------------------------------------------------------------------------

export class AuthorizeActionUseCase {
    public constructor(
        private readonly dependencies:
            AccessUseCaseDependencies,
    ) { }

    public async execute(
        request: AuthorizeActionRequest,
    ): Promise<AccessAuthorizationResult> {
        const now =
            this.dependencies.clock.now();

        const membership =
            await this.dependencies.knownFactsStore
                .findMembership(
                    request.membershipId,
                );

        if (membership === null) {
            throw new AuthorizationContextInvalidError();
        }

        if (
            membership.identityId
            !== request.identityId
            || membership.tenantId
            !== request.tenantId
        ) {
            throw new AuthorizationContextInvalidError();
        }

        const [
            identityIsAvailable,
            tenantIsAvailable,
            permission,
            roleAssignments,
            permissionAssignments,
        ] =
            await Promise.all([
                this.dependencies.knownFactsStore
                    .identityIsAvailable(
                        request.identityId,
                    ),

                this.dependencies.knownFactsStore
                    .tenantIsAvailable(
                        request.tenantId,
                    ),

                this.dependencies.readStore
                    .findPermissionByKey(
                        request.permission.service,
                        request.permission.resource,
                        request.permission.action,
                    ),

                this.dependencies.readStore
                    .listRoleAssignmentsByMembership(
                        request.membershipId,
                        request.tenantId,
                    ),

                this.dependencies.readStore
                    .listPermissionAssignmentsByMembership(
                        request.membershipId,
                        request.tenantId,
                    ),
            ]);

        const membershipIsValid =
            membership.status === "active"
            && identityIsAvailable
            && tenantIsAvailable;

        const roleIds = [
            ...new Set(
                roleAssignments.map(
                    (assignment) =>
                        assignment.roleId,
                ),
            ),
        ];

        const [
            roles,
            rolePermissionBindings,
            restrictions,
            policyResults,
        ] =
            await Promise.all([
                roleIds.length > 0
                    ? Promise.all(
                        roleIds.map(
                            roleId =>
                                this.dependencies.readStore
                                    .findRoleById(
                                        roleId,
                                    ),
                        ),
                    ).then(
                        resolvedRoles =>
                            resolvedRoles.filter(
                                role =>
                                    role !== null,
                            ),
                    )
                    : Promise.resolve([]),

                roleIds.length > 0
                    ? this.dependencies.readStore
                        .listRolePermissionBindings(
                            roleIds,
                        )
                    : Promise.resolve([]),

                this.dependencies.readStore
                    .listApplicableRestrictions(
                        request.membershipId,
                        request.tenantId,
                        permission?.permissionId,
                        request.resource?.resourceType,
                        request.resource?.resourceId,
                    ),

                permission !== null
                    ? this.dependencies.readStore
                        .evaluateActivePolicies({
                            identityId:
                                request.identityId,

                            membershipId:
                                request.membershipId,

                            tenantId:
                                request.tenantId,

                            permissionId:
                                permission.permissionId,

                            resourceType:
                                request.resource
                                    ?.resourceType,

                            resourceId:
                                request.resource
                                    ?.resourceId,

                            now,
                        })
                    : Promise.resolve([]),
            ]);

        const subscriptionCapability =
            request.requiredSubscriptionCapability
                ? await this.dependencies.knownFactsStore
                    .findTenantCapability(
                        request.tenantId,
                        request.requiredSubscriptionCapability,
                    )
                : null;

        const authorizationRequest:
            AccessAuthorizationRequest = {
            subject: {
                identityId:
                    request.identityId,

                membershipId:
                    request.membershipId,

                tenantId:
                    request.tenantId,

                membershipIsValid,
            },

            permission:
                request.permission,

            resource:
                request.resource,

            ...(request.requiredSubscriptionCapability === undefined
                ? {}
                : {
                    requiredSubscriptionCapability:
                        request.requiredSubscriptionCapability,
                }),

            now,
        };

        const decision =
            evaluateAuthorization({
                request:
                    authorizationRequest,

                permissions:
                    permission === null
                        ? []
                        : [
                            permission,
                        ],

                roles,

                roleAssignments,

                permissionAssignments,

                rolePermissionBindings,

                restrictions,

                policyResults,

                subscriptionCapabilities:
                    request.requiredSubscriptionCapability
                        ? [
                            {
                                capability:
                                    request.requiredSubscriptionCapability,

                                available:
                                    subscriptionCapability?.status
                                    === "enabled",

                                ...(subscriptionCapability === null
                                    ? {}
                                    : {
                                        sourceId:
                                            subscriptionCapability.documentId,
                                    }),

                                ...(subscriptionCapability === null
                                    ? {
                                        reason:
                                            "Required subscription capability is not known for the Tenant.",
                                    }
                                    : subscriptionCapability.status === "enabled"
                                        ? {}
                                        : {
                                            reason:
                                                "Required subscription capability is disabled for the Tenant.",
                                        }),
                            },
                        ]
                        : [],
            });

        return toAccessAuthorizationResult(
            this.dependencies.ids.authorizationDecisionId(),
            decision,
        );
    }
}