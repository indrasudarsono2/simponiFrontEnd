<script setup lang="ts">
const { token } = useAuth();
import ip from "../../utils/config.json";
defineOptions({ name: "ApplicationDocDeleteModal" });

interface ApplicationDoc {
  id: number;
  number: string;
  eventUser?: {
    event?: {
      event?: string;
    };
  };
}

const props = defineProps<{
  applicationDoc: ApplicationDoc | null;
}>();

const emit = defineEmits<{
  applicationDocDeleted: [];
  close: [];
}>();

const open = ref(false);
const loading = ref(false);

watch(
  () => props.applicationDoc,
  (newDoc) => {
    if (newDoc) open.value = true;
  },
  { immediate: true },
);

watch(open, (isOpen) => {
  if (!isOpen) emit("close");
});

const toast = useToast();

async function onSubmit() {
  if (!props.applicationDoc) return;
  loading.value = true;
  try {
    await $fetch(
      `http://${ip.ipBackEnd}/api/applicationDocument/${props.applicationDoc.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );
    toast.add({
      title: "Success",
      description: "The application document was deleted successfully.",
      color: "success",
    });
    open.value = false;
    emit("applicationDocDeleted");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error?.data?.statusMessage || "Failed to delete the document.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Delete Application Document">
    <template #description>
      <p>
        Are you sure you want to delete application document
        <strong>"{{ applicationDoc?.number }}"</strong>? This action cannot be
        undone.
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
          variant="solid"
          :loading="loading"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
