<script setup lang="ts">
import ip from "../../utils/config.json";

interface ShiftName {
  id: number;
  shift: string | null;
}

const props = defineProps<{
  shiftName: ShiftName | null;
}>();

const emit = defineEmits<{
  shiftDeleted: [];
  close: [];
}>();

const { token } = useAuth();
const toast = useToast();
const open = ref(false);
const loading = ref(false);

watch(
  () => props.shiftName,
  (nextShiftName) => {
    if (nextShiftName) open.value = true;
  },
);

watch(open, (isOpen) => {
  if (!isOpen) emit("close");
});

async function onDelete() {
  if (!props.shiftName) return;

  loading.value = true;

  try {
    await $fetch(`http://${ip.ipBackEnd}/api/shifts/${props.shiftName.id}`, {
      method: "DELETE",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Shift "${props.shiftName.shift}" has been deleted`,
      color: "success",
    });

    open.value = false;
    emit("shiftDeleted");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to delete shift",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Delete Operation Shift">
    <template #description>
      <p>
        Are you sure you want to delete
        <strong>"{{ shiftName?.shift }}"</strong>
        and all related shift details?
      </p>
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
          :loading="loading"
          @click="onDelete"
        />
      </div>
    </template>
  </UModal>
</template>
