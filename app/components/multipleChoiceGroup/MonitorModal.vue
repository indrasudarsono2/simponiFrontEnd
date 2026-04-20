<script setup lang="ts">
interface GroupedMonitorQuestionGroupItem {
  id?: number;
  group: string;
  quantity: number;
  selected: number;
}

interface GroupedMonitorEntry {
  sector: string;
  rating: string;
  questionGroup: GroupedMonitorQuestionGroupItem[];
}

const props = defineProps<{
  open: boolean;
  grouped: GroupedMonitorEntry[];
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

function handleOpenChange(value: boolean) {
  emit("update:open", value);
}

function getItemStatus(selected: number, quantity: number) {
  if (selected > quantity) return "error";
  if (selected < quantity) return "warning";
  return "success";
}

function getItemStatusText(selected: number, quantity: number) {
  if (selected > quantity) return "Over selected";
  if (selected < quantity) return "Need more";
  return "Complete";
}

function getProgressPercent(selected: number, quantity: number) {
  if (quantity <= 0) return 0;
  return Math.min(100, Math.round((selected / quantity) * 100));
}

const normalizedGrouped = computed(() => {
  return [...(props.grouped || [])].sort((a, b) => {
    const sectorCompare = String(a.sector || "").localeCompare(
      String(b.sector || ""),
    );
    if (sectorCompare !== 0) return sectorCompare;
    return String(a.rating || "").localeCompare(String(b.rating || ""));
  });
});
</script>

<template>
  <UModal
    :open="props.open"
    title="Question Group Monitor"
    description="Monitor grouped question coverage by sector and rating"
    :ui="{ content: 'max-w-6xl' }"
    @update:open="handleOpenChange"
  >
    <template #body>
      <div
        v-if="normalizedGrouped.length === 0"
        class="rounded-lg border border-dashed border-default p-8 text-center text-sm text-muted"
      >
        No grouped monitor data found from API response.
      </div>

      <div v-else class="grid gap-4 md:grid-cols-2">
        <UCard
          v-for="(entry, index) in normalizedGrouped"
          :key="`${entry.sector}-${entry.rating}-${index}`"
          class="h-full"
        >
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="text-xs uppercase tracking-wide text-muted">Sector</p>
                <p class="text-base font-semibold">{{ entry.sector || "-" }}</p>
              </div>
              <UBadge color="neutral" variant="soft">
                Rating {{ entry.rating || "-" }}
              </UBadge>
            </div>
          </template>

          <div class="space-y-3">
            <div
              v-for="(item, itemIndex) in entry.questionGroup"
              :key="item.id || `${item.group}-${itemIndex}`"
              class="rounded-lg border border-default p-3"
            >
              <div class="flex items-start justify-between gap-3">
                <p class="text-sm font-medium leading-5">{{ item.group }}</p>
                <UBadge
                  :color="getItemStatus(item.selected, item.quantity)"
                  variant="subtle"
                >
                  {{ getItemStatusText(item.selected, item.quantity) }}
                </UBadge>
              </div>

              <div class="mt-2 flex items-center justify-between text-xs text-muted">
                <span>Selected {{ item.selected }}</span>
                <span>Quantity {{ item.quantity }}</span>
              </div>

              <UProgress
                class="mt-2"
                :value="getProgressPercent(item.selected, item.quantity)"
                :max="100"
              />
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UModal>
</template>
