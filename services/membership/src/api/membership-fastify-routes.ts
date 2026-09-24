// services/membership/src/api/membership-fastify-routes.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP FASTIFY ROUTES
// -----------------------------------------------------------------------------
// HTTP transport boundary for Membership Operations™.
//
// Purpose:
//   • resolve the Folksdo runtime context for each request
//   • validate route input through Membership-owned parsers
//   • delegate business execution to the Membership API facade
//   • translate semantic Membership errors into stable HTTP responses
//
// Boundary:
//   • contains no Membership business rules
//   • performs no direct persistence
//   • emits no business events directly
//   • exposes no Folksdo Engine infrastructure details
// -----------------------------------------------------------------------------

import type {
    FastifyInstance,
    FastifyReply,
    FastifyRequest,
} from "fastify";

import type {
    MembershipApi,
} from "./membership-api";

import {
    translateMembershipHttpError,
} from "./membership-http-error-translator";

import type {
    MembershipProviderReadSecurityResolver,
    MembershipRouteContextResolver,
} from "./membership-route-context";

import {
    parseCreateMembershipRequest,
    parseInviteMemberRequest,
    parseListMembershipsForProviderRequest,
    parseReasonRequest,
    parseRedeemInvitationRequest,
    parseSwitchMembershipContextRequest,
} from "./membership-route-validation";

// -----------------------------------------------------------------------------
// INPUT CONTRACT
// -----------------------------------------------------------------------------

export interface RegisterMembershipRoutesInput {
    readonly app: FastifyInstance;
    readonly membershipApi: MembershipApi;
    readonly contextResolver: MembershipRouteContextResolver;
    readonly providerReadSecurityResolver: MembershipProviderReadSecurityResolver;
}

// -----------------------------------------------------------------------------
// ROUTE REGISTRATION
// -----------------------------------------------------------------------------

export async function registerMembershipRoutes(
    input: RegisterMembershipRoutesInput,
): Promise<void> {
    await registerCreateMembershipRoute(input);

    await registerInviteMemberRoute(input);
    await registerRedeemInvitationRoute(input);
    await registerRevokeInvitationRoute(input);
    await registerExpireInvitationRoute(input);
    await registerGetInvitationRoute(input);
    await registerListTenantInvitationsRoute(input);

    await registerActivateMembershipRoute(input);
    await registerSuspendMembershipRoute(input);
    await registerReactivateMembershipRoute(input);
    await registerArchiveMembershipRoute(input);

    await registerCurrentMembershipContextRoute(input);
    await registerSwitchMembershipContextRoute(input);

    await registerListMembershipsForProviderRoute(input);
    await registerGetMembershipRoute(input);
    await registerListTenantMembershipsRoute(input);
}

// -----------------------------------------------------------------------------
// CREATE MEMBERSHIP ROUTE
// -----------------------------------------------------------------------------

async function registerCreateMembershipRoute(
    input: RegisterMembershipRoutesInput,
): Promise<void> {
    input.app.post(
        "/api/v1/membership",
        async (
            request,
            reply,
        ) => {
            return executeMembershipRoute({
                request,
                reply,
                route:
                    "membership.create-membership",
                failureMessage:
                    "Membership creation failed.",
                statusCode: 201,
                execute: async () => {
                    const context =
                        await input.contextResolver.resolve({
                            request,
                            reply,
                        });

                    const body =
                        parseCreateMembershipRequest(
                            request.body,
                        );

                    return input.membershipApi.createMembership(
                        body,
                        context,
                    );
                },
            });
        },
    );
}

// -----------------------------------------------------------------------------
// INVITATION ROUTES
// -----------------------------------------------------------------------------

async function registerInviteMemberRoute(
    input: RegisterMembershipRoutesInput,
): Promise<void> {
    input.app.post(
        "/api/v1/membership/invitations",
        async (
            request,
            reply,
        ) => {
            return executeMembershipRoute({
                request,
                reply,
                route:
                    "membership.invite-member",
                failureMessage:
                    "Membership invitation creation failed.",
                statusCode: 201,
                execute: async () => {
                    const context =
                        await input.contextResolver.resolve({
                            request,
                            reply,
                        });

                    const body =
                        parseInviteMemberRequest(
                            request.body,
                        );

                    return input.membershipApi.inviteMember(
                        body,
                        context,
                    );
                },
            });
        },
    );
}

async function registerRedeemInvitationRoute(
    input: RegisterMembershipRoutesInput,
): Promise<void> {
    input.app.post(
        "/api/v1/membership/invitations/redeem",
        async (
            request,
            reply,
        ) => {
            return executeMembershipRoute({
                request,
                reply,
                route:
                    "membership.redeem-invitation",
                failureMessage:
                    "Membership invitation redemption failed.",
                execute: async () => {
                    const context =
                        await input.contextResolver.resolve({
                            request,
                            reply,
                        });

                    const body =
                        parseRedeemInvitationRequest(
                            request.body,
                        );

                    return input.membershipApi.redeemInvitation(
                        body,
                        context,
                    );
                },
            });
        },
    );
}

async function registerRevokeInvitationRoute(
    input: RegisterMembershipRoutesInput,
): Promise<void> {
    input.app.post<{
        Params: InvitationIdParams;
    }>(
        "/api/v1/membership/invitations/:invitationId/revoke",
        async (
            request,
            reply,
        ) => {
            return executeMembershipRoute({
                request,
                reply,
                route:
                    "membership.revoke-invitation",
                failureMessage:
                    "Membership invitation revocation failed.",
                execute: async () => {
                    const context =
                        await input.contextResolver.resolve({
                            request,
                            reply,
                        });

                    return input.membershipApi.revokeInvitation(
                        request.params.invitationId,
                        context,
                    );
                },
            });
        },
    );
}

// -----------------------------------------------------------------------------
// MEMBERSHIP LIFECYCLE ROUTES
// -----------------------------------------------------------------------------

async function registerActivateMembershipRoute(
    input: RegisterMembershipRoutesInput,
): Promise<void> {
    input.app.post<{
        Params: MembershipIdParams;
    }>(
        "/api/v1/membership/:membershipId/activate",
        async (
            request,
            reply,
        ) => {
            return executeMembershipRoute({
                request,
                reply,
                route:
                    "membership.activate-membership",
                failureMessage:
                    "Membership activation failed.",
                execute: async () => {
                    const context =
                        await input.contextResolver.resolve({
                            request,
                            reply,
                        });

                    return input.membershipApi.activateMembership(
                        request.params.membershipId,
                        context,
                    );
                },
            });
        },
    );
}

async function registerSuspendMembershipRoute(
    input: RegisterMembershipRoutesInput,
): Promise<void> {
    input.app.post<{
        Params: MembershipIdParams;
    }>(
        "/api/v1/membership/:membershipId/suspend",
        async (
            request,
            reply,
        ) => {
            return executeMembershipRoute({
                request,
                reply,
                route:
                    "membership.suspend-membership",
                failureMessage:
                    "Membership suspension failed.",
                execute: async () => {
                    const context =
                        await input.contextResolver.resolve({
                            request,
                            reply,
                        });

                    const body =
                        parseReasonRequest(
                            request.body,
                        );

                    return input.membershipApi.suspendMembership(
                        request.params.membershipId,
                        body,
                        context,
                    );
                },
            });
        },
    );
}

async function registerReactivateMembershipRoute(
    input: RegisterMembershipRoutesInput,
): Promise<void> {
    input.app.post<{
        Params: MembershipIdParams;
    }>(
        "/api/v1/membership/:membershipId/reactivate",
        async (
            request,
            reply,
        ) => {
            return executeMembershipRoute({
                request,
                reply,
                route:
                    "membership.reactivate-membership",
                failureMessage:
                    "Membership reactivation failed.",
                execute: async () => {
                    const context =
                        await input.contextResolver.resolve({
                            request,
                            reply,
                        });

                    return input.membershipApi.reactivateMembership(
                        request.params.membershipId,
                        context,
                    );
                },
            });
        },
    );
}

async function registerArchiveMembershipRoute(
    input: RegisterMembershipRoutesInput,
): Promise<void> {
    input.app.post<{
        Params: MembershipIdParams;
    }>(
        "/api/v1/membership/:membershipId/archive",
        async (
            request,
            reply,
        ) => {
            return executeMembershipRoute({
                request,
                reply,
                route:
                    "membership.archive-membership",
                failureMessage:
                    "Membership archival failed.",
                execute: async () => {
                    const context =
                        await input.contextResolver.resolve({
                            request,
                            reply,
                        });

                    const body =
                        parseReasonRequest(
                            request.body,
                        );

                    return input.membershipApi.archiveMembership(
                        request.params.membershipId,
                        body,
                        context,
                    );
                },
            });
        },
    );
}

// -----------------------------------------------------------------------------
// MEMBERSHIP CONTEXT ROUTES
// -----------------------------------------------------------------------------

async function registerCurrentMembershipContextRoute(
    input: RegisterMembershipRoutesInput,
): Promise<void> {
    input.app.get(
        "/api/v1/membership/current",
        async (
            request,
            reply,
        ) => {
            return executeMembershipRoute({
                request,
                reply,
                route:
                    "membership.current-context",
                failureMessage:
                    "Membership context resolution failed.",
                execute: async () => {
                    const context =
                        await input.contextResolver.resolve({
                            request,
                            reply,
                        });

                    const identityId =
                        context.actor.actorId;

                    return input.membershipApi.getCurrentContext(
                        identityId,
                        context,
                    );
                },
            });
        },
    );
}

async function registerSwitchMembershipContextRoute(
    input: RegisterMembershipRoutesInput,
): Promise<void> {
    input.app.post(
        "/api/v1/membership/context",
        async (
            request,
            reply,
        ) => {
            return executeMembershipRoute({
                request,
                reply,
                route:
                    "membership.switch-context",
                failureMessage:
                    "Membership context switch failed.",
                execute: async () => {
                    const context =
                        await input.contextResolver.resolve({
                            request,
                            reply,
                        });

                    const identityId =
                        context.actor.actorId;

                    const body =
                        parseSwitchMembershipContextRequest(
                            request.body,
                        );

                    return input.membershipApi.switchMembershipContext(
                        identityId,
                        body,
                        context,
                    );
                },
            });
        },
    );
}

// -----------------------------------------------------------------------------
// QUERY ROUTES


async function registerListMembershipsForProviderRoute(
    input: RegisterMembershipRoutesInput,
): Promise<void> {
    input.app.get(
        "/api/v1/membership/memberships",
        async (
            request,
            reply,
        ) => {
            return executeMembershipRoute({
                request,
                reply,
                route:
                    "membership.provider-list-memberships",
                failureMessage:
                    "Provider Membership listing failed.",
                execute: async () => {
                    const resolved =
                        await input.providerReadSecurityResolver.resolvePlatform({
                            request,
                            reply,
                        });

                    const query =
                        parseListMembershipsForProviderRequest(
                            request.query,
                        );

                    return input.membershipApi.listMembershipsForProvider(
                        query,
                        resolved.context,
                        resolved.security,
                    );
                },
            });
        },
    );
}


// -----------------------------------------------------------------------------

async function registerGetMembershipRoute(
    input: RegisterMembershipRoutesInput,
): Promise<void> {
    input.app.get<{
        Params: MembershipIdParams;
    }>(
        "/api/v1/membership/:membershipId",
        async (
            request,
            reply,
        ) => {
            return executeMembershipRoute({
                request,
                reply,
                route:
                    "membership.get-membership",
                failureMessage:
                    "Membership lookup failed.",
                execute: async () => {
                    const context =
                        await input.contextResolver.resolve({
                            request,
                            reply,
                        });

                    return input.membershipApi.getMembership(
                        request.params.membershipId,
                        context,
                    );
                },
            });
        },
    );
}

async function registerListTenantMembershipsRoute(
    input: RegisterMembershipRoutesInput,
): Promise<void> {
    input.app.get<{
        Params: TenantIdParams;
    }>(
        "/api/v1/membership/tenant/:tenantId",
        async (
            request,
            reply,
        ) => {
            return executeMembershipRoute({
                request,
                reply,
                route:
                    "membership.list-tenant-memberships",
                failureMessage:
                    "Tenant Membership lookup failed.",
                execute: async () => {
                    const context =
                        await input.contextResolver.resolve({
                            request,
                            reply,
                        });

                    return input.membershipApi.listTenantMemberships(
                        request.params.tenantId,
                        context,
                    );
                },
            });
        },
    );
}

// -----------------------------------------------------------------------------
// SHARED ROUTE EXECUTION
// -----------------------------------------------------------------------------

interface ExecuteMembershipRouteInput {
    readonly request: FastifyRequest;
    readonly reply: FastifyReply;
    readonly route: string;
    readonly failureMessage: string;
    readonly statusCode?: number;
    readonly execute: () => Promise<unknown>;
}

async function executeMembershipRoute(
    input: ExecuteMembershipRouteInput,
): Promise<unknown> {
    try {
        const result =
            await input.execute();

        return input.reply
            .status(
                input.statusCode ?? 200,
            )
            .send(result);
    } catch (error) {
        input.request.log.error(
            {
                requestId:
                    input.request.id,
                route:
                    input.route,
                error:
                    serializeError(error),
            },
            input.failureMessage,
        );

        const translated =
            translateMembershipHttpError(
                error,
            );

        return input.reply
            .status(
                translated.statusCode,
            )
            .send(
                translated.body,
            );
    }
}

// -----------------------------------------------------------------------------
// ERROR SERIALIZATION
// -----------------------------------------------------------------------------

function serializeError(
    error: unknown,
): Record<string, unknown> {
    if (error instanceof Error) {
        return {
            name:
                error.name,
            message:
                error.message,
            stack:
                error.stack,
        };
    }

    return {
        value:
            error,
    };
}

// -----------------------------------------------------------------------------
// ROUTE PARAMETERS
// -----------------------------------------------------------------------------

interface MembershipIdParams {
    readonly membershipId: string;
}

interface InvitationIdParams {
    readonly invitationId: string;
}

interface TenantIdParams {
    readonly tenantId: string;
}

async function registerExpireInvitationRoute(input: RegisterMembershipRoutesInput): Promise<void> {
 input.app.post<{Params: InvitationIdParams}>("/api/v1/membership/invitations/:invitationId/expire", async(request,reply)=>executeMembershipRoute({request,reply,route:"membership.expire-invitation",failureMessage:"Invitation expiration failed.",execute:async()=>input.membershipApi.expireInvitation(request.params.invitationId,await input.contextResolver.resolve({request,reply}))}));
}
async function registerGetInvitationRoute(input: RegisterMembershipRoutesInput): Promise<void> {
 input.app.get<{Params: InvitationIdParams}>("/api/v1/membership/invitations/:invitationId", async(request,reply)=>executeMembershipRoute({request,reply,route:"membership.get-invitation",failureMessage:"Invitation lookup failed.",execute:async()=>input.membershipApi.getInvitation(request.params.invitationId,await input.contextResolver.resolve({request,reply}))}));
}
async function registerListTenantInvitationsRoute(input: RegisterMembershipRoutesInput): Promise<void> {
 input.app.get<{Params:{tenantId:string};Querystring:{status?:import("../state").InvitationStatus}}>("/api/v1/membership/tenants/:tenantId/invitations", async(request,reply)=>executeMembershipRoute({request,reply,route:"membership.list-tenant-invitations",failureMessage:"Invitation listing failed.",execute:async()=>input.membershipApi.listTenantInvitations(request.params.tenantId,{status:request.query.status},await input.contextResolver.resolve({request,reply}))}));
}
