<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false });

defineProps<{
  selectedToken: { token?: string } | null;
}>();

const emit = defineEmits<{
  (e: "submit"): void;
}>();
</script>

<template>
  <UModal v-model:open="open" title="Delete Token">
    <template #body>
      <p>Are you sure you want to delete this token?</p>
      <p class="text-sm text-gray-500 mt-2">
        Token: <span class="font-mono">{{ selectedToken?.token }}</span>
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          @click="open = false"
        />
        <UButton label="Delete" color="error" @click="emit('submit')" />
      </div>
    </template>
  </UModal>
</template>
