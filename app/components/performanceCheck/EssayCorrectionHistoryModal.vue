<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface EssayCorrectionItem {
  id?: number;
  appRating?: { id?: number; rating?: { rating?: string | null } | null } | null;
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
const { authUser } = useAuth();

const emit = defineEmits<{
  (e: "close"): void;
}>();
const isBlurred = ref(false);
const selectedRatingKey = ref<string | null>(null);
const watermarkText = ref("");
let watermarkTimer: number | null = null;

const ratingGroups = computed(() => {
  const groups = new Map<string, { key: string; label: string; items: EssayCorrectionItem[] }>();
  for (const item of props.essayCorrections) {
    const key = item.appRating?.id != null ? String(item.appRating.id) : "unknown";
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: item.appRating?.rating?.rating || "Unknown rating",
        items: [],
      });
    }
    groups.get(key)!.items.push(item);
  }
  return [...groups.values()];
});
watch(() => [props.isOpen, props.essayCorrections] as const, () => {
  if (props.isOpen) selectedRatingKey.value = ratingGroups.value[0]?.key ?? null;
}, { immediate: true });
const activeRating = computed(() =>
  ratingGroups.value.find((group) => group.key === selectedRatingKey.value) || ratingGroups.value[0],
);
const visibleCorrections = computed(() => activeRating.value?.items || []);

function blockEvent(event: Event) {
  if (!props.isOpen) return;
  event.preventDefault();
  event.stopPropagation();
}

function blockKeydown(event: KeyboardEvent) {
  if (!props.isOpen) return;
  const key = event.key.toLowerCase();
  const blockedCtrl = event.ctrlKey && ["c", "x", "u", "s", "p"].includes(key);
  const blockedMeta = event.metaKey && ["c", "x", "u", "s", "p"].includes(key);
  if (blockedCtrl || blockedMeta || event.key === "PrintScreen") {
    event.preventDefault();
    event.stopPropagation();
  }
}

function updateWatermarkText() {
  const now = new Date();
  const iso = now.toISOString().replace("T", " ").slice(0, 19);
  const actorName = authUser.value?.name || props.memberName || "Unknown";
  watermarkText.value = `${actorName} | ${iso}`;
}

function handleWindowBlur() {
  if (!props.isOpen) return;
  isBlurred.value = true;
}

function handleWindowFocus() {
  isBlurred.value = false;
}

function handleVisibilityChange() {
  if (!props.isOpen) return;
  isBlurred.value = document.hidden;
}

onMounted(() => {
  if (!import.meta.client) return;
  updateWatermarkText();
  watermarkTimer = window.setInterval(updateWatermarkText, 1000);
  window.addEventListener("keydown", blockKeydown, true);
  window.addEventListener("copy", blockEvent, true);
  window.addEventListener("cut", blockEvent, true);
  window.addEventListener("contextmenu", blockEvent, true);
  window.addEventListener("blur", handleWindowBlur, true);
  window.addEventListener("focus", handleWindowFocus, true);
  document.addEventListener("visibilitychange", handleVisibilityChange, true);
});

onBeforeUnmount(() => {
  if (!import.meta.client) return;
  if (watermarkTimer) window.clearInterval(watermarkTimer);
  window.removeEventListener("keydown", blockKeydown, true);
  window.removeEventListener("copy", blockEvent, true);
  window.removeEventListener("cut", blockEvent, true);
  window.removeEventListener("contextmenu", blockEvent, true);
  window.removeEventListener("blur", handleWindowBlur, true);
  window.removeEventListener("focus", handleWindowFocus, true);
  document.removeEventListener("visibilitychange", handleVisibilityChange, true);
});

const totalScore = computed(() => {
  return visibleCorrections.value.reduce(
    (sum, item) => sum + Number(item.score || 0),
    0,
  );
});

const totalValue = computed(() => {
  return visibleCorrections.value.reduce(
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
  return `${apiBaseUrl}${trimmed}`;
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
    @copy.capture.prevent
    @cut.capture.prevent
    @contextmenu.capture.prevent
    @update:open="(value) => (!value ? close() : null)"
  >
    <template #body>
      <div
        v-if="essayCorrections.length === 0"
        class="text-sm text-muted py-4 protection-surface"
      >
        No essay correction history available.
      </div>

      <div v-else class="space-y-4 max-h-[70vh] overflow-y-auto pr-1 protection-surface">
        <div class="flex flex-wrap gap-2 border-b pb-3" role="tablist" aria-label="Rating history">
          <UButton
            v-for="group in ratingGroups"
            :key="group.key"
            role="tab"
            :aria-selected="activeRating?.key === group.key"
            :label="group.label"
            :color="activeRating?.key === group.key ? 'primary' : 'neutral'"
            :variant="activeRating?.key === group.key ? 'solid' : 'soft'"
            @click="selectedRatingKey = group.key"
          />
        </div>
        <UCard>
          <div class="flex items-center justify-between gap-2 text-sm">
            <span class="text-muted">Total Score</span>
            <span class="font-semibold text-highlighted">
              {{ totalScore }} / {{ totalValue }}
            </span>
          </div>
        </UCard>

        <UCard
          v-for="(item, index) in visibleCorrections"
          :key="item.id || `history-${index}`"
          class="watermark-container"
        >
          <div class="watermark-overlay">{{ watermarkText }}</div>
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold">Essay {{ index + 1 }}</p>
              <UBadge color="primary" variant="soft">
                Score {{ item.score ?? "-" }} / {{ item.essay?.value ?? "-" }}
              </UBadge>
            </div>
          </template>

          <div :class="['space-y-3', { 'content-blur': isBlurred }]">
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

<style scoped>
.protection-surface {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.watermark-container {
  position: relative;
  overflow: hidden;
}

.watermark-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(-22deg);
  font-size: 14px;
  font-weight: 600;
  color: rgba(71, 85, 105, 0.18);
  letter-spacing: 0.4px;
  z-index: 5;
}

.content-blur {
  filter: blur(10px);
}

@media print {
  .protection-surface {
    display: none !important;
  }
}
</style>
