// services/access/src/runtime/collections/access-collection-contracts.ts
// -----------------------------------------------------------------------------
// ACCESS COLLECTION CONTRACTS
// -----------------------------------------------------------------------------
// Runtime-facing contracts for Access Operations™ persistence collections.
//
// Purpose:
//   • expose validated Access collection configuration
//   • support collection-name overrides during runtime composition
//   • preserve the canonical AccessCollections application contract
//   • prevent incomplete collection configuration
//
// Boundary:
//   • contains no MongoDB imports
//   • contains no collection handles
//   • contains no index definitions
//   • contains no persistence behavior
// -----------------------------------------------------------------------------

import type {
    AccessCollections,
} from "../../usecases";

import {
    ACCESS_COLLECTION_NAMES,
} from "./access-collection-names";

// -----------------------------------------------------------------------------
// COLLECTION OVERRIDES
// -----------------------------------------------------------------------------

export type AccessCollectionOverrides =
    Partial<AccessCollections>;

// -----------------------------------------------------------------------------
// COLLECTION CONFIGURATION
// -----------------------------------------------------------------------------

export interface AccessCollectionConfig {
    readonly collections?:
    AccessCollectionOverrides;
}

// -----------------------------------------------------------------------------
// COLLECTION CONTRACT
// -----------------------------------------------------------------------------

/**
 * Runtime-owned resolved collection contract.
 *
 * This intentionally extends the application-layer AccessCollections
 * interface so the resolved runtime configuration can be passed directly into
 * Access use cases without adaptation.
 */
export interface ResolvedAccessCollections
    extends AccessCollections {
}

// -----------------------------------------------------------------------------
// COLLECTION RESOLUTION
// -----------------------------------------------------------------------------

export function resolveAccessCollections(
    overrides:
        AccessCollectionOverrides = {},
): ResolvedAccessCollections {
    const resolved: ResolvedAccessCollections = {
        ...ACCESS_COLLECTION_NAMES,
        ...overrides,
    };

    validateAccessCollections(
        resolved,
    );

    return resolved;
}

// -----------------------------------------------------------------------------
// COLLECTION VALIDATION
// -----------------------------------------------------------------------------

export function validateAccessCollections(
    collections: AccessCollections,
): void {
    const entries =
        Object.entries(
            collections,
        ) as readonly [
            keyof AccessCollections,
            string,
        ][];

    for (
        const [
            key,
            value,
        ] of entries
    ) {
        if (
            typeof value !== "string"
            || value.trim().length === 0
        ) {
            throw new Error(
                `Access collection "${key}" must be a non-empty string.`,
            );
        }
    }

    const names =
        entries.map(
            (
                [
                    ,
                    value,
                ],
            ) =>
                value.trim(),
        );

    const uniqueNames =
        new Set(
            names,
        );

    if (
        uniqueNames.size !== names.length
    ) {
        throw new Error(
            "Access collection names must be unique.",
        );
    }
}

// -----------------------------------------------------------------------------
// TYPE GUARD
// -----------------------------------------------------------------------------

export function isAccessCollections(
    value: unknown,
): value is AccessCollections {
    if (
        typeof value !== "object"
        || value === null
    ) {
        return false;
    }

    const candidate =
        value as Partial<AccessCollections>;

    return (
        isNonEmptyString(
            candidate.permissions,
        )
        && isNonEmptyString(
            candidate.roles,
        )
        && isNonEmptyString(
            candidate.roleAssignments,
        )
        && isNonEmptyString(
            candidate.permissionAssignments,
        )
        && isNonEmptyString(
            candidate.authorizationPolicies,
        )
        && isNonEmptyString(
            candidate.accessRestrictions,
        )
        && isNonEmptyString(
            candidate.knownIdentities,
        )
        && isNonEmptyString(
            candidate.knownMemberships,
        )
        && isNonEmptyString(
            candidate.knownTenants,
        )
        && isNonEmptyString(
            candidate.knownSubscriptionCapabilities,
        )
    );
}

// -----------------------------------------------------------------------------
// INTERNAL HELPERS
// -----------------------------------------------------------------------------

function isNonEmptyString(
    value: unknown,
): value is string {
    return (
        typeof value === "string"
        && value.trim().length > 0
    );
}