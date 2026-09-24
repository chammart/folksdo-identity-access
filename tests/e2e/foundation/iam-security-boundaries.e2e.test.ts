// tests/e2e/foundation/iam-security-boundaries.e2e.test.ts
// -----------------------------------------------------------------------------
// IAM AUTHENTICATION, AUTHORIZATION, VALIDATION & CONFLICTS — E2E CERTIFICATION
// -----------------------------------------------------------------------------
// Certifies fail-closed behavior across the real IAM public HTTP boundary.
//
// Coverage:
//   • invalid authentication is rejected before protected Access execution
//   • authenticated malformed Access input maps to validation_error
//   • insufficient Access authority is denied
//   • Membership Context cannot switch to another Identity's Membership
//   • invalid Membership lifecycle transitions map to conflict
//
// Boundary:
//   • exercises registered Fastify HTTP routes
//   • uses real Identity authentication and Membership Context resolution
//   • uses real Access authorization
//   • uses real Engine, MongoDB, NATS, outbox and Processing runtime
//   • uses no HTTP mocks, direct reactions, or manufactured events
// -----------------------------------------------------------------------------

import {
    describe,
    expect,
    it,
} from "@jest/globals";

import {
    ACCESS_ADMINISTRATIVE_PERMISSIONS,
} from "../../../services/access/src/authorization";

import {
    createCertifiedMembership,
    createMembershipCertificationContext,
    membershipGet,
    membershipPost,
} from "../../../services/membership/tests/integration/membership-integration-fixtures";

import {
    getIamIntegrationRuntime,
} from "../../integration/support/iam-integration-runtime";

import {
    accessHttp,
    createAccessAdministrativeContext,
} from "../access/support/access-authenticated-fixtures";

describe(
    "IAM authentication, authorization, validation and conflicts",
    () => {
        it(
            "rejects an invalid authenticated session at the protected Access boundary",
            async () => {
                const response =
                    await accessHttp(
                        "session_does_not_exist",
                        "GET",
                        "/permissions",
                    );

                expect(
                    response.statusCode,
                ).toBe(
                    401,
                );

                expect(
                    response.json(),
                ).toMatchObject({
                    error: {
                        code:
                            expect.any(
                                String,
                            ),
                    },
                });
            },
        );

        it(
            "maps malformed authenticated Access input to validation_error",
            async () => {
                const certification =
                    await createAccessAdministrativeContext();

                const response =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        "/roles",
                        {},
                    );

                expect(
                    response.statusCode,
                ).toBe(
                    400,
                );

                expect(
                    response.json(),
                ).toMatchObject({
                    error: {
                        code:
                            "access_request_invalid",
                    },
                });
            },
        );

        it(
            "denies an authenticated actor after its required Access authority is removed",
            async () => {
                const certification =
                    await createAccessAdministrativeContext();

                const runtime =
                    await getIamIntegrationRuntime();

                await runtime.database.database
                    .collection(
                        "access_permission_assignments",
                    )
                    .deleteMany({
                        identityId:
                            certification.identity.userId,

                        membershipId:
                            certification.membershipId,

                        tenantId:
                            certification.tenantId,

                        permissionId:
                            ACCESS_ADMINISTRATIVE_PERMISSIONS
                                .permissionList
                                .permissionId,
                    });

                const response =
                    await accessHttp(
                        certification.sessionId,
                        "GET",
                        "/permissions",
                    );

                expect(
                    response.statusCode,
                ).toBe(
                    403,
                );

                expect(
                    response.json(),
                ).toMatchObject({
                    error: {
                        code:
                            expect.any(
                                String,
                            ),
                    },
                });
            },
        );

        it(
            "rejects switching Membership Context to another Identity's Membership",
            async () => {
                const owner =
                    await createMembershipCertificationContext();

                const foreign =
                    await createMembershipCertificationContext();

                const runtime =
                    await getIamIntegrationRuntime();

                const response =
                    await membershipPost(
                        runtime,
                        "/api/v1/membership/context",
                        {
                            membershipId:
                                foreign.membershipId,
                        },
                        owner.sessionId,
                    );

                expect(
                    response.statusCode,
                ).toBe(
                    403,
                );

                const current =
                    await membershipGet(
                        runtime,
                        "/api/v1/membership/current",
                        owner.sessionId,
                    );

                expect(
                    current.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    current.json(),
                ).toMatchObject({
                    activeMembershipId:
                        owner.membershipId,

                    activeTenantId:
                        owner.tenantId,
                });
            },
        );

        it(
            "maps an invalid Membership lifecycle transition to conflict",
            async () => {
                const certification =
                    await createMembershipCertificationContext();

                const membership =
                    await createCertifiedMembership(
                        certification,
                    );

                const membershipId =
                    String(
                        membership.membershipId,
                    );

                const runtime =
                    await getIamIntegrationRuntime();

                const firstActivation =
                    await membershipPost(
                        runtime,
                        `/api/v1/membership/${membershipId}/activate`,
                        {},
                        certification.sessionId,
                    );

                expect(
                    firstActivation.statusCode,
                ).toBe(
                    200,
                );

                const duplicateActivation =
                    await membershipPost(
                        runtime,
                        `/api/v1/membership/${membershipId}/activate`,
                        {},
                        certification.sessionId,
                    );

                expect(
                    duplicateActivation.statusCode,
                ).toBe(
                    409,
                );

                expect(
                    duplicateActivation.json(),
                ).toMatchObject({
                    error: {
                        code:
                            expect.any(
                                String,
                            ),
                    },
                });
            },
        );
    },
);
