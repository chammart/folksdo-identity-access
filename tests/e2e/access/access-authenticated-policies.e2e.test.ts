// tests/e2e/access/access-authenticated-policies.e2e.test.ts
// -----------------------------------------------------------------------------
// ACCESS™ AUTHENTICATED POLICY HTTP CERTIFICATION
// -----------------------------------------------------------------------------
// Exercises Tenant Policy lifecycle through the real public HTTP API.
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
    "Access™ authenticated Policy HTTP behavior",
    () => {
        it(
            "creates, updates, archives, and lists a Tenant Policy",
            async () => {
                const certification =
                    await createAccessAdministrativeContext();

                const runtime =
                    await getIamIntegrationRuntime();

                const created =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        "/policies",
                        {
                            key:
                                "certification-policy",
                            name:
                                "Certification Policy",
                            description:
                                "Authenticated Policy HTTP certification.",
                            scope:
                                "tenant",
                            tenantId:
                                certification.tenantId,
                            permissionKeys:
                                [],
                            resourceTypes:
                                ["membership"],
                            effect:
                                "deny",
                            priority:
                                100,
                            conditions:
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
                    name:
                        "Certification Policy",
                    scope:
                        "tenant",
                    tenantId:
                        certification.tenantId,
                    version:
                        1,
                    lifecycleStatus:
                        "draft",
                });

                const policyId =
                    String(
                        created.json().policyId,
                    );

                const updated =
                    await accessHttp(
                        certification.sessionId,
                        "PATCH",
                        `/policies/${policyId}`,
                        {
                            name:
                                "Updated Certification Policy",
                            description:
                                "Updated through authenticated HTTP.",
                            permissionKeys:
                                [],
                            resourceTypes:
                                ["membership"],
                            effect:
                                "deny",
                            priority:
                                50,
                            conditions:
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
                    policyId,
                    name:
                        "Updated Certification Policy",
                    tenantId:
                        certification.tenantId,
                    version:
                        2,
                    lifecycleStatus:
                        "draft",
                });

                const archived =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        `/policies/${policyId}/archive`,
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
                    policyId,
                    name:
                        "Updated Certification Policy",
                    tenantId:
                        certification.tenantId,
                    lifecycleStatus:
                        "archived",
                });

                const listed =
                    await accessHttp(
                        certification.sessionId,
                        "GET",
                        "/policies",
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
                            policyId,
                            name:
                                "Updated Certification Policy",
                            tenantId:
                                certification.tenantId,
                            lifecycleStatus:
                                "archived",
                        }),
                    ]),
                );

                await expect(
                    runtime.database.database
                        .collection(
                            "access_authorization_policies",
                        )
                        .findOne({
                            policyId,
                        }),
                ).resolves.toMatchObject({
                    policyId,
                    name:
                        "Updated Certification Policy",
                    tenantId:
                        certification.tenantId,
                    scope:
                        "tenant",
                    lifecycleStatus:
                        "archived",
                });

                await expectIamE2eOutboxCommitted({
                    database:
                        runtime.database,
                    subject:
                        "access.policy.archived",
                });
            },
        );
    },
);
