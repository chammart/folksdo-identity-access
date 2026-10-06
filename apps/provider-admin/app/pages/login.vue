<script setup lang="ts">
definePageMeta({ layout: "auth" })
const email = ref("")
const password = ref("")
const pending = ref(false)
const errorMessage = ref("")
const { session } = useProviderSession()

async function submit() {
  pending.value = true; errorMessage.value = ""
  try {
    session.value = await $fetch("/api/auth/login", { method: "POST", body: { email: email.value, password: password.value } })
    await navigateTo("/")
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage ?? error?.statusMessage ?? "Sign in failed."
  } finally { pending.value = false }
}
</script>
<template>
  <section class="login-card">
    <div class="login-brand"><div class="brand-mark brand-mark--large">S</div><div><strong>Saiwaly IAM™</strong><span>Provider Admin Experience</span></div></div>
    <div class="login-heading"><p class="eyebrow">PROVIDER OPERATIONS</p><h1>Sign in</h1><p>Use an Identity with explicit Provider authority.</p></div>
    <form @submit.prevent="submit">
      <label>Email<input v-model="email" type="email" autocomplete="username" required placeholder="operator@folksdo.com"></label>
      <label>Password<input v-model="password" type="password" autocomplete="current-password" required placeholder="••••••••"></label>
      <div v-if="errorMessage" class="alert alert--error">{{ errorMessage }}</div>
      <button class="primary-button" type="submit" :disabled="pending">{{ pending ? 'Verifying authority…' : 'Sign in to Provider Admin' }}</button>
    </form>
    <p class="login-note">Authentication and Provider authorization are enforced by Saiwaly IAM™.<br><strong>Saiwaly™ by Folksdo</strong></p>
  </section>
</template>
