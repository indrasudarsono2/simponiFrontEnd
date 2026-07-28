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
  password: '',
  captchaInput: ''
})

const isSubmitting = ref(false)
const captchaText = ref('')

const generateCaptcha = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  captchaText.value = Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

const validateNik = (nik: string) => /^\d{8}$/.test(nik)

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
      description: 'e-NIK must contain exactly 8 digits.',
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

  if (form.captchaInput.trim().toUpperCase() !== captchaText.value) {
    toast.add({
      title: 'Incorrect captcha',
      description: 'Please enter the captcha correctly.',
      color: 'error'
    })
    generateCaptcha()
    form.captchaInput = ''
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
    generateCaptcha()
    form.captchaInput = ''
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  generateCaptcha()

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
              Sign in using your e-NIK, password, and captcha
            </p>
          </div>
        </template>

        <form class="space-y-5" @submit.prevent="handleLogin">
          <UFormField label="e-NIK" name="nik" required>
            <UInput
              v-model="form.nik"
              placeholder="Enter your 8-digit e-NIK"
              icon="i-lucide-id-card"
              size="xl"
              :maxlength="8"
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
              class="w-full"
            />
          </UFormField>

          <UFormField label="Captcha" name="captcha" required>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <div
                  class="flex-1 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3"
                >
                  <p
                    class="text-center font-mono text-lg tracking-[0.35em] select-none text-gray-800 dark:text-gray-100"
                  >
                    {{ captchaText }}
                  </p>
                </div>
                <UButton
                  type="button"
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-refresh-cw"
                  aria-label="Generate a new captcha"
                  @click="generateCaptcha"
                />
              </div>

              <UInput
                v-model="form.captchaInput"
                placeholder="Enter the captcha shown above"
                icon="i-lucide-shield-check"
                size="xl"
                class="w-full"
              />
            </div>
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
