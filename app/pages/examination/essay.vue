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
  randomNumbers?: number[] | null;
}

const { token } = useAuth();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const EXAMINATION_ESSAY_META_STORAGE_KEY = "examinationEssayMeta";

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
const cameraVideoRef = ref<HTMLVideoElement | null>(null);
const cameraStream = ref<MediaStream | null>(null);
const isCameraInitializing = ref(false);
const isCameraReady = ref(false);
const cameraError = ref<string | null>(null);
const isCameraObstructed = ref(false);
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let postTimeInterval: ReturnType<typeof setInterval> | null = null;
let randomSnapshotTimeouts: Array<ReturnType<typeof setTimeout>> = [];
let cameraObstructionInterval: ReturnType<typeof setInterval> | null = null;
let lastCameraWarningAt = 0;

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
  examinationEssayMeta.value = meta;
  if (!import.meta.client) return;
  sessionStorage.setItem(
    EXAMINATION_ESSAY_META_STORAGE_KEY,
    JSON.stringify(meta),
  );
}

function readMetaFromSessionStorage(): {
  eventId: number;
  appRatingId: number;
} | null {
  if (!import.meta.client) return null;
  const raw = sessionStorage.getItem(EXAMINATION_ESSAY_META_STORAGE_KEY);
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

function hasImage(imagePath?: string | null): boolean {
  return typeof imagePath === "string" && imagePath.trim() !== "";
}

function resolveImageUrl(imagePath?: string | null): string {
  const trimmed = (imagePath || "").trim();
  if (!trimmed) return "";
  if (/^(data|blob):/i.test(trimmed)) return trimmed;
  return `/api/essay/image?image=${encodeURIComponent(trimmed)}`;
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
const canContinueExam = computed(
  () => isCameraReady.value && !isCameraObstructed.value,
);
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

function clearRandomSnapshotTimeouts() {
  randomSnapshotTimeouts.forEach((timer) => clearTimeout(timer));
  randomSnapshotTimeouts = [];
}

function clearCameraObstructionMonitor() {
  if (cameraObstructionInterval) {
    clearInterval(cameraObstructionInterval);
    cameraObstructionInterval = null;
  }
}

function stopCameraStream() {
  clearCameraObstructionMonitor();
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach((track) => track.stop());
    cameraStream.value = null;
  }
  if (cameraVideoRef.value) {
    cameraVideoRef.value.srcObject = null;
  }
  isCameraReady.value = false;
  isCameraObstructed.value = false;
}

function getCameraErrorMessage(error: unknown): string {
  const message = String((error as any)?.message || "").toLowerCase();
  const name = String((error as any)?.name || "").toLowerCase();

  if (name.includes("notallowed") || message.includes("permission")) {
    return "Camera permission is required. Please allow camera access to continue the examination.";
  }
  if (name.includes("notfound") || name.includes("devicesnotfound")) {
    return "No camera device found. Please connect a camera to continue the examination.";
  }
  if (name.includes("notreadable") || message.includes("in use")) {
    return "Camera is currently used by another app. Close the other app and try again.";
  }

  return "Unable to access camera. Please check device permission and try again.";
}

async function startCamera() {
  if (!import.meta.client) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value =
      "This browser does not support camera access. Unable to continue examination.";
    isCameraReady.value = false;
    return;
  }

  isCameraInitializing.value = true;
  cameraError.value = null;
  stopCameraStream();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
      },
      audio: false,
    });

    cameraStream.value = stream;
    isCameraReady.value = true;

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.onended = () => {
        isCameraReady.value = false;
        isCameraObstructed.value = false;
        cameraError.value =
          "Camera stream was stopped. Please reopen camera to continue.";
      };
    }

    if (cameraVideoRef.value) {
      cameraVideoRef.value.srcObject = stream;
      await cameraVideoRef.value.play().catch(() => null);
    }

    startCameraObstructionMonitor();
  } catch (error) {
    isCameraReady.value = false;
    cameraError.value = getCameraErrorMessage(error);
  } finally {
    isCameraInitializing.value = false;
  }
}

function detectCameraObstruction(): boolean {
  const video = cameraVideoRef.value;
  if (!video || !cameraStream.value || !isCameraReady.value) return false;

  const sampleWidth = 64;
  const sampleHeight = 48;
  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const context = canvas.getContext("2d");
  if (!context) return false;

  context.drawImage(video, 0, 0, sampleWidth, sampleHeight);
  const imageData = context.getImageData(0, 0, sampleWidth, sampleHeight).data;

  let sum = 0;
  let sumSquared = 0;
  let count = 0;
  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i] || 0;
    const g = imageData[i + 1] || 0;
    const b = imageData[i + 2] || 0;
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    sum += luminance;
    sumSquared += luminance * luminance;
    count += 1;
  }

  if (!count) return false;
  const mean = sum / count;
  const variance = sumSquared / count - mean * mean;
  const stdDev = Math.sqrt(Math.max(variance, 0));

  const tooDark = mean < 20;
  const tooFlat = stdDev < 10;
  return tooDark || tooFlat;
}

function startCameraObstructionMonitor() {
  clearCameraObstructionMonitor();

  cameraObstructionInterval = setInterval(() => {
    const obstructed = detectCameraObstruction();
    isCameraObstructed.value = obstructed;

    if (!obstructed) return;
    const now = Date.now();
    if (now - lastCameraWarningAt < 30000) return;
    lastCameraWarningAt = now;

    toast.add({
      title: "Camera Warning",
      description:
        "Camera appears obstructed (covered or too dark). Please adjust camera.",
      color: "warning",
    });
  }, 5000);
}

function captureCameraSnapshotBlob(): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = cameraVideoRef.value;
    if (!video || !cameraStream.value || !isCameraReady.value) {
      resolve(null);
      return;
    }

    const sourceWidth = video.videoWidth || 640;
    const sourceHeight = video.videoHeight || 360;
    const maxWidth = 960;
    const scale = sourceWidth > maxWidth ? maxWidth / sourceWidth : 1;
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      resolve(null);
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.7);
  });
}

async function postCameraSnapshot(
  payload: ExaminationEssayResponse,
  targetMinute: number,
) {
  const currentEventId = Number(payload.eventId ?? requestMeta.value?.eventId);
  const currentAppRatingId = Number(
    payload.appRatingId ?? requestMeta.value?.appRatingId,
  );
  const currentGroupMemberId = Number(payload.groupMemberId);

  if (
    !Number.isFinite(currentEventId) ||
    currentEventId <= 0 ||
    !Number.isFinite(currentAppRatingId) ||
    currentAppRatingId <= 0 ||
    !Number.isFinite(currentGroupMemberId) ||
    currentGroupMemberId <= 0
  ) {
    return;
  }

  const snapshotBlob = await captureCameraSnapshotBlob();
  if (!snapshotBlob) {
    toast.add({
      title: "Camera Snapshot Failed",
      description: `Unable to capture photo at minute ${targetMinute}.`,
      color: "warning",
    });
    return;
  }

  const formData = new FormData();
  formData.append("eventId", String(currentEventId));
  formData.append("appRatingId", String(currentAppRatingId));
  formData.append("groupMemberId", String(currentGroupMemberId));
  formData.append(
    "file",
    snapshotBlob,
    `essay-${currentEventId}-${currentGroupMemberId}-m${targetMinute}.jpg`,
  );

  try {
    await $fetch(`http://${ip.ipBackEnd}/api/preview`, {
      method: "POST",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
      body: formData,
    });
  } catch (_error) {
    toast.add({
      title: "Upload Failed",
      description: `Failed to upload camera snapshot at minute ${targetMinute}.`,
      color: "error",
    });
  }
}

function scheduleRandomSnapshots(payload: ExaminationEssayResponse) {
  clearRandomSnapshotTimeouts();

  const totalMinutes = Number(
    payload.eventQuestion?.minutes ?? payload.eventShort?.minutes ?? 0,
  );
  const remainingMinutes = getCountdownMinutes(payload);
  const elapsedMinutes = Math.max(0, totalMinutes - remainingMinutes);
  const randomMinutes = Array.from(
    new Set(
      (payload.randomNumbers || [])
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0),
    ),
  ).sort((a, b) => a - b);

  if (
    !Number.isFinite(totalMinutes) ||
    totalMinutes <= 0 ||
    !randomMinutes.length
  ) {
    return;
  }

  randomMinutes.forEach((minuteMark) => {
    if (minuteMark <= elapsedMinutes || minuteMark > totalMinutes) return;

    const delayMs = Math.max(
      0,
      Math.round((minuteMark - elapsedMinutes) * 60 * 1000),
    );
    const timer = setTimeout(() => {
      void postCameraSnapshot(payload, minuteMark);
    }, delayMs);
    randomSnapshotTimeouts.push(timer);
  });
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
  const currentAppRatingId = Number(
    payload.appRatingId ?? requestMeta.value?.appRatingId,
  );
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
  if (!isAutoSubmit && !canContinueExam.value) {
    toast.add({
      title: "Camera Required",
      description: "Please enable camera before continuing the examination.",
      color: "error",
    });
    return;
  }
  const payload = essayData.value;
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
    const submitResponse = await $fetch<{ message?: string }>(
      `http://${ip.ipBackEnd}/api/examinationAnswer`,
      {
        method: "POST",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
        body: {
          essay,
          appRatingId: currentAppRatingId,
          eventId,
          eventUserId,
          groupMemberId,
        },
      },
    );

    const submitMessage = String(submitResponse?.message || "")
      .trim()
      .toLowerCase();
    if (submitMessage && submitMessage !== "success") {
      toast.add({
        title: "Error",
        description:
          submitResponse?.message || "Failed to submit examination answers.",
        color: "error",
      });
      return;
    }

    hasSubmittedAnswers.value = true;
    clearCountdown();
    clearPostTimeInterval();
    clearRandomSnapshotTimeouts();
    examinationEssayResponse.value = null;
    examinationEssayMeta.value = null;
    requestMeta.value = null;
    if (import.meta.client) {
      sessionStorage.removeItem(EXAMINATION_ESSAY_META_STORAGE_KEY);
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
    !canContinueExam.value ||
    !isAllQuestionsAnswered.value ||
    isSubmittingAnswers.value ||
    hasSubmittedAnswers.value
  ) {
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
    } else if (examinationEssayMeta.value) {
      requestMeta.value = {
        eventId: examinationEssayMeta.value.eventId,
        appRatingId: examinationEssayMeta.value.appRatingId,
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
      examinationEssayMeta.value?.eventId === currentEventId &&
      examinationEssayMeta.value?.appRatingId === currentAppRatingId &&
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
            eventId: currentEventId,
            appRatingId: currentAppRatingId,
          },
        },
      );

      examinationEssayResponse.value = payload;
      persistRequestMeta({
        eventId: currentEventId,
        appRatingId: currentAppRatingId,
      });
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
    scheduleRandomSnapshots(payload);
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

watch(cameraVideoRef, async (videoEl) => {
  if (!videoEl || !cameraStream.value) return;
  videoEl.srcObject = cameraStream.value;
  await videoEl.play().catch(() => null);
});

onMounted(async () => {
  await loadEssayData();
  await startCamera();
});
watch(isTimeUp, (value) => {
  if (value) {
    void submitAnswers(true);
  }
});
onBeforeUnmount(() => {
  clearCountdown();
  clearPostTimeInterval();
  clearRandomSnapshotTimeouts();
  stopCameraStream();
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

              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                <div class="flex justify-center lg:justify-start">
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

                <div class="rounded-xl border border-default p-3 bg-muted/20">
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-sm font-medium text-highlighted">
                      Camera Monitoring
                    </p>
                    <UBadge
                      :color="isCameraReady ? 'success' : 'error'"
                      :label="isCameraReady ? 'Active' : 'Inactive'"
                    />
                  </div>

                  <video
                    ref="cameraVideoRef"
                    autoplay
                    muted
                    playsinline
                    class="w-full h-100 rounded-lg bg-black object-cover"
                  />

                  <p v-if="cameraError" class="text-xs text-error mt-2">
                    {{ cameraError }}
                  </p>
                  <p v-else-if="isCameraObstructed" class="text-xs text-warning mt-2">
                    Camera looks obstructed (too dark/covered). Please adjust camera.
                  </p>
                  <p
                    v-else-if="isCameraInitializing"
                    class="text-xs text-muted mt-2"
                  >
                    Initializing camera...
                  </p>

                  <div class="mt-2 flex justify-end">
                    <UButton
                      label="Retry Camera"
                      size="xs"
                      color="neutral"
                      variant="outline"
                      icon="i-lucide-camera"
                      :loading="isCameraInitializing"
                      @click="startCamera"
                    />
                  </div>
                </div>
              </div>
            </div>
          </UCard>

          <div
            v-if="!canContinueExam"
            class="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error"
          >
            Camera is required to continue examination. Please enable camera
            access.
          </div>

          <div
            v-if="isCameraReady && isCameraObstructed"
            class="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning"
          >
            Camera warning: view appears obstructed. Please uncover camera lens.
          </div>

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
                !canContinueExam ||
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

                <img
                  v-if="hasImage(item.essay?.image)"
                  :src="resolveImageUrl(item.essay?.image)"
                  alt="Essay question image"
                  class="max-h-72 w-auto rounded border border-default block mx-auto"
                />

                <div
                  class="text-sm rich-preview [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                  v-html="item.essay?.question || '-'"
                />

                <UFormField label="Your Answer">
                  <div
                    :class="
                      isTimeUp || !canContinueExam
                        ? 'pointer-events-none opacity-70'
                        : ''
                    "
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

<style scoped>
.exam-guard {
  user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
}
</style>
