// services/access/src/api/register-access-routes.ts
// -----------------------------------------------------------------------------
// REGISTER ACCESS ROUTES
// -----------------------------------------------------------------------------
// Fastify transport registration for Access Operations™.
//
// Purpose:
//   • register the canonical Access HTTP routes
//   • resolve request context through an injected transport adapter
//   • delegate requests to the provider-neutral AccessApi
//   • translate Access failures into stable HTTP responses
//   • keep the application and business layers independent from Fastify
//
// Boundary:
//   • contains Fastify-specific registration only
//   • performs no business lifecycle decisions
//   • performs no direct persistence access
//   • does not construct Access use cases
//   • does not construct authentication or membership infrastructure
// -----------------------------------------------------------------------------

import type {
    FastifyInstance,
    FastifyReply,
    FastifyRequest,
} from "fastify";

import type {
    AccessApi,
    AccessApiRequestContext,
} from "./access-api-contracts";

import {
    ACCESS_API_PREFIX,

    archivePolicyRoute,
    archiveRoleRoute,
    assignRoleRoute,
    authorizeRoute,
    createPermissionRoute,
    createPolicyRoute,
    createRestrictionRoute,
    createRoleRoute,
    getPermissionRoute,
    getRoleRoute,
    grantPermissionRoute,
    listPermissionAssignmentsRoute,
    listPermissionsRoute,
    listPoliciesRoute,
    listRestrictionsRoute,
    listRoleAssignmentsRoute,
    listRolesRoute,
    removeRestrictionRoute,
    removeRoleRoute,
    restoreRoleRoute,
    revokePermissionRoute,
    updatePolicyRoute,
    updateRoleRoute,
} from "./access-routes";

import {
    toAccessHttpErrorBody,
} from "./access-http-errors";

// -----------------------------------------------------------------------------
// REQUEST SHAPES
// -----------------------------------------------------------------------------

interface AccessPermissionParameters {
    readonly permissionId: string;
}

interface AccessRoleParameters {
    readonly roleId: string;
}

interface AccessRoleAssignmentParameters {
    readonly assignmentId: string;
}

interface AccessPermissionAssignmentParameters {
    readonly assignmentId: string;
}

interface AccessPolicyParameters {
    readonly policyId: string;
}

interface AccessRestrictionParameters {
    readonly restrictionId: string;
}

// -----------------------------------------------------------------------------
// CONTEXT RESOLVER
// -----------------------------------------------------------------------------

export interface AccessApiRequestContextResolver {
    resolve(
        request: FastifyRequest,
    ): Promise<AccessApiRequestContext>;
}

// -----------------------------------------------------------------------------
// VALIDATION ADAPTER
// -----------------------------------------------------------------------------

/**
 * Transport validation remains injected because the canonical request
 * validation implementation belongs in api/validation.
 *
 * Each function must either:
 *
 *   • return a validated and normalized API request/query value
 *   • throw AccessValidationHttpError
 *
 * Keeping validation outside this file prevents route registration from
 * becoming coupled to Zod, TypeBox or another concrete schema provider.
 */
export interface AccessApiValidation {
    readonly createPermission:
    AccessApi["createPermission"] extends (
        request: infer TRequest,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
    ) => TRequest
    : never;

    readonly listPermissions:
    AccessApi["listPermissions"] extends (
        query: infer TQuery,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
    ) => TQuery
    : never;

    readonly createRole:
    AccessApi["createRole"] extends (
        request: infer TRequest,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
    ) => TRequest
    : never;

    readonly updateRole:
    AccessApi["updateRole"] extends (
        request: infer TRequest,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
        roleId: string,
    ) => TRequest
    : never;

    readonly archiveRole:
    AccessApi["archiveRole"] extends (
        request: infer TRequest,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
        roleId: string,
    ) => TRequest
    : never;

    readonly restoreRole:
    AccessApi["restoreRole"] extends (
        request: infer TRequest,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
        roleId: string,
    ) => TRequest
    : never;

    readonly listRoles:
    AccessApi["listRoles"] extends (
        query: infer TQuery,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
    ) => TQuery
    : never;

    readonly assignRole:
    AccessApi["assignRole"] extends (
        request: infer TRequest,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
    ) => TRequest
    : never;

    readonly removeRole:
    AccessApi["removeRole"] extends (
        request: infer TRequest,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
        assignmentId: string,
    ) => TRequest
    : never;

    readonly listRoleAssignments:
    AccessApi["listRoleAssignments"] extends (
        query: infer TQuery,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
    ) => TQuery
    : never;

    readonly grantPermission:
    AccessApi["grantPermission"] extends (
        request: infer TRequest,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
    ) => TRequest
    : never;

    readonly revokePermission:
    AccessApi["revokePermission"] extends (
        request: infer TRequest,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
        assignmentId: string,
    ) => TRequest
    : never;

    readonly listPermissionAssignments:
    AccessApi["listPermissionAssignments"] extends (
        query: infer TQuery,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
    ) => TQuery
    : never;

    readonly createPolicy:
    AccessApi["createPolicy"] extends (
        request: infer TRequest,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
    ) => TRequest
    : never;

    readonly updatePolicy:
    AccessApi["updatePolicy"] extends (
        request: infer TRequest,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
        policyId: string,
    ) => TRequest
    : never;

    readonly archivePolicy:
    AccessApi["archivePolicy"] extends (
        request: infer TRequest,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
        policyId: string,
    ) => TRequest
    : never;

    readonly listPolicies:
    AccessApi["listPolicies"] extends (
        query: infer TQuery,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
    ) => TQuery
    : never;

    readonly createRestriction:
    AccessApi["createRestriction"] extends (
        request: infer TRequest,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
    ) => TRequest
    : never;

    readonly removeRestriction:
    AccessApi["removeRestriction"] extends (
        request: infer TRequest,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
        restrictionId: string,
    ) => TRequest
    : never;

    readonly listRestrictions:
    AccessApi["listRestrictions"] extends (
        query: infer TQuery,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
    ) => TQuery
    : never;

    readonly authorize:
    AccessApi["authorize"] extends (
        request: infer TRequest,
        context: AccessApiRequestContext,
    ) => unknown
    ? (
        value: unknown,
    ) => TRequest
    : never;
}

// -----------------------------------------------------------------------------
// DEPENDENCIES
// -----------------------------------------------------------------------------

export interface RegisterAccessRoutesDependencies {
    readonly api: AccessApi;

    readonly contextResolver:
    AccessApiRequestContextResolver;

    readonly validation:
    AccessApiValidation;
}

// -----------------------------------------------------------------------------
// ROUTE REGISTRATION
// -----------------------------------------------------------------------------

export async function registerAccessRoutes(
    server: FastifyInstance,
    dependencies:
        RegisterAccessRoutesDependencies,
): Promise<void> {
    const {
        api,
        contextResolver,
        validation,
    } = dependencies;

    // -------------------------------------------------------------------------
    // PERMISSIONS
    // -------------------------------------------------------------------------

    server.post(
        `${ACCESS_API_PREFIX}${createPermissionRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                createPermissionRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const command =
                        validation.createPermission(
                            request.body,
                        );

                    return api.createPermission(
                        command,
                        context,
                    );
                },
            ),
    );

    server.get<{
        Params: AccessPermissionParameters;
    }>(
        `${ACCESS_API_PREFIX}${getPermissionRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                getPermissionRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    return api.getPermission(
                        request.params.permissionId,
                        context,
                    );
                },
            ),
    );

    server.get(
        `${ACCESS_API_PREFIX}${listPermissionsRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                listPermissionsRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const query =
                        validation.listPermissions(
                            request.query,
                        );

                    return api.listPermissions(
                        query,
                        context,
                    );
                },
            ),
    );

    // -------------------------------------------------------------------------
    // ROLES
    // -------------------------------------------------------------------------

    server.post(
        `${ACCESS_API_PREFIX}${createRoleRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                createRoleRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const command =
                        validation.createRole(
                            request.body,
                        );

                    return api.createRole(
                        command,
                        context,
                    );
                },
            ),
    );

    server.get<{
        Params: AccessRoleParameters;
    }>(
        `${ACCESS_API_PREFIX}${getRoleRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                getRoleRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    return api.getRole(
                        request.params.roleId,
                        context,
                    );
                },
            ),
    );

    server.get(
        `${ACCESS_API_PREFIX}${listRolesRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                listRolesRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const query =
                        validation.listRoles(
                            request.query,
                        );

                    return api.listRoles(
                        query,
                        context,
                    );
                },
            ),
    );

    server.patch<{
        Params: AccessRoleParameters;
    }>(
        `${ACCESS_API_PREFIX}${updateRoleRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                updateRoleRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const command =
                        validation.updateRole(
                            request.body,
                            request.params.roleId,
                        );

                    return api.updateRole(
                        command,
                        context,
                    );
                },
            ),
    );

    server.post<{
        Params: AccessRoleParameters;
    }>(
        `${ACCESS_API_PREFIX}${archiveRoleRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                archiveRoleRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const command =
                        validation.archiveRole(
                            request.body,
                            request.params.roleId,
                        );

                    return api.archiveRole(
                        command,
                        context,
                    );
                },
            ),
    );

    server.post<{
        Params: AccessRoleParameters;
    }>(
        `${ACCESS_API_PREFIX}${restoreRoleRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                restoreRoleRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const command =
                        validation.restoreRole(
                            request.body,
                            request.params.roleId,
                        );

                    return api.restoreRole(
                        command,
                        context,
                    );
                },
            ),
    );

    // -------------------------------------------------------------------------
    // ROLE ASSIGNMENTS
    // -------------------------------------------------------------------------

    server.post(
        `${ACCESS_API_PREFIX}${assignRoleRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                assignRoleRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const command =
                        validation.assignRole(
                            request.body,
                        );

                    return api.assignRole(
                        command,
                        context,
                    );
                },
            ),
    );

    server.post<{
        Params: AccessRoleAssignmentParameters;
    }>(
        `${ACCESS_API_PREFIX}${removeRoleRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                removeRoleRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const command =
                        validation.removeRole(
                            request.body,
                            request.params.assignmentId,
                        );

                    return api.removeRole(
                        command,
                        context,
                    );
                },
            ),
    );

    server.get(
        `${ACCESS_API_PREFIX}${listRoleAssignmentsRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                listRoleAssignmentsRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const query =
                        validation.listRoleAssignments(
                            request.query,
                        );

                    return api.listRoleAssignments(
                        query,
                        context,
                    );
                },
            ),
    );

    // -------------------------------------------------------------------------
    // PERMISSION ASSIGNMENTS
    // -------------------------------------------------------------------------

    server.post(
        `${ACCESS_API_PREFIX}${grantPermissionRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                grantPermissionRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const command =
                        validation.grantPermission(
                            request.body,
                        );

                    return api.grantPermission(
                        command,
                        context,
                    );
                },
            ),
    );

    server.post<{
        Params: AccessPermissionAssignmentParameters;
    }>(
        `${ACCESS_API_PREFIX}${revokePermissionRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                revokePermissionRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const command =
                        validation.revokePermission(
                            request.body,
                            request.params.assignmentId,
                        );

                    return api.revokePermission(
                        command,
                        context,
                    );
                },
            ),
    );

    server.get(
        `${ACCESS_API_PREFIX}${listPermissionAssignmentsRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                listPermissionAssignmentsRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const query =
                        validation.listPermissionAssignments(
                            request.query,
                        );

                    return api.listPermissionAssignments(
                        query,
                        context,
                    );
                },
            ),
    );

    // -------------------------------------------------------------------------
    // AUTHORIZATION POLICIES
    // -------------------------------------------------------------------------

    server.post(
        `${ACCESS_API_PREFIX}${createPolicyRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                createPolicyRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const command =
                        validation.createPolicy(
                            request.body,
                        );

                    return api.createPolicy(
                        command,
                        context,
                    );
                },
            ),
    );

    server.get(
        `${ACCESS_API_PREFIX}${listPoliciesRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                listPoliciesRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const query =
                        validation.listPolicies(
                            request.query,
                        );

                    return api.listPolicies(
                        query,
                        context,
                    );
                },
            ),
    );

    server.patch<{
        Params: AccessPolicyParameters;
    }>(
        `${ACCESS_API_PREFIX}${updatePolicyRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                updatePolicyRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const command =
                        validation.updatePolicy(
                            request.body,
                            request.params.policyId,
                        );

                    return api.updatePolicy(
                        command,
                        context,
                    );
                },
            ),
    );

    server.post<{
        Params: AccessPolicyParameters;
    }>(
        `${ACCESS_API_PREFIX}${archivePolicyRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                archivePolicyRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const command =
                        validation.archivePolicy(
                            request.body,
                            request.params.policyId,
                        );

                    return api.archivePolicy(
                        command,
                        context,
                    );
                },
            ),
    );

    // -------------------------------------------------------------------------
    // ACCESS RESTRICTIONS
    // -------------------------------------------------------------------------

    server.post(
        `${ACCESS_API_PREFIX}${createRestrictionRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                createRestrictionRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const command =
                        validation.createRestriction(
                            request.body,
                        );

                    return api.createRestriction(
                        command,
                        context,
                    );
                },
            ),
    );

    server.post<{
        Params: AccessRestrictionParameters;
    }>(
        `${ACCESS_API_PREFIX}${removeRestrictionRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                removeRestrictionRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const command =
                        validation.removeRestriction(
                            request.body,
                            request.params.restrictionId,
                        );

                    return api.removeRestriction(
                        command,
                        context,
                    );
                },
            ),
    );

    server.get(
        `${ACCESS_API_PREFIX}${listRestrictionsRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                listRestrictionsRoute.successStatusCode,
                async () => {
                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    const query =
                        validation.listRestrictions(
                            request.query,
                        );

                    return api.listRestrictions(
                        query,
                        context,
                    );
                },
            ),
    );

    // -------------------------------------------------------------------------
    // AUTHORIZATION
    // -------------------------------------------------------------------------

    server.post(
        `${ACCESS_API_PREFIX}${authorizeRoute.path}`,
        async (
            request,
            reply,
        ) =>
            executeAccessRoute(
                reply,
                authorizeRoute.successStatusCode,
                async () => {
                    const command =
                        validation.authorize(
                            request.body,
                        );

                    const context =
                        await contextResolver.resolve(
                            request,
                        );

                    return api.authorize(
                        command,
                        context,
                    );
                },
            ),
    );
}

// -----------------------------------------------------------------------------
// ROUTE EXECUTION
// -----------------------------------------------------------------------------

async function executeAccessRoute<TResult>(
    reply: FastifyReply,
    successStatusCode: number,
    operation: () => Promise<TResult>,
): Promise<FastifyReply> {
    try {
        const result =
            await operation();

        return reply
            .code(
                successStatusCode,
            )
            .send(
                result,
            );
    } catch (
    error
    ) {

        const response =
            toAccessHttpErrorBody(
                error,
            );

        return reply
            .code(
                response.statusCode,
            )
            .send(
                response.body,
            );
    }
}