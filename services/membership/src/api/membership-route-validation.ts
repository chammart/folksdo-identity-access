// services/membership/src/api/membership-route-validation.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP ROUTE VALIDATION
// -----------------------------------------------------------------------------
// Membership-owned HTTP request validation.
//
// Purpose:
//   • validate untrusted transport input
//   • reject malformed requests before application execution
//   • return strongly typed Membership API request contracts
//   • keep Zod and transport validation outside Membership use cases
//
// Boundary:
//   • performs structural input validation only
//   • contains no Membership lifecycle business rules
//   • performs no persistence or authorization
// -----------------------------------------------------------------------------

import {
    z,
} from "zod";

import type {
    ArchiveMembershipRequest,
    CreateMembershipRequest,
    InviteMemberRequest,
    ListMembershipsForProviderRequest,
    RedeemInvitationRequest,
    SuspendMembershipRequest,
    SwitchMembershipContextRequest,
} from "./membership-dtos";

// -----------------------------------------------------------------------------
// SHARED FIELD SCHEMAS
// -----------------------------------------------------------------------------

const identifierSchema =
    z.string()
        .trim()
        .min(
            1,
            "Identifier is required.",
        );

const emailSchema =
    z.string()
        .trim()
        .email(
            "A valid email address is required.",
        )
        .transform((value) =>
            value.toLowerCase(),
        );

const reasonSchema =
    z.string()
        .trim()
        .min(
            1,
            "Reason is required.",
        )
        .max(
            500,
            "Reason must not exceed 500 characters.",
        );

const membershipTypeSchema =
    z.enum([
        "member",
        "guest",
        "service",
        "provider_operator",
    ]);

// -----------------------------------------------------------------------------
// REQUEST SCHEMAS
// -----------------------------------------------------------------------------

const createMembershipRequestSchema =
    z.object({
        identityId:
            identifierSchema,

        tenantId:
            identifierSchema,

        membershipType:
            membershipTypeSchema,

        activate:
            z.boolean()
                .optional(),
    })
        .strict();

const inviteMemberRequestSchema =
    z.object({
        tenantId:
            identifierSchema,

        invitedEmail:
            emailSchema,

        membershipType:
            membershipTypeSchema,

        expiresInMilliseconds:
            z.number()
                .int()
                .positive()
                .optional(),
    })
        .strict();

const redeemInvitationRequestSchema =
    z.object({
        invitationId:
            identifierSchema,

        identityId:
            identifierSchema,

        identityEmail:
            emailSchema,
    })
        .strict();

const switchMembershipContextRequestSchema =
    z.object({
        membershipId:
            identifierSchema,
    })
        .strict();


const providerMembershipDateSchema =
    z.string()
        .datetime({ offset: true });

const listMembershipsForProviderQuerySchema =
    z.object({
        tenantId:
            identifierSchema.optional(),

        identityId:
            identifierSchema.optional(),

        status:
            z.enum([
                "pending",
                "active",
                "suspended",
                "archived",
            ]).optional(),

        membershipType:
            membershipTypeSchema.optional(),

        createdFrom:
            providerMembershipDateSchema.optional(),

        createdTo:
            providerMembershipDateSchema.optional(),

        updatedFrom:
            providerMembershipDateSchema.optional(),

        updatedTo:
            providerMembershipDateSchema.optional(),

        offset:
            z.coerce.number()
                .int()
                .min(0)
                .default(0),

        limit:
            z.coerce.number()
                .int()
                .min(1)
                .max(100)
                .default(50),
    })
        .strict()
        .superRefine((value, context) => {
            if (
                value.createdFrom !== undefined
                && value.createdTo !== undefined
                && value.createdFrom > value.createdTo
            ) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message:
                        "createdFrom must be before or equal to createdTo.",
                });
            }

            if (
                value.updatedFrom !== undefined
                && value.updatedTo !== undefined
                && value.updatedFrom > value.updatedTo
            ) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message:
                        "updatedFrom must be before or equal to updatedTo.",
                });
            }
        });

const reasonRequestSchema =
    z.object({
        reason:
            reasonSchema,
    })
        .strict();


// -----------------------------------------------------------------------------
// PROVIDER MEMBERSHIP READS
// -----------------------------------------------------------------------------

export function parseListMembershipsForProviderRequest(
    value: unknown,
): ListMembershipsForProviderRequest {
    return listMembershipsForProviderQuerySchema.parse(
        value,
    ) as ListMembershipsForProviderRequest;
}

// -----------------------------------------------------------------------------
// CREATE MEMBERSHIP
// -----------------------------------------------------------------------------

export function parseCreateMembershipRequest(
    value: unknown,
): CreateMembershipRequest {
    return createMembershipRequestSchema.parse(
        value,
    ) as CreateMembershipRequest;
}

// -----------------------------------------------------------------------------
// INVITE MEMBER
// -----------------------------------------------------------------------------

export function parseInviteMemberRequest(
    value: unknown,
): InviteMemberRequest {
    return inviteMemberRequestSchema.parse(
        value,
    ) as InviteMemberRequest;
}

// -----------------------------------------------------------------------------
// REDEEM INVITATION
// -----------------------------------------------------------------------------

export function parseRedeemInvitationRequest(
    value: unknown,
): RedeemInvitationRequest {
    return redeemInvitationRequestSchema.parse(
        value,
    ) as RedeemInvitationRequest;
}

// -----------------------------------------------------------------------------
// SWITCH MEMBERSHIP CONTEXT
// -----------------------------------------------------------------------------

export function parseSwitchMembershipContextRequest(
    value: unknown,
): SwitchMembershipContextRequest {
    return switchMembershipContextRequestSchema.parse(
        value,
    );
}

// -----------------------------------------------------------------------------
// MEMBERSHIP LIFECYCLE REASON
// -----------------------------------------------------------------------------

export function parseReasonRequest(
    value: unknown,
): SuspendMembershipRequest & ArchiveMembershipRequest {
    return reasonRequestSchema.parse(
        value,
    );
}