import type { ProviderSession } from "~/types/provider"

export function useProviderSession() {
  const session = useState<ProviderSession>("provider-session", () => ({ authenticated: false }))
  const loaded = useState<boolean>("provider-session-loaded", () => false)

  async function refresh() {
    // On SSR, useRequestFetch forwards the incoming browser headers/cookies to
    // the Provider BFF. On the client it behaves like the normal Nuxt fetch.
    const requestFetch = useRequestFetch()
    session.value = await requestFetch<ProviderSession>("/api/auth/session")
    loaded.value = true
    return session.value
  }

  async function signOut() {
    await $fetch("/api/auth/logout", { method: "POST" })
    session.value = { authenticated: false }
    loaded.value = true
    await navigateTo("/login")
  }

  return { session, loaded, refresh, signOut }
}
