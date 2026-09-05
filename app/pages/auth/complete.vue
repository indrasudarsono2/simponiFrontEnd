<script setup lang="ts">
import type { AuthUser } from '~/composables/useAuth'
import { getDashboardRoute } from '~/utils/dashboardRoute'

definePageMeta({ layout: false })

const config = useRuntimeConfig()
const { setAuthFromResponse } = useAuth()
const csrfToken = useCookie<string | null>('csrf_token')
const failure = ref(false)

onMounted(async () => {
  try {
    const apiBaseUrl = String(config.public.apiBaseUrl).replace(/\/+$/, '')
    const session = await $fetch<{ success: boolean, user: AuthUser }>(`${apiBaseUrl}/api/auth/session`, {
      credentials: 'include'
    })
    if (!session.success || !session.user || !csrfToken.value) {
      throw new Error('No authenticated session')
    }
    setAuthFromResponse({
      success: true,
      message: 'AirNav login successful',
      csrfToken: csrfToken.value,
      user: session.user
    })
    await navigateTo(getDashboardRoute(session.user.roles.map(role => role.roles.role)), { replace: true })
  } catch {
    failure.value = true
  }
})
</script>

<template>
  <main class="min-h-screen flex items-center justify-center p-6">
    <div class="space-y-4 text-center" role="status">
      <h1 class="text-xl font-semibold">
        {{ failure ? 'Unable to complete sign-in' : 'Completing AirNav sign-in…' }}
      </h1>
      <p v-if="failure">Your session could not be verified. Please sign in again.</p>
      <UButton v-if="failure" to="/login">Return to login</UButton>
    </div>
  </main>
</template>
