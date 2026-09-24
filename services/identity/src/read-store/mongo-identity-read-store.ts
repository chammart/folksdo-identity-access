// services/identity/src/read-store/mongo-identity-read-store.ts
// -----------------------------------------------------------------------------
// MONGO IDENTITY READ STORE
// -----------------------------------------------------------------------------
// Mongo-backed read store for Identity Service™.
// -----------------------------------------------------------------------------

import type {
    Collection,
    Db,
    Filter,
} from "mongodb";

import type {
    IdentityCredentialState,
    IdentityEmailVerificationState,
    IdentitySessionState,
    IdentityUserState,
} from "../state";

import type {
    IdentityCredentialReadStore,
    IdentityPasswordResetSessionReadStore,
    IdentityReadStore,
    ListUsersInput,
    ListUsersResult,
} from "./identity-read-store";

// -----------------------------------------------------------------------------
// INPUT
// -----------------------------------------------------------------------------

export interface CreateMongoIdentityReadStoreInput {
    readonly database:
    Db;

    readonly collections:
    MongoIdentityReadStoreCollections;
}

export interface MongoIdentityReadStoreCollections {
    readonly users:
    string;

    readonly credentials:
    string;

    readonly emailVerifications:
    string;

    readonly sessions:
    string;
}

// -----------------------------------------------------------------------------
// FACTORY
// -----------------------------------------------------------------------------

export function createMongoIdentityReadStore(
    input:
        CreateMongoIdentityReadStoreInput,
):
    IdentityReadStore
    & IdentityCredentialReadStore
    & IdentityPasswordResetSessionReadStore {
    const users =
        input.database.collection<IdentityUserState>(
            input.collections.users,
        );

    const credentials =
        input.database.collection<IdentityCredentialState>(
            input.collections.credentials,
        );

    const verifications =
        input.database.collection<IdentityEmailVerificationState>(
            input.collections.emailVerifications,
        );

    const sessions =
        input.database.collection<IdentitySessionState>(
            input.collections.sessions,
        );

    return {
        async findCredentialByProviderCredentialId(
            providerCredentialId:
                string,
        ): Promise<IdentityCredentialState | null> {
            return await credentials.findOne({
                providerCredentialId,

                status:
                    "active",
            });
        },
        async findActivePasswordCredentialByUserId(
            userId:
                string,
        ): Promise<IdentityCredentialState | null> {
            const credential =
                await credentials.findOne({
                    userId,

                    type:
                        "password",

                    status:
                        "active",
                });

            return credential;
        },
        async findUserByEmail(
            email:
                string,
        ): Promise<IdentityUserState | null> {
            return await users.findOne({
                email:
                    email
                        .trim()
                        .toLowerCase(),
            });
        },

        async findUserById(
            userId:
                string,
        ): Promise<IdentityUserState | null> {
            return await users.findOne({
                userId,
            });
        },

        async findSessionById(
            sessionId:
                string,
        ): Promise<IdentitySessionState | null> {
            return await sessions.findOne({
                sessionId,
            });
        },

        async listActiveSessionsByUserId(
            userId:
                string,
        ): Promise<readonly IdentitySessionState[]> {
            return await sessions
                .find({
                    userId,

                    status:
                        "active",
                })
                .sort({
                    createdAt:
                        1,

                    sessionId:
                        1,
                })
                .toArray();
        },

        async findVerificationById(
            verificationId:
                string,
        ): Promise<IdentityEmailVerificationState | null> {
            return await verifications.findOne({
                verificationId,

                status:
                    "pending",
            });
        },

        async listUsers(
            input:
                ListUsersInput,
        ): Promise<ListUsersResult> {
            const filter:
                Filter<IdentityUserState> =
                input.status
                    ? {
                        status:
                            input.status,
                    }
                    : {};

            const total =
                await users.countDocuments(
                    filter,
                );

            const result =
                await users
                    .find(
                        filter,
                    )
                    .sort({
                        createdAt:
                            -1,
                    })
                    .skip(
                        input.offset,
                    )
                    .limit(
                        input.limit,
                    )
                    .toArray();

            return {
                users:
                    result,

                total,
            };
        },
    };
}

// -----------------------------------------------------------------------------
// INDEXES
// -----------------------------------------------------------------------------

export async function ensureIdentityReadStoreIndexes(
    input: {
        readonly database:
        Db;

        readonly collections:
        MongoIdentityReadStoreCollections;
    },
): Promise<void> {
    const users:
        Collection =
        input.database.collection(
            input.collections.users,
        );

    const credentials:
        Collection =
        input.database.collection(
            input.collections.credentials,
        );

    const verifications:
        Collection =
        input.database.collection(
            input.collections.emailVerifications,
        );

    const sessions:
        Collection =
        input.database.collection(
            input.collections.sessions,
        );

    await credentials.createIndex(
        {
            providerCredentialId:
                1,
        },
        {
            unique:
                true,
        },
    );

    await credentials.createIndex({
        userId:
            1,

        status:
            1,
    });

    await credentials.createIndex({
        userId:
            1,

        type:
            1,

        status:
            1,
    });

    await users.createIndex(
        {
            email:
                1,
        },
        {
            unique:
                true,
        },
    );

    await users.createIndex(
        {
            userId:
                1,
        },
        {
            unique:
                true,
        },
    );

    await users.createIndex({
        status:
            1,

        createdAt:
            -1,
    });

    await verifications.createIndex(
        {
            verificationId:
                1,
        },
        {
            unique:
                true,
        },
    );

    await verifications.createIndex({
        userId:
            1,

        status:
            1,
    });

    await sessions.createIndex(
        {
            sessionId:
                1,
        },
        {
            unique:
                true,
        },
    );

    await sessions.createIndex({
        userId:
            1,

        status:
            1,
    });
}