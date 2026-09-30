# Access Service™ — Business Use Cases

## Authorization
- Authorize Action
- Resolve Current Authorization

## Permissions
- Create Permission
- Get Permission
- List Permissions
- Grant Permission
- Revoke Permission
- List Permission Assignments

## Roles
- Create Role
- Get Role
- List Roles
- Update Role
- Archive Role
- Restore Role
- Assign Role
- Remove Role Assignment
- List Role Assignments
- Role Usage Queries — the role-assignment directory supports roles-by-member, members-by-role and assignment counts without creating a second role-usage authority

## Authorization policies
- Create Policy
- Get Policy (internal/API capability)
- List Policies
- Update Policy
- Archive Policy

## Restrictions
- Create Restriction
- Get Restriction (internal/API capability)
- List Restrictions
- Remove Restriction

## Expiration processing
- Expire Role/Permission Assignment
- Expire Restriction

## Lifecycle synchronization
Access also owns lifecycle use cases invoked by reactions to activate, suspend, archive, restore or reactivate authorization for identities, memberships and tenants; provision tenant authorization; record known membership authorization; and apply subscription capabilities/security-policy changes.

These lifecycle operations are not alternate owners of upstream business state. They maintain the Access authorization model from replayable upstream facts.

## R2 access intelligence
- Get Effective Access — return active role-derived/direct permission candidates, effective/expiry facts, Membership validity and applicable restrictions for an authorized target Membership.
- Explain Access — evaluate a requested permission for the target Membership through the canonical authorization evaluator and return `allow`/`deny`, reason code and evidence.
- Get Access Summary — compact counts derived from Effective Access, including role/direct/restriction/expiring access and privileged-access indicators.
- Classify Privileged Access — provider-owned permission-ID policy; role privilege is derived from role permissions rather than stored independently.
- Get Role Access Impact — read-only pre-change impact showing affected Memberships, assignments, permissions and privileged permissions for a role.

## R5 administration workflows & governance
- Clone Tenant Role — creates an independent Tenant Role with copied permissions and optional descriptive overrides.
- Bulk Role Assignment / Removal — bounded deterministic administration operations with per-item outcomes.
- Apply Initial Access — consumes Membership activation intent and delegates creation to the canonical Access role-assignment use case.
- Direct Access Governance — direct permission assignments may carry human-readable `justification` and `reviewAt` governance metadata.
- Direct Access Exception Query — lists active direct assignments with governance metadata and derived `current` / `due` review status.

R5 governance metadata is a foundation for administration. It is not the recurring Access Review lifecycle introduced by R6.

