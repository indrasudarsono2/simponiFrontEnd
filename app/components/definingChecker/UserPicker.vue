<script setup lang="ts">
interface Option {
  value: string;
  label: string;
}

const props = withDefaults(defineProps<{
  options: Option[];
  selected: string[];
  multiple?: boolean;
  disabled?: boolean;
  searchPlaceholder?: string;
}>(), {
  multiple: false,
  disabled: false,
  searchPlaceholder: "Search by name or NIK",
});

const emit = defineEmits<{ change: [selected: string[]] }>();
const search = ref("");
watch(() => props.options, () => { search.value = ""; });

const sortedOptions = computed(() => [...props.options].sort((a, b) =>
  a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
));
const filteredOptions = computed(() => {
  const term = search.value.trim().toLocaleLowerCase();
  return term
    ? sortedOptions.value.filter((option) => `${option.label} ${option.value}`.toLocaleLowerCase().includes(term))
    : sortedOptions.value;
});
const selectedSet = computed(() => new Set(props.selected));
const allFilteredSelected = computed(() =>
  filteredOptions.value.length > 0 && filteredOptions.value.every((option) => selectedSet.value.has(option.value)),
);

function toggle(value: string) {
  if (props.disabled) return;
  if (!props.multiple) {
    emit("change", [value]);
    return;
  }
  emit("change", selectedSet.value.has(value)
    ? props.selected.filter((item) => item !== value)
    : [...props.selected, value]);
}

function toggleFiltered() {
  if (props.disabled || !props.multiple) return;
  const filteredIds = new Set(filteredOptions.value.map((option) => option.value));
  emit("change", allFilteredSelected.value
    ? props.selected.filter((value) => !filteredIds.has(value))
    : [...new Set([...props.selected, ...filteredIds])]);
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-default">
    <div class="space-y-2 border-b border-default bg-elevated/30 p-3">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        :placeholder="searchPlaceholder"
        :disabled="disabled"
        class="w-full"
      />
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>{{ selected.length }} selected · {{ filteredOptions.length }} of {{ options.length }} shown</span>
        <UButton
          v-if="multiple"
          type="button"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="disabled || !filteredOptions.length"
          :label="allFilteredSelected ? 'Deselect shown' : 'Select shown'"
          @click="toggleFiltered"
        />
      </div>
    </div>
    <div class="grid max-h-56 grid-cols-1 overflow-y-auto sm:grid-cols-2">
      <p v-if="!filteredOptions.length" class="col-span-full p-4 text-sm text-muted">
        {{ options.length ? 'No users match your search.' : 'No users available.' }}
      </p>
      <label
        v-for="option in filteredOptions"
        :key="option.value"
        class="flex min-w-0 cursor-pointer items-center gap-2 border-b border-default px-3 py-2 text-sm hover:bg-elevated/50"
        :class="{ 'bg-primary/10': selectedSet.has(option.value), 'cursor-not-allowed opacity-60': disabled }"
      >
        <input
          :type="multiple ? 'checkbox' : 'radio'"
          :checked="selectedSet.has(option.value)"
          :disabled="disabled"
          class="size-4 shrink-0 accent-green-600"
          @change="toggle(option.value)"
        >
        <span class="min-w-0 truncate" :title="option.label">{{ option.label }}</span>
      </label>
    </div>
  </div>
</template>
