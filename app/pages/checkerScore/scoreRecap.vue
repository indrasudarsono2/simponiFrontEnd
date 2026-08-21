<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface ScoreCheckerEventItem {
  id: number;
  event: string;
}

interface ScoreCheckerRemarkItem {
  id: number;
  remark: string;
  events: ScoreCheckerEventItem[];
}

interface ScoreCheckerFinalScoreItem {
  id?: number;
  finalScore?: number | null;
  status?: {
    status?: string | null;
  } | null;
}

interface ScoreCheckerAppRatingItem {
  id?: number;
  rating?: {
    rating?: string | null;
  } | null;
  finalScores?: ScoreCheckerFinalScoreItem[] | null;
  previews?: Array<{
    id?: number;
  }> | null;
  examinationInvalidations?: Array<{
    id?: number;
    reason?: string | null;
    fraudCategory?: string | null;
    createdAt?: string | null;
  }> | null;
}

interface ScoreCheckerApplicationDocItem {
  id?: number;
  number?: string | null;
  appRatings?: ScoreCheckerAppRatingItem[] | null;
}

interface ScoreCheckerResultItem {
  id?: number;
  user?: {
    name?: string | null;
  } | null;
  applicationDocs?: ScoreCheckerApplicationDocItem[] | null;
}

interface ScoreCheckerEvidenceItem {
  id?: number;
  file?: string | null;
  createdAt?: string | null;
}

interface ScoreCheckerRow {
  id: string;
  no: number;
  showNo: boolean;
  noRowSpan: number;
  name: string;
  showName: boolean;
  nameRowSpan: number;
  applicationDoc: string;
  showApplicationDoc: boolean;
  applicationDocRowSpan: number;
  rating: string;
  showRating: boolean;
  ratingRowSpan: number;
  finalScore: string;
  status: string;
  showEvidence: boolean;
  evidenceRowSpan: number;
  appRatingId: number | null;
  hasEvidence: boolean;
}

const { token, getRoleNames } = useAuth();
const toast = useToast();

const selectedRemarkId = ref<number | undefined>(undefined);
const selectedEventId = ref<number | undefined>(undefined);
const resultLoading = ref(false);
const resultData = ref<ScoreCheckerResultItem[] | null>(null);
const evidenceLoadingId = ref<number | null>(null);
const isEvidenceModalOpen = ref(false);
const selectedEvidenceAppRatingId = ref<number | null>(null);
const evidenceItems = ref<ScoreCheckerEvidenceItem[]>([]);
const isEvidenceFetching = ref(false);
const isInvalidationModalOpen = ref(false);
const invalidationLoading = ref(false);
const invalidationReason = ref("");
const fraudCategory = ref<string | undefined>(undefined);
const invalidationConfirmed = ref(false);

const fraudCategoryOptions = [
  { label: "Unauthorized assistance", value: "UNAUTHORIZED_ASSISTANCE" },
  { label: "Impersonation", value: "IMPERSONATION" },
  { label: "Prohibited material or device", value: "PROHIBITED_MATERIAL" },
  { label: "Evidence manipulation", value: "EVIDENCE_MANIPULATION" },
  { label: "Other", value: "OTHER" },
];

const canInvalidateAttempt = computed(() => {
  const roles = getRoleNames().map((role) => role.trim().toUpperCase());
  return roles.includes("CHECKER ADMIN") || roles.includes("GENERAL CHECKER");
});

const { data, status, error, refresh } = await useFetch<
  ScoreCheckerRemarkItem[]
>(`${apiBaseUrl}/api/scoreChecker`, {
  headers: {
    Authorization: token.value ? `Bearer ${token.value}` : "",
  },
});

const remarkOptions = computed(() => {
  return (data.value || []).map((item) => ({
    label: item.remark || "-",
    value: item.id,
  }));
});

const selectedRemarkItem = computed(() => {
  if (!selectedRemarkId.value) return null;
  return (
    (data.value || []).find((item) => item.id === selectedRemarkId.value) ||
    null
  );
});

const eventOptions = computed(() => {
  return (selectedRemarkItem.value?.events || []).map((item) => ({
    label: item.event || "-",
    value: item.id,
  }));
});

watch(selectedRemarkId, () => {
  selectedEventId.value = undefined;
});

function formatScore(value: unknown): string {
  const score = Number(value);
  if (!Number.isFinite(score)) return "-";
  return Number.isInteger(score) ? String(score) : score.toFixed(2);
}

function getRatingRowCount(
  appRating?: ScoreCheckerAppRatingItem | null,
): number {
  const total = appRating?.finalScores?.length || 0;
  return Math.max(1, total);
}

function getApplicationDocRowCount(
  doc?: ScoreCheckerApplicationDocItem | null,
): number {
  const ratings = doc?.appRatings || [];
  if (ratings.length === 0) return 1;
  return ratings.reduce((sum, rating) => sum + getRatingRowCount(rating), 0);
}

function getUserRowCount(item?: ScoreCheckerResultItem | null): number {
  const docs = item?.applicationDocs || [];
  if (docs.length === 0) return 1;
  return docs.reduce((sum, doc) => sum + getApplicationDocRowCount(doc), 0);
}

const rows = computed<ScoreCheckerRow[]>(() => {
  const payload = resultData.value || [];
  const result: ScoreCheckerRow[] = [];

  payload.forEach((item, itemIndex) => {
    const userName = item.user?.name || "-";
    const docs = item.applicationDocs || [];
    const safeDocs =
      docs.length > 0
        ? docs
        : [
            {
              id: undefined,
              number: "-",
              appRatings: [] as ScoreCheckerAppRatingItem[],
            },
          ];
    const userRowSpan = getUserRowCount(item);
    let isFirstUserRow = true;

    safeDocs.forEach((doc, docIndex) => {
      const documentNumber = doc.number || "-";
      const ratings = doc.appRatings || [];
      const safeRatings =
        ratings.length > 0
          ? ratings
          : [
              {
                id: undefined,
                rating: { rating: "-" },
                finalScores: [],
              },
            ];
      const applicationDocRowSpan = getApplicationDocRowCount(doc);
      let isFirstDocumentRow = true;

      safeRatings.forEach((appRating, ratingIndex) => {
        const ratingName = appRating.rating?.rating || "-";
        const finalScores = appRating.finalScores || [];
        const requiresReExamination =
          finalScores.length === 0 &&
          (appRating.examinationInvalidations?.length || 0) > 0;
        const safeFinalScores =
          finalScores.length > 0
            ? finalScores
            : [{
                id: undefined,
                finalScore: null,
                status: requiresReExamination
                  ? { status: "RE-EXAMINATION REQUIRED" }
                  : null,
              }];
        const ratingRowSpan = getRatingRowCount(appRating);
        const hasEvidence = (appRating.previews?.length || 0) > 0;

        safeFinalScores.forEach((score, scoreIndex) => {
          result.push({
            id: `${item.id || itemIndex}-${doc.id || docIndex}-${appRating.id || ratingIndex}-${score.id || scoreIndex}`,
            no: itemIndex + 1,
            showNo: isFirstUserRow,
            noRowSpan: userRowSpan,
            name: userName,
            showName: isFirstUserRow,
            nameRowSpan: userRowSpan,
            applicationDoc: documentNumber,
            showApplicationDoc: isFirstDocumentRow,
            applicationDocRowSpan,
            rating: ratingName,
            showRating: scoreIndex === 0,
            ratingRowSpan,
            finalScore: formatScore(score.finalScore),
            status: score.status?.status || "-",
            showEvidence: scoreIndex === 0,
            evidenceRowSpan: ratingRowSpan,
            appRatingId: appRating.id ?? null,
            hasEvidence,
          });

          isFirstUserRow = false;
          isFirstDocumentRow = false;
        });
      });
    });
  });

  return result;
});

async function handleSearch() {
  if (!selectedEventId.value) {
    toast.add({
      title: "Validation",
      description: "Please select an event first.",
      color: "warning",
    });
    return;
  }

  try {
    resultLoading.value = true;
    const response = await $fetch<
      ScoreCheckerResultItem[] | ScoreCheckerResultItem
    >(`${apiBaseUrl}/api/scoreChecker`, {
      method: "POST",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
      body: {
        eventId: selectedEventId.value,
      },
    });
    resultData.value = Array.isArray(response) ? response : [response];

    toast.add({
      title: "Success",
      description: "Score recap data loaded successfully.",
      color: "success",
    });
  } catch (fetchError: any) {
    const message =
      fetchError?.data?.message ||
      fetchError?.message ||
      "Failed to load score recap data.";
    toast.add({
      title: "Error",
      description: message,
      color: "error",
    });
  } finally {
    resultLoading.value = false;
  }
}

async function handleOpenEvidence(appRatingId: number | null) {
  if (!appRatingId) {
    toast.add({
      title: "Info",
      description: "No appRatingId available for this row.",
      color: "warning",
    });
    return;
  }

  try {
    evidenceLoadingId.value = appRatingId;
    isEvidenceModalOpen.value = true;
    isEvidenceFetching.value = true;
    evidenceItems.value = [];
    selectedEvidenceAppRatingId.value = appRatingId;

    const response = await $fetch<
      ScoreCheckerEvidenceItem[] | ScoreCheckerEvidenceItem
    >(`${apiBaseUrl}/api/scoreCheckerEvidance`, {
      method: "POST",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
      body: {
        appRatingId,
      },
    });

    evidenceItems.value = Array.isArray(response) ? response : [response];
  } catch (fetchError: any) {
    const message =
      fetchError?.data?.message ||
      fetchError?.message ||
      "Failed to load evidence.";
    toast.add({
      title: "Error",
      description: message,
      color: "error",
    });
  } finally {
    isEvidenceFetching.value = false;
    evidenceLoadingId.value = null;
  }
}

function openInvalidationModal() {
  invalidationReason.value = "";
  fraudCategory.value = undefined;
  invalidationConfirmed.value = false;
  isEvidenceModalOpen.value = false;
  isInvalidationModalOpen.value = true;
}

async function handleInvalidateAttempt() {
  if (!selectedEvidenceAppRatingId.value) return;
  if (invalidationReason.value.trim().length < 10) {
    toast.add({
      title: "Validation",
      description: "Please provide a reason of at least 10 characters.",
      color: "warning",
    });
    return;
  }
  if (!invalidationConfirmed.value) {
    toast.add({
      title: "Confirmation required",
      description: "Please confirm that the evidence has been reviewed.",
      color: "warning",
    });
    return;
  }

  try {
    invalidationLoading.value = true;
    const response = await $fetch<{ message?: string }>(
      `${apiBaseUrl}/api/scoreChecker/invalidate-attempt`,
      {
        method: "POST",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
        body: {
          appRatingId: selectedEvidenceAppRatingId.value,
          reason: invalidationReason.value.trim(),
          fraudCategory: fraudCategory.value,
        },
      },
    );

    isInvalidationModalOpen.value = false;
    await handleSearch();
    toast.add({
      title: "Re-examination required",
      description:
        response.message || "The examination attempt has been invalidated.",
      color: "success",
    });
  } catch (fetchError: any) {
    toast.add({
      title: "Unable to invalidate attempt",
      description:
        fetchError?.data?.message ||
        fetchError?.message ||
        "The request could not be completed.",
      color: "error",
    });
  } finally {
    invalidationLoading.value = false;
  }
}

function resolveEvidenceUrl(filePath?: string | null): string {
  if (!filePath) return "";
  if (/^https?:\/\//i.test(filePath)) return filePath;
  return `${apiBaseUrl}${filePath}`;
}

function formatEvidenceTime(value?: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  const hour = String(parsed.getUTCHours()).padStart(2, "0");
  const minute = String(parsed.getUTCMinutes()).padStart(2, "0");
  const second = String(parsed.getUTCSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second} UTC`;
}

const evidenceImageItems = computed(() =>
  evidenceItems.value.filter((item) => Boolean(item.file)),
);

const initialErrorMessage = computed(() => {
  if (!error.value) return "";
  const err = error.value as {
    data?: { message?: string };
    message?: string;
  };
  return (
    err.data?.message ||
    err.message ||
    "Failed to load remark and event options."
  );
});
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Score Recap">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Filter Score</h2>
          </template>

          <div
            v-if="status === 'pending'"
            class="flex items-center gap-2 text-muted py-2"
          >
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
            Loading options...
          </div>

          <div
            v-else-if="error"
            class="rounded-lg border border-error/30 bg-error/5 p-4 space-y-2"
          >
            <p class="font-medium text-error">{{ initialErrorMessage }}</p>
            <UButton
              label="Retry"
              color="error"
              variant="outline"
              icon="i-lucide-refresh-cw"
              @click="refresh()"
            />
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <UFormField label="Remark">
              <USelect
                v-model="selectedRemarkId"
                :items="remarkOptions"
                placeholder="Select remark"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Event">
              <USelect
                v-model="selectedEventId"
                :items="eventOptions"
                :disabled="!selectedRemarkId"
                placeholder="Select event"
                class="w-full"
              />
            </UFormField>

            <div class="flex items-end">
              <UButton
                label="Search"
                color="primary"
                icon="i-lucide-search"
                :loading="resultLoading"
                :disabled="!selectedEventId || resultLoading"
                class="w-full md:w-auto"
                @click="handleSearch"
              />
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Result</h2>
          </template>

          <div
            v-if="resultLoading"
            class="flex items-center gap-2 text-muted py-2"
          >
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
            Loading score recap result...
          </div>

          <div v-else-if="resultData == null" class="text-sm text-muted">
            No result yet. Please select and search.
          </div>

          <div v-else class="overflow-x-auto rounded-lg border">
            <table
              class="min-w-full text-sm border-collapse border border-default"
            >
              <thead class="bg-muted/40">
                <tr>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    No
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Name
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    ApplicationDoc
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Rating
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    FinalScore
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Status
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Evidance
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in rows" :key="row.id" class="align-top">
                  <td
                    v-if="row.showNo"
                    class="px-3 py-2 border border-default align-middle text-center"
                    :rowspan="row.noRowSpan"
                  >
                    {{ row.no }}
                  </td>
                  <td
                    v-if="row.showName"
                    class="px-3 py-2 border border-default align-middle"
                    :rowspan="row.nameRowSpan"
                  >
                    {{ row.name }}
                  </td>
                  <td
                    v-if="row.showApplicationDoc"
                    class="px-3 py-2 border border-default align-middle text-center"
                    :rowspan="row.applicationDocRowSpan"
                  >
                    {{ row.applicationDoc }}
                  </td>
                  <td
                    v-if="row.showRating"
                    class="px-3 py-2 border border-default align-middle text-center"
                    :rowspan="row.ratingRowSpan"
                  >
                    {{ row.rating }}
                  </td>
                  <td class="px-3 py-2 border border-default text-center">
                    {{ row.finalScore }}
                  </td>
                  <td class="px-3 py-2 border border-default text-center">
                    <UBadge
                      :color="
                        row.status?.toUpperCase() === 'SUCCESS'
                          ? 'success'
                          : row.status?.toUpperCase() === 'FAILED'
                            ? 'error'
                            : row.status?.toUpperCase() === 'RECHECK'
                              ? 'warning'
                              : row.status?.toUpperCase() ===
                                  'RE-EXAMINATION REQUIRED'
                                ? 'warning'
                                : row.status?.toUpperCase() ===
                                    'WAITING PRACTICAL'
                                  ? 'warning'
                              : 'neutral'
                      "
                      variant="soft"
                    >
                      {{ row.status }}
                    </UBadge>
                  </td>
                  <td
                    v-if="row.showEvidence"
                    class="px-3 py-2 border border-default align-middle text-center"
                    :rowspan="row.evidenceRowSpan"
                  >
                    <UButton
                      v-if="row.hasEvidence"
                      icon="i-lucide-eye"
                      color="primary"
                      variant="soft"
                      size="xs"
                      :loading="
                        evidenceLoadingId !== null &&
                        evidenceLoadingId === row.appRatingId
                      "
                      @click="handleOpenEvidence(row.appRatingId)"
                    />
                    <span v-else>-</span>
                  </td>
                </tr>

                <tr v-if="rows.length === 0">
                  <td
                    class="px-3 py-3 text-muted border border-default text-center"
                    colspan="7"
                  >
                    No score recap data available.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>

        <UModal
          v-model:open="isEvidenceModalOpen"
          title="Evidance"
          :ui="{ content: 'max-w-4xl w-full' }"
        >
          <template #body>
            <div class="space-y-3">
              <div
                v-if="isEvidenceFetching"
                class="flex items-center justify-center gap-2 py-10 text-muted"
              >
                <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
                Loading evidence...
              </div>
              <div
                v-else-if="evidenceImageItems.length > 0"
                class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[65vh] overflow-auto pr-1"
              >
                <a
                  v-for="item in evidenceImageItems"
                  :key="item.id"
                  :href="resolveEvidenceUrl(item.file)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block rounded-lg border border-default bg-muted/20 p-2"
                >
                  <img
                    :src="resolveEvidenceUrl(item.file)"
                    :alt="`Evidence ${item.id || ''}`"
                    class="w-full h-56 object-cover rounded-md"
                  />
                  <p class="mt-2 text-xs text-muted">
                    Time: {{ formatEvidenceTime(item.createdAt) }}
                  </p>
                </a>
              </div>
              <p v-else class="text-sm text-muted">No evidence data.</p>
            </div>
          </template>
          <template #footer>
            <div class="flex w-full justify-end">
              <UButton
                v-if="canInvalidateAttempt && evidenceImageItems.length > 0"
                label="Require Re-examination"
                icon="i-lucide-shield-alert"
                color="error"
                variant="soft"
                @click="openInvalidationModal"
              />
            </div>
          </template>
        </UModal>

        <UModal
          v-model:open="isInvalidationModalOpen"
          title="Invalidate Examination Attempt"
          description="The existing result will remain in the audit history but will no longer be valid."
          :ui="{ content: 'max-w-xl w-full' }"
        >
          <template #body>
            <div class="space-y-4">
              <UFormField label="Fraud category">
                <USelect
                  v-model="fraudCategory"
                  :items="fraudCategoryOptions"
                  placeholder="Select category (optional)"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Reason" required>
                <UTextarea
                  v-model="invalidationReason"
                  :rows="5"
                  :maxlength="2000"
                  placeholder="Describe the evidence and reason for requiring re-examination..."
                  class="w-full"
                />
                <template #hint>
                  {{ invalidationReason.trim().length }}/2000
                </template>
              </UFormField>

              <UCheckbox
                v-model="invalidationConfirmed"
                label="I have reviewed the evidence and confirm that this attempt must be invalidated."
              />
            </div>
          </template>

          <template #footer>
            <div class="flex w-full justify-end gap-2">
              <UButton
                label="Cancel"
                color="neutral"
                variant="outline"
                :disabled="invalidationLoading"
                @click="isInvalidationModalOpen = false"
              />
              <UButton
                label="Invalidate & Require Re-examination"
                icon="i-lucide-shield-alert"
                color="error"
                :loading="invalidationLoading"
                :disabled="
                  invalidationLoading ||
                  invalidationReason.trim().length < 10 ||
                  !invalidationConfirmed
                "
                @click="handleInvalidateAttempt"
              />
            </div>
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>
