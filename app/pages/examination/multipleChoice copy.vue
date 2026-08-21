<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface MultipleChoiceItem {
  id: number;
  question?: string | null;
  a?: string | null;
  b?: string | null;
  c?: string | null;
  d?: string | null;
  image?: string | null;
}

interface MultipleChoiceQuestionPayload {
  multipleChoice?: MultipleChoiceItem | null;
}

interface MultipleChoiceGroupPayload {
  id: number;
  quantity: number;
  group?: string | null;
  multipleChoice?: MultipleChoiceQuestionPayload[];
}

interface ExaminationMultipleChoiceResponse {
  multipleChoice?: MultipleChoiceGroupPayload[];
  appRatingId?: number;
  eventUserId?: number;
  groupMemberId?: number;
  eventId?: number;
  eventShort?: {
    id?: number;
    minutes?: number;
  } | null;
  eventQuestion?: {
    id?: number;
    minutes?: number;
  } | null;
  monitorTime?: {
    time?: number;
  } | null;
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
  falseAnswer?: SubmitFalseAnswerItem[] | null;
  essayCorrection?: SubmitEssayCorrectionItem[] | null;
  [key: string]: unknown;
}

type OptionKey = "A" | "B" | "C" | "D";
const displayOptionSlots: OptionKey[] = ["A", "B", "C", "D"];

const { token } = useAuth();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const EXAMINATION_MULTIPLE_CHOICE_META_STORAGE_KEY =
  "examinationMultipleChoiceMeta";
const EXAMINATION_SUBMIT_RESULT_STORAGE_KEY = "examinationSubmitResult";

const loading = ref(true);
const fetchError = ref<string | null>(null);
const multipleChoiceData = ref<ExaminationMultipleChoiceResponse | null>(null);

const examinationMultipleChoiceResponse =
  useState<ExaminationMultipleChoiceResponse | null>(
    "examinationMultipleChoiceResponse",
    () => null,
  );
const examinationMultipleChoiceMeta = useState<{
  eventId: number;
  appRatingId: number;
} | null>("examinationMultipleChoiceMeta", () => null);

const answers = reactive<Record<number, "A" | "B" | "C" | "D" | "">>({});
const optionOrderByQuestion = reactive<Record<number, OptionKey[]>>({});
const activeGroupId = ref<number | undefined>(undefined);
const remainingSeconds = ref(0);
const isTimeUpToastShown = ref(false);
const isSubmittingAnswers = ref(false);
const hasSubmittedAnswers = ref(false);
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let postTimeInterval: ReturnType<typeof setInterval> | null = null;

const requestMeta = ref<{ eventId: number; appRatingId: number } | null>(null);

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

function parsePositiveNumber(raw: unknown): number | null {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function persistRequestMeta(meta: { eventId: number; appRatingId: number }) {
  examinationMultipleChoiceMeta.value = meta;
  if (!import.meta.client) return;
  sessionStorage.setItem(
    EXAMINATION_MULTIPLE_CHOICE_META_STORAGE_KEY,
    JSON.stringify(meta),
  );
}

function readMetaFromSessionStorage(): {
  eventId: number;
  appRatingId: number;
} | null {
  if (!import.meta.client) return null;
  const raw = sessionStorage.getItem(
    EXAMINATION_MULTIPLE_CHOICE_META_STORAGE_KEY,
  );
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const eventId = parsePositiveNumber(parsed?.eventId);
    const appRatingId = parsePositiveNumber(parsed?.appRatingId);
    if (!eventId || !appRatingId) return null;
    return { eventId, appRatingId };
  } catch (_error) {
    return null;
  }
}

const multipleChoiceGroups = computed(
  () => multipleChoiceData.value?.multipleChoice || [],
);
const isAnsweredOption = (value: unknown): value is OptionKey =>
  value === "A" || value === "B" || value === "C" || value === "D";
const getGroupAnsweredCount = (group: MultipleChoiceGroupPayload): number => {
  const questions = group.multipleChoice || [];
  return questions.reduce((count, item) => {
    const id = item.multipleChoice?.id;
    if (!id) return count;
    return isAnsweredOption(answers[id]) ? count + 1 : count;
  }, 0);
};
type GroupProgressState = "need-more" | "complete" | "better";
const getGroupTargetCount = (group: MultipleChoiceGroupPayload): number => {
  const quantity = Number(group.quantity);
  if (Number.isFinite(quantity) && quantity > 0) return quantity;
  return group.multipleChoice?.length || 0;
};
const getGroupProgressState = (
  group: MultipleChoiceGroupPayload,
): GroupProgressState => {
  const answered = getGroupAnsweredCount(group);
  const target = getGroupTargetCount(group);
  if (answered < target) return "need-more";
  if (answered === target) return "complete";
  return "better";
};
const getGroupProgressClass = (state: GroupProgressState): string => {
  if (state === "need-more") {
    return "data-[state=inactive]:text-orange-600 data-[state=active]:text-orange-700";
  }
  if (state === "complete") {
    return "data-[state=inactive]:text-green-600 data-[state=active]:text-green-700";
  }
  return "data-[state=inactive]:text-blue-600 data-[state=active]:text-blue-700";
};
const getGroupById = (
  groupId: number,
): MultipleChoiceGroupPayload | undefined =>
  multipleChoiceGroups.value.find((group) => group.id === groupId);
const getGroupProgressLabelById = (groupId: number): string => {
  const group = getGroupById(groupId);
  if (!group) return "0/0";
  const answered = getGroupAnsweredCount(group);
  const target = getGroupTargetCount(group);
  return `${answered}/${target}`;
};
const getGroupProgressPillClassById = (groupId: number): string => {
  const group = getGroupById(groupId);
  if (!group) return "bg-muted text-muted";
  const state = getGroupProgressState(group);
  if (state === "need-more") return "bg-orange-100 text-orange-700";
  if (state === "complete") return "bg-green-100 text-green-700";
  return "bg-blue-100 text-blue-700";
};
const groupTabs = computed(() =>
  multipleChoiceGroups.value.map((group, index) => {
    const state = getGroupProgressState(group);

    return {
      label: `Group ${index + 1}`,
      value: group.id,
      ui: {
        trigger: getGroupProgressClass(state),
      },
    };
  }),
);
const activeGroup = computed(() => {
  if (!multipleChoiceGroups.value.length) return null;
  return (
    multipleChoiceGroups.value.find(
      (group) => group.id === activeGroupId.value,
    ) || multipleChoiceGroups.value[0]
  );
});
const getGroupLabel = (groupId?: number): string => {
  if (!groupId) return "Group";
  const index = multipleChoiceGroups.value.findIndex(
    (group) => group.id === groupId,
  );
  return index >= 0 ? `Group ${index + 1}` : "Group";
};

const totalQuestions = computed(() =>
  multipleChoiceGroups.value.reduce(
    (total, group) => total + (group.multipleChoice?.length || 0),
    0,
  ),
);

function hasImage(imagePath?: string | null): boolean {
  return typeof imagePath === "string" && imagePath.trim() !== "";
}

function resolveImageUrl(imagePath?: string | null): string {
  const trimmed = (imagePath || "").trim();
  if (!trimmed) return "";
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  if (/^(data|blob):/i.test(trimmed)) return trimmed;
  return `${apiBaseUrl}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

function shuffleOptionKeys(): OptionKey[] {
  const keys: OptionKey[] = ["A", "B", "C", "D"];
  for (let i = keys.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = keys[i] as OptionKey;
    keys[i] = keys[j] as OptionKey;
    keys[j] = temp;
  }
  return keys;
}

function getOptionOrder(questionId: number): OptionKey[] {
  if (!optionOrderByQuestion[questionId]) {
    optionOrderByQuestion[questionId] = shuffleOptionKeys();
  }
  return optionOrderByQuestion[questionId];
}

function getShuffledContentKey(questionId: number, index: number): OptionKey {
  return getOptionOrder(questionId)[index] as OptionKey;
}

function getOptionText(
  question: MultipleChoiceItem | undefined | null,
  key: OptionKey,
): string {
  if (!question) return "-";
  if (key === "A") return question.a || "-";
  if (key === "B") return question.b || "-";
  if (key === "C") return question.c || "-";
  return question.d || "-";
}

const answeredCount = computed(() => {
  return Object.values(answers).filter(
    (item) => item === "A" || item === "B" || item === "C" || item === "D",
  ).length;
});
const isAllQuestionsAnswered = computed(
  () => totalQuestions.value > 0 && answeredCount.value >= totalQuestions.value,
);

const isTimeUp = computed(() => remainingSeconds.value <= 0);
const isLessThanTenMinutes = computed(
  () => remainingSeconds.value > 300 && remainingSeconds.value < 600,
);
const isLessThanFiveMinutes = computed(
  () => remainingSeconds.value > 0 && remainingSeconds.value <= 300,
);

const countdownText = computed(() => {
  const seconds = Math.max(0, remainingSeconds.value);
  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = seconds % 60;

  if (hh > 0) {
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
});

function clearCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function clearPostTimeInterval() {
  if (postTimeInterval) {
    clearInterval(postTimeInterval);
    postTimeInterval = null;
  }
}

function startCountdown(minutes: number) {
  clearCountdown();
  isTimeUpToastShown.value = false;
  remainingSeconds.value = Math.max(0, Math.floor(minutes * 60));

  if (remainingSeconds.value <= 0) return;

  countdownTimer = setInterval(() => {
    if (remainingSeconds.value <= 0) {
      clearCountdown();
      return;
    }

    remainingSeconds.value -= 1;

    if (remainingSeconds.value <= 0 && !isTimeUpToastShown.value) {
      isTimeUpToastShown.value = true;
      toast.add({
        title: "Time is up",
        description: "Multiple choice timer has finished.",
        color: "warning",
      });
      clearCountdown();
      void submitAnswers(true);
    }
  }, 1000);
}

function getCountdownMinutes(
  payload: ExaminationMultipleChoiceResponse,
): number {
  const totalMinutesRaw =
    payload.eventQuestion?.minutes ?? payload.eventShort?.minutes ?? 0;
  const totalMinutes = Number(totalMinutesRaw);
  if (!Number.isFinite(totalMinutes)) return 0;

  if (payload.monitorTime == null) {
    return Math.max(0, totalMinutes);
  }

  const usedMinutes = Number(payload.monitorTime?.time ?? 0);
  if (!Number.isFinite(usedMinutes)) {
    return Math.max(0, totalMinutes);
  }

  return Math.max(0, totalMinutes - usedMinutes);
}

function getEventQuestionId(
  payload: ExaminationMultipleChoiceResponse,
): number | null {
  const raw = payload.eventQuestion?.id ?? payload.eventShort?.id;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

async function postMonitorTime(payload: ExaminationMultipleChoiceResponse) {
  const eventQuestionId = getEventQuestionId(payload);
  const currentAppRatingId = Number(
    payload.appRatingId ?? requestMeta.value?.appRatingId,
  );
  if (!eventQuestionId || !Number.isFinite(currentAppRatingId)) return;

  try {
    await $fetch(`${apiBaseUrl}/api/postTime`, {
      method: "POST",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
      body: {
        appRatingId: currentAppRatingId,
        eventQuestionId,
      },
    });
  } catch (_error) {
    // Silent background ping failure.
  }
}

function startPostTimeInterval(payload: ExaminationMultipleChoiceResponse) {
  clearPostTimeInterval();

  const eventQuestionId = getEventQuestionId(payload);
  const currentAppRatingId = Number(
    payload.appRatingId ?? requestMeta.value?.appRatingId,
  );
  if (
    !eventQuestionId ||
    !Number.isFinite(currentAppRatingId) ||
    isTimeUp.value
  ) {
    return;
  }

  postTimeInterval = setInterval(
    async () => {
      if (isTimeUp.value) {
        clearPostTimeInterval();
        return;
      }
      await postMonitorTime(payload);
    },
    5 * 60 * 1000,
  );
}

function buildMultipleChoiceAnswersPayload(
  payload: ExaminationMultipleChoiceResponse,
) {
  const questions =
    payload.multipleChoice?.flatMap((group) => group.multipleChoice || []) ||
    [];
  return questions
    .map((item) => {
      const multipleChoiceId = Number(item.multipleChoice?.id);
      if (!Number.isFinite(multipleChoiceId) || multipleChoiceId <= 0)
        return null;
      return {
        multipleChoiceId,
        answer: answers[multipleChoiceId] || "",
      };
    })
    .filter(Boolean) as Array<{
    multipleChoiceId: number;
    answer: "A" | "B" | "C" | "D" | "";
  }>;
}

async function submitAnswers(isAutoSubmit = false) {
  if (isSubmittingAnswers.value || hasSubmittedAnswers.value) return;
  const payload = multipleChoiceData.value;
  if (!payload) return;

  const currentAppRatingId = Number(
    payload.appRatingId ?? requestMeta.value?.appRatingId,
  );
  const eventUserId = Number(payload.eventUserId);
  const groupMemberId = Number(payload.groupMemberId);
  const eventId = Number(payload.eventId);

  if (
    !Number.isFinite(currentAppRatingId) ||
    currentAppRatingId <= 0 ||
    !Number.isFinite(eventUserId) ||
    eventUserId <= 0 ||
    !Number.isFinite(groupMemberId) ||
    groupMemberId <= 0 ||
    !Number.isFinite(eventId) ||
    eventId <= 0
  ) {
    if (!isAutoSubmit) {
      toast.add({
        title: "Error",
        description:
          "Missing appRatingId, eventUserId, eventId, or groupMemberId.",
        color: "error",
      });
    }
    return;
  }

  const multipleChoice = buildMultipleChoiceAnswersPayload(payload);
  if (!isAutoSubmit && !isAllQuestionsAnswered.value) {
    toast.add({
      title: "Incomplete Answers",
      description: "Please answer all questions before submitting.",
      color: "warning",
    });
    return;
  }

  try {
    isSubmittingAnswers.value = true;
    const submitPayload = await $fetch<ExaminationSubmitResponse>(
      `${apiBaseUrl}/api/examinationMultipleChoiceAnswer`,
      {
        method: "POST",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
        body: {
          multipleChoice,
          appRatingId: currentAppRatingId,
          eventId,
          eventUserId,
          groupMemberId,
        },
      },
    );

    hasSubmittedAnswers.value = true;
    clearCountdown();
    clearPostTimeInterval();
    examinationMultipleChoiceResponse.value = null;
    examinationMultipleChoiceMeta.value = null;
    requestMeta.value = null;
    if (import.meta.client) {
      sessionStorage.removeItem(EXAMINATION_MULTIPLE_CHOICE_META_STORAGE_KEY);
    }

    toast.add({
      title: "Success",
      description: isAutoSubmit
        ? "Time is up. Answers submitted automatically."
        : "Answers submitted successfully.",
      color: "success",
    });

    try {
      clearNuxtData((key) => key.includes("/api/examination"));
    } catch (_error) {
      // Prevent cache-clear issues from blocking redirect.
    }

    if (import.meta.client) {
      sessionStorage.setItem(
        EXAMINATION_SUBMIT_RESULT_STORAGE_KEY,
        JSON.stringify(submitPayload || {}),
      );
    }

    await router.replace({
      path: "/examination/examination",
      query: { refreshedAt: String(Date.now()) },
    });
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message || "Failed to submit examination answers.",
      color: "error",
    });
  } finally {
    isSubmittingAnswers.value = false;
  }
}

function handleManualSubmit() {
  if (
    !isAllQuestionsAnswered.value ||
    isSubmittingAnswers.value ||
    hasSubmittedAnswers.value
  ) {
    return;
  }
  if (!window.confirm("Are you sure to submit multiple choice answers?")) {
    return;
  }
  void submitAnswers(false);
}

async function loadMultipleChoiceData() {
  loading.value = true;
  fetchError.value = null;

  try {
    const queryEventId = parsePositiveNumber(route.query.eventId);
    const queryAppRatingId = parsePositiveNumber(route.query.appRatingId);

    if (queryEventId && queryAppRatingId) {
      requestMeta.value = {
        eventId: queryEventId,
        appRatingId: queryAppRatingId,
      };
      persistRequestMeta(requestMeta.value);

      await router.replace({ path: route.path, query: {} });
    } else if (examinationMultipleChoiceMeta.value) {
      requestMeta.value = {
        eventId: examinationMultipleChoiceMeta.value.eventId,
        appRatingId: examinationMultipleChoiceMeta.value.appRatingId,
      };
    } else {
      requestMeta.value = readMetaFromSessionStorage();
      if (requestMeta.value) {
        persistRequestMeta(requestMeta.value);
      }
    }

    const currentEventId = requestMeta.value?.eventId;
    const currentAppRatingId = requestMeta.value?.appRatingId;

    if (currentEventId == null || currentAppRatingId == null) {
      fetchError.value =
        "Missing examination session. Please start again from examination page.";
      loading.value = false;
      return;
    }

    const hasCachedPayload =
      examinationMultipleChoiceMeta.value?.eventId === currentEventId &&
      examinationMultipleChoiceMeta.value?.appRatingId === currentAppRatingId &&
      !!examinationMultipleChoiceResponse.value;

    let payload: ExaminationMultipleChoiceResponse;

    if (hasCachedPayload) {
      payload =
        examinationMultipleChoiceResponse.value as ExaminationMultipleChoiceResponse;
    } else {
      payload = await $fetch<ExaminationMultipleChoiceResponse>(
        `${apiBaseUrl}/api/examinationMultipleChoice`,
        {
          method: "POST",
          headers: {
            Authorization: token.value ? `Bearer ${token.value}` : "",
          },
          body: {
            eventId: currentEventId,
            appRatingId: currentAppRatingId,
          },
        },
      );

      examinationMultipleChoiceResponse.value = payload;
      persistRequestMeta({
        eventId: currentEventId,
        appRatingId: currentAppRatingId,
      });
    }

    multipleChoiceData.value = payload;

    const allQuestions =
      payload.multipleChoice?.flatMap((group) => group.multipleChoice || []) ||
      [];
    for (const item of allQuestions) {
      const id = item.multipleChoice?.id;
      if (!id) continue;
      if (!["A", "B", "C", "D"].includes(String(answers[id] || ""))) {
        answers[id] = "";
      }
      if (!optionOrderByQuestion[id]) {
        optionOrderByQuestion[id] = shuffleOptionKeys();
      }
    }

    startCountdown(getCountdownMinutes(payload));
    startPostTimeInterval(payload);
    if (isTimeUp.value) {
      void submitAnswers(true);
    }
  } catch (error: any) {
    fetchError.value =
      error?.data?.message ||
      error?.message ||
      "Failed to load multiple choice examination data.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadMultipleChoiceData);
watch(
  multipleChoiceGroups,
  (groups) => {
    if (!groups.length) {
      activeGroupId.value = undefined;
      return;
    }

    const hasActiveGroup = groups.some(
      (group) => group.id === activeGroupId.value,
    );
    if (!hasActiveGroup) {
      activeGroupId.value = groups[0]?.id;
    }
  },
  { immediate: true },
);
watch(isTimeUp, (value) => {
  if (value) {
    void submitAnswers(true);
  }
});
onBeforeUnmount(() => {
  clearCountdown();
  clearPostTimeInterval();
});
</script>

<template>
  <UDashboardPanel
    class="exam-guard"
    @copy.capture.prevent
    @cut.capture.prevent
    @paste.capture.prevent
    @keydown.capture="blockClipboardShortcuts"
  >
    <template #header>
      <UDashboardNavbar title="Multiple Choice Examination">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            label="Back"
            variant="ghost"
            icon="i-lucide-arrow-left"
            @click="navigateTo('/examination/examination')"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <div
          v-if="loading"
          class="flex items-center justify-center py-10 text-muted"
        >
          <UIcon name="i-lucide-loader-2" class="size-6 animate-spin mr-2" />
          Loading multiple choice examination...
        </div>

        <div
          v-else-if="fetchError"
          class="rounded-lg border border-error/30 bg-error/5 p-4 space-y-2"
        >
          <p class="font-medium text-error">{{ fetchError }}</p>
          <UButton
            label="Retry"
            color="error"
            variant="outline"
            icon="i-lucide-refresh-cw"
            @click="loadMultipleChoiceData"
          />
        </div>

        <div
          v-else-if="multipleChoiceGroups.length === 0"
          class="rounded-lg border p-4 text-muted"
        >
          No multiple choice data available.
        </div>

        <template v-else>
          <UCard>
            <div class="space-y-4">
              <div class="text-sm text-muted">
                <p>
                  Total Questions:
                  <span class="font-semibold text-highlighted">{{
                    totalQuestions
                  }}</span>
                </p>
                <p>
                  Answered:
                  <span class="font-semibold text-primary">{{
                    answeredCount
                  }}</span>
                </p>
              </div>

              <div class="flex justify-center">
                <div
                  class="px-8 py-4 rounded-xl border text-3xl font-bold tracking-wide text-center min-w-[260px] p-[30px]"
                  :class="
                    isTimeUp || isLessThanFiveMinutes
                      ? 'border-error/40 bg-error/10 text-error'
                      : isLessThanTenMinutes
                        ? 'border-orange-400/40 bg-orange-400/10 text-orange-600'
                        : 'border-primary/30 bg-primary/10 text-primary'
                  "
                >
                  Time Left: {{ countdownText }}
                </div>
              </div>
            </div>
          </UCard>

          <div
            v-if="isTimeUp"
            class="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning"
          >
            Time is up. You can still review your answers on this page.
          </div>

          <div class="flex justify-end">
            <UButton
              label="Submit Answers"
              color="primary"
              icon="i-lucide-send"
              :loading="isSubmittingAnswers"
              :disabled="
                isSubmittingAnswers ||
                hasSubmittedAnswers ||
                !isAllQuestionsAnswered
              "
              @click="handleManualSubmit"
            />
          </div>

          <UTabs
            v-model="activeGroupId"
            :items="groupTabs"
            :content="false"
            size="lg"
          >
            <template #trailing="{ item }">
              <span
                class="ml-2 rounded-md px-2 py-1 text-sm font-semibold"
                :class="getGroupProgressPillClassById(Number(item.value))"
              >
                {{ getGroupProgressLabelById(Number(item.value)) }}
              </span>
            </template>
          </UTabs>

          <UCard v-if="activeGroup" :key="activeGroup.id" class="space-y-4">
            <template #header>
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-base font-semibold text-highlighted">
                  {{ getGroupLabel(activeGroup.id) }}:
                  {{ activeGroup.group || "-" }}
                </h2>
                <span class="text-xs text-muted">
                  Quantity: {{ activeGroup.quantity }}
                </span>
              </div>
            </template>

            <div class="space-y-6">
              <div
                v-for="(item, questionIndex) in activeGroup.multipleChoice ||
                []"
                :key="
                  item.multipleChoice?.id ||
                  `${activeGroup.id}-${questionIndex}`
                "
                class="space-y-3 rounded-lg border p-4"
              >
                <div class="text-sm font-medium text-highlighted">
                  Question {{ questionIndex + 1 }}
                </div>

                <img
                  v-if="hasImage(item.multipleChoice?.image)"
                  :src="resolveImageUrl(item.multipleChoice?.image)"
                  alt="Multiple choice question image"
                  class="max-h-72 w-auto rounded border border-default block mx-auto"
                />

                <div
                  class="text-sm rich-preview [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                  v-html="item.multipleChoice?.question || '-'"
                />

                <div
                  v-if="item.multipleChoice?.id"
                  :class="isTimeUp ? 'pointer-events-none opacity-70' : ''"
                  class="space-y-2"
                >
                  <label
                    v-for="(slotKey, slotIndex) in displayOptionSlots"
                    :key="`${item.multipleChoice.id}-${slotKey}`"
                    class="flex items-center gap-2 text-sm"
                  >
                    <input
                      :id="`q-${item.multipleChoice?.id}-${slotKey}`"
                      v-model="answers[item.multipleChoice.id]"
                      type="radio"
                      :name="`q-${item.multipleChoice?.id}`"
                      :value="
                        getShuffledContentKey(item.multipleChoice.id, slotIndex)
                      "
                    />
                    <span>
                      <strong>{{ slotKey }}.</strong>
                      {{
                        getOptionText(
                          item.multipleChoice,
                          getShuffledContentKey(
                            item.multipleChoice.id,
                            slotIndex,
                          ),
                        )
                      }}
                    </span>
                  </label>
                </div>
                <div v-else class="text-xs text-error">
                  Invalid question ID.
                </div>
              </div>
            </div>
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>

</template>

<style scoped>
.exam-guard {
  user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
}
</style>
