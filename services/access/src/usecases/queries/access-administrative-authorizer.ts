// services/access/src/usecases/queries/access-administrative-authorizer.ts
// -----------------------------------------------------------------------------
// ACCESS ADMINISTRATIVE AUTHORIZER
// -----------------------------------------------------------------------------
// Internal application boundary used by Access Operations™ to authorize its
// own administrative capabilities without recursively calling the public
// /authorize HTTP endpoint.
//
// Purpose:
//   • reuse the canonical AuthorizeActionUseCase
//   • require trusted Identity, Membership, and Tenant execution context
//   • support explicit non-public Security Foundation bootstrap execution
//   • authorize delegated Permissions through the same evaluator
//   • fail closed on deny or unavailable authorization dependencies
//   • expose only safe decision evidence to upper layers
//
// Boundary:
//   • contains no HTTP or Fastify logic
//   • contains no persistence implementation
//   • performs no administrative mutation
//   • does not interpret RuntimeContext.permissions
// -----------------------------------------------------------------------------

import type {
    AccessAdministrativePermission,
    AccessPermissionRequest,
} from "../../authorization";

import {
    AccessAdministrativeAuthorizationDeniedError,
    AccessAdministrativeAuthorizationUnavailableError,
    AccessError,
} from "../../errors";

import type {
    AccessAuthorizationResult,
} from "../shared";

import type {
    AuthorizeActionRequest,
} from "./authorize-action-usecase";

// -----------------------------------------------------------------------------
// CONTEXT
// -----------------------------------------------------------------------------

export type AccessAdministrativeAuthorizationContext =
    | {
        readonly identityId: string;

        readonly membershipId: string;

        readonly tenantId: string;

        readonly trustedExecution?: undefined;
    }
    | {
        readonly identityId: string;

        readonly trustedExecution: {
            readonly boundary:
            "security_foundation";
        };
    };

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

export interface AccessAdministrativeAuthorizationRequest {
    readonly permission:
    AccessAdministrativePermission;

    readonly resourceType: string;

    readonly resourceId?: string;
}

export interface AccessDelegatedPermissionAuthorizationRequest {
    readonly permission:
    AccessPermissionRequest;

    readonly resourceType: string;

    readonly resourceId?: string;
}

// -----------------------------------------------------------------------------
// EXECUTOR
// -----------------------------------------------------------------------------

export interface AccessAdministrativeAuthorizationExecutor {
    execute(
        request: AuthorizeActionRequest,
    ): Promise<AccessAuthorizationResult>;
}

// -----------------------------------------------------------------------------
// DEPENDENCIES
// -----------------------------------------------------------------------------

export interface AccessAdministrativeAuthorizerDependencies {
    readonly authorizeAction:
    AccessAdministrativeAuthorizationExecutor;
}

// -----------------------------------------------------------------------------
// AUTHORIZER
// -----------------------------------------------------------------------------

export class AccessAdministrativeAuthorizer {
    public constructor(
        private readonly dependencies:
        AccessAdministrativeAuthorizerDependencies,
    ) { }

    public async assertAuthorized(
        request:
            AccessAdministrativeAuthorizationRequest,
        context:
            AccessAdministrativeAuthorizationContext,
    ): Promise<void> {
        await this.assertPermissionAuthorized(
            request,
            context,
        );
    }

    public async assertPermissionAuthorized(
        request:
            AccessDelegatedPermissionAuthorizationRequest,
        context:
            AccessAdministrativeAuthorizationContext,
    ): Promise<void> {
        if (
            context.trustedExecution?.boundary
            === "security_foundation"
        ) {
            return;
        }

        if (
            !("membershipId" in context)
            || !("tenantId" in context)
        ) {
            throw new AccessAdministrativeAuthorizationDeniedError(
                "authorization_context_invalid",
            );
        }

        try {
            const decision =
                await this.dependencies.authorizeAction.execute({
                    identityId:
                        context.identityId,

                    membershipId:
                        context.membershipId,

                    tenantId:
                        context.tenantId,

                    permission: {
                        service:
                            request.permission.service,

                        resource:
                            request.permission.resource,

                        action:
                            request.permission.action,
                    },

                    resource: {
                        resourceType:
                            request.resourceType,

                        ...(request.resourceId === undefined
                            ? {}
                            : {
                                resourceId:
                                    request.resourceId,
                            }),
                    },
                });

            if (
                decision.decision
                !== "allow"
            ) {
                throw new AccessAdministrativeAuthorizationDeniedError(
                    decision.reasonCode,
                    decision.decisionId,
                );
            }
        } catch (error) {
            if (
                error
                instanceof AccessAdministrativeAuthorizationDeniedError
            ) {
                throw error;
            }

            if (
                error instanceof AccessError
                && (
                    error.code
                    === "authorization_context_invalid"
                    || error.code
                    === "authorization_subject_invalid"
                    || error.code
                    === "authorization_scope_invalid"
                )
            ) {
                throw new AccessAdministrativeAuthorizationDeniedError(
                    error.code,
                );
            }

            throw new AccessAdministrativeAuthorizationUnavailableError(
                error,
            );
        }
    }
}
