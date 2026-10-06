import { iamRequest } from "../../../utils/iam"
export default defineEventHandler((event) => iamRequest(event, "/api/v1/admin/iam/metrics", { authenticated: true }))
