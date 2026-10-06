// services/access/src/runtime/provider-bootstrap.ts
// -----------------------------------------------------------------------------
// PROVIDER BOOTSTRAP — ACCESS PORT
// -----------------------------------------------------------------------------
// Trusted service-owned entry point used only by environment bootstrap tooling.
// All writes delegate to normal Access use cases, preserving canonical state,
// events and outbox. This port does not authorize a network caller.
// -----------------------------------------------------------------------------

import {
    PermissionAlreadyExistsError,
    PermissionAssignmentAlreadyExistsError,
} from "../errors";
import type { AccessQueryReadStore } from "../read-store";
import type { ComposedAccessUseCases } from "./composition/compose-access-usecases";

export interface ProviderBootstrapPermission {
    readonly service: string;
    readonly resource: string;
    readonly action: string;
    readonly displayName: string;
    readonly description: string;
}

export interface AccessProviderBootstrap {
    ensurePermission(permission: ProviderBootstrapPermission, actorId: string): Promise<string>;
    ensureGrant(input: {
        readonly membershipId: string;
        readonly tenantId: string;
        readonly permissionId: string;
        readonly actorId: string;
    }): Promise<void>;
}

export function createAccessProviderBootstrap(
    useCases: ComposedAccessUseCases,
    readStore: AccessQueryReadStore,
): AccessProviderBootstrap {
    return {
        async ensurePermission(permission, actorId) {
            const permissionId = [permission.service, permission.resource, permission.action].join(".");
            try {
                await useCases.permissions.create.execute({
                    ...permission,
                    classification: "administrative",
                    createdBy: actorId,
                });
            } catch (error) {
                if (!(error instanceof PermissionAlreadyExistsError)) throw error;
            }
            return permissionId;
        },

        async ensureGrant(input) {
            const assignments = await readStore.listPermissionAssignments(
                input.membershipId,
            );
            const existing = assignments.find(assignment =>
                assignment.permissionId === input.permissionId
                && assignment.tenantId === input.tenantId
                && assignment.assignmentType === "grant"
                && assignment.scope.scopeType === "tenant"
            );

            // A grant created while Access still knew the Membership as pending
            // is canonical desired state. Membership activation reactions own the
            // pending -> active transition, so bootstrap must not insert a
            // duplicate assignment while that projection catches up.
            if (existing?.status === "active" || existing?.status === "pending") {
                return;
            }
            if (existing !== undefined) {
                throw new Error(
                    `Provider Permission assignment ${input.permissionId} exists in status ${existing.status}; bootstrap will not override Access lifecycle state.`,
                );
            }

            try {
                await useCases.permissions.grant.execute({
                    membershipId: input.membershipId,
                    tenantId: input.tenantId,
                    permissionId: input.permissionId,
                    assignmentType: "grant",
                    scope: { scopeType: "tenant" },
                    assignedBy: input.actorId,
                });
            } catch (error) {
                if (!(error instanceof PermissionAssignmentAlreadyExistsError)) throw error;
            }
        },
    };
}
