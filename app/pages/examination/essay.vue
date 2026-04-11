<script setup lang="ts">
import ip from "../../utils/config.json";

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

const { token } = useAuth();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const loading = ref(true);
const fetchError = ref<string | null>(null);
const essayData = ref<ExaminationEssayResponse | null>(null);

const examinationEssayResponse = useState<ExaminationEssayResponse | null>(
  "examinationEssayResponse",
  () => null,
);
const examinationEssayMeta = useState<{
  eventId: number;
  appRatingId: number;
} | null>("examinationEssayMeta", () => null);

const answers = reactive<Record<number, string>>({});
const remainingSeconds = ref(0);
const isTimeUpToastShown = ref(false);
const isSubmittingAnswers = ref(false);
const hasSubmittedAnswers = ref(false);
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let postTimeInterval: ReturnType<typeof setInterval> | null = null;

const eventId = computed(() => {
  const raw = route.query.eventId;
  const parsed = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
});

const appRatingId = computed(() => {
  const raw = route.query.appRatingId;
  const parsed = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
});

const essayGroups = computed(() => essayData.value?.essay || []);

const totalQuestions = computed(() =>
  essayGroups.value.reduce(
    (total, group) => total + (group.essay?.length || 0),
    0,
  ),
);

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

const answeredCount = computed(() => {
  return Object.values(answers).filter(
    (item) => stripHtml(item || "").length > 0,
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
        description: "Essay timer has finished.",
        color: "warning",
      });
      clearCountdown();
      void submitAnswers(true);
    }
  }, 1000);
}

function getCountdownMinutes(payload: ExaminationEssayResponse): number {
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

function getEventQuestionId(payload: ExaminationEssayResponse): number | null {
  const raw = payload.eventQuestion?.id ?? payload.eventShort?.id;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

async function postMonitorTime(payload: ExaminationEssayResponse) {
  const eventQuestionId = getEventQuestionId(payload);
  const currentAppRatingId = Number(payload.appRatingId ?? appRatingId.value);
  if (!eventQuestionId || !Number.isFinite(currentAppRatingId)) return;

  try {
    await $fetch(`http://${ip.ipBackEnd}/api/postTime`, {
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
    // Keep silent to avoid interrupting exam UX on background ping failure.
  }
}

function startPostTimeInterval(payload: ExaminationEssayResponse) {
  clearPostTimeInterval();

  const eventQuestionId = getEventQuestionId(payload);
  const currentAppRatingId = Number(payload.appRatingId ?? appRatingId.value);
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

function buildEssayAnswersPayload(payload: ExaminationEssayResponse) {
  const questions = payload.essay?.flatMap((group) => group.essay || []) || [];
  return questions
    .map((item) => {
      const essayId = Number(item.essay?.id);
      if (!Number.isFinite(essayId) || essayId <= 0) return null;
      return {
        essayId,
        answer: answers[essayId] || "",
      };
    })
    .filter(Boolean) as Array<{ essayId: number; answer: string }>;
}

async function submitAnswers(isAutoSubmit = false) {
  if (isSubmittingAnswers.value || hasSubmittedAnswers.value) return;
  const payload = essayData.value;
  if (!payload) return;

  const currentAppRatingId = Number(payload.appRatingId ?? appRatingId.value);
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

  const essay = buildEssayAnswersPayload(payload);
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
    await $fetch(`http://${ip.ipBackEnd}/api/examinationAnswer`, {
      method: "POST",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
      body: {
        essay,
        appRatingId: currentAppRatingId,
        eventUserId,
        groupMemberId,
      },
    });

    hasSubmittedAnswers.value = true;
    clearCountdown();
    clearPostTimeInterval();
    examinationEssayResponse.value = null;
    examinationEssayMeta.value = null;

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

    await router.push({
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
  if (!isAllQuestionsAnswered.value || isSubmittingAnswers.value || hasSubmittedAnswers.value) {
    return;
  }
  if (!window.confirm("Are you sure to submit essay answer?")) {
    return;
  }
  void submitAnswers(false);
}

async function loadEssayData() {
  loading.value = true;
  fetchError.value = null;

  if (!Number.isFinite(eventId.value) || !Number.isFinite(appRatingId.value)) {
    fetchError.value = "Missing or invalid eventId/appRatingId in URL.";
    loading.value = false;
    return;
  }

  try {
    const hasCachedPayload =
      examinationEssayMeta.value?.eventId === eventId.value &&
      examinationEssayMeta.value?.appRatingId === appRatingId.value &&
      !!examinationEssayResponse.value;

    let payload: ExaminationEssayResponse;

    if (hasCachedPayload) {
      payload = examinationEssayResponse.value as ExaminationEssayResponse;
    } else {
      payload = await $fetch<ExaminationEssayResponse>(
        `http://${ip.ipBackEnd}/api/examinationEssay`,
        {
          method: "POST",
          headers: {
            Authorization: token.value ? `Bearer ${token.value}` : "",
          },
          body: {
            eventId: eventId.value,
            appRatingId: appRatingId.value,
          },
        },
      );

      examinationEssayResponse.value = payload;
      examinationEssayMeta.value = {
        eventId: eventId.value,
        appRatingId: appRatingId.value,
      };
    }

    essayData.value = payload;

    const allQuestions =
      payload.essay?.flatMap((group) => group.essay || []) || [];
    for (const item of allQuestions) {
      const id = item.essay?.id;
      if (!id) continue;
      if (typeof answers[id] !== "string") {
        answers[id] = "";
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
      "Failed to load essay examination data.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadEssayData);
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
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Essay Examination">
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
          Loading essay examination...
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
            @click="loadEssayData"
          />
        </div>

        <div
          v-else-if="essayGroups.length === 0"
          class="rounded-lg border p-4 text-muted"
        >
          No essay data available.
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

          <UCard
            v-for="(group, groupIndex) in essayGroups"
            :key="group.id"
            class="space-y-4"
          >
            <template #header>
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-base font-semibold text-highlighted">
                  Group {{ groupIndex + 1 }}: {{ group.group || "-" }}
                </h2>
                <span class="text-xs text-muted">
                  Quantity: {{ group.quantity }}
                </span>
              </div>
            </template>

            <div class="space-y-6">
              <div
                v-for="(item, questionIndex) in group.essay || []"
                :key="item.essay?.id || `${group.id}-${questionIndex}`"
                class="space-y-3 rounded-lg border p-4"
              >
                <div class="text-sm font-medium text-highlighted">
                  Question {{ questionIndex + 1 }}
                </div>

                <div
                  class="text-sm rich-preview [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                  v-html="item.essay?.question || '-'"
                />

                <img
                  v-if="item.essay?.image"
                  :src="item.essay?.image"
                  alt="Essay question image"
                  class="max-h-72 w-auto rounded border border-default"
                />

                <UFormField label="Your Answer">
                  <div
                    :class="isTimeUp ? 'pointer-events-none opacity-70' : ''"
                  >
                    <RichTextEditor
                      v-if="item.essay?.id"
                      v-model="answers[item.essay.id]"
                      placeholder="Write your answer here..."
                    />
                    <div v-else class="text-xs text-error">
                      Invalid question ID.
                    </div>
                  </div>
                </UFormField>
              </div>
            </div>
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
