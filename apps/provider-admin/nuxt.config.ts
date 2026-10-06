// apps/provider-admin/nuxt.config.ts
// -----------------------------------------------------------------------------
// PROVIDER ADMIN CONFIGURATION
// -----------------------------------------------------------------------------
// Application configuration only. Folksdo IAM remains the business authority.
// -----------------------------------------------------------------------------

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    iamBaseUrl: process.env.FOLKSDO_IAM_BASE_URL ?? "http://127.0.0.1:3100",
    public: {
      appName: "Saiwaly IAM™",
    },
  },
  typescript: {
    typeCheck: true,
  },
})
