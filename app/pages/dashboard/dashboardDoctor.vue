<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface DoctorDashboardResponse {
  pendingUsers: number;
}

const { token } = useAuth();

const {
  data,
  status,
  error,
  refresh,
} = await useFetch<DoctorDashboardResponse>(
  `${apiBaseUrl}/api/dashboardDoctor`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const pendingUsers = computed(() => Number(data.value?.pendingUsers || 0));
</script>

<template>
  <UDashboardPanel id="dashboard-doctor">
    <template #header>
      <UDashboardNavbar title="Doctor Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            :loading="status === 'pending'"
            aria-label="Refresh dashboard"
            @click="refresh()"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 sm:p-6">
        <div
          v-if="error"
          class="rounded-lg border border-error/30 bg-error/5 p-4 text-error"
        >
          Failed to load the Doctor dashboard.
        </div>

        <UCard
          v-else
          class="max-w-xl"
          :ui="{ body: 'p-6' }"
        >
          <div class="flex items-center justify-between gap-6">
            <div class="space-y-2">
              <p class="text-sm font-medium text-muted">
                Waiting for Verification
              </p>
              <p class="text-4xl font-bold text-highlighted">
                {{ pendingUsers }}
              </p>
              <p class="text-sm text-muted">
                {{ pendingUsers === 1 ? 'user is' : 'users are' }} waiting for
                medical verification.
              </p>
            </div>

            <div
              class="flex size-16 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning"
            >
              <UIcon name="i-lucide-user-round-search" class="size-8" />
            </div>
          </div>

          <template #footer>
            <UButton
              label="Open Medical Verification"
              icon="i-lucide-stethoscope"
              to="/doctor/monitorMedicalTest"
              color="primary"
              variant="soft"
            />
          </template>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
