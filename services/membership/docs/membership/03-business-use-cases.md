# Membership Service™ — Business Use Cases

## Command Use Cases

### Create Membership
Creates tenant participation for an Identity with the requested Membership type and lifecycle state permitted by the business rules.

### Invite Member
Creates a pending invitation for a normalized email and target tenant. Only the token hash is persisted. Emits the invitation-created fact used by downstream choreography.

### Redeem Invitation
Validates a redeemable invitation and binds the redeeming Identity to tenant participation. The invitation becomes redeemed atomically with the Membership transition required by the current contract.

### Revoke Invitation
Transitions a pending invitation to revoked. A revoked invitation cannot subsequently be redeemed.

### Expire Invitation
Transitions an eligible pending invitation to expired. It may be invoked explicitly or by the expiration worker.

### Activate Membership
Transitions an eligible pending Membership to active.

### Suspend Membership
Suspends an eligible Membership and records the reason/source needed for safe lifecycle restoration.

### Reactivate Membership
Restores an eligible suspended Membership to active when the suspension semantics permit it.

### Archive Membership
Archives an eligible Membership and records archival metadata.

### Switch Membership Context
Changes the authenticated Identity's active Membership and tenant context after validating that the selected Membership is valid for that Identity.

## Query Use Cases

### Current Membership Context
Resolves the authenticated Identity's current active Membership and tenant context.

### Get Membership
Returns a Membership by identifier subject to authorization and visibility rules.

### List Tenant Memberships
Returns Memberships belonging to a tenant.

### List Memberships for Provider
Provides the provider/operator Membership listing surface defined by the service.

### Get Invitation
Returns an invitation by identifier subject to the invitation-view contract.

### List Tenant Invitations
Returns invitations for a tenant, optionally constrained by invitation status.

## Reaction Use Cases

### Redeem Invitation Reaction
Consumes `identity.invitation_redemption.requested` and applies Membership-owned invitation redemption semantics.

### Activate Pending Memberships
Consumes `identity.user.activated` and activates eligible pending Membership participation associated with the activated Identity.

### Apply Membership Lifecycle Reaction
Translates external Identity/tenant/subscription lifecycle facts into Membership suspension, archival, or safe restoration behavior. Restoration is source-aware; for example, subscription restoration must not undo an unrelated manual suspension.

## Business Outcome

Every command changes only Membership-owned truth. Cross-boundary consequences are communicated through replayable events/outbox messages rather than direct ownership of another service's state.
