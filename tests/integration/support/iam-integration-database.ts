// tests/integration/support/iam-integration-database.ts
// -----------------------------------------------------------------------------
// IAM INTEGRATION DATABASE
// -----------------------------------------------------------------------------
// Read-only certification access to IAM canonical state and Engine records.
// Test cleanup is limited to collections owned by the isolated IAM database.
// -----------------------------------------------------------------------------

import type {
    Db,
    Document,
    Filter,
    WithId,
} from "mongodb";

export const IAM_ENGINE_COLLECTIONS = {
    events:
        "engine_events",

    outbox:
        "engine_outbox",

    aggregateVersions:
        "engine_aggregate_versions",

    projectionCheckpoints:
        "engine_projection_checkpoints",

    projectionFailures:
        "engine_projection_failures",
} as const;

export const IAM_SERVICE_COLLECTIONS = [
    "identity_users",
    "identity_user_profiles",
    "identity_credentials",
    "identity_sessions",
    "identity_email_verifications",
    "identity_known_invitations",
    "identity_acceptance_captures",
    "membership_memberships",
    "membership_invitations",
    "membership_contexts",
    "access_permissions",
    "access_roles",
    "access_role_assignments",
    "access_permission_assignments",
    "access_authorization_policies",
    "access_restrictions",
    "access_known_memberships",
    "access_known_tenants",
    "access_known_identities",
    "access_known_subscription_capabilities",
    "user",
    "session",
    "account",
    "verification",
] as const;

export const IAM_INTEGRATION_COLLECTIONS = [
    ...IAM_SERVICE_COLLECTIONS,
    ...Object.values(IAM_ENGINE_COLLECTIONS),
] as const;

export interface IamIntegrationDatabase {
    readonly database: Db;

    findCanonicalState<TDocument extends Document>(
        collectionName: string,
        filter: Filter<TDocument>,
    ): Promise<WithId<TDocument> | null>;

    findEvents<TDocument extends Document = Document>(
        filter?: Filter<TDocument>,
    ): Promise<WithId<TDocument>[]>;

    findOutboxRecords<TDocument extends Document = Document>(
        filter?: Filter<TDocument>,
    ): Promise<WithId<TDocument>[]>;

    findAggregateVersion(
        aggregateType: string,
        aggregateId: string,
    ): Promise<number | undefined>;

    clean(): Promise<void>;
}

export function createIamIntegrationDatabase(
    database: Db,
): IamIntegrationDatabase {
    return {
        database,

        async findCanonicalState<TDocument extends Document>(
            collectionName: string,
            filter: Filter<TDocument>,
        ): Promise<WithId<TDocument> | null> {
            return await database
                .collection<TDocument>(collectionName)
                .findOne(filter);
        },

        async findEvents<TDocument extends Document = Document>(
            filter: Filter<TDocument> = {},
        ): Promise<WithId<TDocument>[]> {
            return await database
                .collection<TDocument>(IAM_ENGINE_COLLECTIONS.events)
                .find(filter)
                .sort({ aggregateVersion: 1 })
                .toArray();
        },

        async findOutboxRecords<TDocument extends Document = Document>(
            filter: Filter<TDocument> = {},
        ): Promise<WithId<TDocument>[]> {
            return await database
                .collection<TDocument>(IAM_ENGINE_COLLECTIONS.outbox)
                .find(filter)
                .sort({ occurredAt: 1 })
                .toArray();
        },

        async findAggregateVersion(
            aggregateType: string,
            aggregateId: string,
        ): Promise<number | undefined> {
            const record = await database
                .collection(IAM_ENGINE_COLLECTIONS.aggregateVersions)
                .findOne({
                    aggregateType,
                    aggregateId,
                });

            return typeof record?.version === "number"
                ? record.version
                : undefined;
        },

        async clean(): Promise<void> {
            await Promise.all(
                IAM_INTEGRATION_COLLECTIONS.map(
                    async (collectionName): Promise<void> => {
                        await database
                            .collection(collectionName)
                            .deleteMany({});
                    },
                ),
            );
        },
    };
}
