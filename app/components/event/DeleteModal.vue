<script setup lang="ts">
import ip from "../../utils/config.json";
const { token } = useAuth();
interface Event {
  id: number;
  event: string;
  sectorId?: number;
  sectorName?: string;
  sessionId?: number;
  sessionName?: string;
  startDate: string;
  finishDate: string;
  forExpiredDate: string;
  remarkDoc: {
    remark: string;
  };
  briefingFile: string | null;
  passingGrade: number;
  branchId?: number;
  branchName?: string;
  branchUnitId?: number;
  branchUnitName?: string;
  sector?: {
    sector: string;
  };
}

const props = defineProps<{
  event: Event | null;
}>();

const emit = defineEmits<{
  eventDeleted: [];
  close: [];
}>();

const open = ref(false);
const loading = ref(false);

// Watch for event prop changes to open modal
watch(
  () => props.event,
  (newEvent) => {
    if (newEvent) {
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    emit("close");
  }
});

const toast = useToast();

async function onSubmit() {
  if (!props.event) return;

  loading.value = true;

  try {
    // Call API to delete event
    await $fetch(`http://${ip.ipBackEnd}/api/events/${props.event.id}`, {
      method: "DELETE",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Event "${props.event.event}" has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("eventDeleted");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to delete event. Please try again.";
    toast.add({
      title: "Error",
      description: errorMessage,
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Delete Event">
    <template #description>
      <div class="space-y-2">
        <p>
          Are you sure you want to delete
          <strong>"{{ event?.event }}"</strong>?
        </p>

        <div
          class="p-3 bg-elevated/50 rounded-lg border border-default text-sm"
        >
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-muted">Sector:</span>
              <span class="font-medium">{{
                event?.sector?.sector || event?.sectorName || "-"
              }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted">Session:</span>
              <span class="font-medium">{{ event?.sessionName }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted">Branch:</span>
              <span class="font-medium">{{ event?.branchName }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted">Branch Unit:</span>
              <span class="font-medium">{{ event?.branchUnitName }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted">Remark:</span>
              <UBadge
                :label="event?.remarkDoc?.remark"
                :color="
                  event?.remarkDoc?.remark === 'PENERBITAN'
                    ? 'primary'
                    : 'warning'
                "
                variant="soft"
                size="sm"
              />
            </div>
          </div>
        </div>
        <p class="text-sm text-muted">This action cannot be undone.</p>
      </div>
    </template>
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="subtle"
          :disabled="loading"
          @click="open = false"
        />
        <UButton
          label="Delete"
          color="error"
          variant="solid"
          :loading="loading"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
