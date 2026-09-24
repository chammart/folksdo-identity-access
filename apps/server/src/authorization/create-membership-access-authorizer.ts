// apps/server/src/authorization/create-membership-access-authorizer.ts
// -----------------------------------------------------------------------------
// CREATE MEMBERSHIP ACCESS AUTHORIZER
// -----------------------------------------------------------------------------
// Host-owned Membership Operations™ → Access Operations™ authorization adapter.
//
// Purpose:
//   • implement Membership's provider-neutral authorization port
//   • translate Membership business Permission identities to Access requests
//   • translate Folksdo RuntimeContext into the public Access API context
//   • resolve the Membership → Access → Membership bootstrap cycle through
//     explicit late binding
//
// Boundary:
//   • Membership does not import Access Operations™
//   • Access implementation internals are not exposed to Membership
//   • only the public AccessApi authorization operation is consumed
//   • the adapter fails closed before Access is bound
//   • Access may be bound only once
//
// Permission translation:
//
//   Membership:
//       membership.member.invite
//
//           ↓
//
//   Access:
//       action: membership.invite
//       resource.type: member
//
//           ↓
//
//   Access resolves:
//       service  = membership
//       resource = member
//       action   = invite
// -----------------------------------------------------------------------------

import type {
    RuntimeContext,
} from "@folksdo-engine/runtime";

import type {
    AccessApi,
    AccessApiRequestContext,
} from "@folksdo-identity-access/access";

import type {
    MembershipAccessAuthorizer,
    MembershipAccessAuthorizationDecision,
    MembershipAccessAuthorizationRequest,
    MembershipPermission,
} from "@folksdo-identity-access/membership";

// -----------------------------------------------------------------------------
// PUBLIC CONTRACT
// -----------------------------------------------------------------------------

export interface MembershipAccessAuthorizerBinding
    extends
    MembershipAccessAuthorizer {
    /**
     * Bind the public Access authorization API after Access Operations™ has
     * completed runtime composition.
     *
     * Binding is intentionally one-time. Replacing the authorization authority
     * of a running Membership service is not permitted.
     */
    bind(
        accessApi:
            Pick<AccessApi, "authorize">,
    ): void;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createMembershipAccessAuthorizer():
    MembershipAccessAuthorizerBinding {
    let accessApi:
        Pick<
            AccessApi,
            "authorize"
        >
        | undefined;

    return {
        bind(
            candidate,
        ): void {
            if (
                accessApi !== undefined
            ) {
                throw new Error(
                    "Membership Access authorizer is already bound.",
                );
            }

            accessApi =
                candidate;
        },

        async authorize(
            request,
            context,
        ): Promise<
            MembershipAccessAuthorizationDecision
        > {
            if (
                accessApi === undefined
            ) {
                throw new Error(
                    "Membership Access authorization is unavailable.",
                );
            }

            const permission =
                parseMembershipPermission(
                    request.permission,
                );

            assertResourceConsistency(
                permission.resource,
                request,
            );

            const decision =
                await accessApi.authorize(
                    {
                        action:
                            `${permission.service}.${permission.action}`,

                        resource: {
                            type:
                                request.resource.type,

                            id:
                                request.resource.id,
                        },

                        membershipId:
                            request.membershipId,

                        tenantId:
                            request.tenantId,
                    },

                    createAccessContext(
                        request,
                        context,
                    ),
                );

            return {
                allowed:
                    decision.allowed,

                decisionId:
                    decision.decisionId,

                reasonCode:
                    decision.reasonCode,
            };
        },
    };
}

// -----------------------------------------------------------------------------
// PERMISSION TRANSLATION
// -----------------------------------------------------------------------------
// Membership owns canonical business Permission identity:
//
//   service.resource.action
//
// Access's current public authorization request separates the resource from
// the protected action:
//
//   action        = service.action
//   resource.type = resource
//
// This adapter is the only Membership integration component responsible for
// that translation.
// -----------------------------------------------------------------------------

interface ParsedMembershipPermission {
    readonly service:
    string;

    readonly resource:
    string;

    readonly action:
    string;
}

function parseMembershipPermission(
    permission:
        MembershipPermission,
): ParsedMembershipPermission {
    const parts =
        permission.split(
            ".",
        );

    if (
        parts.length
        !== 3
    ) {
        throw new Error(
            `Invalid canonical Membership Permission: ${permission}.`,
        );
    }

    const [
        service,
        resource,
        action,
    ] =
        parts;

    if (
        service === undefined
        || service.length === 0
        || resource === undefined
        || resource.length === 0
        || action === undefined
        || action.length === 0
    ) {
        throw new Error(
            `Invalid canonical Membership Permission: ${permission}.`,
        );
    }

    return {
        service,
        resource,
        action,
    };
}

// -----------------------------------------------------------------------------
// RESOURCE CONSISTENCY
// -----------------------------------------------------------------------------
// The canonical Permission and protected resource must describe the same
// business resource.
//
// Example:
//
//   membership.member.suspend
//
// may authorize:
//
//   resource.type = member
//
// but never:
//
//   resource.type = invitation
//
// This prevents the host adapter from constructing an authorization request
// whose Permission identity and resource scope disagree.
// -----------------------------------------------------------------------------

function assertResourceConsistency(
    permissionResource:
        string,

    request:
        MembershipAccessAuthorizationRequest,
): void {
    if (
        permissionResource
        !== request.resource.type
    ) {
        throw new Error(
            "Membership authorization Permission and resource type do not match.",
        );
    }
}

// -----------------------------------------------------------------------------
// ACCESS CONTEXT TRANSLATION
// -----------------------------------------------------------------------------
// Membership receives a Folksdo Engine RuntimeContext.
//
// Access exposes its own transport-neutral public request context. The host
// owns translation between those two service boundaries.
//
// Important:
//
//   • the Tenant comes from Membership's canonical authorization request
//   • RuntimeContext.tenant is not trusted as the Membership execution Tenant
//   • RuntimeContext.permissions is never forwarded as Membership authority
// -----------------------------------------------------------------------------

function createAccessContext(
    request:
        MembershipAccessAuthorizationRequest,

    context:
        RuntimeContext,
): AccessApiRequestContext {
    return {
        requestId:
            context.requestId,

        correlationId:
            context.correlationId,

        causationId:
            context.causationId,

        actor: {
            actorId:
                context.actor.actorId,

            actorType:
                translateActorType(
                    context.actor.actorType,
                ),
        },

        tenant: {
            tenantId:
                request.tenantId,

            tenantType:
                "tenant",
        },

        membershipId:
            request.membershipId,

        permissions: [],
    };
}

// -----------------------------------------------------------------------------
// ACTOR TRANSLATION
// -----------------------------------------------------------------------------

function translateActorType(
    actorType:
        string,
): AccessApiRequestContext["actor"]["actorType"] {
    switch (
    actorType
    ) {
        case "user":
        case "identity":
            return "identity";

        case "service":
        case "worker":
            return "service";

        case "system":
            return "system";

        case "platform":
            return "platform";

        default:
            throw new Error(
                `Unsupported Membership authorization actor type: ${actorType}.`,
            );
    }
}
