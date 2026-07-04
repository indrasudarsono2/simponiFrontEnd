<script setup lang="ts">
import ip from "../../utils/config.json";

interface Profession {
  profession: string;
}

interface ProfessionInBranch {
  id: number;
  profession: Profession | null;
}

interface Briefing {
  id: number;
  speaker: string | null;
  speakerUser?: {
    name: string | null;
  } | null;
  createdAt: string;
  briefingDestinations?: {
    id: number;
    professionInBranch: ProfessionInBranch | null;
  }[];
}

const props = defineProps<{
  briefing: Briefing | null;
  open: boolean;
}>();

const emit = defineEmits<{
  "deleted": [];
  "update:open": [value: boolean];
}>();

const { token } = useAuth();
const toast = useToast();
const loading = ref(false);

const openState = computed({
  get: () => props.open,
  set: (value: boolean) => emit("update:open", value),
});

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const extractDestinationLabels = (briefing?: Briefing | null) => {
  if (!briefing?.briefingDestinations?.length) return [];

  return briefing.briefingDestinations
    .map((item) => item.professionInBranch?.profession?.profession)
    .filter((value): value is string => Boolean(value));
};

async function submit() {
  if (!props.briefing) return;

  loading.value = true;

  try {
    await $fetch(`http://${ip.ipBackEnd}/api/briefings/${props.briefing.id}`, {
      method: "DELETE",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: "Briefing data has been deleted successfully.",
      color: "success",
    });

    emit("deleted");
    openState.value = false;
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to delete briefing data.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="openState"
    title="Delete Briefing"
    description="This will soft delete the selected briefing."
  >
    <template #body>
      <div class="space-y-3">
        <p class="text-sm text-muted">
          The briefing will be hidden from this page, but the record remains in
          the database.
        </p>
        <div class="rounded-lg border border-default bg-elevated/40 p-4 space-y-2">
          <div class="text-sm">
            <span class="text-muted">Speaker:</span>
            <span class="ml-2 font-medium">
              {{ briefing?.speakerUser?.name || briefing?.speaker || "-" }}
            </span>
          </div>
          <div class="text-sm">
            <span class="text-muted">Created At:</span>
            <span class="ml-2 font-medium">
              {{ formatDate(briefing?.createdAt) }}
            </span>
          </div>
          <div class="text-sm">
            <span class="text-muted">Destinations:</span>
            <span class="ml-2 font-medium">
              {{ extractDestinationLabels(briefing).join(", ") || "-" }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="soft"
          :disabled="loading"
          @click="openState = false"
        />
        <UButton
          label="Delete Briefing"
          color="error"
          variant="solid"
          :loading="loading"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>
