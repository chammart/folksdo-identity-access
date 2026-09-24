# Access Service™ — Events & Reactions

## Access-owned replayable events
Access emits business events for its state transitions, including:
- permission created / granted / revoked
- role created / updated / archived / restored / assigned / removed
- authorization policy created / updated / archived
- restriction created / removed / expired
- assignment expiration
- identity authorization activated / suspended / archived / restored
- membership authorization recorded / activated / suspended / archived / reactivated
- tenant authorization provisioned / activated / suspended / archived / reactivated
- subscription capabilities applied
- security policy applied
- authorization evaluated where the executable contract records that event

Exact event subjects and payloads are defined by the Access event/business-rule implementation and are the executable source of truth.

## Consumed lifecycle events
Access registers reactions for upstream events from:

### Identity
- user activated
- user disabled
- user archived
- user restored

### Membership
- membership created
- membership activated
- membership suspended
- membership archived
- membership reactivated

### Tenant
- tenant created
- tenant activated
- tenant suspended
- tenant archived
- tenant reactivated
- tenant restored

### Subscription
Commercial-state subjects including created, activated, suspended, resumed, renewed, plan changed, entitlements updated, cancelled and expired are mapped into the Access subscription-capability lifecycle.

## Reaction guarantees
Reactions adapt upstream event contracts into existing Access lifecycle use cases. They do not directly mutate persistence or execute business rules. Source event identifiers are propagated as source references so replay/idempotency semantics remain explicit.
