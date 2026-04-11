<script setup lang="ts">
import ip from "../../utils/config.json";
const { token } = useAuth();
interface DefiningCheckerRow {
  id: number;
  eventId: number;
  eventName: string;
  sectorId: number;
  sectorName: string;
  group: string;
  pic: string;
  picName: string;
  checkers: string[];
  checkerNames: string[];
  members: string[];
  memberNames: string[];
  remarkDoc: string;
  createdAt?: string;
}

const props = defineProps<{
  definingChecker: DefiningCheckerRow | null;
}>();

const emit = defineEmits<{
  definingCheckerDeleted: [];
  close: [];
}>();

const open = ref(false);
const loading = ref(false);

// Watch for definingChecker prop changes to open modal
watch(
  () => props.definingChecker,
  (newDefiningChecker) => {
    if (newDefiningChecker) {
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
  if (!props.definingChecker) return;

  loading.value = true;

  try {
    // Call API to delete defining checker
    await $fetch(
      `http://${ip.ipBackEnd}/api/groups/${props.definingChecker.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: `Group "${props.definingChecker.group}" has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("definingCheckerDeleted");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to delete group. Please try again.";
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
  <UModal v-model:open="open" title="Delete Group">
    <template #description>
      <div class="space-y-2">
        <p>
          Are you sure you want to delete
          <strong>"{{ definingChecker?.group }}"</strong>?
        </p>
        <div
          class="p-3 bg-elevated/50 rounded-lg border border-default text-sm"
        >
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-muted">Sector:</span>
              <span class="font-medium">{{ definingChecker?.sectorName }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted">Event:</span>
              <span class="font-medium">{{ definingChecker?.eventName }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted">Remark Doc:</span>
              <span
                :class="
                  definingChecker?.remarkDoc === 'PENERBITAN'
                    ? 'text-primary font-medium'
                    : 'text-warning font-medium'
                "
              >
                {{ definingChecker?.remarkDoc }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted">PIC:</span>
              <span class="font-medium">{{ definingChecker?.picName }}</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-muted">Checkers:</span>
              <ul class="list-disc list-inside font-medium">
                <li
                  v-for="checker in definingChecker?.checkerNames"
                  :key="checker"
                >
                  {{ checker }}
                </li>
              </ul>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-muted">Members:</span>
              <ul class="list-disc list-inside font-medium">
                <li
                  v-for="member in definingChecker?.memberNames"
                  :key="member"
                >
                  {{ member }}
                </li>
              </ul>
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
