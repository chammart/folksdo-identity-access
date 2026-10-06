export default defineNuxtRouteMiddleware(async (to) => {
  const { session, loaded, refresh } = useProviderSession()
  if (!loaded.value) await refresh()
  if (to.path === "/login") {
    if (session.value.authenticated) return navigateTo("/")
    return
  }
  if (!session.value.authenticated) return navigateTo("/login")
})
