import { iamRequest } from "../../utils/iam"
import type { IamMetrics, IamStatus } from "../../../app/types/provider"

export default defineEventHandler(async (event) => {
  const [status, metrics] = await Promise.all([
    iamRequest<IamStatus>(event, "/api/v1/admin/iam/status", { authenticated: true }),
    iamRequest<IamMetrics>(event, "/api/v1/admin/iam/metrics", { authenticated: true }),
  ])
  return { status, metrics }
})
