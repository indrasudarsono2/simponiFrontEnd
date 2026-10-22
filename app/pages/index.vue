<script setup lang="ts">
import { getDashboardRoute } from '~/utils/dashboardRoute'

// Keep old home links valid without rendering the retired demonstration dashboard.
definePageMeta({ layout: false })
const { isAuthenticated, getRoleNames } = useAuth()
await navigateTo(isAuthenticated.value ? getDashboardRoute(getRoleNames()) : '/login', { replace: true })
</script>

<template>
  <div role="status">Redirecting…</div>
</template>
