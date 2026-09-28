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


## Administration Read Contract

Access owns role-usage and access-summary facts used by R1 administration experiences. Roles-by-member, members-by-role and assignment counts are projections of Access-owned Role Assignment state; they do not create a separate administration aggregate. Tenant reads remain tenant-bound and provider authority is explicit.

## R2 Effective Access & Explanation

R2 exposes administration-grade access intelligence without creating a second authorization authority. Effective Access, Access Explanation, Access Summary, privileged-access classification and Access Impact remain Access-owned reads over canonical Access facts.

- Effective Access combines role-derived and direct permission candidates with Membership validity, effective dates, expiry and applicable active restrictions.
- Access Explanation evaluates a requested permission through the same canonical authorization evaluator used by runtime enforcement and returns its decision, stable reason code and evidence.
- Access Summary is derived from Effective Access; it is not separately persisted.
- Privileged access is a provider-owned policy over canonical permission IDs. It is deliberately separate from `Permission.classification`, which already represents catalog scope. A role is privileged when its permission set contains a privileged permission.
- Access Impact is a read-only pre-change projection over Access-owned role, assignment and permission facts. R2 role impact does not mutate the role or reserve a future mutation.
