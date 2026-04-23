<script setup lang="ts">
import ip from "../../utils/config.json";

interface EssayCorrectionItem {
  id?: number;
  answer?: string | null;
  score?: number | null;
  essay?: {
    id?: number;
    image?: string | null;
    question?: string | null;
    answer?: string | null;
    value?: number | null;
  } | null;
}

const props = defineProps<{
  isOpen: boolean;
  memberName: string;
  essayCorrections: EssayCorrectionItem[];
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const totalScore = computed(() => {
  return props.essayCorrections.reduce(
    (sum, item) => sum + Number(item.score || 0),
    0,
  );
});

const totalValue = computed(() => {
  return props.essayCorrections.reduce(
    (sum, item) => sum + Number(item.essay?.value || 0),
    0,
  );
});

function close() {
  emit("close");
}

function resolveImageUrl(imagePath?: string | null): string {
  const trimmed = (imagePath || "").trim();
  if (!trimmed) return "";
  if (/^(data|blob|https?):/i.test(trimmed)) return trimmed;
  return `http://${ip.ipBackEnd}${trimmed}`;
}

function hasImage(imagePath?: string | null): boolean {
  return Boolean((imagePath || "").trim());
}
</script>

<template>
  <UModal
    :open="isOpen"
    title="Essay Correction History"
    :description="memberName || '-'"
    :ui="{ content: 'max-w-5xl' }"
    @update:open="(value) => (!value ? close() : null)"
  >
    <template #body>
      <div v-if="essayCorrections.length === 0" class="text-sm text-muted py-4">
        No essay correction history available.
      </div>

      <div v-else class="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <UCard>
          <div class="flex items-center justify-between gap-2 text-sm">
            <span class="text-muted">Total Score</span>
            <span class="font-semibold text-highlighted">
              {{ totalScore }} / {{ totalValue }}
            </span>
          </div>
        </UCard>

        <UCard
          v-for="(item, index) in essayCorrections"
          :key="item.id || `history-${index}`"
        >
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold">Essay {{ index + 1 }}</p>
              <UBadge color="primary" variant="soft">
                Score {{ item.score ?? "-" }} / {{ item.essay?.value ?? "-" }}
              </UBadge>
            </div>
          </template>

          <div class="space-y-3">
            <img
              v-if="hasImage(item.essay?.image)"
              :src="resolveImageUrl(item.essay?.image)"
              alt="Essay image"
              class="max-h-72 w-auto rounded border border-default block mx-auto"
            />

            <div>
              <p class="text-xs font-semibold text-muted mb-1">Question</p>
              <div
                class="text-sm rich-preview [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                v-html="item.essay?.question || '-'"
              />
            </div>

            <div>
              <p class="text-xs font-semibold text-muted mb-1">Essay Value</p>
              <div class="text-sm">{{ item.essay?.value ?? "-" }}</div>
            </div>

            <div v-if="item.essay?.answer">
              <p class="text-xs font-semibold text-muted mb-1">Answer Key</p>
              <div
                class="text-sm rich-preview [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                v-html="item.essay?.answer || ''"
              />
            </div>

            <div>
              <p class="text-xs font-semibold text-muted mb-1">User Answer</p>
              <div
                class="text-sm rich-preview [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                v-html="item.answer || '-'"
              />
            </div>
          </div>
        </UCard>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton label="Close" color="neutral" variant="outline" @click="close" />
      </div>
    </template>
  </UModal>
</template>
