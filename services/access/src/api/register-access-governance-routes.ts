// services/access/src/api/register-access-governance-routes.ts
// -----------------------------------------------------------------------------
// ACCESS GOVERNANCE ROUTES
// -----------------------------------------------------------------------------
// Administration workflows composed exclusively from Access-owned API commands.
// -----------------------------------------------------------------------------

import type { FastifyInstance } from "fastify";
import type { AccessApi, AccessApiContextResolver } from "./access-api-contracts";

export async function registerAccessGovernanceRoutes(input: {
    readonly server: FastifyInstance;
    readonly api: AccessApi;
    readonly contextResolver: AccessApiContextResolver;
}): Promise<void> {
    input.server.get("/api/v1/access/direct-access/exceptions", async (request) => {
        const context = await input.contextResolver.resolve(request);
        const query = request.query as Record<string, unknown>;
        const result = await input.api.listPermissionAssignments(
            {
                tenantId: typeof query.tenantId === "string" ? query.tenantId : undefined,
                status: "active",
                offset: 0,
                limit: 100,
            } as never,
            context,
        );
        const now = Date.now();
        return {
            items: result.items.map(assignment => ({
                ...assignment,
                governance: {
                    justification: assignment.justification,
                    reviewAt: assignment.reviewAt,
                    reviewStatus:
                        assignment.reviewAt !== undefined && Date.parse(assignment.reviewAt) <= now
                            ? "due"
                            : "current",
                },
            })),
        };
    });

    input.server.post("/api/v1/access/role-assignments/bulk-remove", async (request, reply) => {
        const context = await input.contextResolver.resolve(request);
        const body = request.body as { items?: readonly { assignmentId?: string; reason?: string }[] };
        const items = Array.isArray(body?.items) ? body.items.slice(0, 100) : [];
        const results = [];
        for (let index = 0; index < items.length; index += 1) {
            const item = items[index];
            try {
                const assignment = await input.api.removeRole(
                    {
                        assignmentId: String(item.assignmentId ?? ""),
                        reason: item.reason,
                    },
                    context,
                );
                results.push({ index, outcome: "removed", assignment });
            } catch (error) {
                const code = error instanceof Error && "code" in error ? String(error.code) : "operation_failed";
                results.push({ index, outcome: code === "role_assignment_not_active" ? "existing" : "failed", code });
            }
        }
        return reply.status(200).send({ items: results });
    });

    input.server.post("/api/v1/access/role-assignments/bulk", async (request, reply) => {
        const context = await input.contextResolver.resolve(request);
        const body = request.body as { items?: readonly Record<string, unknown>[] };
        const items = Array.isArray(body?.items) ? body.items.slice(0, 100) : [];
        const results = [];
        for (let index = 0; index < items.length; index += 1) {
            try {
                const assignment = await input.api.assignRole(items[index] as never, context);
                results.push({ index, outcome: "assigned", assignment });
            } catch (error) {
                const code = error instanceof Error && "code" in error ? String(error.code) : "operation_failed";
                results.push({ index, outcome: code === "role_assignment_already_exists" ? "existing" : "failed", code });
            }
        }
        return reply.status(200).send({ items: results });
    });
}
