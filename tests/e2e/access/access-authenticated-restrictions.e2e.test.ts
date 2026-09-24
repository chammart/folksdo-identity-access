// tests/e2e/access/access-authenticated-restrictions.e2e.test.ts
// -----------------------------------------------------------------------------
// ACCESS™ AUTHENTICATED RESTRICTION HTTP CERTIFICATION
// -----------------------------------------------------------------------------
// Exercises Tenant Restriction lifecycle through the real public HTTP API.
// -----------------------------------------------------------------------------

import {
    describe,
    expect,
    it,
} from "@jest/globals";

import {
    getIamIntegrationRuntime,
} from "../../integration/support/iam-integration-runtime";

import {
    expectIamE2eOutboxCommitted,
} from "../support/iam-e2e-outbox-assertions";

import {
    accessHttp,
    createAccessAdministrativeContext,
} from "./support/access-authenticated-fixtures";

describe(
    "Access™ authenticated Restriction HTTP behavior",
    () => {
        it(
            "creates, lists, and removes a Permission Restriction",
            async () => {
                const certification =
                    await createAccessAdministrativeContext();

                const runtime =
                    await getIamIntegrationRuntime();

                const restrictedPermissionId =
                    "access.role.create";

                const created =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        "/restrictions",
                        {
                            targetType:
                                "permission",
                            targetId:
                                restrictedPermissionId,
                            tenantId:
                                certification.tenantId,
                            reasonCode:
                                "certification_restriction",
                            description:
                                "Authenticated Restriction HTTP certification.",
                        },
                    );

                expect(
                    created.statusCode,
                ).toBe(
                    201,
                );

                expect(
                    created.json(),
                ).toMatchObject({
                    tenantId:
                        certification.tenantId,
                    target: {
                        targetType:
                            "permission",
                        permissionId:
                            restrictedPermissionId,
                    },
                    restrictionReason:
                        "certification_restriction",
                    status:
                        "active",
                });

                const restrictionId =
                    String(
                        created.json().restrictionId,
                    );

                const listed =
                    await accessHttp(
                        certification.sessionId,
                        "GET",
                        "/restrictions",
                    );

                expect(
                    listed.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    listed.json(),
                ).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            restrictionId,
                            tenantId:
                                certification.tenantId,
                            target: {
                                targetType:
                                    "permission",
                                permissionId:
                                    restrictedPermissionId,
                            },
                            status:
                                "active",
                        }),
                    ]),
                );

                const removed =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        `/restrictions/${restrictionId}/remove`,
                        {
                            reason:
                                "Certification removal.",
                        },
                    );

                expect(
                    removed.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    removed.json(),
                ).toMatchObject({
                    restrictionId,
                    tenantId:
                        certification.tenantId,
                    status:
                        "removed",
                });

                await expect(
                    runtime.database.database
                        .collection(
                            "access_restrictions",
                        )
                        .findOne({
                            restrictionId,
                        }),
                ).resolves.toMatchObject({
                    restrictionId,
                    tenantId:
                        certification.tenantId,
                    target: {
                        targetType:
                            "permission",
                        permissionId:
                            restrictedPermissionId,
                    },
                    status:
                        "removed",
                });

                await expectIamE2eOutboxCommitted({
                    database:
                        runtime.database,
                    subject:
                        "access.restriction.removed",
                });
            },
        );
    },
);
