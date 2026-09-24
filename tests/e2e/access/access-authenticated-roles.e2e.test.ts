// tests/e2e/access/access-authenticated-roles.e2e.test.ts
// -----------------------------------------------------------------------------
// ACCESS™ AUTHENTICATED ROLE HTTP CERTIFICATION
// -----------------------------------------------------------------------------
// Exercises Tenant Role definition lifecycle through the real public HTTP API.
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
    "Access™ authenticated Role HTTP behavior",
    () => {
        it(
            "creates, reads, updates, archives, restores, and lists a Tenant Role",
            async () => {
                const certification =
                    await createAccessAdministrativeContext();

                const runtime =
                    await getIamIntegrationRuntime();

                const key =
                    `certification-role-${randomUUID()}`;

                const created =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        "/roles",
                        {
                            key,
                            name:
                                "Certification Role",
                            description:
                                "Authenticated Role HTTP certification.",
                            type:
                                "tenant",
                            tenantId:
                                certification.tenantId,
                            permissionIds:
                                [],
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
                    key,
                    name:
                        "Certification Role",
                    type:
                        "tenant",
                    tenantId:
                        certification.tenantId,
                    permissionIds:
                        [],
                    status:
                        "active",
                });

                const roleId =
                    String(
                        created.json().roleId,
                    );

                const read =
                    await accessHttp(
                        certification.sessionId,
                        "GET",
                        `/roles/${roleId}`,
                    );

                expect(
                    read.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    read.json(),
                ).toMatchObject({
                    roleId,
                    key,
                    status:
                        "active",
                });

                const updated =
                    await accessHttp(
                        certification.sessionId,
                        "PATCH",
                        `/roles/${roleId}`,
                        {
                            name:
                                "Updated Certification Role",
                            description:
                                "Updated through authenticated HTTP.",
                            permissionIds:
                                [],
                        },
                    );

                expect(
                    updated.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    updated.json(),
                ).toMatchObject({
                    roleId,
                    name:
                        "Updated Certification Role",
                    status:
                        "active",
                });

                const archived =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        `/roles/${roleId}/archive`,
                        {
                            reason:
                                "Certification archive.",
                        },
                    );

                expect(
                    archived.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    archived.json(),
                ).toMatchObject({
                    roleId,
                    status:
                        "archived",
                });

                const restored =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        `/roles/${roleId}/restore`,
                        {
                            reason:
                                "Certification restore.",
                        },
                    );

                expect(
                    restored.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    restored.json(),
                ).toMatchObject({
                    roleId,
                    status:
                        "active",
                });

                const listed =
                    await accessHttp(
                        certification.sessionId,
                        "GET",
                        "/roles",
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
                                roleId,
                                key,
                                tenantId:
                                    certification.tenantId,
                                status:
                                    "active",
                            }),
                        ]),
                    count:
                        expect.any(
                            Number,
                        ),
                });

                await expect(
                    runtime.database.database
                        .collection(
                            "access_roles",
                        )
                        .findOne({
                            roleId,
                        }),
                ).resolves.toMatchObject({
                    roleId,
                    key,
                    tenantId:
                        certification.tenantId,
                    lifecycleStatus:
                        "active",
                });

                await expectIamE2eOutboxCommitted({
                    database:
                        runtime.database,
                    subject:
                        "access.role.restored",
                });
            },
        );
    },
);
