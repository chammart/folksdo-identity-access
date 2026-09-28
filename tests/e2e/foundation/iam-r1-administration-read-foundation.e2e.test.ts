// tests/e2e/foundation/iam-r1-administration-read-foundation.e2e.test.ts
// -----------------------------------------------------------------------------
// IAM R1 ADMINISTRATION READ FOUNDATION E2E CERTIFICATION
// -----------------------------------------------------------------------------
// Release-level certification for the R1 administration read contract.
//
// Proves through the real IAM HTTP runtime:
//   • Provider Identity Search
//   • Provider Membership Search
//   • Role Usage Queries
//   • Tenant People Projection
//   • Provider IAM 360
//   • Tenant Person Detail
//   • tenant isolation / cross-tenant denial
//
// No HTTP mocks. Capability state remains owned by Identity, Membership, Access.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";

import {
    describe,
    expect,
    it,
} from "@jest/globals";

import {
    grantProviderIdentityReads,
} from "../../../services/identity/tests/integration/identity-integration-fixtures";

import {
    getIamIntegrationRuntime,
} from "../../integration/support/iam-integration-runtime";

import {
    accessHttp,
    createAccessAdministrativeContext,
} from "../access/support/access-authenticated-fixtures";

describe(
    "IAM R1 Administration Read Foundation",
    () => {
        it(
            "certifies provider and tenant administration reads across Identity, Membership, and Access",
            async () => {
                const certification =
                    await createAccessAdministrativeContext();

                await grantProviderIdentityReads(
                    certification.identity,
                );

                const runtime =
                    await getIamIntegrationRuntime();

                const role =
                    await accessHttp(
                        certification.sessionId,
                        "POST",
                        "/roles",
                        {
                            key:
                                `r1-administration-${randomUUID()}`,
                            name:
                                "R1 Administration Certification Role",
                            description:
                                "Role used by the R1 administration release gate.",
                            type:
                                "tenant",
                            tenantId:
                                certification.tenantId,
                            permissionIds:
                                [],
                        },
                    );

                expect(role.statusCode).toBe(201);

                const roleId =
                    String(role.json().roleId);

                const assignment =
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

                expect(assignment.statusCode).toBe(201);

                const providerIdentities =
                    await runtime.server.app.inject({
                        method: "GET",
                        url: `/api/v1/identities?search=${encodeURIComponent(
                            certification.identity.email,
                        )}&status=active&offset=0&limit=10`,
                        headers: authorization(certification.sessionId),
                    });

                expect(providerIdentities.statusCode).toBe(200);
                expect(providerIdentities.json()).toMatchObject({
                    items: expect.arrayContaining([
                        expect.objectContaining({
                            userId:
                                certification.identity.userId,
                            status:
                                "active",
                        }),
                    ]),
                    total: expect.any(Number),
                    offset: 0,
                    limit: 10,
                });
                expect(providerIdentities.body).not.toContain("providerCredentialId");
                expect(providerIdentities.body).not.toContain("password");

                const providerMemberships =
                    await runtime.server.app.inject({
                        method: "GET",
                        url: `/api/v1/membership/memberships?identityId=${encodeURIComponent(
                            certification.identity.userId,
                        )}&status=active&offset=0&limit=10`,
                        headers: authorization(certification.sessionId),
                    });

                expect(providerMemberships.statusCode).toBe(200);
                expect(providerMemberships.json()).toMatchObject({
                    items: expect.arrayContaining([
                        expect.objectContaining({
                            membershipId:
                                certification.membershipId,
                            identityId:
                                certification.identity.userId,
                            tenantId:
                                certification.tenantId,
                            status:
                                "active",
                        }),
                    ]),
                    total: expect.any(Number),
                    offset: 0,
                    limit: 10,
                });

                const roleUsage =
                    await accessHttp(
                        certification.sessionId,
                        "GET",
                        `/role-assignments?roleId=${encodeURIComponent(
                            roleId,
                        )}&status=active&offset=0&limit=10`,
                    );

                expect(roleUsage.statusCode).toBe(200);
                expect(roleUsage.json()).toMatchObject({
                    items: expect.arrayContaining([
                        expect.objectContaining({
                            roleId,
                            membershipId:
                                certification.membershipId,
                            tenantId:
                                certification.tenantId,
                            status:
                                "active",
                        }),
                    ]),
                    total: expect.any(Number),
                    offset: 0,
                    limit: 10,
                });
                expect(roleUsage.json().total).toBeGreaterThanOrEqual(1);

                const tenantPeople =
                    await runtime.server.app.inject({
                        method: "GET",
                        url: `/api/v1/tenants/${encodeURIComponent(
                            certification.tenantId,
                        )}/people?search=${encodeURIComponent(
                            certification.identity.userId,
                        )}&offset=0&limit=10`,
                        headers: authorization(certification.sessionId),
                    });

                expect(tenantPeople.statusCode).toBe(200);
                expect(tenantPeople.json()).toMatchObject({
                    items: expect.arrayContaining([
                        expect.objectContaining({
                            identity: expect.objectContaining({
                                userId:
                                    certification.identity.userId,
                            }),
                            membership: expect.objectContaining({
                                membershipId:
                                    certification.membershipId,
                                tenantId:
                                    certification.tenantId,
                            }),
                            roles: expect.arrayContaining([
                                expect.objectContaining({ roleId }),
                            ]),
                            access: expect.objectContaining({
                                activeRoleCount:
                                    expect.any(Number),
                            }),
                        }),
                    ]),
                    total: expect.any(Number),
                    offset: 0,
                    limit: 10,
                });

                const providerIam360 =
                    await runtime.server.app.inject({
                        method: "GET",
                        url: `/api/v1/admin/identities/${encodeURIComponent(
                            certification.identity.userId,
                        )}/iam-360`,
                        headers: authorization(certification.sessionId),
                    });

                expect(providerIam360.statusCode).toBe(200);
                expect(providerIam360.json()).toMatchObject({
                    identity: expect.objectContaining({
                        userId:
                            certification.identity.userId,
                    }),
                    memberships: expect.arrayContaining([
                        expect.objectContaining({
                            membership: expect.objectContaining({
                                membershipId:
                                    certification.membershipId,
                                tenantId:
                                    certification.tenantId,
                            }),
                            roles: expect.arrayContaining([
                                expect.objectContaining({ roleId }),
                            ]),
                            directAccess:
                                expect.any(Array),
                            effectiveAccessSummary:
                                expect.objectContaining({
                                    activeRoleCount:
                                        expect.any(Number),
                                    activeDirectGrantCount:
                                        expect.any(Number),
                                    activeDirectDenyCount:
                                        expect.any(Number),
                                }),
                        }),
                    ]),
                    security: expect.objectContaining({
                        userId:
                            certification.identity.userId,
                        emailVerified:
                            expect.any(Boolean),
                        sessions: expect.objectContaining({
                            total:
                                expect.any(Number),
                            active:
                                expect.any(Number),
                        }),
                    }),
                });
                expect(providerIam360.body).not.toContain("providerCredentialId");
                expect(providerIam360.body).not.toContain("password");
                expect(providerIam360.body).not.toContain("token");

                const tenantPerson =
                    await runtime.server.app.inject({
                        method: "GET",
                        url: `/api/v1/tenants/${encodeURIComponent(
                            certification.tenantId,
                        )}/people/${encodeURIComponent(
                            certification.identity.userId,
                        )}`,
                        headers: authorization(certification.sessionId),
                    });

                expect(tenantPerson.statusCode).toBe(200);
                expect(tenantPerson.json()).toMatchObject({
                    identity: expect.objectContaining({
                        userId:
                            certification.identity.userId,
                    }),
                    membership: expect.objectContaining({
                        membership: expect.objectContaining({
                            membershipId:
                                certification.membershipId,
                            tenantId:
                                certification.tenantId,
                        }),
                        roles: expect.arrayContaining([
                            expect.objectContaining({ roleId }),
                        ]),
                    }),
                    security: expect.objectContaining({
                        userId:
                            certification.identity.userId,
                    }),
                });

                const unrelatedTenantId =
                    `tenant_${randomUUID()}`;

                const crossTenantPeople =
                    await runtime.server.app.inject({
                        method: "GET",
                        url: `/api/v1/tenants/${encodeURIComponent(
                            unrelatedTenantId,
                        )}/people`,
                        headers: authorization(certification.sessionId),
                    });

                expect(crossTenantPeople.statusCode).toBe(403);

                const crossTenantPerson =
                    await runtime.server.app.inject({
                        method: "GET",
                        url: `/api/v1/tenants/${encodeURIComponent(
                            unrelatedTenantId,
                        )}/people/${encodeURIComponent(
                            certification.identity.userId,
                        )}`,
                        headers: authorization(certification.sessionId),
                    });

                expect(crossTenantPerson.statusCode).toBe(403);
            },
        );
    },
);

function authorization(
    sessionId: string,
): { readonly authorization: string } {
    return {
        authorization:
            `Bearer ${sessionId}`,
    };
}
