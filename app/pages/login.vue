<script setup lang="ts">
definePageMeta({
  layout: false,
});

const { loginWithApi, isAuthenticated } = useAuth();
const toast = useToast();
const router = useRouter();

const form = reactive({
  nik: "",
  password: "",
  captchaInput: "",
});

const isSubmitting = ref(false);
const captchaText = ref("");

const generateCaptcha = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  captchaText.value = Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
};

const validateNik = (nik: string) => /^\d{8}$/.test(nik);

const handleLogin = async () => {
  if (!validateNik(form.nik)) {
    toast.add({
      title: "e-NIK tidak valid",
      description: "e-NIK harus terdiri dari 8 digit angka.",
      color: "error",
    });
    return;
  }

  if (!form.password || form.password.length < 6) {
    toast.add({
      title: "Password tidak valid",
      description: "Password minimal 6 karakter.",
      color: "error",
    });
    return;
  }

  if (form.captchaInput.trim().toUpperCase() !== captchaText.value) {
    toast.add({
      title: "Captcha salah",
      description: "Silakan masukkan captcha dengan benar.",
      color: "error",
    });
    generateCaptcha();
    form.captchaInput = "";
    return;
  }

  isSubmitting.value = true;

  try {
    const response = await loginWithApi(form.nik, form.password);

    toast.add({
      title: "Login berhasil",
      description: response.message || "Selamat datang di aplikasi.",
      color: "success",
    });

    await router.push("/");
  } catch (error: any) {
    toast.add({
      title: "Login gagal",
      description:
        error?.data?.message ||
        error?.message ||
        "Periksa kembali kredensial Anda.",
      color: "error",
    });
    generateCaptcha();
    form.captchaInput = "";
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  generateCaptcha();

  if (isAuthenticated.value) {
    router.push("/");
  }
});
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-100 via-white to-green-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 flex items-center justify-center px-4"
  >
    <div class="w-full max-w-md">
      <UCard class="shadow-xl ring-1 ring-gray-200/70 dark:ring-gray-800">
        <template #header>
          <div class="text-center space-y-1">
            <h1
              class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
            >
              Login Aplikasi
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Masuk menggunakan e-NIK, password, dan captcha
            </p>
          </div>
        </template>

        <form class="space-y-5" @submit.prevent="handleLogin">
          <UFormField label="e-NIK" name="nik" required>
            <UInput
              v-model="form.nik"
              placeholder="Masukkan 8 digit e-NIK"
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
              placeholder="Masukkan password"
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
                  @click="generateCaptcha"
                />
              </div>

              <UInput
                v-model="form.captchaInput"
                placeholder="Ketik captcha di atas"
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
            Masuk
          </UButton>
        </form>
      </UCard>
    </div>
  </div>
</template>
