<script setup lang="ts">
const props = defineProps<{
  collapsed: boolean;
  role: string;
  roles: string[];
  loading?: boolean;
}>();

const emit = defineEmits<{ "update:role": [string] }>();

const items = computed(() => [
  props.roles.map((r) => ({
    label: r,
    icon: r === props.role ? "i-lucide-check" : undefined,
    disabled: props.loading,
    onSelect: (_e: Event) => {
      emit("update:role", r);
    },
  })),
]);
</script>

<template>
  <div class="p-2">
    <UDropdownMenu :items="items" :disabled="collapsed || !!loading">
      <UButton
        color="neutral"
        variant="ghost"
        :class="collapsed ? 'w-full justify-center' : 'w-full justify-between'"
        :disabled="collapsed || !!loading"
      >
        <span v-if="!collapsed" class="truncate">{{
          role || "Select role"
        }}</span>
        <UIcon name="i-lucide-chevron-down" class="shrink-0" />
      </UButton>
    </UDropdownMenu>
  </div>
</template>
