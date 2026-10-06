import { iamRequest, clearProviderSession } from "../../utils/iam"

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, "folksdo_provider_session")
  if (sessionId) {
    try { await iamRequest(event, "/api/v1/identity/sign-out", { method: "POST", authenticated: true, body: { sessionId } }) } catch {}
  }
  clearProviderSession(event)
  return { authenticated: false }
})
