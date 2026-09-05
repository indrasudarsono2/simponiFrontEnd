<script setup lang="ts">
definePageMeta({ layout: false })

const apiBaseUrl = useApiBaseUrl()
const identifier = ref("")
const loading = ref(false)
const submitted = ref(false)
const message = ref("")

async function submitRequest() {
  loading.value = true
  try {
    const response = await $fetch<{ message: string }>(`${apiBaseUrl}/api/auth/forgot-password`, {
      method: "POST",
      credentials: "include",
      body: { identifier: identifier.value.trim() }
    })
    message.value = response.message
    submitted.value = true
  } catch {
    message.value = "If an eligible account was found, password reset instructions have been sent."
    submitted.value = true
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-100 via-white to-green-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 flex items-center justify-center px-4">
    <UCard class="w-full max-w-lg shadow-xl">
      <template #header>
        <div class="text-center space-y-2">
          <h1 class="text-2xl font-bold">Forgot Password</h1>
          <p class="text-sm text-muted">For Non-AirNav accounts only.</p>
        </div>
      </template>

      <div v-if="submitted" class="space-y-5 text-center">
        <UIcon name="i-lucide-mail-check" class="size-12 text-primary" />
        <p>{{ message }}</p>
        <UButton to="/login" label="Back to Sign In" block />
      </div>
      <form v-else class="space-y-5" @submit.prevent="submitRequest">
        <UFormField label="Registered email or e-NIK" required>
          <UInput v-model="identifier" autocomplete="username" class="w-full" required />
        </UFormField>
        <UButton type="submit" label="Send Reset Link" block :loading="loading" :disabled="loading || !identifier.trim()" />
        <UButton to="/login" label="Cancel" color="neutral" variant="soft" block />
      </form>
    </UCard>
  </div>
</template>
