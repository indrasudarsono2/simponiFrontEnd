<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false });

defineProps<{
  room: { name?: string } | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: "submit"): void;
}>();
</script>

<template>
  <UModal v-model:open="open" title="Delete Room">
    <template #body>
      <p>Are you sure you want to delete this room?</p>
      <p class="text-sm text-gray-500 mt-2">
        Room: <span class="font-medium">{{ room?.name }}</span>
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          :disabled="loading"
          @click="open = false"
        />
        <UButton
          label="Delete"
          color="error"
          :loading="loading"
          :disabled="loading"
          @click="emit('submit')"
        />
      </div>
    </template>
  </UModal>
</template>
