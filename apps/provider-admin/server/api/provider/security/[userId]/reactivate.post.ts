import { iamRequest } from "../../../../utils/iam"
export default defineEventHandler(async (event) => { const userId = getRouterParam(event, "userId"); if (!userId) throw createError({ statusCode: 400, statusMessage: "Identity is required." }); return await iamRequest(event, `/api/v1/identities/${encodeURIComponent(userId)}/reactivate`, { method: "POST", authenticated: true }) })
