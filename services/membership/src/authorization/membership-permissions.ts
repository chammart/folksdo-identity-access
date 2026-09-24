// services/membership/src/authorization/membership-permissions.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP PERMISSIONS
// -----------------------------------------------------------------------------
// Canonical business permission identifiers required by Membership Operations™.
//
// Boundary:
//   • Membership owns which business permission protects each operation.
//   • Access Operations™ owns permission assignment, effective permission
//     resolution, policy evaluation, restriction evaluation, and the final
//     authorization decision.
//   • Membership does not interpret permission grants or wildcard permissions.
//
// Canonical permission identity:
//
//   service.resource.action
//
// The host authorization adapter translates these stable Membership permission
// identities into the public Access Operations™ authorization request contract.
// -----------------------------------------------------------------------------

export const membershipPermissions = {
    create: "membership.member.create",
    invite: "membership.member.invite",
    activate: "membership.member.activate",
    suspend: "membership.member.suspend",
    reactivate: "membership.member.reactivate",
    archive: "membership.member.archive",

    read: "membership.member.view",
    list: "membership.member.list",

    readInvitation: "membership.invitation.view",
    listInvitations: "membership.invitation.list",
    revokeInvitation: "membership.invitation.revoke",
    expireInvitation: "membership.invitation.expire",

    viewContext: "membership.context.view",
    switchContext: "membership.context.switch",
} as const;

export type MembershipPermission =
    (typeof membershipPermissions)[keyof typeof membershipPermissions];