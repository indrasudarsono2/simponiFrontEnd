<script setup lang="ts">
import { getDashboardRoute } from '~/utils/dashboardRoute'

definePageMeta({
  layout: false
})

const { loginWithApi, isAuthenticated, getRoleNames } = useAuth()
const toast = useToast()
const router = useRouter()

const form = reactive({
  nik: '',
  password: ''
})

const isSubmitting = ref(false)

const validateNik = (nik: string) => /^[A-Za-z0-9]{8}$/.test(nik.trim())

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const requestError = error as {
      message?: string
      data?: { message?: string }
    }
    return requestError.data?.message
      || requestError.message
      || 'Please check your credentials and try again.'
  }
  return 'Please check your credentials and try again.'
}

const handleLogin = async () => {
  if (!validateNik(form.nik)) {
    toast.add({
      title: 'Invalid e-NIK',
      description: 'e-NIK must contain exactly 8 letters or digits.',
      color: 'error'
    })
    return
  }

  if (!form.password || form.password.length < 6) {
    toast.add({
      title: 'Invalid password',
      description: 'Password must contain at least 6 characters.',
      color: 'error'
    })
    return
  }

  isSubmitting.value = true

  try {
    const response = await loginWithApi(form.nik, form.password)

    toast.add({
      title: 'Login successful',
      description: response.message || 'Welcome to the application.',
      color: 'success'
    })

    const roleNames = response.user.roles.map(role => role.roles.role)
    await router.push(getDashboardRoute(roleNames))
  } catch (error: unknown) {
    toast.add({
      title: 'Login failed',
      description: getErrorMessage(error),
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  if (isAuthenticated.value) {
    router.push(getDashboardRoute(getRoleNames()))
  }
})
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-100 via-white to-green-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 flex items-center justify-center px-4"
  >
    <div class="w-full max-w-lg">
      <UCard class="shadow-xl ring-1 ring-gray-200/70 dark:ring-gray-800">
        <template #header>
          <div class="space-y-3 text-center">
            <img
              src="/performa-logo.png"
              alt="PERFORMA - Performance and Operational Record Management Application"
              class="mx-auto h-auto w-full max-w-md object-contain"
            >
            <h1
              class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
            >
              Application Login
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Sign in using your e-NIK and password
            </p>
          </div>
        </template>

        <form class="space-y-5" method="post" action="/login" @submit.prevent="handleLogin">
          <UFormField label="e-NIK" name="nik" required>
            <UInput
              v-model="form.nik"
              placeholder="Enter your 8-character e-NIK"
              icon="i-lucide-id-card"
              size="xl"
              :maxlength="8"
              autocomplete="username"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Password" name="password" required>
            <UInput
              v-model="form.password"
              type="password"
              placeholder="Enter your password"
              icon="i-lucide-lock"
              size="xl"
              autocomplete="current-password"
              class="w-full"
            />
          </UFormField>

          <UButton
            type="submit"
            block
            size="xl"
            :loading="isSubmitting"
            :disabled="isSubmitting"
            icon="i-lucide-log-in"
          >
            Sign In
          </UButton>
        </form>
      </UCard>
    </div>
  </div>
</template>
