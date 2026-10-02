<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl();
const { token, getRoleNames } = useAuth();
const isGeneralAdmin = computed(() => getRoleNames().some((role) => role.trim().toUpperCase() === "GENERAL ADMIN"));
const { apiFetch } = useApiFetch();
const toast = useToast();

interface Standard {
  theoryGrade: number;
  practicalGrade: number;
}

const { data, status, error } = await useFetch<Standard>(
  `${apiBaseUrl}/api/passingGradeStandard`,
  { headers: { Authorization: token.value ? `Bearer ${token.value}` : "" } },
);

const theoryGrade = ref<number | undefined>();
const practicalGrade = ref<number | undefined>();
const saving = ref(false);

watch(data, (standard) => {
  theoryGrade.value = standard?.theoryGrade;
  practicalGrade.value = standard?.practicalGrade;
}, { immediate: true });

async function save() {
  if (!isGeneralAdmin.value || saving.value) return;
  const theory = Number(theoryGrade.value);
  const practical = Number(practicalGrade.value);
  if (![theory, practical].every((grade) => Number.isFinite(grade) && grade >= 0 && grade <= 100)) {
    toast.add({ title: "Invalid passing grade", description: "Enter a value from 0 to 100 for both grades.", color: "error" });
    return;
  }

  saving.value = true;
  try {
    const result = await apiFetch("/api/passingGradeStandard", {
      method: "PUT",
      body: { theoryGrade: theory, practicalGrade: practical },
    }) as { standard: Standard; updatedFutureEvents: number };
    data.value = result.standard;
    toast.add({
      title: "Passing grades updated",
      description: `Applied to ${result.updatedFutureEvents} upcoming event(s). Started events retain their grades.`,
      color: "success",
    });
  } catch (requestError: any) {
    toast.add({ title: "Unable to update grades", description: requestError?.data?.message || requestError?.message || "Please try again.", color: "error" });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Passing Grade Standard">
        <template #leading><UDashboardSidebarCollapse /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="max-w-3xl space-y-4">
        <UAlert
          title="Standard for all branches"
          description="These grades apply to new events and existing events that have not started. Events already underway keep their current grades."
          icon="i-lucide-info"
          color="info"
          variant="soft"
        />
        <p v-if="status === 'pending'" class="text-muted">Loading passing grades...</p>
        <UAlert v-else-if="error" title="Unable to load passing grades" color="error" variant="soft" />
        <UCard v-else>
          <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <UFormField label="Theory Passing Grade (%)" required>
              <UInput v-model.number="theoryGrade" type="number" min="0" max="100" step="0.01" class="w-full" :disabled="!isGeneralAdmin" />
            </UFormField>
            <UFormField label="Practical Passing Grade (%)" required>
              <UInput v-model.number="practicalGrade" type="number" min="0" max="100" step="0.01" class="w-full" :disabled="!isGeneralAdmin" />
            </UFormField>
            <UButton v-if="isGeneralAdmin" label="Save Standard" :loading="saving" class="justify-center" @click="save" />
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
