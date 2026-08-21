<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface Rating {
  id: number;
  rating: string | null;
}

interface Cwp {
  id: number;
  cwp: string | null;
  rating: Rating | null;
  supervisorId: number | null;
}

interface CwpSupervisor {
  id: number;
  cwpId: number | null;
  cwp: Cwp | null;
}

interface Supervisor {
  id: number;
  supervisor: string | null;
  cwpSupervisors: CwpSupervisor[];
}

interface CwpOption {
  value: number;
  label: string;
}

const props = defineProps<{
  supervisorData: Supervisor | null;
  cwps: Cwp[];
}>();

const emit = defineEmits<{
  updated: [];
  close: [];
}>();

const { token } = useAuth();
const toast = useToast();

const loading = ref(false);
const supervisor = ref("");
const selectedCwps = ref<CwpOption[]>([]);

const open = computed({
  get: () => props.supervisorData !== null,
  set: (value: boolean) => {
    if (!value) emit("close");
  },
});

const cwpOptions = computed(() =>
  props.cwps
    .filter(
      (cwp) =>
        !cwp.supervisorId || cwp.supervisorId === props.supervisorData?.id,
    )
    .map((cwp) => ({
      value: cwp.id,
      label: `${cwp.cwp || `CWP ${cwp.id}`}${cwp.rating?.rating ? ` - ${cwp.rating.rating}` : ""}`,
    })),
);

const selectedCwpIds = computed(() =>
  selectedCwps.value.map((cwp) => cwp.value),
);

watch(
  () => props.supervisorData,
  (value) => {
    if (!value) {
      supervisor.value = "";
      selectedCwps.value = [];
      return;
    }

    supervisor.value = value.supervisor || "";

    const activeCwpIds = new Set(
      value.cwpSupervisors
        ?.map((cwpSupervisor) => cwpSupervisor.cwpId)
        .filter((cwpId): cwpId is number => Number.isInteger(cwpId)) || [],
    );

    selectedCwps.value = cwpOptions.value.filter((cwp) =>
      activeCwpIds.has(cwp.value),
    );
  },
  { immediate: true },
);

async function onSubmit() {
  if (!props.supervisorData) return;

  if (!supervisor.value.trim()) {
    toast.add({
      title: "Error",
      description: "Supervisor name is required.",
      color: "error",
    });
    return;
  }

  if (selectedCwpIds.value.length === 0) {
    toast.add({
      title: "Error",
      description: "Please select at least one CWP.",
      color: "error",
    });
    return;
  }

  loading.value = true;

  try {
    await $fetch(
      `${apiBaseUrl}/api/cwpSupervisors/${props.supervisorData.id}`,
      {
        method: "PUT",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
        body: {
          supervisor: supervisor.value,
          cwpIds: selectedCwpIds.value,
        },
      },
    );

    toast.add({
      title: "Success",
      description: "CWP supervisor has been updated.",
      color: "success",
    });

    emit("updated");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to update CWP supervisor.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Edit CWP Supervisor - ${supervisorData?.supervisor || ''}`"
    description="Update supervisor and handled CWP"
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-info"
          title="Delete particular CWP"
          description="Remove a CWP from the selection and save. The CwpSupervisor relation will be soft-deleted."
        />

        <UFormField label="Supervisor" required>
          <UInput
            v-model="supervisor"
            placeholder="Input supervisor name"
            :disabled="loading"
          />
        </UFormField>

        <UFormField label="CWP" required>
          <USelectMenu
            v-model="selectedCwps"
            class="w-full"
            :items="cwpOptions"
            multiple
            searchable
            placeholder="Select CWP"
            :disabled="loading || cwpOptions.length === 0"
          />
        </UFormField>

        <div class="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p class="mb-2 text-sm font-medium text-highlighted">
            Summary handled CWP
          </p>
          <div v-if="selectedCwps.length" class="flex flex-wrap gap-2">
            <UBadge
              v-for="cwp in selectedCwps"
              :key="cwp.value"
              color="primary"
              variant="soft"
            >
              {{ cwp.label }}
            </UBadge>
          </div>
          <p v-else class="text-sm text-muted">No CWP selected.</p>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="emit('close')"
          />
          <UButton
            label="Save Changes"
            color="primary"
            type="submit"
            :loading="loading"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
