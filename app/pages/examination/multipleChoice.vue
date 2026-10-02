<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import { useScreenMonitoring } from "../../composables/useScreenMonitoring";

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
  id: number | string;
  quantity: number;
  group?: string | null;
  isMats?: boolean;
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
  randomNumbers?: number[] | null;
  draftAnswers?: Record<string, string>;
  deadlineAt?: string | null;
  requiresStart?: boolean;
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
const activeGroupId = ref<number | string | undefined>(undefined);
const questionView = ref<"GROUP" | "SINGLE">("GROUP");
const activeQuestionIndex = ref(0);
const tabScrollerRef = ref<HTMLElement | null>(null);
const remainingSeconds = ref(0);
const isTimeUpToastShown = ref(false);
const isSubmittingAnswers = ref(false);
const hasSubmittedAnswers = ref(false);
const lastDraftSavedAt = ref<string | null>(null);
const cameraVideoRef = ref<HTMLVideoElement | null>(null);
const cameraStream = ref<MediaStream | null>(null);
const isCameraInitializing = ref(false);
const isCameraReady = ref(false);
const cameraError = ref<string | null>(null);
const isCameraObstructed = ref(false);
const isExamStarted = ref(false);
const {
  screenMonitoringEnabled,
  screenSupportError,
  isScreenInitializing,
  isScreenReady,
  screenError,
  checkScreenMonitoringSupport,
  startScreenCapture,
  stopScreenCapture,
  captureScreenSnapshotBlob,
} = useScreenMonitoring();
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let draftSaveInterval: ReturnType<typeof setInterval> | null = null;
let draftSaveTimeout: ReturnType<typeof setTimeout> | null = null;
let draftSaveRunning = false;
let answerRevision = 0;
let savedAnswerRevision = 0;
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
  groupId: unknown,
): MultipleChoiceGroupPayload | undefined =>
  multipleChoiceGroups.value.find(
    (group) => String(group.id) === String(groupId),
  );
const getGroupProgressLabelById = (groupId: unknown): string => {
  const group = getGroupById(groupId);
  if (!group) return "0/0";
  const answered = getGroupAnsweredCount(group);
  const target = getGroupTargetCount(group);
  return `${answered}/${target}`;
};
const getGroupProgressPillClassById = (groupId: unknown): string => {
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
      label: getGroupDisplayName(group, index),
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
function getGroupDisplayName(
  group: MultipleChoiceGroupPayload,
  index: number,
): string {
  const groupName = String(group.group || "").replace(/<[^>]*>/g, "").trim();
  if (
    group.isMats ||
    String(group.id).toUpperCase() === "MATS" ||
    groupName.toUpperCase() === "MATS"
  ) {
    return "MATS";
  }
  return groupName || `Group ${index + 1}`;
}

const getGroupLabel = (groupId?: number | string): string => {
  if (!groupId) return "Group";
  const index = multipleChoiceGroups.value.findIndex(
    (group) => String(group.id) === String(groupId),
  );
  return index >= 0
    ? getGroupDisplayName(multipleChoiceGroups.value[index]!, index)
    : "Group";
};

function slideTabs(direction: "left" | "right") {
  tabScrollerRef.value?.scrollBy({
    left: direction === "left" ? -320 : 320,
    behavior: "smooth",
  });
}

const totalQuestions = computed(() =>
  multipleChoiceGroups.value.reduce(
    (total, group) => total + (group.multipleChoice?.length || 0),
    0,
  ),
);

const questionItems = computed(() => {
  let number = 0;
  return multipleChoiceGroups.value.flatMap((group, groupIndex) =>
    (group.multipleChoice || []).map((item) => ({
      question: item.multipleChoice,
      groupName: getGroupDisplayName(group, groupIndex),
      number: ++number,
    })),
  );
});
const activeQuestion = computed(() => questionItems.value[activeQuestionIndex.value] || null);
const isQuestionAnswered = (questionId?: number) => Boolean(questionId && isAnsweredOption(answers[questionId]));
const unansweredCount = computed(() => questionItems.value.filter((item) => !isQuestionAnswered(item.question?.id)).length);
function nextUnansweredQuestion() {
  const next = questionItems.value.findIndex((item, index) =>
    index > activeQuestionIndex.value && !isQuestionAnswered(item.question?.id));
  const wrapped = next < 0
    ? questionItems.value.findIndex((item) => !isQuestionAnswered(item.question?.id))
    : next;
  if (wrapped >= 0) activeQuestionIndex.value = wrapped;
}

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
const canContinueExam = computed(
  () =>
    !screenMonitoringEnabled ||
    (isCameraReady.value &&
      !isCameraObstructed.value &&
      isScreenReady.value),
);
const isMonitoringInitializing = computed(
  () => isCameraInitializing.value || isScreenInitializing.value,
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

async function activateExamination(payload: ExaminationMultipleChoiceResponse) {
  if (isExamStarted.value) return;
  isExamStarted.value = true;
  const started = await postMonitorTime(payload, true);
  if (!started) {
    isExamStarted.value = false;
    toast.add({
      title: "Unable to start exam",
      description: "The examination start time could not be saved. Please try again.",
      color: "error",
    });
    return;
  }
  if (payload.requiresStart) {
    await loadMultipleChoiceData();
    if (!multipleChoiceData.value || multipleChoiceData.value.requiresStart || fetchError.value) {
      isExamStarted.value = false;
      return;
    }
    payload = multipleChoiceData.value;
  }
  startCountdown(getCountdownMinutes(payload), payload.deadlineAt);
  startDraftAutosave();
  if (screenMonitoringEnabled) {
    scheduleRandomSnapshots(payload);
  }
  if (isTimeUp.value) {
    void submitAnswers(true);
  }
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

async function startExamMonitoring() {
  if (screenMonitoringEnabled && !isScreenReady.value) {
    const screenStarted = await startScreenCapture();
    if (!screenStarted) return;
  }

  if (!isCameraReady.value) {
    await startCamera();
  }

  if (!canContinueExam.value || !multipleChoiceData.value) return;
  await activateExamination(multipleChoiceData.value);
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

async function postMonitoringSnapshot(
  payload: ExaminationMultipleChoiceResponse,
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

  const [cameraBlob, screenBlob] = await Promise.all([
    captureCameraSnapshotBlob(),
    screenMonitoringEnabled
      ? captureScreenSnapshotBlob()
      : Promise.resolve(null),
  ]);
  if (!cameraBlob) {
    toast.add({
      title: "Camera Snapshot Failed",
      description: `Unable to capture photo at minute ${targetMinute}.`,
      color: "warning",
    });
    return;
  }
  if (screenMonitoringEnabled && !screenBlob) {
    toast.add({
      title: "Screen Snapshot Failed",
      description: `Unable to capture the screen at minute ${targetMinute}.`,
      color: "warning",
    });
  }

  const formData = new FormData();
  formData.append("eventId", String(currentEventId));
  formData.append("appRatingId", String(currentAppRatingId));
  formData.append("groupMemberId", String(currentGroupMemberId));
  formData.append(
    screenMonitoringEnabled ? "cameraFile" : "file",
    cameraBlob,
    screenMonitoringEnabled
      ? `mc-camera-${currentEventId}-${currentGroupMemberId}-m${targetMinute}.jpg`
      : `mc-${currentEventId}-${currentGroupMemberId}-m${targetMinute}.jpg`,
  );
  if (screenBlob) {
    formData.append(
      "screenFile",
      screenBlob,
      `mc-screen-${currentEventId}-${currentGroupMemberId}-m${targetMinute}.jpg`,
    );
  }

  try {
    await $fetch(`${apiBaseUrl}/api/preview`, {
      method: "POST",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
      body: formData,
    });
  } catch (_error) {
    toast.add({
      title: "Upload Failed",
      description: `Failed to upload monitoring snapshots at minute ${targetMinute}.`,
      color: "error",
    });
  }
}

function scheduleRandomSnapshots(payload: ExaminationMultipleChoiceResponse) {
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
    if (minuteMark <= elapsedMinutes || minuteMark > totalMinutes) {
      return;
    }

    const delayMs = Math.max(
      0,
      Math.round((minuteMark - elapsedMinutes) * 60 * 1000),
    );
    const timer = setTimeout(() => {
      void postMonitoringSnapshot(payload, minuteMark);
    }, delayMs);
    randomSnapshotTimeouts.push(timer);
  });
}

function startCountdown(minutes: number, deadlineAt?: string | null) {
  clearCountdown();
  isTimeUpToastShown.value = false;
  const serverDeadline = deadlineAt ? Date.parse(deadlineAt) : NaN;
  const endAt = Number.isFinite(serverDeadline) ? serverDeadline : Date.now() + minutes * 60_000;
  remainingSeconds.value = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));

  if (remainingSeconds.value <= 0) return;

  countdownTimer = setInterval(() => {
    if (remainingSeconds.value <= 0) {
      clearCountdown();
      return;
    }

    remainingSeconds.value = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));

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
  if (payload.deadlineAt) return Math.max(0, (Date.parse(payload.deadlineAt) - Date.now()) / 60_000);
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

async function postMonitorTime(payload: ExaminationMultipleChoiceResponse, isInitial = false): Promise<boolean> {
  const eventQuestionId = getEventQuestionId(payload);
  const currentAppRatingId = Number(
    payload.appRatingId ?? requestMeta.value?.appRatingId,
  );
  if (!eventQuestionId || !Number.isFinite(currentAppRatingId)) return false;

  try {
    const clock = await $fetch<{ deadlineAt?: string | null }>(`${apiBaseUrl}/api/postTime`, {
      method: "POST",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
      body: {
        appRatingId: currentAppRatingId,
        eventQuestionId,
        isInitial,
      },
    });
    if (clock?.deadlineAt) payload.deadlineAt = clock.deadlineAt;
    return true;
  } catch (_error) {
    // Silent background ping failure.
    return false;
  }
}

async function saveDraft() {
  const payload = multipleChoiceData.value;
  if (!payload || !isExamStarted.value || isSubmittingAnswers.value || hasSubmittedAnswers.value || draftSaveRunning || answerRevision === savedAnswerRevision) return;
  draftSaveRunning = true;
  const revision = answerRevision;
  try {
    const ids = payload.multipleChoice?.flatMap((group) => group.multipleChoice || [])
      .map((item) => item.multipleChoice?.id).filter((id): id is number => Number.isInteger(id)) || [];
    const saved = await $fetch<{ savedAt?: string }>(`${apiBaseUrl}/api/examinationDraft`, {
      method: "POST", headers: { Authorization: token.value ? `Bearer ${token.value}` : "" },
      body: { kind: "MULTIPLE_CHOICE", eventId: payload.eventId, appRatingId: payload.appRatingId,
        answers: Object.fromEntries(ids.map((id) => [id, answers[id] || ""])) },
    });
    lastDraftSavedAt.value = saved?.savedAt || new Date().toISOString();
    savedAnswerRevision = revision;
  } catch (error: any) {
    if (!isTimeUp.value) toast.add({ title: "Autosave failed", description: error?.data?.message || "Please check your connection. Your latest answer is still on this page.", color: "warning" });
  } finally { draftSaveRunning = false; }
}

function startDraftAutosave() {
  if (draftSaveInterval) clearInterval(draftSaveInterval);
  if (draftSaveTimeout) clearTimeout(draftSaveTimeout);
  draftSaveTimeout = setTimeout(() => {
    void saveDraft();
    draftSaveInterval = setInterval(() => void saveDraft(), 5 * 60 * 1000);
  }, 5 * 60 * 1000 - Math.floor(Math.random() * 60_000));
}

watch(answers, () => {
  if (!isExamStarted.value) return;
  answerRevision += 1;
}, { deep: true });

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
  if (!isAutoSubmit && !canContinueExam.value) {
    toast.add({
      title: "Camera Required",
      description: "Please enable camera before continuing the examination.",
      color: "error",
    });
    return;
  }
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
    clearRandomSnapshotTimeouts();
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
    !canContinueExam.value ||
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

    const payload = await $fetch<ExaminationMultipleChoiceResponse>(
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
    persistRequestMeta({ eventId: currentEventId, appRatingId: currentAppRatingId });

    multipleChoiceData.value = payload;

    const allQuestions =
      payload.multipleChoice?.flatMap((group) => group.multipleChoice || []) ||
      [];
    for (const item of allQuestions) {
      const id = item.multipleChoice?.id;
      if (!id) continue;
      const saved = String(payload.draftAnswers?.[String(id)] || "").toUpperCase();
      answers[id] = (["A", "B", "C", "D"].includes(saved) ? saved : "") as "A" | "B" | "C" | "D" | "";
      if (!optionOrderByQuestion[id]) {
        optionOrderByQuestion[id] = shuffleOptionKeys();
      }
    }
    await nextTick();
    savedAnswerRevision = answerRevision;

    if (!screenMonitoringEnabled) {
      await activateExamination(payload);
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

watch(cameraVideoRef, async (videoEl) => {
  if (!videoEl || !cameraStream.value) return;
  videoEl.srcObject = cameraStream.value;
  await videoEl.play().catch(() => null);
});

onMounted(async () => {
  if (screenMonitoringEnabled && !checkScreenMonitoringSupport()) {
    toast.add({
      title: "Browser Upgrade Required",
      description:
        screenSupportError.value ||
        "Please update your browser to continue the examination.",
      color: "warning",
    });
  }
  await loadMultipleChoiceData();
});
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
watch(questionItems, (items) => {
  if (activeQuestionIndex.value >= items.length) activeQuestionIndex.value = 0;
});
watch(isTimeUp, (value) => {
  if (value) {
    void submitAnswers(true);
  }
});
onBeforeUnmount(() => {
  if (draftSaveInterval) clearInterval(draftSaveInterval);
  if (draftSaveTimeout) clearTimeout(draftSaveTimeout);
  clearCountdown();
  clearRandomSnapshotTimeouts();
  stopCameraStream();
  stopScreenCapture();
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
          <span v-if="lastDraftSavedAt" class="text-xs text-muted">Autosaved {{ lastDraftSavedAt.slice(11, 16) }} UTC</span>
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
          v-else-if="multipleChoiceGroups.length === 0 && !multipleChoiceData?.requiresStart"
          class="rounded-lg border p-4 text-muted"
        >
          No multiple choice data available.
        </div>

        <template v-else>
          <UCard
            v-if="screenMonitoringEnabled && !isExamStarted"
            class="border border-warning/40 bg-warning/5"
          >
            <div class="space-y-3">
              <div>
                <p class="font-semibold text-highlighted">
                  Monitoring permission required
                </p>
                <p class="text-sm text-muted">
                  Select Entire Screen and allow camera access. The examination
                  timer starts after both monitoring sources are active.
                </p>
              </div>
              <p
                v-if="screenError && !screenSupportError"
                class="text-sm text-error"
              >
                {{ screenError }}
              </p>
              <p v-if="screenSupportError" class="text-sm text-error">
                {{ screenSupportError }}
              </p>
              <p v-if="cameraError" class="text-sm text-error">
                {{ cameraError }}
              </p>
              <UButton
                label="Start Examination"
                icon="i-lucide-monitor-up"
                :loading="isMonitoringInitializing"
                :disabled="!!screenSupportError"
                @click="startExamMonitoring"
              />
            </div>
          </UCard>

          <template v-if="isExamStarted || !screenMonitoringEnabled">
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
                    Time Left: {{ isExamStarted ? countdownText : "--:--" }}
                  </div>
                </div>

                <div class="rounded-xl border border-default p-3 bg-muted/20">
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <p class="text-sm font-medium text-highlighted">
                      {{
                        screenMonitoringEnabled
                          ? "Camera & Screen Monitoring"
                          : "Camera Monitoring"
                      }}
                    </p>
                    <div class="flex gap-1">
                      <UBadge
                        :color="isCameraReady ? 'success' : 'error'"
                        :label="isCameraReady ? 'Camera Active' : 'Camera Inactive'"
                      />
                      <UBadge
                        v-if="screenMonitoringEnabled"
                        :color="isScreenReady ? 'success' : 'error'"
                        :label="isScreenReady ? 'Screen Active' : 'Screen Inactive'"
                      />
                    </div>
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
                  <p v-if="screenError" class="text-xs text-error mt-2">
                    {{ screenError }}
                  </p>

                  <div class="mt-2 flex justify-end gap-2">
                    <UButton
                      v-if="screenMonitoringEnabled && !isScreenReady"
                      label="Share Entire Screen"
                      size="xs"
                      color="warning"
                      variant="outline"
                      icon="i-lucide-monitor-up"
                      :loading="isScreenInitializing"
                      @click="startExamMonitoring"
                    />
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
            {{
              screenMonitoringEnabled
                ? "Camera and Entire Screen sharing are required to continue the examination."
                : "Camera is required to continue the examination. Please enable camera access."
            }}
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

          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex gap-2" role="group" aria-label="Multiple Choice view">
              <UButton label="Group Tabs" :variant="questionView === 'GROUP' ? 'solid' : 'outline'" @click="questionView = 'GROUP'" />
              <UButton label="One by One" :variant="questionView === 'SINGLE' ? 'solid' : 'outline'" @click="questionView = 'SINGLE'" />
            </div>
            <span class="text-sm text-muted">{{ answeredCount }}/{{ totalQuestions }} answered</span>
          </div>

          <template v-if="questionView === 'GROUP'">
          <div class="flex min-w-0 items-center gap-2">
            <UButton
              icon="i-lucide-chevron-left"
              color="neutral"
              variant="outline"
              size="sm"
              aria-label="Slide tabs left"
              class="shrink-0"
              @click="slideTabs('left')"
            />
            <div
              ref="tabScrollerRef"
              class="min-w-0 flex-1 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]"
            >
              <UTabs
                v-model="activeGroupId"
                :items="groupTabs"
                :content="false"
                size="lg"
                class="w-max min-w-full"
                :ui="{
                  list: 'flex w-max min-w-full flex-nowrap',
                  trigger: 'shrink-0 whitespace-nowrap',
                }"
              >
                <template #trailing="{ item }">
                  <span
                    class="ml-2 shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-sm font-semibold"
                    :class="getGroupProgressPillClassById(item.value)"
                  >
                    {{ getGroupProgressLabelById(item.value) }}
                  </span>
                </template>
              </UTabs>
            </div>
            <UButton
              icon="i-lucide-chevron-right"
              color="neutral"
              variant="outline"
              size="sm"
              aria-label="Slide tabs right"
              class="shrink-0"
              @click="slideTabs('right')"
            />
          </div>

          <UCard v-if="activeGroup" :key="activeGroup.id" class="space-y-4">
            <template #header>
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-base font-semibold text-highlighted">
                  {{ getGroupLabel(activeGroup.id) }}
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
                  :class="
                    isTimeUp || !canContinueExam
                      ? 'pointer-events-none opacity-70'
                      : ''
                  "
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

          <div v-else class="space-y-4">
            <div class="rounded-lg border border-default p-4">
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p class="font-medium">Question navigator · {{ unansweredCount }} unanswered</p>
                <UButton label="Next Unanswered" variant="outline" size="sm" :disabled="unansweredCount === 0" @click="nextUnansweredQuestion" />
              </div>
              <div class="flex max-h-44 flex-wrap gap-2 overflow-y-auto p-1">
                <button
                  v-for="(item, index) in questionItems"
                  :key="`${item.groupName}-${item.question?.id || index}`"
                  type="button"
                  class="h-9 min-w-9 rounded border px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  :class="[isQuestionAnswered(item.question?.id) ? 'border-green-400 bg-green-50 text-green-800' : 'border-orange-400 bg-orange-50 text-orange-800', index === activeQuestionIndex ? 'ring-2 ring-primary ring-offset-2' : '']"
                  :aria-label="`Question ${item.number}, ${isQuestionAnswered(item.question?.id) ? 'answered' : 'unanswered'}`"
                  :aria-current="index === activeQuestionIndex ? 'step' : undefined"
                  :title="`${item.groupName} · ${isQuestionAnswered(item.question?.id) ? 'Answered' : 'Unanswered'}`"
                  @click="activeQuestionIndex = index"
                >{{ item.number }}</button>
              </div>
              <p class="mt-2 text-xs text-muted">Green: answered · Orange: unanswered · Ring: current question</p>
            </div>

            <UCard v-if="activeQuestion" :key="activeQuestion.question?.id || activeQuestionIndex">
              <div class="space-y-3">
                <p class="text-sm text-muted">{{ activeQuestion.groupName }} · Question {{ activeQuestion.number }} of {{ questionItems.length }}</p>
                <img
                  v-if="hasImage(activeQuestion.question?.image)"
                  :src="resolveImageUrl(activeQuestion.question?.image)"
                  alt="Multiple choice question image"
                  class="mx-auto block max-h-72 w-auto rounded border border-default"
                />
                <div
                  class="text-sm rich-preview [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                  v-html="activeQuestion.question?.question || '-'"
                />
                <div
                  v-if="activeQuestion.question?.id"
                  :class="isTimeUp || !canContinueExam ? 'pointer-events-none opacity-70' : ''"
                  class="space-y-2"
                >
                  <label
                    v-for="(slotKey, slotIndex) in displayOptionSlots"
                    :key="`${activeQuestion.question.id}-${slotKey}`"
                    class="flex items-center gap-2 text-sm"
                  >
                    <input
                      :id="`single-q-${activeQuestion.question.id}-${slotKey}`"
                      v-model="answers[activeQuestion.question.id]"
                      type="radio"
                      :name="`single-q-${activeQuestion.question.id}`"
                      :value="getShuffledContentKey(activeQuestion.question.id, slotIndex)"
                    />
                    <span><strong>{{ slotKey }}.</strong> {{ getOptionText(activeQuestion.question, getShuffledContentKey(activeQuestion.question.id, slotIndex)) }}</span>
                  </label>
                </div>
                <div v-else class="text-xs text-error">Invalid question ID.</div>
              </div>
            </UCard>
            <div class="flex justify-between gap-2">
              <UButton label="Previous" icon="i-lucide-chevron-left" variant="outline" :disabled="activeQuestionIndex === 0" @click="activeQuestionIndex--" />
              <UButton label="Next" trailing-icon="i-lucide-chevron-right" variant="outline" :disabled="activeQuestionIndex >= questionItems.length - 1" @click="activeQuestionIndex++" />
            </div>
          </div>
          </template>
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
