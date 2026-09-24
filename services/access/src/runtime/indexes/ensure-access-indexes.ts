// services/access/src/runtime/indexes/ensure-access-indexes.ts
// -----------------------------------------------------------------------------
// ENSURE ACCESS RUNTIME INDEXES
// -----------------------------------------------------------------------------
// Infrastructure-neutral index provisioning for Access Operations™ runtime.
//
// Purpose:
//   • install all canonical Access runtime indexes
//   • resolve logical collection keys into configured collection names
//   • provide deterministic provisioning results
//   • fail startup when a required index cannot be created
//
// Boundary:
//   • depends only on a minimal index-management contract
//   • does not import a concrete MongoDB client
//   • does not own collection naming
//   • does not modify or remove non-canonical indexes
//
// Naming:
//   The runtime function is named ensureAccessRuntimeIndexes to avoid a public
//   barrel collision with ensureAccessIndexes exported by the read-store layer.
// -----------------------------------------------------------------------------

import type {
    AccessCollections,
} from "../../usecases";

import type {
    AccessIndexDefinition,
    AccessIndexKey,
    AccessIndexPartialFilter,
} from "./access-index-definitions";

import {
    ACCESS_INDEX_DEFINITIONS,
} from "./access-index-definitions";

// -----------------------------------------------------------------------------
// INDEX MANAGER CONTRACT
// -----------------------------------------------------------------------------

export interface AccessRuntimeIndexCreateOptions {
    readonly name:
    string;

    readonly unique?:
    boolean;

    readonly sparse?:
    boolean;

    readonly partialFilterExpression?:
    AccessIndexPartialFilter;

    readonly expireAfterSeconds?:
    number;
}

export interface AccessRuntimeIndexCollection {
    createIndex(
        key: AccessIndexKey,
        options: AccessRuntimeIndexCreateOptions,
    ): Promise<string>;
}

export interface AccessRuntimeIndexDatabase {
    collection(
        name: string,
    ): AccessRuntimeIndexCollection;
}

// -----------------------------------------------------------------------------
// ENSURE OPTIONS
// -----------------------------------------------------------------------------

export interface EnsureAccessRuntimeIndexesOptions {
    readonly database:
    AccessRuntimeIndexDatabase;

    readonly collections:
    AccessCollections;

    readonly definitions?:
    readonly AccessIndexDefinition[];

    /**
     * Optional hook invoked after each index is successfully ensured.
     */
    readonly onIndexEnsured?: (
        result: AccessRuntimeIndexEnsureResult,
    ) => void | Promise<void>;
}

// -----------------------------------------------------------------------------
// ENSURE RESULT
// -----------------------------------------------------------------------------

export interface AccessRuntimeIndexEnsureResult {
    readonly collectionKey:
    keyof AccessCollections;

    readonly collectionName:
    string;

    readonly requestedName:
    string;

    readonly ensuredName:
    string;
}

export interface EnsureAccessRuntimeIndexesResult {
    readonly ensuredCount:
    number;

    readonly indexes:
    readonly AccessRuntimeIndexEnsureResult[];
}

// -----------------------------------------------------------------------------
// ENSURE ERROR
// -----------------------------------------------------------------------------

export class AccessRuntimeIndexProvisioningError
    extends Error {
    public readonly cause:
        unknown;

    public readonly collectionKey:
        keyof AccessCollections;

    public readonly collectionName:
        string;

    public readonly indexName:
        string;

    public constructor(
        input: {
            readonly collectionKey:
            keyof AccessCollections;

            readonly collectionName:
            string;

            readonly indexName:
            string;

            readonly cause:
            unknown;
        },
    ) {
        super(
            `Failed to ensure Access runtime index "${input.indexName}" `
            + `on collection "${input.collectionName}".`,
        );

        this.name =
            "AccessRuntimeIndexProvisioningError";

        this.collectionKey =
            input.collectionKey;

        this.collectionName =
            input.collectionName;

        this.indexName =
            input.indexName;

        this.cause =
            input.cause;
    }
}

// -----------------------------------------------------------------------------
// ENSURE ACCESS RUNTIME INDEXES
// -----------------------------------------------------------------------------

export async function ensureAccessRuntimeIndexes(
    options:
        EnsureAccessRuntimeIndexesOptions,
): Promise<EnsureAccessRuntimeIndexesResult> {
    const definitions =
        options.definitions
        ?? ACCESS_INDEX_DEFINITIONS;

    validateAccessRuntimeIndexDefinitions(
        definitions,
    );

    const results:
        AccessRuntimeIndexEnsureResult[] = [];

    for (
        const definition
        of definitions
    ) {
        const collectionName =
            resolveAccessRuntimeCollectionName(
                options.collections,
                definition.collection,
            );

        const collection =
            options.database.collection(
                collectionName,
            );

        try {
            const ensuredName =
                await collection.createIndex(
                    definition.key,
                    createAccessRuntimeIndexOptions(
                        definition,
                    ),
                );

            const result:
                AccessRuntimeIndexEnsureResult = {
                collectionKey:
                    definition.collection,

                collectionName,

                requestedName:
                    definition.name,

                ensuredName,
            };

            results.push(
                result,
            );

            await options.onIndexEnsured?.(
                result,
            );
        } catch (
        error
        ) {
            throw new AccessRuntimeIndexProvisioningError({
                collectionKey:
                    definition.collection,

                collectionName,

                indexName:
                    definition.name,

                cause:
                    error,
            });
        }
    }

    return {
        ensuredCount:
            results.length,

        indexes:
            results,
    };
}

// -----------------------------------------------------------------------------
// OPTION MAPPING
// -----------------------------------------------------------------------------
// MongoDB optional index properties must be omitted when they are undefined or
// null. Passing values such as `sparse: null` causes index provisioning to fail
// because MongoDB expects a Boolean when the field is present.
// -----------------------------------------------------------------------------

function createAccessRuntimeIndexOptions(
    definition:
        AccessIndexDefinition,
): AccessRuntimeIndexCreateOptions {
    const options:
        AccessRuntimeIndexCreateOptions = {
        name:
            definition.name,
    };

    if (
        definition.unique !== undefined
        && definition.unique !== null
    ) {
        Object.assign(
            options,
            {
                unique:
                    definition.unique,
            },
        );
    }

    if (
        definition.sparse !== undefined
        && definition.sparse !== null
    ) {
        Object.assign(
            options,
            {
                sparse:
                    definition.sparse,
            },
        );
    }

    if (
        definition.partialFilterExpression !== undefined
        && definition.partialFilterExpression !== null
    ) {
        Object.assign(
            options,
            {
                partialFilterExpression:
                    definition.partialFilterExpression,
            },
        );
    }

    if (
        definition.expireAfterSeconds !== undefined
        && definition.expireAfterSeconds !== null
    ) {
        Object.assign(
            options,
            {
                expireAfterSeconds:
                    definition.expireAfterSeconds,
            },
        );
    }

    return options;
}

// -----------------------------------------------------------------------------
// COLLECTION RESOLUTION
// -----------------------------------------------------------------------------

function resolveAccessRuntimeCollectionName(
    collections:
        AccessCollections,

    key:
        keyof AccessCollections,
): string {
    const name =
        collections[
        key
        ];

    if (
        typeof name !== "string"
        || name.trim().length === 0
    ) {
        throw new Error(
            `Access collection "${String(key)}" is not configured.`,
        );
    }

    return name;
}

// -----------------------------------------------------------------------------
// DEFINITION VALIDATION
// -----------------------------------------------------------------------------

function validateAccessRuntimeIndexDefinitions(
    definitions:
        readonly AccessIndexDefinition[],
): void {
    const indexNames =
        new Set<string>();

    for (
        const definition
        of definitions
    ) {
        if (
            definition.name.trim().length === 0
        ) {
            throw new Error(
                "Access runtime index names must be non-empty strings.",
            );
        }

        if (
            Object.keys(
                definition.key,
            ).length === 0
        ) {
            throw new Error(
                `Access runtime index "${definition.name}" `
                + "must define at least one key.",
            );
        }

        if (
            indexNames.has(
                definition.name,
            )
        ) {
            throw new Error(
                `Duplicate Access runtime index name "${definition.name}".`,
            );
        }

        if (
            definition.expireAfterSeconds !== undefined
            && definition.expireAfterSeconds !== null
            && (
                !Number.isFinite(
                    definition.expireAfterSeconds,
                )
                || definition.expireAfterSeconds < 0
            )
        ) {
            throw new Error(
                `Access runtime index "${definition.name}" `
                + "has an invalid TTL value.",
            );
        }

        indexNames.add(
            definition.name,
        );
    }
}