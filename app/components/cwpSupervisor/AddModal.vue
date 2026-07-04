<script setup lang="ts">
import ip from "../../utils/config.json";

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

interface CwpOption {
  value: number;
  label: string;
}

const props = defineProps<{
  cwps: Cwp[];
}>();

const emit = defineEmits<{
  created: [];
}>();

const { token } = useAuth();
const toast = useToast();

const open = ref(false);
const loading = ref(false);
const supervisor = ref("");
const selectedCwps = ref<CwpOption[]>([]);

const cwpOptions = computed(() =>
  props.cwps
    .filter((cwp) => !cwp.supervisorId)
    .map((cwp) => ({
      value: cwp.id,
      label: `${cwp.cwp || `CWP ${cwp.id}`}${cwp.rating?.rating ? ` - ${cwp.rating.rating}` : ""}`,
    })),
);

const selectedCwpIds = computed(() =>
  selectedCwps.value.map((cwp) => cwp.value),
);

function resetForm() {
  supervisor.value = "";
  selectedCwps.value = [];
}

watch(open, (isOpen) => {
  if (!isOpen) {
    resetForm();
    return;
  }

  if (cwpOptions.value.length === 0) {
    toast.add({
      title: "No CWP Available",
      description: "No unassigned CWP found for your branch unit.",
      color: "warning",
    });
  }
});

async function onSubmit() {
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
    await $fetch(`http://${ip.ipBackEnd}/api/cwpSupervisors`, {
      method: "POST",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
      body: {
        supervisor: supervisor.value,
        cwpIds: selectedCwpIds.value,
      },
    });

    toast.add({
      title: "Success",
      description: "CWP supervisor has been created.",
      color: "success",
    });

    open.value = false;
    emit("created");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to create CWP supervisor.",
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
    title="Add CWP Supervisor"
    description="Create supervisor and assign handled CWP"
      :ui="{ content: 'max-w-2xl' }"
  >
    <UButton
      label="Add Supervisor"
      icon="i-lucide-plus"
      color="primary"
      :disabled="cwpOptions.length === 0"
    />

    <template #body>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <UAlert
          v-if="cwpOptions.length === 0"
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="No unassigned CWP"
          description="No unassigned CWP is available. One CWP can only be handled by one supervisor."
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
            @click="open = false"
          />
          <UButton
            label="Save Supervisor"
            color="primary"
            type="submit"
            :loading="loading"
            :disabled="cwpOptions.length === 0"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
