# Access Service™ — Capability & Domain Design

## Purpose
Access Service™ is the **What** boundary of Folksdo IAM™. It owns authorization truth: permissions, roles, assignments, authorization policies, restrictions, and authorization decisions.

Identity answers **Who?** Membership answers **Where?** Access answers **What may this actor do here?**

## Owned domain state
- Permission
- Role
- Role Assignment
- Permission Assignment
- Authorization Policy
- Access Restriction
- Known Identity, Membership, Tenant, and Subscription Capability facts required for authorization

## Core invariants
- Authorization is deny-by-default.
- Runtime-context permission strings are not authority; decisions are resolved through Access-owned state.
- Roles and direct permission assignments are explicit authorization inputs.
- Restrictions participate in effective authorization and can override grants according to canonical precedence.
- Archived/suspended lifecycle state cannot silently retain effective authority.
- Cross-service lifecycle facts are learned through replayable reactions rather than direct ownership of foreign state.
- Mutations commit canonical state and replayable events through the Folksdo Engine contract.

## Does not own
Access does not own authentication credentials or sessions, Membership lifecycle, tenant business state, subscription commercial truth, or provider/customer UI state.
