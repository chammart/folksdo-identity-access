// tests/e2e/foundation/iam-runtime-recovery.e2e.test.ts
// -----------------------------------------------------------------------------
// IAM RESTART, PERSISTENCE, REPLAY & IDEMPOTENCY — E2E CERTIFICATION
// -----------------------------------------------------------------------------
// Certifies durable IAM behavior across a real runtime shutdown/recreation.
//
// Coverage:
//   • Identity state and authenticated session survive runtime restart
//   • Membership Context survives runtime restart
//   • replayable Engine event history survives runtime restart
//   • restart/reprocessing preserves one canonical Access projection
//
// Boundary:
//   • exercises the real Fastify + IAM runtime
//   • preserves the isolated Mongo database across the certified restart
//   • uses real Engine, outbox, NATS and Processing runtime
//   • uses no HTTP mocks, direct reactions, or manufactured events
// -----------------------------------------------------------------------------

import {
    describe,
    expect,
    it,
} from "@jest/globals";

import {
    createActiveIdentity,
    getJson,
    prepareProviderIdentityReadContext,
    signInIdentity,
} from "../../../services/identity/tests/integration/identity-integration-fixtures";

import {
    membershipGet,
} from "../../../services/membership/tests/integration/membership-integration-fixtures";

import {
    getIamIntegrationRuntime,
    restartIamIntegrationRuntime,
} from "../../integration/support/iam-integration-runtime";

import {
    expectKnownIdentity,
} from "../../integration/reactions/reaction-certification-fixtures";

describe(
    "IAM restart, persistence, replay and idempotency",
    () => {
        it(
            "preserves durable IAM state, replayable history and canonical projections across runtime restart",
            async () => {
                const identity =
                    await createActiveIdentity();

                const sessionId =
                    await signInIdentity(
                        identity,
                    );

                await prepareProviderIdentityReadContext(
                    identity,
                );

                await expectKnownIdentity(
                    identity.userId,
                    "active",
                );

                const beforeRestart =
                    await getIamIntegrationRuntime();

                const eventsBeforeRestart =
                    await beforeRestart.database
                        .findEvents({
                            aggregateId:
                                identity.userId,
                        });

                expect(
                    eventsBeforeRestart.length,
                ).toBeGreaterThan(
                    0,
                );

                await expect(
                    beforeRestart.database.database
                        .collection(
                            "access_known_identities",
                        )
                        .countDocuments({
                            identityId:
                                identity.userId,
                        }),
                ).resolves.toBe(
                    1,
                );

                const restarted =
                    await restartIamIntegrationRuntime();

                const currentUser =
                    await getJson(
                        restarted,
                        "/api/v1/identity/me",
                        sessionId,
                    );

                expect(
                    currentUser.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    currentUser.json(),
                ).toMatchObject({
                    userId:
                        identity.userId,
                });

                const currentMembership =
                    await membershipGet(
                        restarted,
                        "/api/v1/membership/current",
                        sessionId,
                    );

                expect(
                    currentMembership.statusCode,
                ).toBe(
                    200,
                );

                expect(
                    currentMembership.json(),
                ).toMatchObject({
                    activeMembershipId:
                        identity.membershipId,

                    activeTenantId:
                        identity.tenantId,
                });

                const eventsAfterRestart =
                    await restarted.database
                        .findEvents({
                            aggregateId:
                                identity.userId,
                        });

                expect(
                    eventsAfterRestart.map(
                        event =>
                            String(
                                event._id,
                            ),
                    ),
                ).toEqual(
                    eventsBeforeRestart.map(
                        event =>
                            String(
                                event._id,
                            ),
                    ),
                );

                await expectKnownIdentity(
                    identity.userId,
                    "active",
                );

                await expect(
                    restarted.database.database
                        .collection(
                            "access_known_identities",
                        )
                        .countDocuments({
                            identityId:
                                identity.userId,
                        }),
                ).resolves.toBe(
                    1,
                );
            },
            30_000,
        );
    },
);
