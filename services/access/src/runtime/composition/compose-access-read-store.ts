// services/access/src/runtime/composition/compose-access-read-store.ts
// -----------------------------------------------------------------------------
// COMPOSE ACCESS READ STORE
// -----------------------------------------------------------------------------
// Runtime composition for Access Operations™ read infrastructure.
//
// Purpose:
//   • create the canonical Mongo Access read store
//   • preserve the provider-neutral AccessQueryReadStore contract
//   • keep MongoDB construction inside the runtime composition boundary
//
// Boundary:
//   • contains no business decisions
//   • contains no use-case construction
//   • does not create or close the shared database connection
//   • does not claim that AccessQueryReadStore implements AccessKnownFactsStore
// -----------------------------------------------------------------------------

import type {
    Db,
} from "mongodb";

import {
    createMongoAccessReadStore,
    type AccessQueryReadStore,
    type MongoAccessCollectionNames,
} from "../../read-store";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface ComposeAccessReadStoreInput {
    readonly database:
    Db;

    readonly collections:
    MongoAccessCollectionNames;
}

// -----------------------------------------------------------------------------
// RESULT
// -----------------------------------------------------------------------------

export interface ComposedAccessReadStore {
    readonly readStore:
    AccessQueryReadStore;
}

// -----------------------------------------------------------------------------
// COMPOSITION
// -----------------------------------------------------------------------------

export function composeAccessReadStore(
    input:
    ComposeAccessReadStoreInput,
): ComposedAccessReadStore {
    return {
        readStore:
            createMongoAccessReadStore({
                database:
                    input.database,

                collections:
                    input.collections,
            }),
    };
}
