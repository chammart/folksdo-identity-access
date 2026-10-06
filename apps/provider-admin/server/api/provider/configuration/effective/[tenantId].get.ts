import { iamRequest } from "../../../../utils/iam"
export default defineEventHandler((event) => iamRequest(event, `/api/v1/tenants/${encodeURIComponent(getRouterParam(event, "tenantId") ?? "")}/iam/effective-policy`, { authenticated: true }))
