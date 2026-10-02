<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl();
const { token } = useAuth();

interface GroupLink {
  sector?: { id: number; sector?: string | null } | null;
  questionGroup?: {
    id: number;
    group?: string | null;
    subBranchUnitRating?: {
      rating?: { id: number; rating?: string | null } | null;
    } | null;
  } | null;
}

interface ReviewQuestion {
  id: number;
  question?: string | null;
  image?: string | null;
  a?: string | null;
  b?: string | null;
  c?: string | null;
  d?: string | null;
  version: number;
  updatedAt: string;
  essayQuestionGroups?: GroupLink[];
  mcQuestionGroups?: GroupLink[];
}

interface QuestionReviewResponse {
  questions: ReviewQuestion[];
}

interface RatingOption { id: number; rating: string | null }

const search = ref("");
const activeType = ref<"ESSAY" | "MULTIPLE_CHOICE">("ESSAY");
const selectedRatingId = ref<number | undefined>(undefined);
const { apiFetch } = useApiFetch();
const data = ref<QuestionReviewResponse | null>(null);
const status = ref<"idle" | "pending" | "success" | "error">("idle");
const error = ref<unknown>(null);
let requestSequence = 0;

const { data: ratingData, status: ratingStatus, error: ratingError, refresh: refreshRatings } = await useFetch<{ ratings: RatingOption[] }>(
  `${apiBaseUrl}/api/questionReview`,
  {
    query: { view: "ratings" },
    headers: { Authorization: token.value ? `Bearer ${token.value}` : "" },
  },
);

const ratingOptions = computed(() => (ratingData.value?.ratings || [])
  .map((item) => ({ id: item.id, label: item.rating || `Rating ${item.id}` })));

async function refresh() {
  const sequence = ++requestSequence;
  data.value = null;
  error.value = null;
  if (!selectedRatingId.value) {
    status.value = "idle";
    return;
  }
  status.value = "pending";
  try {
    const response = await apiFetch(
      `/api/questionReview?type=${activeType.value}&ratingId=${selectedRatingId.value}`,
    ) as QuestionReviewResponse;
    if (sequence !== requestSequence) return;
    data.value = response;
    status.value = "success";
  } catch (cause) {
    if (sequence !== requestSequence) return;
    error.value = cause;
    status.value = "error";
  }
}

watch([activeType, selectedRatingId], () => { void refresh(); });

const sourceQuestions = computed(() => data.value?.questions || []);

const questions = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return sourceQuestions.value;
  return sourceQuestions.value.filter((item) => {
    const groups = item.essayQuestionGroups || item.mcQuestionGroups || [];
    const metadata = groups
      .flatMap((link) => [
        link.sector?.sector,
        link.questionGroup?.group,
        link.questionGroup?.subBranchUnitRating?.rating?.rating,
      ])
      .filter(Boolean)
      .join(" ");
    return `${item.question || ""} ${metadata}`.toLowerCase().includes(term);
  });
});

function groupLabels(item: ReviewQuestion): string[] {
  const links = item.essayQuestionGroups || item.mcQuestionGroups || [];
  return [...new Set(links.map((link) => link.questionGroup?.group).filter((value): value is string => Boolean(value)))];
}

function sectorLabels(item: ReviewQuestion): string[] {
  const links = item.essayQuestionGroups || item.mcQuestionGroups || [];
  return [...new Set(links.map((link) => link.sector?.sector).filter((value): value is string => Boolean(value)))];
}

function options(item: ReviewQuestion): { label: string; content: string }[] {
  return (["a", "b", "c", "d"] as const)
    .map((label) => ({ label: label.toUpperCase(), content: item[label]?.trim() || "" }))
    .filter((option) => option.content);
}

const errorMessage = computed(() => {
  const value = error.value as { data?: { message?: string }; message?: string } | null;
  return value?.data?.message || value?.message || "Failed to load questions.";
});
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Question Review">
        <template #leading><UDashboardSidebarCollapse /></template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UAlert
          title="Read-only question bank"
          description="Questions from your branch unit are shown with multiple-choice options, without answer keys or essay answers."
          icon="i-lucide-eye"
          color="info"
          variant="soft"
        />

        <UCard>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex gap-2">
              <UButton
                label="Essay"
                :variant="activeType === 'ESSAY' ? 'solid' : 'outline'"
                @click="activeType = 'ESSAY'"
              />
              <UButton
                label="Multiple Choice"
                :variant="activeType === 'MULTIPLE_CHOICE' ? 'solid' : 'outline'"
                @click="activeType = 'MULTIPLE_CHOICE'"
              />
            </div>
            <div class="flex w-full items-center gap-2 sm:w-auto">
              <label for="question-review-rating" class="text-sm font-medium text-highlighted">Rating</label>
              <USelect
                id="question-review-rating"
                v-model="selectedRatingId"
                :items="ratingOptions"
                label-key="label"
                value-key="id"
                placeholder="Select rating"
                class="min-w-40 flex-1 sm:max-w-48"
                :loading="ratingStatus === 'pending'"
              />
            </div>
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Search question, sector, or group"
              class="w-full sm:max-w-md"
            />
          </div>
        </UCard>

        <UAlert
          v-if="ratingError"
          title="Unable to load ratings"
          description="Please retry loading the available ratings."
          color="error"
          variant="soft"
        >
          <template #actions><UButton label="Retry" color="error" variant="outline" @click="refreshRatings()" /></template>
        </UAlert>

        <UCard v-else-if="!selectedRatingId">
          <p class="text-center text-muted">Select a rating to load {{ activeType === 'ESSAY' ? 'Essay' : 'Multiple Choice' }} questions.</p>
        </UCard>

        <div v-else-if="status === 'pending'" class="flex items-center gap-2 text-muted">
          <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" /> Loading questions...
        </div>

        <UAlert
          v-else-if="error"
          title="Unable to load questions"
          :description="errorMessage"
          color="error"
          variant="soft"
        >
          <template #actions><UButton label="Retry" color="error" variant="outline" @click="refresh()" /></template>
        </UAlert>

        <div v-else class="space-y-3">
          <UCard v-for="(item, index) in questions" :key="`${activeType}-${item.id}`">
            <div class="space-y-3">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge color="neutral" variant="soft">{{ index + 1 }}</UBadge>
                <UBadge v-for="sector in sectorLabels(item)" :key="`sector-${sector}`" color="info" variant="soft">Sector: {{ sector }}</UBadge>
              </div>
              <div class="prose prose-sm max-w-none dark:prose-invert" v-html="item.question || '-'" />
              <img
                v-if="item.image"
                :src="item.image"
                alt="Question illustration"
                class="max-h-72 rounded-lg border border-default object-contain"
              >
              <div v-if="activeType === 'MULTIPLE_CHOICE'" class="space-y-2">
                <div class="text-sm font-medium text-highlighted">Options</div>
                <div v-for="option in options(item)" :key="option.label" class="flex gap-3 rounded-lg border border-default p-3">
                  <span class="font-semibold text-primary">{{ option.label }}.</span>
                  <div class="prose prose-sm max-w-none dark:prose-invert" v-html="option.content" />
                </div>
                <p v-if="options(item).length === 0" class="text-sm text-muted">No options available.</p>
              </div>
              <div class="rounded-lg border border-default bg-elevated/40 p-3">
                <div class="mb-2 flex items-center gap-2 text-sm font-medium text-highlighted">
                  <UIcon name="i-lucide-layers-3" class="size-4 text-primary" />
                  Related Question Group
                </div>
                <div v-if="groupLabels(item).length" class="flex flex-wrap gap-2">
                  <UBadge
                    v-for="group in groupLabels(item)"
                    :key="`related-group-${group}`"
                    color="primary"
                    variant="subtle"
                    size="lg"
                  >
                    {{ group }}
                  </UBadge>
                </div>
                <p v-else class="text-sm text-muted">No question group assigned.</p>
              </div>
            </div>
          </UCard>

          <UCard v-if="questions.length === 0">
            <p class="text-center text-muted">No matching questions are available in your branch unit.</p>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
