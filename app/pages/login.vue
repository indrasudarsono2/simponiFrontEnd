<script setup lang="ts">
import { getDashboardRoute } from '~/utils/dashboardRoute'

definePageMeta({
  layout: false
})

const { loginWithApi, isAuthenticated, getRoleNames } = useAuth()
const config = useRuntimeConfig()
const toast = useToast()
const router = useRouter()
const route = useRoute()
const apiBaseUrl = String(config.public.apiBaseUrl || '').replace(/\/+$/, '')
const authProvider = computed(() => String(config.public.authProvider || 'airnav').toLowerCase())
const showsAirnavSso = computed(() => ['airnav', 'hybrid'].includes(authProvider.value))
const showsLocalLogin = computed(() => ['local', 'hybrid'].includes(authProvider.value))
const loginDescription = computed(() => {
  if (authProvider.value === 'hybrid') return 'AirNav users sign in with SSO. Non-AirNav users use their PERFORMA account.'
  return showsAirnavSso.value
    ? 'Continue securely using AirNav AUTH.'
    : 'Sign in using your e-NIK and password.'
})

const form = reactive({
  nik: '',
  password: ''
})

const isSubmitting = ref(false)

const startAirnavLogin = () => {
  window.location.assign(`${apiBaseUrl}/api/auth/airnav/start`)
}

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

  const authError = typeof route.query.auth_error === 'string' ? route.query.auth_error : ''
  if (authError) {
    toast.add({
      title: 'AirNav sign-in failed',
      description: authError,
      color: 'error'
    })
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
              {{ loginDescription }}
            </p>
          </div>
        </template>

        <div v-if="showsAirnavSso" class="space-y-5">
          <UButton
            block
            size="xl"
            icon="i-lucide-log-in"
            @click="startAirnavLogin"
          >
            Sign in with AirNav
          </UButton>

          <p class="text-center text-sm text-gray-500 dark:text-gray-400">
            You will be redirected to AirNav AUTH to enter your credentials.
          </p>
        </div>

        <div v-if="showsAirnavSso && showsLocalLogin" class="my-6 flex items-center gap-3 text-xs text-gray-400">
          <div class="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          <span>OR</span>
          <div class="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        </div>

        <form v-if="showsLocalLogin" class="space-y-5" method="post" action="/login" @submit.prevent="handleLogin">
          <p v-if="showsAirnavSso" class="text-center text-sm font-medium text-gray-700 dark:text-gray-200">
            Non-AirNav Sign In
          </p>
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
          <div class="text-center">
            <UButton
              to="/forgot-password"
              label="Forgot Password?"
              color="neutral"
              variant="link"
            />
          </div>
        </form>
      </UCard>
    </div>
  </div>
</template>
