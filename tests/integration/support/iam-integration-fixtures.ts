// tests/integration/support/iam-integration-fixtures.ts
// -----------------------------------------------------------------------------
// IAM INTEGRATION FIXTURES
// -----------------------------------------------------------------------------
// Produces unique business identifiers for isolated IAM certification cases.
// -----------------------------------------------------------------------------

import {
    randomUUID,
} from "node:crypto";

export interface IamIntegrationFixtures {
    readonly suffix: string;
    readonly requestId: string;
    readonly correlationId: string;
    readonly userId: string;
    readonly membershipId: string;
    readonly tenantId: string;
    readonly email: string;
}

export function createIamIntegrationFixtures(): IamIntegrationFixtures {
    const suffix =
        randomUUID()
            .replaceAll("-", "");

    return {
        suffix,
        requestId:
            `request_${suffix}`,
        correlationId:
            `correlation_${suffix}`,
        userId:
            `user_${suffix}`,
        membershipId:
            `membership_${suffix}`,
        tenantId:
            `tenant_${suffix}`,
        email:
            `iam-${suffix}@example.com`,
    };
}
