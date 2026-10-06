import { iamRequest, clearProviderSession } from "../../utils/iam"

interface CurrentSession { userId?: string }
interface CurrentUser { userId: string; email: string }

export default defineEventHandler(async (event) => {
  try {
    await iamRequest<CurrentSession>(event, "/api/v1/identity/session", { authenticated: true })
    const user = await iamRequest<CurrentUser>(event, "/api/v1/identity/me", { authenticated: true })
    await iamRequest(event, "/api/v1/admin/iam/status", { authenticated: true })
    return { authenticated: true, user: { userId: user.userId, email: user.email } }
  } catch {
    clearProviderSession(event)
    return { authenticated: false }
  }
})
