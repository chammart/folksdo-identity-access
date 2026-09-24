// tests/e2e/access/access-authenticated-role-assignments.e2e.test.ts
// -----------------------------------------------------------------------------
// ACCESS™ AUTHENTICATED ROLE ASSIGNMENT HTTP CERTIFICATION
// -----------------------------------------------------------------------------
// Exercises Tenant Role assignment lifecycle through the real public HTTP API.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";

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
    "Access™ authenticated Role Assignment HTTP behavior",
    () => {
        it(
            "assigns, lists, and removes a Tenant Role for an eligible Membership",
            async () => {
                const certification =
                    await createAccessAdministrativeContext();

                const runtime =
                    await getIamIntegrationRuntime();

                const role =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        "/roles",
                        {
                            key:
                                `certification-assignment-role-${randomUUID()}`,
                            name:
                                "Certification Assignment Role",
                            description:
                                "Role used for authenticated assignment certification.",
                            type:
                                "tenant",
                            tenantId:
                                certification.tenantId,
                            permissionIds:
                                [],
                        },
                    );

                expect(
                    role.statusCode,
                ).toBe(
                    201,
                );

                const roleId =
                    String(
                        role.json().roleId,
                    );

                const assigned =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        "/role-assignments",
                        {
                            roleId,
                            subjectType:
                                "membership",
                            subjectId:
                                certification.membershipId,
                            identityId:
                                certification.identity.userId,
                            membershipId:
                                certification.membershipId,
                            tenantId:
                                certification.tenantId,
                        },
                    );

                expect(
                    assigned.statusCode,
                ).toBe(
                    201,
                );

                expect(
                    assigned.json(),
                ).toMatchObject({
                    roleId,
                    membershipId:
                        certification.membershipId,
                    tenantId:
                        certification.tenantId,
                    status:
                        "active",
                });

                const assignmentId =
                    String(
                        assigned.json().assignmentId,
                    );

                const listed =
                    await accessHttp(
                        certification.sessionId,
                        "GET",
                        `/role-assignments?membershipId=${encodeURIComponent(
                            certification.membershipId,
                        )}`,
                    );

                expect(
                    listed.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    listed.json(),
                ).toMatchObject({
                    items:
                        expect.arrayContaining([
                            expect.objectContaining({
                                assignmentId,
                                roleId,
                                membershipId:
                                    certification.membershipId,
                                status:
                                    "active",
                            }),
                        ]),
                    count:
                        expect.any(
                            Number,
                        ),
                });

                const removed =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        `/role-assignments/${assignmentId}/remove`,
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
                    assignmentId,
                    roleId,
                    status:
                        "removed",
                });

                await expect(
                    runtime.database.database
                        .collection(
                            "access_role_assignments",
                        )
                        .findOne({
                            assignmentId,
                        }),
                ).resolves.toMatchObject({
                    assignmentId,
                    roleId,
                    membershipId:
                        certification.membershipId,
                    tenantId:
                        certification.tenantId,
                    status:
                        "removed",
                });

                await expectIamE2eOutboxCommitted({
                    database:
                        runtime.database,
                    subject:
                        "access.role.removed",
                });
            },
        );
    },
);
