<script setup lang="ts">
const props = defineProps<{
  collapsed: boolean;
  role: string;
  roles: string[];
  loading?: boolean;
}>();

const emit = defineEmits<{ "update:role": [string] }>();

const displayRole = (value: string) => value === "CHECKER EXAMINATION LEAD" ? "EXAMINATION LEAD" : value;

const items = computed(() => [
  props.roles.map((r) => ({
    label: displayRole(r),
    icon: r === props.role ? "i-lucide-check" : undefined,
    disabled: props.loading,
    onSelect: (_e: Event) => {
      emit("update:role", r);
    },
  })),
]);
</script>

<template>
  <div class="min-w-0 p-2">
    <UDropdownMenu :items="items" :disabled="collapsed || !!loading">
      <UButton
        color="neutral"
        variant="ghost"
        :class="collapsed ? 'w-full justify-center' : 'w-full min-w-0 justify-between overflow-hidden'"
        :disabled="collapsed || !!loading"
        :title="role || 'Select role'"
      >
        <span v-if="!collapsed" class="min-w-0 flex-1 truncate text-left">{{
          displayRole(role) || "Select role"
        }}</span>
        <UIcon name="i-lucide-chevron-down" class="shrink-0" />
      </UButton>
    </UDropdownMenu>
  </div>
</template>
