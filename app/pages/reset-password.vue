<script setup lang="ts">
import * as z from "zod"
import type { FormSubmitEvent } from "@nuxt/ui"

definePageMeta({ layout: false })

const apiBaseUrl = useApiBaseUrl()
const route = useRoute()
const loading = ref(false)
const completed = ref(false)
const errorMessage = ref("")
const token = computed(() => typeof route.query.token === "string" ? route.query.token : "")

const schema = z.object({
  newPassword: z.string().min(8, "Use at least 8 characters")
    .regex(/[a-z]/, "Include a lowercase letter")
    .regex(/[A-Z]/, "Include an uppercase letter")
    .regex(/\d/, "Include a number")
    .regex(/[^A-Za-z0-9]/, "Include a symbol"),
  confirmPassword: z.string().min(1, "Confirm your password")
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
})

type Schema = z.output<typeof schema>
const state = reactive<Partial<Schema>>({ newPassword: "", confirmPassword: "" })

async function resetPassword(event: FormSubmitEvent<Schema>) {
  loading.value = true
  errorMessage.value = ""
  try {
    await $fetch(`${apiBaseUrl}/api/auth/reset-password`, {
      method: "POST",
      credentials: "include",
      body: { token: token.value, ...event.data }
    })
    completed.value = true
  } catch (error: any) {
    errorMessage.value = error?.data?.message || "This reset link is invalid or has expired."
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
          <h1 class="text-2xl font-bold">Reset Password</h1>
          <p class="text-sm text-muted">Create a new password for your Non-AirNav account.</p>
        </div>
      </template>

      <div v-if="completed" class="space-y-5 text-center">
        <UIcon name="i-lucide-circle-check" class="size-12 text-success" />
        <p>Password reset successfully. You can now sign in.</p>
        <UButton to="/login" label="Go to Sign In" block />
      </div>
      <div v-else-if="!token" class="space-y-5 text-center">
        <p class="text-error">This reset link is invalid.</p>
        <UButton to="/forgot-password" label="Request a New Link" block />
      </div>
      <UForm v-else :schema="schema" :state="state" class="space-y-5" @submit="resetPassword">
        <UFormField label="New Password" name="newPassword" required>
          <UInput v-model="state.newPassword" type="password" autocomplete="new-password" class="w-full" />
        </UFormField>
        <p class="text-xs text-muted">Use at least 8 characters with uppercase, lowercase, number, and symbol.</p>
        <UFormField label="Confirm New Password" name="confirmPassword" required>
          <UInput v-model="state.confirmPassword" type="password" autocomplete="new-password" class="w-full" />
        </UFormField>
        <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
        <UButton type="submit" label="Reset Password" block :loading="loading" :disabled="loading" />
      </UForm>
    </UCard>
  </div>
</template>
