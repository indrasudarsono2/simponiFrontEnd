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
      title: "Berhasil",
      description: "Dokumen permohonan berhasil dihapus.",
      color: "success",
    });
    open.value = false;
    emit("applicationDocDeleted");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error?.data?.statusMessage || "Gagal menghapus dokumen.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Hapus Dokumen Permohonan">
    <template #description>
      <p>
        Apakah anda yakin ingin menghapus dokumen permohonan
        <strong>"{{ applicationDoc?.number }}"</strong>? Tindakan ini tidak
        dapat dibatalkan.
      </p>
    </template>
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          label="Batal"
          color="neutral"
          variant="subtle"
          :disabled="loading"
          @click="open = false"
        />
        <UButton
          label="Hapus"
          color="error"
          variant="solid"
          :loading="loading"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
