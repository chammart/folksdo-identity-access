// apps/server/src/bootstrap/register-tenant-people-routes.ts
// -----------------------------------------------------------------------------
// TENANT PEOPLE ADMINISTRATION PROJECTION
// -----------------------------------------------------------------------------
// Thin IAM-host composition of Identity + Membership + Access read facts.
// No canonical state is owned here.
// -----------------------------------------------------------------------------

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
    AccessHttpError,
    translateAccessHttpError,
    type AccessApi,
    type AccessApiRequestContext,
} from "@folksdo-identity-access/access";
import {
    translateIdentityHttpError,
    type IdentityApi,
} from "@folksdo-identity-access/identity";
import {
    translateMembershipHttpError,
    type MembershipApi,
    type MembershipRouteContextResolver,
} from "@folksdo-identity-access/membership";

interface TenantPeopleParams { readonly tenantId: string; }
interface TenantPeopleQuery {
    readonly search?: string;
    readonly status?: "pending" | "active" | "suspended" | "archived";
    readonly offset?: string;
    readonly limit?: string;
}

export function registerTenantPeopleRoutes(input: {
    readonly app: FastifyInstance;
    readonly identityApi: IdentityApi;
    readonly membershipApi: MembershipApi;
    readonly accessApi: AccessApi;
    readonly contextResolver: MembershipRouteContextResolver;
}): void {
    input.app.get<{ Params: TenantPeopleParams; Querystring: TenantPeopleQuery }>(
        "/api/v1/tenants/:tenantId/people",
        async (request, reply) => execute(request, reply, async () => {
            const context = await input.contextResolver.resolve({ request, reply });
            const tenantId = request.params.tenantId;

            // Membership owns the tenant administrative boundary. This call
            // must succeed before any cross-capability composition occurs.
            const memberships = await input.membershipApi.listTenantMemberships(
                tenantId,
                context,
            );

            const actorMembership = memberships.find(
                membership => membership.identityId === context.actor.actorId
                    && membership.status === "active",
            );
            if (actorMembership === undefined) {
                throw new Error("Active administrative Membership context is unavailable.");
            }

            const accessContext: AccessApiRequestContext = {
                requestId: context.requestId,
                correlationId: context.correlationId,
                causationId: context.causationId,
                actor: { actorId: context.actor.actorId, actorType: "identity" },
                tenant: { tenantId, tenantType: "tenant" },
                membershipId: actorMembership.membershipId,
                permissions: [],
            };

            const assignments = await input.accessApi.listRoleAssignments(
                { tenantId, limit: 1000, offset: 0 },
                accessContext,
            );

            const people = await Promise.all(memberships.map(async membership => {
                const identity = await input.identityApi.getIdentityForTenantAdministration(
                    membership.identityId,
                    context,
                    {
                        scope: {
                            type: "tenant",
                            tenantId,
                            membershipId: actorMembership.membershipId,
                        },
                    },
                );
                const memberAssignments = assignments.items.filter(
                    assignment => assignment.membershipId === membership.membershipId,
                );
                const activeAssignments = memberAssignments.filter(
                    assignment => assignment.status === "active",
                );
                return {
                    identity: {
                        userId: identity.userId,
                        email: identity.email,
                        status: identity.status,
                        emailVerified: identity.emailVerified,
                    },
                    membership,
                    roles: activeAssignments.map(assignment => ({
                        roleId: assignment.roleId,
                        assignmentId: assignment.assignmentId,
                    })),
                    access: {
                        roleAssignmentCount: memberAssignments.length,
                        activeRoleCount: activeAssignments.length,
                    },
                };
            }));

            const search = request.query.search?.trim().toLowerCase();
            const filtered = people.filter(person => {
                if (request.query.status && person.membership.status !== request.query.status) return false;
                if (!search) return true;
                return person.identity.email.toLowerCase().includes(search)
                    || person.identity.userId.toLowerCase().includes(search)
                    || person.membership.membershipId.toLowerCase().includes(search);
            });
            const offset = parseBoundedInteger(request.query.offset, 0, 0, 100000);
            const limit = parseBoundedInteger(request.query.limit, 50, 1, 100);
            return {
                items: filtered.slice(offset, offset + limit),
                total: filtered.length,
                offset,
                limit,
            };
        }),
    );
}

function parseBoundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) throw new AccessHttpError(400, "validation_error", "Tenant People pagination is invalid.");
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new AccessHttpError(400, "validation_error", "Tenant People pagination is invalid.");
    return parsed;
}

async function execute(
    request: FastifyRequest,
    reply: FastifyReply,
    operation: () => Promise<unknown>,
): Promise<unknown> {
    try {
        return reply.status(200).send(await operation());
    } catch (error) {
        const membership = translateMembershipHttpError(error);
        const identity = translateIdentityHttpError(error);
        const access = translateAccessHttpError(error);
        const translations = [
            membership,
            identity,
            { statusCode: access.statusCode, body: access.toResponseBody() },
        ];
        const translated = translations.find(candidate => candidate.statusCode < 500)
            ?? membership;
        request.log.error({ requestId: request.id, route: "tenant-people", error }, "Tenant People lookup failed.");
        return reply.status(translated.statusCode).send(translated.body);
    }
}
