// services/access/src/runtime/composition/compose-access-usecases.ts
// -----------------------------------------------------------------------------
// COMPOSE ACCESS USE CASES
// -----------------------------------------------------------------------------
// Runtime composition for Access Operations™ application use cases.
//
// Purpose:
//   • construct the complete public Access use-case surface
//   • inject one shared AccessUseCaseDependencies contract
//   • expose grouped runtime capabilities
//   • prevent use-case construction from leaking into API, reactions or workers
//
// Boundary:
//   • performs dependency injection only
//   • contains no business rules
//   • contains no transport behavior
//   • imports only use cases exported by the public usecases barrel
// -----------------------------------------------------------------------------

import {
    ActivateIdentityAuthorizationUseCase,
    ActivateMembershipAuthorizationUseCase,
    ActivateTenantAuthorizationUseCase,
    ApplySubscriptionCapabilitiesUseCase,
    ArchiveIdentityAccessUseCase,
    ArchiveMembershipAuthorizationUseCase,
    ArchivePolicyUseCase,
    ArchiveRoleUseCase,
    ArchiveTenantAuthorizationUseCase,
    ProvisionTenantAuthorizationUseCase,
    AssignRoleUseCase,
    AuthorizeActionUseCase,
    CreatePermissionUseCase,
    CreatePolicyUseCase,
    CreateRestrictionUseCase,
    CreateRoleUseCase,
    CurrentAuthorizationUseCase,
    ExpireAssignmentUseCase,
    ExpireRestrictionUseCase,
    GetPermissionUseCase,
    GetPolicyUseCase,
    GetRestrictionUseCase,
    GetRoleUseCase,
    GrantPermissionUseCase,
    ListPermissionsUseCase,
    ListPoliciesUseCase,
    ListRestrictionsUseCase,
    ListRolesUseCase,
    RecordMembershipAuthorizationUseCase,
    ReactivateMembershipAuthorizationUseCase,
    RemoveRestrictionUseCase,
    RemoveRoleUseCase,
    RestoreIdentityAuthorizationUseCase,
    RestoreRoleUseCase,
    ReactivateTenantAuthorizationUseCase,
    RevokePermissionUseCase,
    SuspendIdentityAccessUseCase,
    SuspendMembershipAuthorizationUseCase,
    SuspendTenantAuthorizationUseCase,
    UpdatePolicyUseCase,
    UpdateRoleUseCase,
    type AccessUseCaseDependencies,
} from "../../usecases";

// -----------------------------------------------------------------------------
// COMPOSED USE CASES
// -----------------------------------------------------------------------------

export interface ComposedAccessUseCases {
    readonly permissions: {
        readonly create: CreatePermissionUseCase;
        readonly get: GetPermissionUseCase;
        readonly list: ListPermissionsUseCase;
        readonly grant: GrantPermissionUseCase;
        readonly revoke: RevokePermissionUseCase;
    };

    readonly roles: {
        readonly create: CreateRoleUseCase;
        readonly get: GetRoleUseCase;
        readonly list: ListRolesUseCase;
        readonly update: UpdateRoleUseCase;
        readonly archive: ArchiveRoleUseCase;
        readonly restore: RestoreRoleUseCase;
        readonly assign: AssignRoleUseCase;
        readonly remove: RemoveRoleUseCase;
    };

    readonly policies: {
        readonly create: CreatePolicyUseCase;
        readonly get: GetPolicyUseCase;
        readonly list: ListPoliciesUseCase;
        readonly update: UpdatePolicyUseCase;
        readonly archive: ArchivePolicyUseCase;
    };

    readonly restrictions: {
        readonly create: CreateRestrictionUseCase;
        readonly get: GetRestrictionUseCase;
        readonly list: ListRestrictionsUseCase;
        readonly remove: RemoveRestrictionUseCase;
    };

    readonly authorization: {
        readonly authorizeAction: AuthorizeActionUseCase;
        readonly current: CurrentAuthorizationUseCase;
    };

    readonly expirations: {
        readonly assignment: ExpireAssignmentUseCase;
        readonly restriction: ExpireRestrictionUseCase;
    };

    readonly lifecycle: {
        readonly identity: {
            readonly activateAuthorization: ActivateIdentityAuthorizationUseCase;
            readonly suspendAccess: SuspendIdentityAccessUseCase;
            readonly archiveAccess: ArchiveIdentityAccessUseCase;
            readonly restoreAuthorization: RestoreIdentityAuthorizationUseCase;
        };

        readonly membership: {
            readonly recordAuthorization: RecordMembershipAuthorizationUseCase;
            readonly activateAuthorization: ActivateMembershipAuthorizationUseCase;
            readonly suspendAuthorization: SuspendMembershipAuthorizationUseCase;
            readonly archiveAuthorization: ArchiveMembershipAuthorizationUseCase;
            readonly reactivateAuthorization: ReactivateMembershipAuthorizationUseCase;
        };

        readonly tenant: {
            readonly provisionAuthorization: ProvisionTenantAuthorizationUseCase;
            readonly activateAuthorization: ActivateTenantAuthorizationUseCase;
            readonly suspendAuthorization: SuspendTenantAuthorizationUseCase;
            readonly reactivateAuthorization: ReactivateTenantAuthorizationUseCase;
            readonly archiveAuthorization: ArchiveTenantAuthorizationUseCase;
        };

        readonly subscription: {
            readonly applyCapabilities: ApplySubscriptionCapabilitiesUseCase;
        };
    };
}

// -----------------------------------------------------------------------------
// COMPOSITION
// -----------------------------------------------------------------------------

export function composeAccessUseCases(
    dependencies:
    AccessUseCaseDependencies,
): ComposedAccessUseCases {
    return {
        permissions: {
            create: new CreatePermissionUseCase(dependencies),
            get: new GetPermissionUseCase(dependencies),
            list: new ListPermissionsUseCase(dependencies),
            grant: new GrantPermissionUseCase(dependencies),
            revoke: new RevokePermissionUseCase(dependencies),
        },

        roles: {
            create: new CreateRoleUseCase(dependencies),
            get: new GetRoleUseCase(dependencies),
            list: new ListRolesUseCase(dependencies),
            update: new UpdateRoleUseCase(dependencies),
            archive: new ArchiveRoleUseCase(dependencies),
            restore: new RestoreRoleUseCase(dependencies),
            assign: new AssignRoleUseCase(dependencies),
            remove: new RemoveRoleUseCase(dependencies),
        },

        policies: {
            create: new CreatePolicyUseCase(dependencies),
            get: new GetPolicyUseCase(dependencies),
            list: new ListPoliciesUseCase(dependencies),
            update: new UpdatePolicyUseCase(dependencies),
            archive: new ArchivePolicyUseCase(dependencies),
        },

        restrictions: {
            create: new CreateRestrictionUseCase(dependencies),
            get: new GetRestrictionUseCase(dependencies),
            list: new ListRestrictionsUseCase(dependencies),
            remove: new RemoveRestrictionUseCase(dependencies),
        },

        authorization: {
            authorizeAction: new AuthorizeActionUseCase(dependencies),
            current: new CurrentAuthorizationUseCase(dependencies),
        },

        expirations: {
            assignment: new ExpireAssignmentUseCase(dependencies),
            restriction: new ExpireRestrictionUseCase(dependencies),
        },

        lifecycle: {
            identity: {
                activateAuthorization: new ActivateIdentityAuthorizationUseCase(dependencies),
                suspendAccess: new SuspendIdentityAccessUseCase(dependencies),
                archiveAccess: new ArchiveIdentityAccessUseCase(dependencies),
                restoreAuthorization: new RestoreIdentityAuthorizationUseCase(dependencies),
            },

            membership: {
                recordAuthorization: new RecordMembershipAuthorizationUseCase(dependencies),
                activateAuthorization: new ActivateMembershipAuthorizationUseCase(dependencies),
                suspendAuthorization: new SuspendMembershipAuthorizationUseCase(dependencies),
                archiveAuthorization: new ArchiveMembershipAuthorizationUseCase(dependencies),
                reactivateAuthorization: new ReactivateMembershipAuthorizationUseCase(dependencies),
            },

            tenant: {
                provisionAuthorization: new ProvisionTenantAuthorizationUseCase(dependencies),
                activateAuthorization: new ActivateTenantAuthorizationUseCase(dependencies),
                suspendAuthorization: new SuspendTenantAuthorizationUseCase(dependencies),
                reactivateAuthorization: new ReactivateTenantAuthorizationUseCase(dependencies),
                archiveAuthorization: new ArchiveTenantAuthorizationUseCase(dependencies),
            },

            subscription: {
                applyCapabilities: new ApplySubscriptionCapabilitiesUseCase(dependencies),
            },
        },
    };
}
