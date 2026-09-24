// services/access/src/authorization/onboarding-administrative-permissions.ts
// -----------------------------------------------------------------------------
// ONBOARDING ADMINISTRATIVE PERMISSIONS
// -----------------------------------------------------------------------------
// Canonical Access-owned Permission vocabulary for Onboarding Operations™.
//
// Purpose:
//   • define stable Permission identifiers for protected Onboarding actions
//   • preserve the canonical service.resource.action business identity
//   • provide structured Permission requests for deterministic authorization
//   • prevent Onboarding/server composition from constructing identifiers ad hoc
//   • keep bootstrap continuation authority outside the Access Permission Catalog
//
// Boundary:
//   • Access Operations™ owns the canonical Permission Catalog
//   • Onboarding Operations™ declares which protected business action is required
//   • bootstrap continuation authority remains Onboarding-owned and journey-bound
//   • contains no route registration or transport logic
//   • contains no authorization evaluation
//   • contains no persistence or infrastructure dependencies
// -----------------------------------------------------------------------------

import type {
    AccessPermissionRequest,
} from "./access-permissions";

// -----------------------------------------------------------------------------
// ONBOARDING ADMINISTRATIVE PERMISSION IDENTIFIER
// -----------------------------------------------------------------------------

export type OnboardingAdministrativePermissionId =
    `onboarding.${string}.${string}`;

// -----------------------------------------------------------------------------
// ONBOARDING ADMINISTRATIVE PERMISSION
// -----------------------------------------------------------------------------

export interface OnboardingAdministrativePermission
    extends AccessPermissionRequest {
    readonly permissionId:
        OnboardingAdministrativePermissionId;

    readonly service:
        "onboarding";
}

// -----------------------------------------------------------------------------
// PERMISSION FACTORY
// -----------------------------------------------------------------------------

function defineOnboardingAdministrativePermission<
    TResource extends string,
    TAction extends string,
>(
    resource: TResource,
    action: TAction,
): OnboardingAdministrativePermission & {
    readonly permissionId:
        `onboarding.${TResource}.${TAction}`;
    readonly service:
        "onboarding";
    readonly resource:
        TResource;
    readonly action:
        TAction;
} {
    const permissionId =
        `onboarding.${resource}.${action}` as
        `onboarding.${TResource}.${TAction}`;

    return {
        permissionId,
        service:
            "onboarding",
        resource,
        action,
    };
}

// -----------------------------------------------------------------------------
// CANONICAL ONBOARDING PERMISSION CATALOG
// -----------------------------------------------------------------------------

export const ONBOARDING_ADMINISTRATIVE_PERMISSIONS = {
    onboardingCreate:
        defineOnboardingAdministrativePermission(
            "onboarding",
            "create",
        ),

    onboardingStart:
        defineOnboardingAdministrativePermission(
            "onboarding",
            "start",
        ),

    onboardingView:
        defineOnboardingAdministrativePermission(
            "onboarding",
            "view",
        ),

    onboardingList:
        defineOnboardingAdministrativePermission(
            "onboarding",
            "list",
        ),

    onboardingResume:
        defineOnboardingAdministrativePermission(
            "onboarding",
            "resume",
        ),

    onboardingComplete:
        defineOnboardingAdministrativePermission(
            "onboarding",
            "complete",
        ),

    onboardingCancel:
        defineOnboardingAdministrativePermission(
            "onboarding",
            "cancel",
        ),

    onboardingAbandon:
        defineOnboardingAdministrativePermission(
            "onboarding",
            "abandon",
        ),

    establishmentUpdate:
        defineOnboardingAdministrativePermission(
            "establishment",
            "update",
        ),

    requirementView:
        defineOnboardingAdministrativePermission(
            "requirement",
            "view",
        ),

    progressView:
        defineOnboardingAdministrativePermission(
            "progress",
            "view",
        ),
} as const;

export type OnboardingAdministrativePermissionName =
    keyof typeof ONBOARDING_ADMINISTRATIVE_PERMISSIONS;
