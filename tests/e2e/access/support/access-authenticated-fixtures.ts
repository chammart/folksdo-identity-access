// tests/e2e/access/support/access-authenticated-fixtures.ts
// -----------------------------------------------------------------------------
// ACCESS AUTHENTICATED HTTP CERTIFICATION FIXTURES
// -----------------------------------------------------------------------------
// Uses a real Identity session and canonical Access authorization projections.
// Administrative grants are test fixture state, never HTTP or authorization mocks.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { ACCESS_ADMINISTRATIVE_PERMISSIONS } from "../../../../services/access/src/authorization";
import {
    createMembershipCertificationContext,
} from "../../../../services/membership/tests/integration/membership-integration-fixtures";
import { getIamIntegrationRuntime } from "../../../integration/support/iam-integration-runtime";

export async function createAccessAdministrativeContext() {
    const certification = await createMembershipCertificationContext();
    const runtime = await getIamIntegrationRuntime();
    const now = new Date().toISOString();

    for (const permission of Object.values(ACCESS_ADMINISTRATIVE_PERMISSIONS)) {
        await runtime.database.database.collection("access_permissions").updateOne(
            { permissionId: permission.permissionId },
            {
                $set: {
                    permissionId: permission.permissionId,
                    service: permission.service,
                    resource: permission.resource,
                    action: permission.action,
                    displayName: permission.permissionId,
                    description: `Allows ${permission.permissionId}.`,
                    classification: "administrative",
                    createdAt: now,
                },
            },
            { upsert: true },
        );

        await runtime.database.database.collection("access_permission_assignments").insertOne({
            assignmentId: `assignment_${randomUUID()}`,
            identityId: certification.identity.userId,
            membershipId: certification.membershipId,
            tenantId: certification.tenantId,
            permissionId: permission.permissionId,
            assignmentType: "grant",
            scope: { scopeType: "tenant" },
            status: "active",
            assignedBy: "system:access-e2e-certification",
            effectiveFrom: now,
            activatedAt: now,
            suspensionSources: [],
            createdAt: now,
            updatedAt: now,
        });
    }

    return certification;
}

export async function accessHttp(
    sessionId: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    url: string,
    payload?: Record<string, unknown>,
) {
    const runtime = await getIamIntegrationRuntime();
    return await runtime.server.app.inject({
        method,
        url: `/api/v1/access${url}`,
        headers: {
            authorization: `Bearer ${sessionId}`,
            "content-type": "application/json",
        },
        ...(payload === undefined ? {} : { payload }),
    });
}
