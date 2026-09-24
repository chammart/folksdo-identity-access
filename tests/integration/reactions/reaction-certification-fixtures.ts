// tests/integration/reactions/reaction-certification-fixtures.ts
// -----------------------------------------------------------------------------
// REAL EVENT + REACTION CERTIFICATION FIXTURES
// -----------------------------------------------------------------------------
// All source events originate from real IAM use cases. Tests never invoke a
// reaction directly and never manufacture broker messages.
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";

import { getIamIntegrationRuntime } from "../support/iam-integration-runtime";
import { expectIamReactionState } from "../support/iam-reaction-assertions";
import {
    createMembershipCertificationContext,
    createCertifiedMembership,
} from "../../../services/membership/tests/integration/membership-integration-fixtures";
import {
    createActiveIdentity,
} from "../../../services/identity/tests/integration/identity-integration-fixtures";

export async function createRealActiveIdentity() {
    return await createActiveIdentity();
}

export async function createRealMembership(activate = false) {
    const certification = await createMembershipCertificationContext();
    const membership = await createCertifiedMembership(certification, activate);
    return { certification, membership };
}

export async function expectKnownIdentity(identityId: string, status: string): Promise<void> {
    const runtime = await getIamIntegrationRuntime();
    await expectIamReactionState({
        database: runtime.database,
        collectionName: "access_known_identities",
        filter: { identityId },
        expected: { identityId, status },
    });
}

export async function expectKnownMembership(input: {
    membershipId: string;
    identityId: string;
    tenantId: string;
    status: string;
}): Promise<void> {
    const runtime = await getIamIntegrationRuntime();
    await expectIamReactionState({
        database: runtime.database,
        collectionName: "access_known_memberships",
        filter: { membershipId: input.membershipId },
        expected: input,
    });
}

export function readString(record: Record<string, unknown>, key: string): string {
    const value = record[key];
    if (typeof value !== "string" || value.length === 0) {
        throw new Error(`Expected ${key} to be a non-empty string.`);
    }
    return value;
}

export function uniqueIdentityId(): string {
    return `identity_${randomUUID()}`;
}
