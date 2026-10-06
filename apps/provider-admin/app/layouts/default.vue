<script setup lang="ts">
const { session, signOut } = useProviderSession()
const mobileOpen = ref(false)
const navigation = [
  { label: "Overview", to: "/", icon: "grid" },
  { section: "IDENTITY & ACCESS" },
  { label: "Identities", to: "/identities", icon: "user" },
  { label: "Memberships", to: "/memberships", icon: "people" },
  { label: "Access", to: "/access", icon: "shield" },
  { section: "OPERATIONS" },
  { label: "Security", to: "/security", icon: "lock" },
  { label: "Investigation", to: "/investigation", icon: "search" },
  { label: "Activity", to: "/activity", icon: "pulse" },
  { section: "PLATFORM" },
  { label: "Configuration", to: "/configuration", icon: "settings" },
  { label: "Metrics", to: "/metrics", icon: "chart" },
]
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar" :class="{ 'sidebar--open': mobileOpen }">
      <div class="brand"><div class="brand-mark">S</div><div><strong>Saiwaly IAM™</strong><span>Provider Admin</span></div></div>
      <nav class="nav">
        <template v-for="(item, index) in navigation" :key="index">
          <div v-if="item.section" class="nav-section">{{ item.section }}</div>
          <NuxtLink v-else :to="item.to!" class="nav-item" @click="mobileOpen = false">
            <AppIcon :name="item.icon!" /><span>{{ item.label }}</span>
          </NuxtLink>
        </template>
      </nav>
      <div class="sidebar-foot"><div><span class="status-dot" /> Connected to Saiwaly IAM™</div><small>Saiwaly™ by Folksdo</small></div>
    </aside>
    <div v-if="mobileOpen" class="backdrop" @click="mobileOpen = false" />
    <div class="main-shell">
      <header class="topbar">
        <button class="icon-button mobile-menu" aria-label="Open navigation" @click="mobileOpen = true"><AppIcon name="menu" /></button>
        <div class="topbar-title"><strong>Provider Operations</strong><span>Identity · Membership · Access</span></div>
        <div class="operator"><div class="operator-copy"><strong>{{ session.user?.email ?? 'Provider operator' }}</strong><span>Provider authority</span></div><div class="avatar">{{ (session.user?.email?.[0] ?? 'P').toUpperCase() }}</div><button class="icon-button" title="Sign out" @click="signOut"><AppIcon name="logout" /></button></div>
      </header>
      <main class="content"><slot /></main>
    </div>
  </div>
</template>
