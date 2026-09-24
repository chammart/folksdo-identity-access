// services/access/src/usecases/access-usecase-contracts.ts
// -----------------------------------------------------------------------------
// ACCESS USE CASE CONTRACTS
// -----------------------------------------------------------------------------
// Shared application-layer contracts for Access Operations™.
//
// Boundary:
//   • defines Access-owned dependency interfaces
//   • isolates use cases from MongoDB and transport concerns
//   • isolates use cases from concrete Folksdo Engine construction
//   • provides deterministic clock and identifier dependencies
//   • preserves service extraction boundaries
// -----------------------------------------------------------------------------

import type {
    KnownIdentity,
    KnownMembership,
    KnownSubscriptionCapabilities,
    KnownTenant,
} from "../../known-facts";

import type {
    AccessRestrictionState,
    AuthorizationPolicyState,
    PermissionAssignmentState,
    PermissionState,
    RoleAssignmentState,
    RoleState,
} from "../../state";

import type {
    AuthorizationPolicyResult,
    RolePermissionBinding,
} from "../../authorization";

// -----------------------------------------------------------------------------
// CLOCK
// -----------------------------------------------------------------------------

export interface AccessClock {
    now(): string;
}

// -----------------------------------------------------------------------------
// IDENTIFIER GENERATOR
// -----------------------------------------------------------------------------

export interface AccessIdGenerator {
    roleId(): string;

    permissionId(): string;

    assignmentId(): string;

    policyId(): string;

    restrictionId(): string;

    authorizationDecisionId(): string;

    eventId(): string;

    outboxMessageId(): string;
}

// -----------------------------------------------------------------------------
// COLLECTIONS
// -----------------------------------------------------------------------------

export interface AccessCollections {
    readonly permissions: string;

    readonly roles: string;

    readonly roleAssignments: string;

    readonly permissionAssignments: string;

    readonly authorizationPolicies: string;

    readonly accessRestrictions: string;

    readonly knownIdentities: string;

    readonly knownMemberships: string;

    readonly knownTenants: string;

    readonly knownSubscriptionCapabilities: string;
}

// -----------------------------------------------------------------------------
// OUTBOX SUBJECTS
// -----------------------------------------------------------------------------

export interface AccessOutboxSubjects {
    readonly permissionCreated: string;

    readonly roleCreated: string;

    readonly roleUpdated: string;

    readonly roleArchived: string;

    readonly roleRestored: string;

    readonly roleAssigned: string;

    readonly roleRemoved: string;

    readonly permissionGranted: string;

    readonly permissionRevoked: string;

    readonly policyCreated: string;

    readonly policyUpdated: string;

    readonly policyArchived: string;

    readonly restrictionCreated: string;

    readonly restrictionRemoved: string;

    readonly assignmentExpired: string;

    readonly restrictionExpired: string;

    readonly authorizationEvaluated: string;

    readonly membershipAuthorizationRecorded: string;

    readonly membershipAuthorizationActivated: string;

    readonly membershipAuthorizationSuspended: string;

    readonly membershipAuthorizationArchived: string;

    readonly membershipAuthorizationReactivated: string;

    readonly tenantAuthorizationProvisioned: string;

    readonly tenantAuthorizationActivated: string;

    readonly tenantAuthorizationSuspended: string;

    readonly tenantAuthorizationReactivated: string;

    readonly tenantAuthorizationArchived: string;

    readonly subscriptionCapabilitiesApplied: string;

    readonly securityPolicyApplied: string;

    /**
     * Published after Access applies the consequences of an Identity
     * becoming unavailable because it was disabled.
     */
    readonly identityAccessActivated: string;

    readonly identityAccessSuspended: string;

    /**
     * Published after Access applies the terminal consequences of an
     * Identity being archived.
     */
    readonly identityAccessArchived: string;

    /**
     * Published after Access removes the Identity lifecycle suspension
     * source from otherwise eligible assignments.
     */
    readonly identityAccessRestored: string;
}

// -----------------------------------------------------------------------------
// ENGINE STATE CHANGE
// -----------------------------------------------------------------------------

export interface AccessInsertStateChange {
    readonly operation: "insert";

    readonly collection: string;

    readonly document:
    Readonly<Record<string, unknown>>;
}

export interface AccessUpdateStateChange {
    readonly operation: "update";

    readonly collection: string;

    /**
     * Persistence document identifier used by the Engine update boundary.
     *
     * This is intentionally separate from the domain identifier because
     * concrete stores may use an internal document identifier.
     */
    readonly documentId: string;

    readonly patch:
    Readonly<Record<string, unknown>>;
}

export type AccessStateChange =
    | AccessInsertStateChange
    | AccessUpdateStateChange;

// -----------------------------------------------------------------------------
// ENGINE EVENT
// -----------------------------------------------------------------------------

export interface AccessCommitEvent {
    readonly eventId: string;

    readonly eventType: string;

    readonly aggregateType: string;

    readonly aggregateId: string;

    readonly occurredAt: string;

    readonly payload:
    Readonly<Record<string, unknown>>;

    readonly metadata?:
    Readonly<Record<string, unknown>>;
}

// -----------------------------------------------------------------------------
// OUTBOX MESSAGE
// -----------------------------------------------------------------------------

export interface AccessOutboxMessage {
    readonly messageId: string;

    readonly subject: string;

    readonly occurredAt: string;

    readonly payload:
    Readonly<Record<string, unknown>>;

    readonly metadata?:
    Readonly<Record<string, unknown>>;
}

// -----------------------------------------------------------------------------
// ENGINE COMMIT
// -----------------------------------------------------------------------------

export interface AccessEngineCommitInput {
    readonly aggregateType: string;

    readonly aggregateId: string;

    readonly expectedVersion?: number;

    readonly stateChanges:
    readonly AccessStateChange[];

    readonly events:
    readonly AccessCommitEvent[];

    readonly outbox:
    readonly AccessOutboxMessage[];
}

export interface AccessEngineCommitResult {
    readonly committedVersion: number;

    readonly stateChangeCount: number;

    readonly eventCount: number;

    readonly outboxMessageCount: number;
}

export interface FolksdoEngine {
    commit(
        input: AccessEngineCommitInput,
    ): Promise<AccessEngineCommitResult>;
}

// -----------------------------------------------------------------------------
// ACCESS READ STORE
// -----------------------------------------------------------------------------

export interface AccessReadStore {
    findKnownIdentity(
        identityId: string,
    ): Promise<KnownIdentity | null>;

    findKnownMembership(
        membershipId: string,
    ): Promise<KnownMembership | null>;

    listKnownMemberships(
        identityId?: string,
        tenantId?: string,
    ): Promise<readonly KnownMembership[]>;

    findKnownTenant(
        tenantId: string,
    ): Promise<KnownTenant | null>;

    findKnownSubscriptionCapabilities(
        tenantId: string,
    ): Promise<KnownSubscriptionCapabilities | null>;

    listRoleAssignments(
        membershipId?: string,
        identityId?: string,
    ): Promise<readonly RoleAssignmentState[]>;

    listPermissionAssignments(
        membershipId?: string,
        identityId?: string,
    ): Promise<readonly PermissionAssignmentState[]>;

    findRoleById(
        roleId: string,
    ): Promise<RoleState | null>;

    findRoleByName(
        name: string,
        tenantId?: string,
    ): Promise<RoleState | null>;

    listRoles(
        tenantId?: string,
    ): Promise<readonly RoleState[]>;

    findPermissionById(
        permissionId: string,
    ): Promise<PermissionState | null>;

    findPermissionByKey(
        service: string,
        resource: string,
        action: string,
    ): Promise<PermissionState | null>;

    findPermissionsByIds(
        permissionIds: readonly string[],
    ): Promise<readonly PermissionState[]>;

    listPermissions(): Promise<
        readonly PermissionState[]
    >;

    findRoleAssignmentById(
        assignmentId: string,
    ): Promise<RoleAssignmentState | null>;

    findPermissionAssignmentById(
        assignmentId: string,
    ): Promise<PermissionAssignmentState | null>;

    findActiveRoleAssignment(
        membershipId: string,
        roleId: string,
        tenantId: string,
    ): Promise<RoleAssignmentState | null>;

    findActivePermissionAssignment(
        membershipId: string,
        permissionId: string,
        tenantId: string,
    ): Promise<PermissionAssignmentState | null>;

    listRoleAssignmentsByMembership(
        membershipId: string,
        tenantId: string,
    ): Promise<readonly RoleAssignmentState[]>;

    listPermissionAssignmentsByMembership(
        membershipId: string,
        tenantId: string,
    ): Promise<readonly PermissionAssignmentState[]>;

    listAssignmentsByTenant(
        tenantId: string,
    ): Promise<{
        readonly roleAssignments:
        readonly RoleAssignmentState[];

        readonly permissionAssignments:
        readonly PermissionAssignmentState[];
    }>;

    findPolicyById(
        policyId: string,
    ): Promise<AuthorizationPolicyState | null>;

    listPolicies(
        tenantId?: string,
    ): Promise<readonly AuthorizationPolicyState[]>;

    findRestrictionById(
        restrictionId: string,
    ): Promise<AccessRestrictionState | null>;

    listRestrictions(
        tenantId?: string,
    ): Promise<readonly AccessRestrictionState[]>;

    listApplicableRestrictions(
        membershipId: string,
        tenantId: string,
        permissionId?: string,
        resourceType?: string,
        resourceId?: string,
    ): Promise<readonly AccessRestrictionState[]>;

    listRolePermissionBindings(
        roleIds: readonly string[],
    ): Promise<readonly RolePermissionBinding[]>;

    evaluateActivePolicies(
        input: AccessPolicyEvaluationInput,
    ): Promise<readonly AuthorizationPolicyResult[]>;
}

// -----------------------------------------------------------------------------
// POLICY EVALUATION INPUT
// -----------------------------------------------------------------------------

export interface AccessPolicyEvaluationInput {
    readonly identityId: string;

    readonly membershipId: string;

    readonly tenantId: string;

    readonly permissionId: string;

    readonly resourceType?: string;

    readonly resourceId?: string;

    readonly now: string;
}

// -----------------------------------------------------------------------------
// KNOWN IDENTITY
// -----------------------------------------------------------------------------

export type KnownAccessIdentityStatus =
    | "active"
    | "disabled"
    | "archived";

export interface KnownAccessIdentity {
    /**
     * Persistence document identifier used for Engine state updates.
     */
    readonly documentId: string;

    /**
     * Canonical Identity Operations™ identifier.
     */
    readonly identityId: string;

    /**
     * Latest Identity lifecycle status known by Access Operations™.
     */
    readonly status: KnownAccessIdentityStatus;

    /**
     * Time at which Access last updated the known Identity fact.
     */
    readonly updatedAt: string;

    /**
     * Present when the latest known Identity lifecycle includes disablement.
     */
    readonly disabledAt?: string;

    /**
     * Present when the latest known Identity lifecycle includes archival.
     */
    readonly archivedAt?: string;

    /**
     * Present when Access last observed Identity restoration.
     */
    readonly restoredAt?: string;
}

// -----------------------------------------------------------------------------
// KNOWN MEMBERSHIP
// -----------------------------------------------------------------------------

export type KnownAccessMembershipStatus =
    | "pending"
    | "active"
    | "guest"
    | "suspended"
    | "archived";

export interface KnownAccessMembership {
    /**
     * Persistence document identifier used for Engine state updates.
     */
    readonly documentId: string;

    /**
     * Canonical Membership Operations™ identifier.
     */
    readonly membershipId: string;

    /**
     * Identity participating through the Membership.
     */
    readonly identityId: string;

    /**
     * Tenant in which the Membership participates.
     */
    readonly tenantId: string;

    /**
     * Latest Membership lifecycle status known by Access Operations™.
     */
    readonly status: KnownAccessMembershipStatus;

    /**
     * Time at which Access last updated the known Membership fact.
     */
    readonly updatedAt: string;
}

// -----------------------------------------------------------------------------
// KNOWN TENANT
// -----------------------------------------------------------------------------

export type KnownAccessTenantStatus =
    | "provisioning"
    | "active"
    | "suspended"
    | "archived";

export interface KnownAccessTenant {
    /**
     * Persistence document identifier used for Engine state updates.
     */
    readonly documentId: string;

    /**
     * Canonical Tenant Operations™ identifier.
     */
    readonly tenantId: string;

    /**
     * Latest Tenant lifecycle status known by Access Operations™.
     */
    readonly status: KnownAccessTenantStatus;

    /**
     * Time at which Access first observed Tenant creation.
     */
    readonly createdAt?: string;

    /**
     * Present when Access observed Tenant activation.
     */
    readonly activatedAt?: string;

    /**
     * Present when the latest known Tenant lifecycle includes suspension.
     */
    readonly suspendedAt?: string;

    /**
     * Present when Access last observed Tenant reactivation.
     */
    readonly reactivatedAt?: string;

    /**
     * Present when the latest known Tenant lifecycle includes archival.
     */
    readonly archivedAt?: string;

    /**
     * Time at which Access last updated the known Tenant fact.
     */
    readonly updatedAt: string;
}

// -----------------------------------------------------------------------------
// KNOWN SUBSCRIPTION CAPABILITY
// -----------------------------------------------------------------------------

export type KnownSubscriptionCapabilityStatus =
    | "enabled"
    | "disabled";

export interface KnownSubscriptionCapability {
    /**
     * Persistence document identifier used for Engine state updates.
     */
    readonly documentId: string;

    /**
     * Tenant whose Subscription capability is represented.
     */
    readonly tenantId: string;

    /**
     * Stable Subscription-owned capability identifier.
     */
    readonly capability: string;

    /**
     * Latest capability availability known by Access Operations™.
     */
    readonly status: KnownSubscriptionCapabilityStatus;

    /**
     * Time at which Access last updated the known capability fact.
     */
    readonly updatedAt: string;

    /**
     * Present when the capability most recently became enabled.
     */
    readonly enabledAt?: string;

    /**
     * Present when the capability most recently became disabled.
     */
    readonly disabledAt?: string;
}

// -----------------------------------------------------------------------------
// KNOWN FACTS STORE
// -----------------------------------------------------------------------------

export interface AccessKnownFactsStore {
    /**
     * Returns the Identity lifecycle fact currently known by Access.
     */
    findIdentity(
        identityId: string,
    ): Promise<KnownAccessIdentity | null>;

    /**
     * Returns one Membership fact by its canonical Membership identifier.
     */
    findMembership(
        membershipId: string,
    ): Promise<KnownAccessMembership | null>;

    /**
     * Returns all Membership facts associated with an Identity.
     *
     * Identity lifecycle use cases use this method to locate all
     * tenant-scoped Access assignments affected by the Identity change.
     */
    listMembershipsByIdentity(
        identityId: string,
    ): Promise<readonly KnownAccessMembership[]>;

    /**
     * Returns the Tenant lifecycle fact currently known by Access.
     */
    findTenant(
        tenantId: string,
    ): Promise<KnownAccessTenant | null>;

    /**
     * Returns one Subscription-owned capability fact currently known by
     * Access for the specified Tenant.
     */
    findTenantCapability(
        tenantId: string,
        capability: string,
    ): Promise<KnownSubscriptionCapability | null>;

    /**
     * Returns all Subscription-owned capabilities currently known by Access
     * for the specified Tenant.
     */
    listTenantCapabilities(
        tenantId: string,
    ): Promise<readonly KnownSubscriptionCapability[]>;

    /**
     * Determines whether the Identity may currently participate in
     * Access authorization.
     */
    identityIsAvailable(
        identityId: string,
    ): Promise<boolean>;

    /**
     * Determines whether the Tenant may currently participate in
     * Access authorization.
     */
    tenantIsAvailable(
        tenantId: string,
    ): Promise<boolean>;

    /**
     * Determines whether a Subscription-owned capability is currently
     * available within the Tenant.
     */
    tenantCapabilityIsEnabled(
        tenantId: string,
        capability: string,
    ): Promise<boolean>;
}

// -----------------------------------------------------------------------------
// SHARED DEPENDENCIES
// -----------------------------------------------------------------------------

export interface AccessUseCaseDependencies {
    readonly engine: FolksdoEngine;

    readonly readStore: AccessReadStore;

    readonly knownFactsStore: AccessKnownFactsStore;

    readonly clock: AccessClock;

    readonly ids: AccessIdGenerator;

    readonly collections: AccessCollections;

    readonly outboxSubjects: AccessOutboxSubjects;
}