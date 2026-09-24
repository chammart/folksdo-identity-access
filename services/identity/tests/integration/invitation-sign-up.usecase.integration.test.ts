// services/identity/tests/integration/invitation-sign-up.usecase.integration.test.ts
// -----------------------------------------------------------------------------
// INVITATION SIGNUP USE CASE INTEGRATION TEST
// -----------------------------------------------------------------------------

import {
    describe,
    expect,
    it,
} from "@jest/globals";

import {
    expectIamOutboxCommitted,
} from "../../../../tests/integration/support/iam-outbox-assertions";

import {
    getIamIntegrationRuntime,
} from "../../../../tests/integration/support/iam-integration-runtime";

import {
    createPendingIdentity,
    expectNoSensitivePersistence,
} from "./identity-integration-fixtures";

describe("Invitation SignUp™ use case", () => {
    it("creates canonical Identity state and commits its invitation-redemption request", async () => {
        const identity =
            await createPendingIdentity();

        const runtime =
            await getIamIntegrationRuntime();

        await expect(
            runtime.database.database
                .collection("identity_users")
                .findOne({ userId: identity.userId }),
        ).resolves.toMatchObject({
            userId:
                identity.userId,
            email:
                identity.email,
            status:
                "pending_email_verification",
            emailVerified:
                false,
        });

        for (const collectionName of [
            "identity_user_profiles",
            "identity_credentials",
            "identity_sessions",
            "identity_email_verifications",
        ]) {
            await expect(
                runtime.database.database
                    .collection(collectionName)
                    .countDocuments({ userId: identity.userId }),
            ).resolves.toBe(1);
        }

        await expectIamOutboxCommitted({
            database:
                runtime.database,
            subject:
                "identity.email_verification.requested",
        });

        await expectIamOutboxCommitted({
            database:
                runtime.database,
            subject:
                "identity.invitation_redemption.requested",
        });

        await expectNoSensitivePersistence([
            identity.password,
            identity.invitationToken,
            identity.verificationToken,
        ]);
    });
});
