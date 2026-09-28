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
    IdentityAdministrationSessionReadStore,
    IdentityCredentialReadStore,
    IdentityPasswordResetSessionReadStore,
    IdentityReadStore,
    IdentitySecuritySummaryReadStore,
    IdentitySecurityHistoryReadStore,
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
    & IdentityPasswordResetSessionReadStore
    & IdentityAdministrationSessionReadStore
    & IdentitySecuritySummaryReadStore
    & IdentitySecurityHistoryReadStore {
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

    const events = input.database.collection<Record<string, any>>("engine_events");

    const passwordResetRequests =
        input.database.collection<{ userId: string; status: "requested"; requestedAt: string }>(
            "identity_password_reset_requests",
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
        async listSecurityEventsByUserId(userId: string) {
            const records = await events.find({
                eventType: { $regex: "^identity\\." },
                $or: [{ aggregateId: userId }, { "payload.userId": userId }, { "payload.identityId": userId }],
            }).sort({ occurredAt: -1, eventId: -1 }).limit(200).toArray();
            return records.map((record) => ({
                eventType: String(record.eventType), occurredAt: String(record.occurredAt),
                aggregateType: String(record.aggregateType), aggregateId: String(record.aggregateId),
                ...(typeof record.metadata?.requestId === "string" ? { requestId: record.metadata.requestId } : {}),
                ...(typeof record.metadata?.correlationId === "string" ? { correlationId: record.metadata.correlationId } : {}),
                ...(typeof record.metadata?.actorId === "string" ? { actorId: record.metadata.actorId } : {}),
                ...(typeof record.metadata?.tenantId === "string" ? { tenantId: record.metadata.tenantId } : {}),
            }));
        },
        async findLatestPasswordResetRequestByUserId(userId: string): Promise<{ status: "requested"; requestedAt: string } | null> {
            return await passwordResetRequests.findOne({ userId }, { sort: { requestedAt: -1 } });
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

        async listSessionsByUserId(
            userId:
                string,
        ): Promise<readonly IdentitySessionState[]> {
            return await sessions
                .find({ userId })
                .sort({ issuedAt: 1, sessionId: 1 })
                .toArray();
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
            const search =
                input.search?.trim();

            const escapedSearch =
                search
                    ? search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                    : undefined;

            const filter:
                Filter<IdentityUserState> = {
                    ...(input.status !== undefined
                        ? { status: input.status }
                        : {}),

                    ...(input.emailVerified !== undefined
                        ? { emailVerified: input.emailVerified }
                        : {}),

                    ...(escapedSearch !== undefined
                        ? {
                            $or: [
                                {
                                    email: {
                                        $regex: escapedSearch,
                                        $options: "i",
                                    },
                                },
                                {
                                    userId: {
                                        $regex: escapedSearch,
                                        $options: "i",
                                    },
                                },
                            ],
                        }
                        : {}),
                };

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