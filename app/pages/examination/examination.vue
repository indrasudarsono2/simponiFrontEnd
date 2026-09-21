<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface AppRatingItem {
  id: number;
  statusId?: number;
  rating?: {
    id: number;
    rating: string;
    description?: string;
  } | null;
  examinationInvalidations?: Array<{
    id: number;
    createdAt?: string | null;
  }>;
  examinationStatus?: RatingExaminationStatus | null;
}

type ExaminationStatus =
  | "COMPLETED"
  | "IN_PROGRESS"
  | "NOT_STARTED"
  | "WAITING_ROOM"
  | "NOT_ASSIGNED"
  | "EXPIRED";

interface RatingExaminationStatus {
  appRatingId?: number;
  rating?: string;
  status: ExaminationStatus;
  message: string;
  completedAt?: string | null;
  canStart?: boolean;
  awaitingPractical?: boolean;
}

interface ApplicationDocsItem {
  id: number;
  appRatings?: AppRatingItem[];
}

interface EventUserItem {
  id: number;
  applicationDocs?: ApplicationDocsItem | ApplicationDocsItem[] | null;
  applicationDoc?: ApplicationDocsItem | ApplicationDocsItem[] | null;
  attendances?: {
    room?: {
      startDate?: string | null;
      finishDate?: string | null;
    } | null;
  } | null;
  attendaces?: {
    room?: {
      startDate?: string | null;
      finishDate?: string | null;
    } | null;
  } | null;
}

interface EventQuestionItem {
  id: number;
  quantity: number;
  persentage: number;
  minutes: number;
  kindOfQuestion?: {
    question: string;
  } | null;
}

interface ExaminationEvent {
  id: number;
  event: string;
  passingGrade: number;
  eventQuestions?: EventQuestionItem[];
  eventUsers?: EventUserItem[];
}

interface ExaminationResponse {
  event?: ExaminationEvent | null;
  status?: ExaminationStatus;
  message?: string;
  completedAt?: string | null;
  ratingStatuses?: RatingExaminationStatus[];
}

interface EssayQuestionPayload {
  essay?: {
    id: number;
    question?: string | null;
    image?: string | null;
  } | null;
}

interface EssayGroupPayload {
  id: number;
  quantity: number;
  group?: string | null;
  essay?: EssayQuestionPayload[];
}

interface ExaminationEssayResponse {
  essay?: EssayGroupPayload[];
  eventShort?: {
    minutes?: number;
  } | null;
}

interface ExaminationMultipleChoiceResponse {
  [key: string]: unknown;
}

interface SubmitFalseAnswerItem {
  id?: number;
  question?: string | null;
  a?: string | null;
  b?: string | null;
  c?: string | null;
  d?: string | null;
}

interface SubmitEssayCorrectionItem {
  id?: number;
  score?: number | null;
  checkerUser?: {
    name?: string | null;
  } | null;
  essay?: {
    id?: number;
    question?: string | null;
    value?: number | null;
  } | null;
}

interface ExaminationSubmitResponse {
  finalValue?: number | null;
  passingGrade?: number | null;
  awaitingPractical?: boolean;
  falseAnswer?: SubmitFalseAnswerItem[] | null;
  essayCorrection?: SubmitEssayCorrectionItem[] | null;
  [key: string]: unknown;
}

interface TableRow {
  no: number;
  appRatingId: number;
  statusId: number;
  rating: string;
  quantity: number;
  persentage: number;
  minutes: number;
  isReExamination: boolean;
  examinationStatus: ExaminationStatus;
  statusMessage: string;
  completedAt?: string | null;
  canStart: boolean;
}

const { token } = useAuth();
const toast = useToast();
const isActionSubmitting = ref(false);
const examinationEssayResponse = useState<ExaminationEssayResponse | null>(
  "examinationEssayResponse",
  () => null,
);
const examinationEssayMeta = useState<{
  eventId: number;
  appRatingId: number;
} | null>("examinationEssayMeta", () => null);
const EXAMINATION_ESSAY_META_STORAGE_KEY = "examinationEssayMeta";
const examinationMultipleChoiceResponse =
  useState<ExaminationMultipleChoiceResponse | null>(
    "examinationMultipleChoiceResponse",
    () => null,
  );
const examinationMultipleChoiceMeta = useState<{
  eventId: number;
  appRatingId: number;
} | null>("examinationMultipleChoiceMeta", () => null);
const EXAMINATION_MULTIPLE_CHOICE_META_STORAGE_KEY =
  "examinationMultipleChoiceMeta";
const EXAMINATION_SUBMIT_RESULT_STORAGE_KEY = "examinationSubmitResult";
const isSubmitResultModalOpen = ref(false);
const submitResultData = ref<ExaminationSubmitResponse | null>(null);
const submitResultCountdown = ref(60);
let submitResultTimer: ReturnType<typeof setInterval> | null = null;

const { data, status, error, refresh } = await useFetch<ExaminationResponse>(
  `${apiBaseUrl}/api/examination`,
  {
    credentials: "include",
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const eventData = computed(() => data.value?.event || null);
const overallExaminationStatus = computed<ExaminationStatus>(
  () => data.value?.status || "NOT_ASSIGNED",
);
const overallStatusMessage = computed(
  () => data.value?.message || "No examination status is available.",
);

function statusColor(statusValue: ExaminationStatus) {
  if (statusValue === "COMPLETED") return "success" as const;
  if (statusValue === "IN_PROGRESS") return "info" as const;
  if (statusValue === "NOT_STARTED") return "primary" as const;
  if (statusValue === "WAITING_ROOM") return "warning" as const;
  if (statusValue === "EXPIRED") return "error" as const;
  return "neutral" as const;
}

function statusLabel(statusValue: ExaminationStatus): string {
  return statusValue.replaceAll("_", " ");
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

const appRatings = computed<AppRatingItem[]>(() => {
  const eventUser = eventData.value?.eventUsers?.[0];
  const docs = [
    ...toArray(eventUser?.applicationDocs),
    ...toArray(eventUser?.applicationDoc),
  ];

  for (const doc of docs) {
    const ratings = doc?.appRatings || [];
    if (ratings.length) return ratings;
  }

  return [];
});

function clearSubmitResultTimer() {
  if (submitResultTimer) {
    clearInterval(submitResultTimer);
    submitResultTimer = null;
  }
}

function blockClipboardShortcuts(event: KeyboardEvent) {
  const key = event.key.toLowerCase();
  const hasPrimaryModifier = event.ctrlKey || event.metaKey;

  const isCopy =
    (hasPrimaryModifier && key === "c") || (event.ctrlKey && key === "insert");
  const isCut = hasPrimaryModifier && key === "x";
  const isPaste =
    (hasPrimaryModifier && key === "v") || (event.shiftKey && key === "insert");
  const isSelectAll = hasPrimaryModifier && key === "a";

  if (isCopy || isCut || isPaste || isSelectAll) {
    event.preventDefault();
    event.stopPropagation();
  }
}

const submitFalseAnswers = computed(
  () => submitResultData.value?.falseAnswer || [],
);
const submitEssayCorrections = computed(
  () => submitResultData.value?.essayCorrection || [],
);
const formattedFinalValue = computed(() => {
  const value = Number(submitResultData.value?.finalValue);
  if (!Number.isFinite(value)) return "-";
  return value.toFixed(2);
});
const isFinalValuePassed = computed<boolean | null>(() => {
  const finalValue = Number(submitResultData.value?.finalValue);
  const passingGrade = Number(submitResultData.value?.passingGrade);
  if (!Number.isFinite(finalValue) || !Number.isFinite(passingGrade)) return null;
  return finalValue >= passingGrade;
});
const finalValueTextClass = computed(() => {
  if (isFinalValuePassed.value === true) return "text-green-600";
  if (isFinalValuePassed.value === false) return "text-red-600";
  return "text-highlighted";
});
const formattedSubmitResultJson = computed(() => {
  if (!submitResultData.value) return "";
  try {
    return JSON.stringify(submitResultData.value, null, 2);
  } catch (_error) {
    return "";
  }
});

function openSubmitResultModal(payload: ExaminationSubmitResponse) {
  submitResultData.value = payload;
  submitResultCountdown.value = 60;
  isSubmitResultModalOpen.value = true;
  clearSubmitResultTimer();

  submitResultTimer = setInterval(() => {
    submitResultCountdown.value -= 1;
    if (submitResultCountdown.value <= 0) {
      clearSubmitResultTimer();
      isSubmitResultModalOpen.value = false;
    }
  }, 1000);
}

function loadSubmitResultFromStorage() {
  if (!import.meta.client) return;
  const raw = sessionStorage.getItem(EXAMINATION_SUBMIT_RESULT_STORAGE_KEY);
  if (!raw) return;
  sessionStorage.removeItem(EXAMINATION_SUBMIT_RESULT_STORAGE_KEY);

  try {
    const parsed = JSON.parse(raw);
    openSubmitResultModal(parsed || {});
  } catch (_error) {
    // Ignore malformed payload.
  }
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

const roomTimeWindow = computed(() => {
  const eventUser = eventData.value?.eventUsers?.[0];
  const room =
    eventUser?.attendaces?.room || eventUser?.attendances?.room || null;

  const startDate = room?.startDate || null;
  const finishDate = room?.finishDate || null;
  const startMs = startDate ? new Date(startDate).getTime() : Number.NaN;
  const finishMs = finishDate ? new Date(finishDate).getTime() : Number.NaN;
  const nowMs = Date.now();

  const hasValidRange =
    Number.isFinite(startMs) &&
    Number.isFinite(finishMs) &&
    startMs <= finishMs;
  const isInRange = hasValidRange && nowMs >= startMs && nowMs <= finishMs;

  return {
    hasValidRange,
    isInRange,
    startDate,
    finishDate,
  };
});

const roomRangeMessage = computed(() => {
  if (!roomTimeWindow.value.hasValidRange) {
    return "Room is not available. Please contact administrator.";
  }
  return `Room is closed !!! Examination can only start between ${formatDateTime(roomTimeWindow.value.startDate)} and ${formatDateTime(roomTimeWindow.value.finishDate)} (UTC).`;
});

const hasShownOutOfRangeToast = ref(false);

watch(
  () => [
    status.value,
    roomTimeWindow.value.hasValidRange,
    roomTimeWindow.value.isInRange,
    overallExaminationStatus.value,
  ],
  ([fetchStatus, hasValidRange, isInRange, examinationStatus]) => {
    if (fetchStatus !== "success") return;
    if (examinationStatus === "COMPLETED" || examinationStatus === "NOT_ASSIGNED") {
      hasShownOutOfRangeToast.value = false;
      return;
    }
    if (hasValidRange && isInRange) {
      hasShownOutOfRangeToast.value = false;
      return;
    }
    if (hasShownOutOfRangeToast.value) return;
    hasShownOutOfRangeToast.value = true;
    toast.add({
      title: "Examination Not Available",
      description: roomRangeMessage.value,
      color: "warning",
    });
  },
  { immediate: true },
);

function toPercentageText(value: number): string {
  if (Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(0)}%`;
}

function getRowsForQuestion(question: EventQuestionItem): TableRow[] {
  return appRatings.value.map((item, index) => ({
    no: index + 1,
    appRatingId: item.id,
    statusId: Number(item.statusId || 0),
    rating: item.rating?.rating || "-",
    quantity: question.quantity,
    persentage: question.persentage,
    minutes: question.minutes,
    isReExamination: (item.examinationInvalidations?.length || 0) > 0,
    examinationStatus:
      item.examinationStatus?.status || "NOT_STARTED",
    statusMessage:
      item.examinationStatus?.message || "Examination status is unavailable.",
    completedAt: item.examinationStatus?.completedAt || null,
    canStart: Boolean(item.examinationStatus?.canStart),
  }));
}

async function handleAction(row: TableRow, question: EventQuestionItem) {
  if (!roomTimeWindow.value.hasValidRange || !roomTimeWindow.value.isInRange) {
    toast.add({
      title: "Examination Not Available",
      description: roomRangeMessage.value,
      color: "warning",
    });
    return;
  }

  const eventId = eventData.value?.id;
  if (!eventId) {
    toast.add({
      title: "Error",
      description: "Event ID is not available",
      color: "error",
    });
    return;
  }

  if (!row.appRatingId) {
    toast.add({
      title: "Error",
      description: "App Rating ID is not available",
      color: "error",
    });
    return;
  }

  try {
    isActionSubmitting.value = true;

    if (isMultipleChoiceQuestion(question)) {
      const multipleChoicePayload =
        await $fetch<ExaminationMultipleChoiceResponse>(
          `${apiBaseUrl}/api/examinationMultipleChoice`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              Authorization: token.value ? `Bearer ${token.value}` : "",
            },
            body: {
              eventId,
              appRatingId: row.appRatingId,
            },
          },
        );

      examinationMultipleChoiceResponse.value = multipleChoicePayload;
      examinationMultipleChoiceMeta.value = {
        eventId,
        appRatingId: row.appRatingId,
      };
      if (import.meta.client) {
        sessionStorage.setItem(
          EXAMINATION_MULTIPLE_CHOICE_META_STORAGE_KEY,
          JSON.stringify(examinationMultipleChoiceMeta.value),
        );
      }

      await navigateTo("/examination/multipleChoice");
      return;
    }

    const essayPayload = await $fetch<ExaminationEssayResponse>(
      `${apiBaseUrl}/api/examinationEssay`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
        body: {
          eventId,
          appRatingId: row.appRatingId,
        },
      },
    );

    examinationEssayResponse.value = essayPayload;
    examinationEssayMeta.value = {
      eventId,
      appRatingId: row.appRatingId,
    };
    if (import.meta.client) {
      sessionStorage.setItem(
        EXAMINATION_ESSAY_META_STORAGE_KEY,
        JSON.stringify(examinationEssayMeta.value),
      );
    }

    await navigateTo("/examination/essay");
  } catch (error: any) {
    const isMultipleChoice = isMultipleChoiceQuestion(question);
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        (isMultipleChoice
          ? "Failed to start multiple choice examination"
          : "Failed to start essay examination"),
      color: "error",
    });
  } finally {
    isActionSubmitting.value = false;
  }
}

function isMultipleChoiceQuestion(question: EventQuestionItem): boolean {
  const kind = (question.kindOfQuestion?.question || "").trim().toUpperCase();
  return kind === "MULTIPLE CHOICE";
}

function canShowGoButton(question: EventQuestionItem, row: TableRow): boolean {
  if (!row.canStart) return false;
  const statusId = Number(row.statusId || 0);
  if (isMultipleChoiceQuestion(question)) {
    return statusId === 4;
  }
  return statusId === 1 || statusId === 5;
}

onMounted(() => {
  loadSubmitResultFromStorage();
});

onBeforeUnmount(() => {
  clearSubmitResultTimer();
});
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Examination">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <div
          v-if="status === 'pending'"
          class="flex items-center justify-center py-10 text-muted"
        >
          <UIcon name="i-lucide-loader-2" class="size-6 animate-spin mr-2" />
          Loading examination data...
        </div>

        <div
          v-else-if="error"
          class="rounded-lg border border-error/30 bg-error/5 p-4 space-y-2"
        >
          <p class="font-medium text-error">Failed to fetch examination data</p>
          <UButton
            label="Retry"
            color="error"
            variant="outline"
            icon="i-lucide-refresh-cw"
            @click="refresh()"
          />
        </div>

        <div v-else-if="!eventData" class="rounded-lg border p-4 space-y-2">
          <UBadge :color="statusColor(overallExaminationStatus)" variant="soft">
            {{ statusLabel(overallExaminationStatus) }}
          </UBadge>
          <p class="text-sm text-muted">{{ overallStatusMessage }}</p>
        </div>

        <template v-else>
          <div
            class="rounded-lg border p-4 space-y-2"
            :class="{
              'border-success/30 bg-success/5': overallExaminationStatus === 'COMPLETED',
              'border-info/30 bg-info/5': overallExaminationStatus === 'IN_PROGRESS',
              'border-warning/30 bg-warning/5': overallExaminationStatus === 'WAITING_ROOM',
              'border-error/30 bg-error/5': overallExaminationStatus === 'EXPIRED',
            }"
          >
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :color="statusColor(overallExaminationStatus)" variant="soft">
                {{ statusLabel(overallExaminationStatus) }}
              </UBadge>
              <span class="font-medium text-highlighted">Examination Status</span>
            </div>
            <p class="text-sm text-muted">{{ overallStatusMessage }}</p>
            <p v-if="data?.completedAt" class="text-xs text-muted">
              Completed at: {{ formatDateTime(data.completedAt) }} UTC
            </p>
          </div>

          <div
            v-if="
              overallExaminationStatus !== 'COMPLETED' &&
              (!roomTimeWindow.hasValidRange || !roomTimeWindow.isInRange)
            "
            class="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning"
          >
            {{ roomRangeMessage }}
          </div>

          <UCard>
            <template #header>
              <div class="space-y-1">
                <p class="text-sm text-muted">Current Event</p>
                <h2 class="text-xl font-semibold text-highlighted">
                  {{ eventData.event }}
                </h2>
              </div>
            </template>

            <div class="text-sm text-muted">
              Passing Grade:
              <span
                class="font-semibold text-primary"
                style="font-size: 18px"
                >{{ eventData.passingGrade }}</span
              >
            </div>
          </UCard>

          <div
            v-for="question in eventData.eventQuestions || []"
            :key="question.id"
            class="space-y-3"
          >
            <div class="flex items-center justify-between">
              <h3
                class="text-sm font-semibold uppercase tracking-wide text-muted"
              >
                {{ question.kindOfQuestion?.question || "Question" }}
              </h3>
              <!-- <span class="text-xs text-muted">Event Question ID: {{ question.id }}</span> -->
            </div>

            <div class="overflow-x-auto rounded-lg border">
              <table class="min-w-full text-sm">
                <thead class="bg-muted/40">
                  <tr>
                    <th class="px-3 py-2 text-left font-medium">No</th>
                    <th class="px-3 py-2 text-left font-medium">Rating</th>
                    <th class="px-3 py-2 text-left font-medium">Quantity</th>
                    <th class="px-3 py-2 text-left font-medium">Persentage</th>
                    <th class="px-3 py-2 text-left font-medium">Minutes</th>
                    <th class="px-3 py-2 text-left font-medium">Status</th>
                    <th class="px-3 py-2 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in getRowsForQuestion(question)"
                    :key="`${question.id}-${row.appRatingId}`"
                    class="border-t"
                  >
                    <td class="px-3 py-2">{{ row.no }}</td>
                    <td class="px-3 py-2">{{ row.rating }}</td>
                    <td class="px-3 py-2">{{ row.quantity }}</td>
                    <td class="px-3 py-2">
                      {{ toPercentageText(row.persentage) }}
                    </td>
                    <td class="px-3 py-2">{{ row.minutes }}</td>
                    <td class="px-3 py-2">
                      <div class="space-y-1">
                        <UBadge
                          :color="statusColor(row.examinationStatus)"
                          variant="soft"
                          size="sm"
                        >
                          {{ statusLabel(row.examinationStatus) }}
                        </UBadge>
                        <p class="max-w-72 text-xs text-muted">
                          {{ row.statusMessage }}
                        </p>
                        <p v-if="row.completedAt" class="text-xs text-muted">
                          {{ formatDateTime(row.completedAt) }} UTC
                        </p>
                      </div>
                    </td>
                    <td class="px-3 py-2">
                      <UButton
                        v-if="canShowGoButton(question, row)"
                        :label="row.isReExamination ? 'Re-execute' : 'Go'"
                        size="md"
                        :icon="
                          row.isReExamination
                            ? 'i-lucide-rotate-ccw'
                            : 'i-lucide-plane'
                        "
                        :color="row.isReExamination ? 'warning' : 'primary'"
                        variant="soft"
                        :disabled="
                          isActionSubmitting ||
                          !roomTimeWindow.hasValidRange ||
                          !roomTimeWindow.isInRange
                        "
                        @click="handleAction(row, question)"
                      />
                      <span v-else class="text-muted">-</span>
                    </td>
                  </tr>

                  <tr
                    v-if="getRowsForQuestion(question).length === 0"
                    class="border-t"
                  >
                    <td class="px-3 py-3 text-muted" colspan="7">
                      No rating has been assigned for this examination.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>

  <div
    v-if="isActionSubmitting"
    class="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center"
  >
    <div
      class="bg-white dark:bg-neutral-900 rounded-xl px-6 py-5 shadow-xl flex items-center gap-3"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-6 animate-spin text-primary"
      />
      <span class="text-sm font-medium text-highlighted">
        Processing request...
      </span>
    </div>
  </div>

  <UModal
    v-model:open="isSubmitResultModalOpen"
    title="Examination Result"
    :dismissible="false"
    :close="false"
    :ui="{ content: 'max-w-4xl' }"
  >
    <template #body>
      <div
        class="submit-result-guard space-y-4"
        @copy.capture.prevent
        @cut.capture.prevent
        @paste.capture.prevent
        @keydown.capture="blockClipboardShortcuts"
      >
        <div
          class="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary"
        >
          This result popup will close automatically in
          <strong>{{ submitResultCountdown }}</strong> seconds.
        </div>

        <div
          v-if="submitResultData?.awaitingPractical"
          class="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning"
        >
          Theory passed. The overall examination remains pending until every
          required practical item is completed and passed. No user rating has
          been activated yet.
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <UCard>
            <p class="text-xs text-muted">Final Value</p>
            <p class="text-xl font-semibold" :class="finalValueTextClass">
              {{ formattedFinalValue }}
            </p>
          </UCard>
          <UCard>
            <p class="text-xs text-muted">False Answers</p>
            <p class="text-xl font-semibold text-highlighted">
              {{ submitFalseAnswers.length }}
            </p>
          </UCard>
          <UCard>
            <p class="text-xs text-muted">Essay Corrections</p>
            <p class="text-xl font-semibold text-highlighted">
              {{ submitEssayCorrections.length }}
            </p>
          </UCard>
        </div>

        <UCard v-if="submitFalseAnswers.length > 0">
          <template #header>
            <h3 class="text-sm font-semibold text-highlighted">
              Incorrect Multiple Choice
            </h3>
          </template>
          <div class="max-h-64 overflow-y-auto space-y-3 pr-1">
            <div
              v-for="(item, index) in submitFalseAnswers"
              :key="item.id || `false-${index}`"
              class="rounded-lg border p-3 space-y-2"
            >
              <div class="text-xs text-muted font-medium">
                #{{ index + 1 }} - ID {{ item.id || "-" }}
              </div>
              <div
                class="text-sm rich-preview [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                v-html="item.question || '-'"
              />
              <div
                class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted"
              >
                <div><strong>A:</strong> {{ item.a || "-" }}</div>
                <div><strong>B:</strong> {{ item.b || "-" }}</div>
                <div><strong>C:</strong> {{ item.c || "-" }}</div>
                <div><strong>D:</strong> {{ item.d || "-" }}</div>
              </div>
            </div>
          </div>
        </UCard>

        <UCard v-if="submitEssayCorrections.length > 0">
          <template #header>
            <h3 class="text-sm font-semibold text-highlighted">
              Essay Correction
            </h3>
          </template>
          <div class="max-h-64 overflow-y-auto space-y-3 pr-1">
            <div
              v-for="(item, index) in submitEssayCorrections"
              :key="item.id || `essay-${index}`"
              class="rounded-lg border p-3 space-y-2"
            >
              <div class="text-xs text-muted font-medium">
                #{{ index + 1 }} - Essay ID {{ item.essay?.id || "-" }}
              </div>
              <div
                class="text-sm rich-preview [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                v-html="item.essay?.question || '-'"
              />
              <div class="text-xs text-muted">
                Score: <strong>{{ item.score ?? "-" }}</strong> /
                {{ item.essay?.value ?? "-" }} | Checker:
                <strong>{{ item.checkerUser?.name || "-" }}</strong>
              </div>
            </div>
          </div>
        </UCard>

        <UCard
          v-if="submitFalseAnswers.length === 0 && submitEssayCorrections.length === 0"
        >
          <template #header>
            <h3 class="text-sm font-semibold text-highlighted">Raw Response</h3>
          </template>
          <pre class="text-xs whitespace-pre-wrap break-words">{{
            formattedSubmitResultJson || "-"
          }}</pre>
        </UCard>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.submit-result-guard {
  user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
}
</style>
