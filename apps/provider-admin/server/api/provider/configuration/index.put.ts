import { iamRequest } from "../../../utils/iam"
export default defineEventHandler(async (event) => iamRequest(event, "/api/v1/admin/iam/policy", { method: "PUT", body: await readBody(event), authenticated: true }))
