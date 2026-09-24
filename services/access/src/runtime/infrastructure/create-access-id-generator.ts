// services/access/src/runtime/infrastructure/create-access-id-generator.ts
// -----------------------------------------------------------------------------
// CREATE ACCESS ID GENERATOR
// -----------------------------------------------------------------------------
// Default identifier infrastructure for Access Operations™.
//
// Purpose:
//   • provide collision-resistant identifiers for Access-owned entities
//   • implement the canonical AccessIdGenerator application contract
//   • support dependency injection for deterministic testing
//   • centralize identifier prefixes and generation behavior
//
// Boundary:
//   • generates identifiers only
//   • performs no persistence access
//   • performs no uniqueness query
//   • contains no business lifecycle behavior
// -----------------------------------------------------------------------------

import {
    randomUUID,
} from "node:crypto";

import type {
    AccessIdGenerator,
} from "../../usecases";

// -----------------------------------------------------------------------------
// UUID PROVIDER
// -----------------------------------------------------------------------------

export interface AccessUuidProvider {
    createUuid(): string;
}

// -----------------------------------------------------------------------------
// FACTORY OPTIONS
// -----------------------------------------------------------------------------

export interface CreateAccessIdGeneratorOptions {
    readonly uuidProvider?:
    AccessUuidProvider;
}

// -----------------------------------------------------------------------------
// IDENTIFIER PREFIXES
// -----------------------------------------------------------------------------

export const ACCESS_ID_PREFIXES = {
    role:
        "role",

    permission:
        "permission",

    assignment:
        "assignment",

    policy:
        "policy",

    restriction:
        "restriction",

    authorizationDecision:
        "access_decision",

    event:
        "access_event",

    outboxMessage:
        "access_outbox",
} as const;

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createAccessIdGenerator(
    options:
        CreateAccessIdGeneratorOptions = {},
): AccessIdGenerator {
    const uuidProvider =
        options.uuidProvider
        ?? createNodeAccessUuidProvider();

    return {
        roleId:
            () =>
                createPrefixedId(
                    ACCESS_ID_PREFIXES.role,
                    uuidProvider,
                ),

        permissionId:
            () =>
                createPrefixedId(
                    ACCESS_ID_PREFIXES.permission,
                    uuidProvider,
                ),

        assignmentId:
            () =>
                createPrefixedId(
                    ACCESS_ID_PREFIXES.assignment,
                    uuidProvider,
                ),

        policyId:
            () =>
                createPrefixedId(
                    ACCESS_ID_PREFIXES.policy,
                    uuidProvider,
                ),

        restrictionId:
            () =>
                createPrefixedId(
                    ACCESS_ID_PREFIXES.restriction,
                    uuidProvider,
                ),

        authorizationDecisionId:
            () =>
                createPrefixedId(
                    ACCESS_ID_PREFIXES.authorizationDecision,
                    uuidProvider,
                ),

        eventId:
            () =>
                createPrefixedId(
                    ACCESS_ID_PREFIXES.event,
                    uuidProvider,
                ),

        outboxMessageId:
            () =>
                createPrefixedId(
                    ACCESS_ID_PREFIXES.outboxMessage,
                    uuidProvider,
                ),
    };
}

// -----------------------------------------------------------------------------
// DEFAULT UUID PROVIDER
// -----------------------------------------------------------------------------

export function createNodeAccessUuidProvider():
    AccessUuidProvider {
    return {
        createUuid:
            () =>
                randomUUID(),
    };
}

// -----------------------------------------------------------------------------
// INTERNAL GENERATION
// -----------------------------------------------------------------------------

function createPrefixedId(
    prefix: string,
    uuidProvider:
        AccessUuidProvider,
): string {
    const uuid =
        uuidProvider
            .createUuid()
            .trim();

    if (
        uuid.length === 0
    ) {
        throw new Error(
            "Access UUID provider returned an empty identifier.",
        );
    }

    return `${prefix}_${uuid}`;
}