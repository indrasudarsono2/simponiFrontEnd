<script setup lang="ts">
import ip from "../../utils/config.json";

interface EssayItem {
  id?: number;
  image?: string | null;
  question?: string | null;
  answer?: string | null;
  value?: number | null;
}

interface EssayCorrectionItem {
  id?: number;
  answer?: string | null;
  essay?: EssayItem | null;
}

interface FinalScoreItem {
  id?: number;
  essayCorrections?: EssayCorrectionItem[] | null;
}

interface CorrectionCardItem {
  key: string;
  finalScoreId: number | null;
  essayCorrectionId: number | null;
  essayId: number | null;
  value: number;
  maxScore: number;
  essayImage: string;
  essayQuestion: string;
  essayAnswer: string;
  userAnswer: string;
}

const props = defineProps<{
  isOpen: boolean;
  memberName: string;
  finalScores: FinalScoreItem[];
  persentage: number | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "submitted"): void;
}>();
const { token } = useAuth();
const toast = useToast();
const router = useRouter();

const selectedScores = reactive<Record<string, number>>({});
const isSubmitting = ref(false);

const correctionCards = computed<CorrectionCardItem[]>(() => {
  const cards: CorrectionCardItem[] = [];

  props.finalScores.forEach((finalScore, finalScoreIndex) => {
    (finalScore.essayCorrections || []).forEach((essayCorrection, correctionIndex) => {
      const key = `${finalScore.id ?? finalScoreIndex}-${essayCorrection.id ?? correctionIndex}`;
      cards.push({
        key,
        finalScoreId: Number.isFinite(Number(finalScore.id))
          ? Number(finalScore.id)
          : null,
        essayCorrectionId: Number.isFinite(Number(essayCorrection.id))
          ? Number(essayCorrection.id)
          : null,
        essayId: Number.isFinite(Number(essayCorrection.essay?.id))
          ? Number(essayCorrection.essay?.id)
          : null,
        value: Number(essayCorrection.essay?.value || 0),
        maxScore: Number(essayCorrection.essay?.value || 0),
        essayImage: (essayCorrection.essay?.image || "").trim(),
        essayQuestion: essayCorrection.essay?.question || "-",
        essayAnswer: essayCorrection.essay?.answer || "-",
        userAnswer: essayCorrection.answer || "-",
      });
    });
  });

  return cards;
});

watch(
  correctionCards,
  (cards) => {
    for (const card of cards) {
      if (selectedScores[card.key] == null) {
        selectedScores[card.key] = card.maxScore;
      }
    }
  },
  { immediate: true },
);

function hasImage(imagePath?: string | null): boolean {
  return typeof imagePath === "string" && imagePath.trim() !== "";
}

function resolveImageUrl(imagePath?: string | null): string {
  const trimmed = (imagePath || "").trim();
  if (!trimmed) return "";
  if (/^(data|blob):/i.test(trimmed)) return trimmed;
  return `/api/essay/image?image=${encodeURIComponent(trimmed)}`;
}

function getScoreOptions(maxValue: number) {
  const max = Number.isFinite(maxValue) && maxValue > 0 ? Math.floor(maxValue) : 0;
  return Array.from({ length: max + 1 }, (_, idx) => ({
    label: String(idx),
    value: idx,
  }));
}

function handleOpenChange(nextOpen: boolean) {
  if (!nextOpen) {
    emit("close");
  }
}

function buildEssayCorrectionPayload() {
  return correctionCards.value
    .map((card) => {
      if (!card.essayId) return null;
      if (!card.essayCorrectionId) return null;
      const score = Number(selectedScores[card.key]);
      if (!Number.isFinite(score)) return null;
      return {
        essayCorrectionId: card.essayCorrectionId,
        essayId: card.essayId,
        value: card.value,
        score,
      };
    })
    .filter(Boolean) as Array<{
      essayCorrectionId: number;
      essayId: number;
      value: number;
      score: number;
    }>;
}

function getFinalScoreId(): number | null {
  const ids = correctionCards.value
    .map((card) => card.finalScoreId)
    .filter((id): id is number => Number.isFinite(id) && Number(id) > 0);
  if (ids.length === 0) return null;
  return ids[0] ?? null;
}

async function handleSubmit() {
  if (isSubmitting.value) return;

  if (!window.confirm("Are you sure to submit essay correction?")) {
    return;
  }

  const essayCorrection = buildEssayCorrectionPayload();
  const finalScoreId = getFinalScoreId();

  if (!finalScoreId || essayCorrection.length === 0) {
    toast.add({
      title: "No Data",
      description: "No essay correction data to submit.",
      color: "warning",
    });
    return;
  }

  try {
    isSubmitting.value = true;
    await $fetch(`http://${ip.ipBackEnd}/api/performanceCheck`, {
      method: "POST",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
      body: {
        finalScoreId,
        persentage: props.persentage,
        essayCorrection,
      },
    });

    emit("submitted");
    emit("close");
    await router.push({
      path: "/performanceCheck/correctionEssay",
      query: { refreshedAt: String(Date.now()) },
    });
    toast.add({
      title: "Success",
      description: "Essay correction submitted successfully.",
      color: "success",
    });
    if (import.meta.client) {
      window.location.reload();
    }
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message || error?.message || "Failed to submit essay correction.",
      color: "error",
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <UModal
    :open="isOpen"
    title="Essay Correction"
    :description="memberName || '-'"
    :ui="{ content: 'max-w-5xl' }"
    @update:open="handleOpenChange"
  >
    <template #body>
      <div v-if="correctionCards.length === 0" class="text-sm text-muted py-4">
        No essay correction data available.
      </div>

      <div v-else class="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <UCard v-for="(card, index) in correctionCards" :key="card.key">
          <template #header>
            <h3 class="text-sm font-semibold">Essay {{ index + 1 }}</h3>
          </template>

          <div class="space-y-4">
            <img
              v-if="hasImage(card.essayImage)"
              :src="resolveImageUrl(card.essayImage)"
              alt="Essay image"
              class="max-h-72 w-auto rounded border border-default block mx-auto"
            />

            <div>
              <p class="text-xs font-semibold text-muted mb-1">Question</p>
              <div
                class="text-sm rich-preview [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                v-html="card.essayQuestion"
              />
            </div>

            <div>
              <p class="text-xs font-semibold text-muted mb-1">Answer Key</p>
              <div
                class="text-sm rich-preview [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                v-html="card.essayAnswer"
              />
            </div>

            <div>
              <p class="text-xs font-semibold text-muted mb-1">User Answer</p>
              <div
                class="text-sm rich-preview [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                v-html="card.userAnswer"
              />
            </div>

            <UFormField label="Selection Value">
              <USelect
                v-model="selectedScores[card.key]"
                :items="getScoreOptions(card.maxScore)"
                class="w-28"
              />
            </UFormField>
          </div>
        </UCard>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          :disabled="isSubmitting"
          @click="emit('close')"
        />
        <UButton
          label="Submit"
          color="primary"
          variant="solid"
          icon="i-lucide-send"
          :loading="isSubmitting"
          :disabled="correctionCards.length === 0 || isSubmitting"
          @click="handleSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
