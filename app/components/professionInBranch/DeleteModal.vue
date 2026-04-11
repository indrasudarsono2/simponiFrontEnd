<script setup lang="ts">
import ip from "../../utils/config.json";

defineOptions({
  name: "ProfessionInBranchDeleteModal",
});

// Nested profession in professionInBranch
interface NestedProfession {
  id: number;
  profession: string;
}

// ProfessionInBranch interface - matches actual API
interface ProfessionInBranch {
  id: number;
  profession: NestedProfession;
}

const props = defineProps<{
  professionInBranch: ProfessionInBranch | null;
}>();

const emit = defineEmits<{
  (e: "profession-deleted"): void;
  (e: "close"): void;
}>();

const toast = useToast();
const loading = ref(false);
const { token } = useAuth();

const isOpen = computed({
  get: () => props.professionInBranch !== null,
  set: (value) => {
    if (!value) emit("close");
  },
});

async function onDelete() {
  if (!props.professionInBranch) return;

  loading.value = true;

  try {
    await $fetch(
      `http://${ip.ipBackEnd}/api/professionInBranch/${props.professionInBranch.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: "Profession removed from branch successfully",
      color: "success",
    });

    emit("profession-deleted");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.message ||
        "Failed to remove profession from branch",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" title="Remove Profession from Branch">
    <template #body>
      <div class="space-y-4">
        <p class="text-muted">
          Are you sure you want to remove
          <span class="font-medium text-highlighted">{{
            professionInBranch?.profession?.profession || "this profession"
          }}</span>
          from this branch?
        </p>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="emit('close')"
          />
          <UButton
            label="Remove"
            color="error"
            variant="solid"
            :loading="loading"
            @click="onDelete"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
