# Membership Service™ — API Contract

## Base

Public Membership routes are under `/api/v1/membership`.

## Routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/v1/membership` | Create Membership |
| POST | `/api/v1/membership/invitations` | Invite member |
| POST | `/api/v1/membership/invitations/redeem` | Redeem invitation |
| POST | `/api/v1/membership/invitations/:invitationId/revoke` | Revoke invitation |
| POST | `/api/v1/membership/invitations/:invitationId/expire` | Expire invitation |
| GET | `/api/v1/membership/invitations/:invitationId` | Get invitation |
| GET | `/api/v1/membership/tenants/:tenantId/invitations` | List tenant invitations |
| POST | `/api/v1/membership/:membershipId/activate` | Activate Membership |
| POST | `/api/v1/membership/:membershipId/suspend` | Suspend Membership |
| POST | `/api/v1/membership/:membershipId/reactivate` | Reactivate Membership |
| POST | `/api/v1/membership/:membershipId/archive` | Archive Membership |
| GET | `/api/v1/membership/current` | Current Membership context |
| POST | `/api/v1/membership/context` | Switch Membership context |
| GET | `/api/v1/membership/memberships` | Provider/operator Membership listing |
| GET | `/api/v1/membership/:membershipId` | Get Membership |
| GET | `/api/v1/membership/tenant/:tenantId` | List tenant Memberships |

## HTTP Semantics

Creation endpoints use `201` where the current route contract creates a new resource. Successful reads and lifecycle operations use the route-defined success response. Authentication, authorization, validation, conflict/not-found, and invariant failures are translated through the Membership HTTP error boundary.

## Authentication and Authorization

Protected routes resolve the authenticated actor through the IAM runtime. Membership declares the business permission required for each protected operation; Access performs the authorization decision.

The API must not accept caller-supplied authorization truth as authoritative runtime context.

## Validation

Request bodies, route parameters, and query values are validated at the HTTP boundary before reaching business rules. Invitation status filters use the canonical invitation statuses: `pending`, `redeemed`, `revoked`, `expired`.

## Stability Rule

This document describes the human-readable HTTP surface. DTO source files remain the executable schema authority. Changes to routes, DTOs, status codes, or error contracts require corresponding API-contract and acceptance updates.
