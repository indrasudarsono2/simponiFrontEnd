<script setup lang="ts">
import { formatPracticalType } from '~/utils/checkerHistory'

const apiBaseUrl = useApiBaseUrl()

interface KindOfPracticalItem {
  kind?: string | null;
}

interface PracticalTestItem {
  id: number;
  ratingLicenseFile?: string | null;
  score?: number | null;
  file?: string | null;
  echainSyncs?: PracticalEchainSyncItem[];
  kindOfPractical?: KindOfPracticalItem | null;
}

interface PracticalEchainSyncItem {
  id: number;
  status: "PENDING" | "SUCCESS" | "FAILED" | string;
  sentAt?: string | null;
  errorMessage?: string | null;
  echainRequestId?: string | null;
  createdAt?: string | null;
  requestPayload?: { file?: { fileName?: string | null } | null } | null;
}

interface AppRatingItem {
  id: number;
  practicalLicense?: { id: number; file?: string | null; expiredDate?: string | null } | null;
  statusId?: number | null;
  status?: {
    status?: string | null;
  } | null;
  rating?: {
    rating?: string | null;
  } | null;
  finalScores?: Array<{
    statusId?: number | null;
    finalScore?: number | null;
    status?: {
      status?: string | null;
    } | null;
  }>;
  practicalTests?: PracticalTestItem[];
}

interface ApplicationDocItem {
  id: number;
  number?: string | null;
  user?: {
    name?: string | null;
  } | null;
  eventUser?: {
    event?: {
      event?: string | null;
      forExpiredDate?: string | null;
      passingGrade?: number | null;
      practicalPassingGrade?: number | null;
    } | null;
  } | null;
  appRatings?: AppRatingItem[];
}

interface PracticalExamResponse {
  applicationDoc?: ApplicationDocItem[];
  rechecks?: PracticalRecheckItem[];
}
interface PracticalEventResponse {
  events: Array<{ id: number; event: string | null; createdAt: string }>;
}

interface PracticalRecheckItem {
  id: number;
  score?: number | null;
  file?: string | null;
  echainSyncs?: PracticalEchainSyncItem[];
  practicalTest: PracticalTestItem;
  authorization: {
    status?: string | null;
    completedAt?: string | null;
    reason: string;
    passingGrade: number;
    appRating: {
      rating?: { rating?: string | null } | null;
      practicalLicense?: { id: number; file?: string | null; expiredDate?: string | null } | null;
      applicationDoc?: {
        number?: string | null;
        user?: { name?: string | null } | null;
        eventUser?: { event?: { event?: string | null; forExpiredDate?: string | null } | null } | null;
      } | null;
    };
  };
}

interface PracticalRecheckGroup {
  key: string;
  user: string;
  application: string;
  rating: string;
  tasks: PracticalRecheckItem[];
}

interface PracticalUpdateResponse {
  success: boolean;
  allCompleted?: boolean;
  allPassed?: boolean;
  overallStatus?: "WAITING PRACTICAL" | "SUCCESS" | "FAILED";
}

interface PracticalGroupRow {
  no: number;
  documentId: number;
  documentRowSpan: number;
  showDocumentCells: boolean;
  number: string;
  name: string;
  rating: string;
  status: string;
  canInputPractical: boolean;
  canReviewTheory: boolean;
  appRatingId: number;
  practicalLicenseFile: string | null;
  eventName: string | null;
  licenseExpiredDate: string | null;
  passingGrade: number | null;
  practicalTests: PracticalTestItem[];
}

interface PracticalEchainPayload {
  profession?: string | null;
  practicalCheckedAt?: string | null;
  rating?: string | null;
  validUntil?: string | null;
  file?: {
    fileName?: string | null;
    fileUrl?: string | null;
    fileMimeType?: string | null;
  } | null;
}

const { token } = useAuth();
const toast = useToast();
const isUpdateModalOpen = ref(false);
const selectedPracticalTest = ref<PracticalTestItem | null>(null);
const selectedRecheck = ref<PracticalRecheckItem | null>(null);
const selectedPassingGrade = ref<number | null>(null);
const belowPassingGradeConfirmed = ref(false);
const inputScore = ref<string>("");
const inputFile = ref<File | null>(null);
const inputLicenseFile = ref<File | null>(null);
const selectedRatingLicenseFile = ref<string | null>(null);
const selectedLicenseEventName = ref<string | null>(null);
const selectedLicenseExpiryDate = ref<string | null>(null);
const fileInputKey = ref(0);
const isSubmittingUpdate = ref(false);
const isFilePreviewModalOpen = ref(false);
const previewFileUrl = ref("");
const previewFileName = ref("");
const previewFileType = ref<"image" | "pdf" | "other">("other");
const sendingEchainKeys = ref<Set<string>>(new Set());
const isEchainConfirmModalOpen = ref(false);
const isLoadingEchainPayload = ref(false);
const selectedEchainTest = ref<PracticalTestItem | null>(null);
const selectedEchainRecheck = ref<PracticalRecheckItem | null>(null);
const echainPayload = ref<PracticalEchainPayload | null>(null);
interface TheoryReview {
  finalScoreId: number;
  event: string | null;
  reviewedBy: { name: string; nik: string };
  applicationNumber: string | null;
  name: string | null;
  rating: string | null;
  incorrectMultipleChoice: Array<{ id: number; question: string; image: string | null; selectedAnswer: string | null }>;
  essay: Array<{ id: number; question: string; image: string | null; answer: string }>;
}
const isTheoryReviewOpen = ref(false);
const isLoadingTheoryReview = ref(false);
const theoryReview = ref<TheoryReview | null>(null);
const { apiFetch } = useApiFetch();
async function openTheoryReview(appRatingId: number) {
  theoryReview.value = null;
  isTheoryReviewOpen.value = true;
  isLoadingTheoryReview.value = true;
  try {
    theoryReview.value = await apiFetch(`/api/practicalExam/theory-review/${appRatingId}`) as TheoryReview;
  } catch (error) {
    isTheoryReviewOpen.value = false;
    toast.add({ title: 'Unable to load theory review', description: error instanceof Error ? error.message : 'Please try again.', color: 'error' });
  } finally {
    isLoadingTheoryReview.value = false;
  }
}

const selectedEventId = ref<number | undefined>(undefined);
const { data: availableEvents, status: eventsStatus, error: eventsError, refresh: refreshEvents } = await useFetch<PracticalEventResponse>(
  `${apiBaseUrl}/api/practicalExam`,
  {
    query: { view: 'events' },
    headers: { Authorization: token.value ? `Bearer ${token.value}` : '' },
  },
);
const eventOptions = computed(() => (availableEvents.value?.events || []).map((event) => ({
  label: event.event || `Event ${event.id}`,
  value: event.id,
})));

const {
  data: practicalExamData,
  status,
  error,
  refresh,
} = await useFetch<PracticalExamResponse>(
  `${apiBaseUrl}/api/practicalExam`,
  {
    query: computed(() => ({ eventId: selectedEventId.value })),
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
    immediate: false,
    watch: false,
  },
);
watch(selectedEventId, (eventId) => {
  practicalExamData.value = undefined;
  if (eventId) refresh();
});

const practicalRows = computed<PracticalGroupRow[]>(() => {
  const docs = practicalExamData.value?.applicationDoc || [];
  const rows: PracticalGroupRow[] = [];
  let no = 1;

  for (const doc of docs) {
    const firstRowIndex = rows.length;
    const ratings = doc.appRatings || [];
    for (const rating of ratings) {
      const tests =
        rating.practicalTests && rating.practicalTests.length > 0
          ? rating.practicalTests.map((test) => ({ ...test, ratingLicenseFile: rating.practicalLicense?.file || null }))
          : [
              {
                id: -1,
                score: null,
                file: null,
                kindOfPractical: { kind: "-" },
              },
            ];

      rows.push({
        no,
        documentId: doc.id,
        documentRowSpan: 0,
        showDocumentCells: false,
        appRatingId: rating.id,
        practicalLicenseFile: rating.practicalLicense?.file || null,
        eventName: doc.eventUser?.event?.event || null,
        licenseExpiredDate: doc.eventUser?.event?.forExpiredDate || null,
        number: doc.number || "-",
        name: doc.user?.name || "-",
        rating: rating.rating?.rating || "-",
        status: rating.status?.status || "-",
        canInputPractical:
          rating.status?.status === "WAITING PRACTICAL" &&
          rating.finalScores?.[0]?.status?.status === "WAITING PRACTICAL",
        canReviewTheory:
          rating.finalScores?.[0]?.status?.status !== "CHECKING ESSAY" &&
          Number(rating.finalScores?.[0]?.finalScore ?? -1) >= Number(doc.eventUser?.event?.passingGrade ?? Infinity),
        passingGrade:
          doc.eventUser?.event?.practicalPassingGrade == null
            ? null
            : Number(doc.eventUser.event.practicalPassingGrade),
        practicalTests: tests,
      });
    }
    if (rows.length > firstRowIndex) {
      const firstRow = rows[firstRowIndex]!;
      firstRow.showDocumentCells = true;
      firstRow.documentRowSpan = rows.slice(firstRowIndex).reduce(
        (count, row) => count + row.practicalTests.length, 0,
      );
      no += 1;
    }
  }

  return rows;
});
const recheckTasks = computed(() => practicalExamData.value?.rechecks || []);
const recheckGroups = computed<PracticalRecheckGroup[]>(() => {
  const groups = new Map<string, PracticalRecheckGroup>();

  for (const task of recheckTasks.value) {
    const user = task.authorization.appRating.applicationDoc?.user?.name || "-";
    const application = task.authorization.appRating.applicationDoc?.number || "-";
    const rating = task.authorization.appRating.rating?.rating || "-";
    const key = `${user}|${application}|${rating}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        user,
        application,
        rating,
        tasks: [],
      });
    }

    groups.get(key)!.tasks.push(task);
  }

  return Array.from(groups.values());
});

function formatScore(score?: number | null): string {
  if (score == null) return "-";
  return String(score);
}

function getLatestEchainSync(test?: PracticalTestItem | null) {
  const latest = test?.echainSyncs?.[0] || null;
  return latest?.requestPayload?.file?.fileName === getFileName(test?.ratingLicenseFile) ? latest : null;
}

function getLatestRecheckEchainSync(task?: PracticalRecheckItem | null) {
  return task?.echainSyncs?.[0] || null;
}

function getPracticalSendKey(test?: PracticalTestItem | null): string {
  return `practical-${test?.id ?? "none"}`;
}

function getRecheckSendKey(task?: PracticalRecheckItem | null): string {
  return `recheck-${task?.id ?? "none"}`;
}

function getEchainButtonLabel(test?: PracticalTestItem | null): string {
  const latestSync = getLatestEchainSync(test);
  if (!latestSync) return "Send";
  if (latestSync.status === "SUCCESS") return "Sent";
  if (latestSync.status === "FAILED") return "Retry";
  return "Send";
}

function getEchainButtonColor(test?: PracticalTestItem | null) {
  const latestSync = getLatestEchainSync(test);
  if (latestSync?.status === "SUCCESS") return "success";
  if (latestSync?.status === "FAILED") return "error";
  return "primary";
}

function getEchainButtonIcon(test?: PracticalTestItem | null): string {
  const latestSync = getLatestEchainSync(test);
  if (latestSync?.status === "SUCCESS") return "i-lucide-check";
  if (latestSync?.status === "FAILED") return "i-lucide-rotate-cw";
  return "i-lucide-send";
}

function getEchainTooltip(test?: PracticalTestItem | null, licenseFile?: string | null): string {
  if (!licenseFile) return "Upload a PDF rating license before sending to e-chain";
  if (!isPdfPracticalFile(licenseFile)) return "Only a PDF license can be sent to e-chain";
  const latestSync = getLatestEchainSync(test);
  if (!latestSync) return "Send the rating license to e-chain";
  if (latestSync.status === "SUCCESS") return "Already sent to e-chain";
  if (latestSync.status === "FAILED") return latestSync.errorMessage || "Previous send failed";
  return "Send the rating license to e-chain";
}

function canSendRowToEchain(row: PracticalGroupRow, test?: PracticalTestItem | null): boolean {
  return Boolean(
    test &&
      test.id > 0 &&
      test.score != null &&
      row.status === "SUCCESS" &&
      isPdfPracticalFile(row.practicalLicenseFile) &&
      getLatestEchainSync(test)?.status !== "SUCCESS",
  );
}

function getRowEchainTooltip(row: PracticalGroupRow, test?: PracticalTestItem | null): string {
  if (row.status !== "SUCCESS") return "Only SUCCESS practical exam data can be sent to e-chain";
  return getEchainTooltip(test, row.practicalLicenseFile);
}

function canSendRecheckToEchain(task?: PracticalRecheckItem | null): boolean {
  return Boolean(
    task &&
      task.id > 0 &&
      task.score != null &&
      task.authorization.status === "SUCCESS" &&
      isPdfPracticalFile(task.authorization.appRating.practicalLicense?.file) &&
      getLatestRecheckEchainSync(task)?.status !== "SUCCESS",
  );
}

function getRecheckEchainButtonLabel(task?: PracticalRecheckItem | null): string {
  const latestSync = getLatestRecheckEchainSync(task);
  if (!latestSync) return "Send";
  if (latestSync.status === "SUCCESS") return "Sent";
  if (latestSync.status === "FAILED") return "Retry";
  return "Send";
}

function getRecheckEchainTooltip(task?: PracticalRecheckItem | null): string {
  if (task?.authorization.status !== "SUCCESS") return "Only SUCCESS practical recheck data can be sent to e-chain";
  const licenseFile = task?.authorization.appRating.practicalLicense?.file;
  if (!licenseFile) return "Upload a PDF rating license before sending to e-chain";
  if (!isPdfPracticalFile(licenseFile)) return "Only a PDF license can be sent to e-chain";
  const latestSync = getLatestRecheckEchainSync(task);
  if (latestSync?.status === "SUCCESS") return "Already sent to e-chain";
  if (latestSync?.status === "FAILED") return latestSync.errorMessage || "Previous send failed";
  return "Send the rating license to e-chain";
}

function getRecheckEchainButtonColor(task?: PracticalRecheckItem | null) {
  const latestSync = getLatestRecheckEchainSync(task);
  if (latestSync?.status === "SUCCESS") return "success";
  if (latestSync?.status === "FAILED") return "error";
  return "primary";
}

function getRecheckEchainButtonIcon(task?: PracticalRecheckItem | null): string {
  const latestSync = getLatestRecheckEchainSync(task);
  if (latestSync?.status === "SUCCESS") return "i-lucide-check";
  if (latestSync?.status === "FAILED") return "i-lucide-rotate-cw";
  return "i-lucide-send";
}

async function sendPracticalToEchain(test?: PracticalTestItem | null) {
  if (!test || test.id <= 0 || test.score == null) return;

  const sendKey = getPracticalSendKey(test);
  sendingEchainKeys.value = new Set(sendingEchainKeys.value).add(sendKey);
  try {
    await apiFetch(`/api/practicalExam/${test.id}/send-echain`, { method: "POST" });

    toast.add({
      title: "Sent to e-chain",
      description: "The rating license has been sent successfully.",
      color: "success",
    });
    await refresh();
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string };
    toast.add({
      title: "Send Failed",
      description:
        err?.data?.message || err?.message || "Failed to send the rating license to e-chain.",
      color: "error",
    });
    await refresh();
  } finally {
    const next = new Set(sendingEchainKeys.value);
    next.delete(sendKey);
    sendingEchainKeys.value = next;
  }
}

async function sendRecheckToEchain(task?: PracticalRecheckItem | null) {
  if (!task || task.id <= 0 || task.score == null) return;

  const sendKey = getRecheckSendKey(task);
  sendingEchainKeys.value = new Set(sendingEchainKeys.value).add(sendKey);
  try {
    await apiFetch(`/api/practicalExam/recheck/${task.id}/send-echain`, { method: "POST" });

    toast.add({
      title: "Sent to e-chain",
      description: "The rating license has been sent successfully.",
      color: "success",
    });
    await refresh();
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string };
    toast.add({
      title: "Send Failed",
      description:
        err?.data?.message || err?.message || "Failed to send practical recheck data to e-chain.",
      color: "error",
    });
    await refresh();
  } finally {
    const next = new Set(sendingEchainKeys.value);
    next.delete(sendKey);
    sendingEchainKeys.value = next;
  }
}

async function openEchainConfirmModal(test?: PracticalTestItem | null) {
  if (!test || test.id <= 0 || test.score == null) return;

  selectedEchainTest.value = test;
  selectedEchainRecheck.value = null;
  echainPayload.value = null;
  isEchainConfirmModalOpen.value = true;
  isLoadingEchainPayload.value = true;

  try {
    const response = await $fetch<{ success: boolean; data: PracticalEchainPayload }>(
      `${apiBaseUrl}/api/practicalExam/${test.id}/echain-payload`,
      {
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );
    echainPayload.value = response.data;
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string };
    toast.add({
      title: "Review Failed",
      description:
        err?.data?.message || err?.message || "Failed to prepare practical exam data for review.",
      color: "error",
    });
    isEchainConfirmModalOpen.value = false;
  } finally {
    isLoadingEchainPayload.value = false;
  }
}

async function openRecheckEchainConfirmModal(task?: PracticalRecheckItem | null) {
  if (!task || task.id <= 0 || task.score == null) return;

  selectedEchainTest.value = null;
  selectedEchainRecheck.value = task;
  echainPayload.value = null;
  isEchainConfirmModalOpen.value = true;
  isLoadingEchainPayload.value = true;

  try {
    const response = await $fetch<{ success: boolean; data: PracticalEchainPayload }>(
      `${apiBaseUrl}/api/practicalExam/recheck/${task.id}/echain-payload`,
      {
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );
    echainPayload.value = response.data;
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string };
    toast.add({
      title: "Review Failed",
      description:
        err?.data?.message || err?.message || "Failed to prepare practical recheck data for review.",
      color: "error",
    });
    isEchainConfirmModalOpen.value = false;
  } finally {
    isLoadingEchainPayload.value = false;
  }
}

async function confirmSendPracticalToEchain() {
  if (selectedEchainRecheck.value) {
    await sendRecheckToEchain(selectedEchainRecheck.value);
    isEchainConfirmModalOpen.value = false;
    selectedEchainRecheck.value = null;
    echainPayload.value = null;
    return;
  }

  const test = selectedEchainTest.value;
  if (!test) return;
  await sendPracticalToEchain(test);
  isEchainConfirmModalOpen.value = false;
  selectedEchainTest.value = null;
  echainPayload.value = null;
}

function closeEchainConfirmModal() {
  if (selectedEchainTest.value && sendingEchainKeys.value.has(getPracticalSendKey(selectedEchainTest.value))) return;
  if (selectedEchainRecheck.value && sendingEchainKeys.value.has(getRecheckSendKey(selectedEchainRecheck.value))) return;
  isEchainConfirmModalOpen.value = false;
  selectedEchainTest.value = null;
  selectedEchainRecheck.value = null;
  echainPayload.value = null;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " UTC";
}

function getFileName(filePath?: string | null): string {
  if (!filePath) return "-";
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || filePath;
}

function resolveFileUrl(filePath?: string | null): string {
  const trimmed = (filePath || "").trim();
  if (!trimmed) return "";
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  if (/^(data|blob):/i.test(trimmed)) return trimmed;
  return `${apiBaseUrl}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

function getPdfPreviewUrl(url: string): string {
  if (!url) return "";
  if (url.includes("#")) return url;
  return `${url}#zoom=page-width&view=FitH`;
}

function getExtension(filePath?: string | null): string {
  if (!filePath) return "";
  const clean = filePath.split("?")[0]?.toLowerCase() || "";
  const parts = clean.split(".");
  return parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
}

function isPdfPracticalFile(filePath?: string | null): boolean {
  return getExtension(filePath) === "pdf";
}

function openFilePreview(filePath?: string | null) {
  if (!filePath) return;
  previewFileUrl.value = resolveFileUrl(filePath);
  previewFileName.value = getFileName(filePath);

  const ext = getExtension(filePath);
  if (ext === "pdf") {
    previewFileType.value = "pdf";
  } else if (
    [
      "png",
      "jpg",
      "jpeg",
      "svg",
      "gif",
      "bmp",
      "webp",
      "avif",
      "tif",
      "tiff",
      "jfif",
    ].includes(ext)
  ) {
    previewFileType.value = "image";
  } else {
    previewFileType.value = "other";
  }

  isFilePreviewModalOpen.value = true;
}

function closeFilePreviewModal() {
  isFilePreviewModalOpen.value = false;
  previewFileUrl.value = "";
  previewFileName.value = "";
  previewFileType.value = "other";
}

const isBelowPassingGrade = computed(() => {
  if (isCompletedRecheckUpdate.value) return false;
  const score = Number(inputScore.value);
  return Number.isFinite(score)
    && selectedPassingGrade.value != null
    && score < selectedPassingGrade.value;
});

const isCompletedRecheckUpdate = computed(() => {
  return Boolean(selectedRecheck.value && selectedRecheck.value.authorization.status !== "ACTIVE");
});

watch(inputScore, () => {
  belowPassingGradeConfirmed.value = false;
});

function openUpdateModal(test: PracticalTestItem, passingGrade: number | null) {
  if (!test?.id || test.id <= 0) return;
  selectedPracticalTest.value = test;
  selectedPassingGrade.value = passingGrade;
  belowPassingGradeConfirmed.value = false;
  inputScore.value =
    test.score == null || Number.isNaN(Number(test.score))
      ? ""
      : String(test.score);
  inputFile.value = null;
  inputLicenseFile.value = null;
  const row = practicalRows.value.find((item) => item.practicalTests.some((candidate) => candidate.id === test.id));
  selectedRatingLicenseFile.value = row?.practicalLicenseFile || null;
  selectedLicenseEventName.value = row?.eventName || null;
  selectedLicenseExpiryDate.value = row?.licenseExpiredDate || null;
  fileInputKey.value += 1;
  isUpdateModalOpen.value = true;
}

function openRecheckModal(recheck: PracticalRecheckItem) {
  selectedRecheck.value = recheck;
  selectedPracticalTest.value = recheck.practicalTest;
  selectedPassingGrade.value = Number(recheck.authorization.passingGrade);
  inputScore.value = recheck.score == null ? "" : String(recheck.score);
  inputFile.value = null;
  inputLicenseFile.value = null;
  selectedRatingLicenseFile.value = recheck.authorization.appRating.practicalLicense?.file || null;
  selectedLicenseEventName.value = recheck.authorization.appRating.applicationDoc?.eventUser?.event?.event || null;
  selectedLicenseExpiryDate.value = recheck.authorization.appRating.applicationDoc?.eventUser?.event?.forExpiredDate || null;
  belowPassingGradeConfirmed.value = false;
  fileInputKey.value += 1;
  isUpdateModalOpen.value = true;
}

function closeUpdateModal() {
  isUpdateModalOpen.value = false;
  selectedPracticalTest.value = null;
  selectedRecheck.value = null;
  selectedPassingGrade.value = null;
  belowPassingGradeConfirmed.value = false;
  inputScore.value = "";
  inputFile.value = null;
  inputLicenseFile.value = null;
  selectedRatingLicenseFile.value = null;
  selectedLicenseEventName.value = null;
  selectedLicenseExpiryDate.value = null;
  fileInputKey.value += 1;
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0] || null;
  inputFile.value = file;
}

function onLicenseFileChange(event: Event) {
  inputLicenseFile.value = (event.target as HTMLInputElement).files?.[0] || null;
}

function isAllowedUploadFile(file: File): boolean {
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return mime === "application/pdf" || name.endsWith(".pdf");
}

function validateUpdateForm(): string | null {
  const score = Number(inputScore.value);
  if (
    !Number.isFinite(score) ||
    !Number.isInteger(score) ||
    score < 1 ||
    score > 100
  ) {
    return "Score must be an integer between 1 and 100.";
  }

  if (!inputFile.value && !(selectedRecheck.value?.file || selectedPracticalTest.value?.file)) {
    return "An evaluation sheet PDF is required for this practical exam.";
  }

  if (inputFile.value && !isAllowedUploadFile(inputFile.value)) {
    return "Evaluation sheet must be PDF.";
  }
  if (!inputLicenseFile.value && !selectedRatingLicenseFile.value) {
    return "A license PDF is required for this rating.";
  }
  if (inputLicenseFile.value && !isAllowedUploadFile(inputLicenseFile.value)) {
    return "License must be PDF.";
  }

  if (isBelowPassingGrade.value && !belowPassingGradeConfirmed.value) {
    return `This score is below the passing grade of ${selectedPassingGrade.value}. Please confirm the failing result.`;
  }

  return null;
}

async function submitPracticalUpdate() {
  if (isSubmittingUpdate.value) return;
  const testId = selectedRecheck.value?.id || selectedPracticalTest.value?.id;
  if (!testId || testId <= 0) return;

  const validationError = validateUpdateForm();
  if (validationError) {
    toast.add({
      title: "Validation Error",
      description: validationError,
      color: "error",
    });
    return;
  }

  const formData = new FormData();
  formData.append("score", String(Number(inputScore.value)));
  formData.append(
    "confirmBelowPassingGrade",
    String(isBelowPassingGrade.value && belowPassingGradeConfirmed.value),
  );
  if (inputFile.value) {
    formData.append("evaluationFile", inputFile.value);
  }
  if (inputLicenseFile.value) {
    formData.append("licenseFile", inputLicenseFile.value);
  }

  try {
    isSubmittingUpdate.value = true;
    const response = await apiFetch(
      selectedRecheck.value
        ? `/api/practicalExam/recheck/${testId}`
        : `/api/practicalExam/${testId}`,
      {
      method: "PUT",
      body: formData,
      },
    ) as PracticalUpdateResponse;

    toast.add({
      title:
        response.overallStatus === "SUCCESS"
          ? "Examination Passed"
          : response.overallStatus === "FAILED"
            ? "Examination Failed"
            : "Practical Score Saved",
      description:
        response.overallStatus === "SUCCESS"
          ? "Theory and all practical items passed. The user rating is now active."
          : response.overallStatus === "FAILED"
            ? "A practical item did not pass. The complete examination attempt has failed."
            : "The result remains pending until every practical item has been scored.",
      color:
        response.overallStatus === "SUCCESS"
          ? "success"
          : response.overallStatus === "FAILED"
            ? "error"
            : "warning",
    });

    closeUpdateModal();
    await refresh();
  } catch (err: any) {
    toast.add({
      title: "Error",
      description:
        err?.data?.message || "Failed to update practical exam data.",
      color: "error",
    });
  } finally {
    isSubmittingUpdate.value = false;
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Practical Exam">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4">
        <UCard class="mb-4">
          <template #header><h2 class="text-lg font-semibold">Select Event</h2></template>
          <div class="space-y-2">
            <USelectMenu
              v-model="selectedEventId"
              :items="eventOptions"
              label-key="label"
              value-key="value"
              searchable
              placeholder="Select an event to load practical exams"
              class="w-full max-w-2xl"
            />
            <p v-if="eventsStatus === 'pending'" class="text-sm text-muted">Loading available events...</p>
            <div v-else-if="eventsError" class="flex items-center gap-2 text-sm text-error">
              Unable to load events. <UButton label="Retry" size="xs" variant="outline" @click="refreshEvents()" />
            </div>
            <p v-else-if="!eventOptions.length" class="text-sm text-muted">No assigned practical exam events available.</p>
          </div>
        </UCard>
        <UCard v-if="selectedEventId && recheckTasks.length" class="mb-4">
          <template #header>
            <div>
              <h2 class="text-lg font-semibold">One-Time Practical Recheck</h2>
              <p class="text-sm text-muted">Attempt-1 evidence remains available as reference.</p>
            </div>
          </template>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse border border-warning/30 text-sm">
              <thead class="bg-warning/10">
                <tr>
                  <th class="border px-3 py-2">User</th>
                  <th class="border px-3 py-2">Application</th>
                  <th class="border px-3 py-2">Rating</th>
                  <th class="border px-3 py-2">Status</th>
                  <th class="border px-3 py-2">Practical</th>
                  <th class="border px-3 py-2">Previous Score</th>
                  <th class="border px-3 py-2">Previous Evidence</th>
                  <th class="border px-3 py-2">Current Score</th>
                  <th class="border px-3 py-2">Current Evidence</th>
                  <th class="border px-3 py-2">e-chain</th>
                  <th class="border px-3 py-2">Attempt-2</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="group in recheckGroups" :key="group.key">
                  <tr
                    v-for="(task, taskIndex) in group.tasks"
                    :key="task.id"
                  >
                    <td
                      v-if="taskIndex === 0"
                      class="border px-3 py-2 align-top"
                      :rowspan="group.tasks.length"
                    >
                      {{ group.user }}
                    </td>
                    <td
                      v-if="taskIndex === 0"
                      class="border px-3 py-2 align-top"
                      :rowspan="group.tasks.length"
                    >
                      {{ group.application }}
                    </td>
                    <td
                      v-if="taskIndex === 0"
                      class="border px-3 py-2 align-top"
                      :rowspan="group.tasks.length"
                    >
                      {{ group.rating }}
                    </td>
                    <td class="border px-3 py-2 text-center">{{ task.authorization.status || '-' }}</td>
                    <td class="border px-3 py-2">{{ formatPracticalType(task.practicalTest.kindOfPractical?.kind) }}</td>
                    <td class="border px-3 py-2 text-center">{{ task.practicalTest.score ?? '-' }}</td>
                    <td class="border px-3 py-2 text-center">
                      <UButton
                        v-if="task.practicalTest.file"
                        label="View"
                        size="xs"
                        variant="soft"
                        @click="openFilePreview(task.practicalTest.file)"
                      />
                    </td>
                    <td class="border px-3 py-2 text-center">
                      {{ task.score ?? '-' }}
                    </td>
                    <td class="border px-3 py-2 text-center">
                      <UButton
                        v-if="task.file"
                        label="View"
                        size="xs"
                        color="primary"
                        variant="soft"
                        @click="openFilePreview(task.file)"
                      />
                      <span v-else>-</span>
                    </td>
                    <td class="border px-3 py-2 text-center">
                      <span class="text-xs text-muted">Send the shared rating license in Practical Exam Data</span>
                    </td>
                    <td class="border px-3 py-2 text-center">
                      <UButton
                        :label="
                          task.authorization.status === 'ACTIVE'
                            ? task.score == null ? 'Check Again' : 'Update Recheck'
                            : 'Update Files'
                        "
                        icon="i-lucide-rotate-ccw"
                        color="warning"
                        size="xs"
                        @click="openRecheckModal(task)"
                      />
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </UCard>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">Practical Exam Data</h2>
              <UButton
                label="Refresh"
                icon="i-lucide-refresh-cw"
                color="primary"
                variant="soft"
                :loading="status === 'pending'"
                :disabled="!selectedEventId"
                @click="refresh()"
              />
            </div>
          </template>

          <div v-if="!selectedEventId" class="text-muted py-4">
            Select an event to view practical exam data.
          </div>
          <div
            v-else-if="status === 'pending'"
            class="flex items-center justify-center py-8 text-muted gap-2"
          >
            <UIcon name="i-lucide-loader-2" class="animate-spin" />
            <span>Loading practical exam data...</span>
          </div>

          <div
            v-else-if="error"
            class="rounded-lg border border-error/30 bg-error/5 p-4 space-y-2"
          >
            <p class="font-medium text-error">
              Failed to fetch practical exam data
            </p>
            <UButton
              label="Retry"
              color="error"
              variant="outline"
              icon="i-lucide-refresh-cw"
              @click="refresh()"
            />
          </div>

          <div v-else-if="practicalRows.length === 0" class="text-muted py-4">
            No practical exam data available.
          </div>

          <div v-else class="overflow-x-auto">
            <table
              class="w-full border-collapse border border-gray-200 text-sm"
            >
              <thead>
                <tr class="bg-gray-100">
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    No
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Number
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Name
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Rating
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Status
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Theory Review
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Practical
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Score
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Evaluation sheet
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    e-chain
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <template
                  v-for="row in practicalRows"
                  :key="`${row.documentId}-${row.appRatingId}`"
                >
                  <tr class="hover:bg-gray-50">
                    <td
                      v-if="row.showDocumentCells"
                      class="border border-gray-300 px-4 py-2 text-center align-top"
                      :rowspan="row.documentRowSpan"
                    >
                      {{ row.no }}
                    </td>
                    <td
                      v-if="row.showDocumentCells"
                      class="border border-gray-300 px-4 py-2 align-top"
                      :rowspan="row.documentRowSpan"
                    >
                      {{ row.number }}
                    </td>
                    <td
                      v-if="row.showDocumentCells"
                      class="border border-gray-300 px-4 py-2 align-top"
                      :rowspan="row.documentRowSpan"
                    >
                      {{ row.name }}
                    </td>
                    <td
                      class="border border-gray-300 px-4 py-2 align-top"
                      :rowspan="row.practicalTests.length"
                    >
                      <div>{{ row.rating }}</div>
                      <UButton v-if="row.practicalLicenseFile" label="View license" size="xs" variant="link"
                        @click="openFilePreview(row.practicalLicenseFile)" />
                    </td>
                    <td
                      class="border border-gray-300 px-4 py-2 text-center align-top"
                      :rowspan="row.practicalTests.length"
                    >
                      {{ row.status }}
                    </td>
                    <td class="border border-gray-300 px-4 py-2 text-center align-top" :rowspan="row.practicalTests.length">
                      <UButton v-if="row.canReviewTheory" label="Review" icon="i-lucide-eye" size="xs" variant="soft" @click="openTheoryReview(row.appRatingId)" />
                      <span v-else class="text-muted">-</span>
                    </td>

                    <td class="border border-gray-300 px-4 py-2">
                      {{ formatPracticalType(row.practicalTests[0]?.kindOfPractical?.kind) }}
                    </td>
                    <td class="border border-gray-300 px-4 py-2 text-center">
                      {{ formatScore(row.practicalTests[0]?.score) }}
                    </td>
                    <td class="border border-gray-300 px-4 py-2">
                      <div class="flex items-center justify-center">
                        <UButton
                          v-if="row.practicalTests[0]?.file"
                          label="View"
                          size="xs"
                          color="primary"
                          variant="soft"
                          icon="i-lucide-eye"
                          @click="openFilePreview(row.practicalTests[0]?.file)"
                        />
                        <span v-else class="text-muted">-</span>
                      </div>
                    </td>
                    <td class="border border-gray-300 px-4 py-2 text-center">
                      <UButton
                        v-if="(row.practicalTests[0]?.id ?? 0) > 0"
                        :label="getEchainButtonLabel(row.practicalTests[0])"
                        size="xs"
                        :color="getEchainButtonColor(row.practicalTests[0])"
                        variant="soft"
                        :icon="getEchainButtonIcon(row.practicalTests[0])"
                        :title="getRowEchainTooltip(row, row.practicalTests[0])"
                        :loading="sendingEchainKeys.has(getPracticalSendKey(row.practicalTests[0]))"
                        :disabled="!canSendRowToEchain(row, row.practicalTests[0])"
                        @click="openEchainConfirmModal(row.practicalTests[0])"
                      />
                      <span v-else class="text-muted">-</span>
                    </td>
                    <td class="border border-gray-300 px-4 py-2 text-center">
                      <UButton
                        v-if="(row.practicalTests[0]?.id ?? 0) > 0"
                        :label="
                          row.practicalTests[0]?.score == null
                            ? 'Input'
                            : 'Update'
                        "
                        size="xs"
                        color="primary"
                        variant="soft"
                        icon="i-lucide-square-pen"
                        :disabled="
                          row.practicalTests[0]?.score == null &&
                          !row.canInputPractical
                        "
                        :title="
                          row.practicalTests[0]?.score == null &&
                          !row.canInputPractical
                            ? 'Theory examination must be passed before entering a practical exam score.'
                            : undefined
                        "
                        @click="openUpdateModal(row.practicalTests[0]!, row.passingGrade)"
                      />
                    </td>
                  </tr>

                  <tr
                    v-for="(test, testIndex) in row.practicalTests.slice(1)"
                    :key="`${row.no}-${test.id}-${testIndex}`"
                    class="hover:bg-gray-50"
                  >
                    <td class="border border-gray-300 px-4 py-2">
                      {{ formatPracticalType(test.kindOfPractical?.kind) }}
                    </td>
                    <td class="border border-gray-300 px-4 py-2 text-center">
                      {{ formatScore(test.score) }}
                    </td>
                    <td class="border border-gray-300 px-4 py-2">
                      <div class="flex items-center justify-center">
                        <UButton
                          v-if="test.file"
                          label="View"
                          size="xs"
                          color="primary"
                          variant="soft"
                          icon="i-lucide-eye"
                          @click="openFilePreview(test.file)"
                        />
                        <span v-else class="text-muted">-</span>
                      </div>
                    </td>
                    <td class="border border-gray-300 px-4 py-2 text-center">
                      <span class="text-xs text-muted">Shared per rating</span>
                    </td>
                    <td class="border border-gray-300 px-4 py-2 text-center">
                      <UButton
                        v-if="test.id > 0"
                        :label="test.score == null ? 'Input' : 'Update'"
                        size="xs"
                        color="primary"
                        variant="soft"
                        icon="i-lucide-square-pen"
                        :disabled="test.score == null && !row.canInputPractical"
                        :title="
                          test.score == null && !row.canInputPractical
                            ? 'Theory examination must be passed before entering a practical exam score.'
                            : undefined
                        "
                        @click="openUpdateModal(test, row.passingGrade)"
                      />
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="isTheoryReviewOpen" title="Theory Examination Review" :ui="{ content: 'sm:max-w-4xl' }">
    <template #body>
      <div v-if="isLoadingTheoryReview" class="p-4 text-sm text-muted">Loading examination answers…</div>
      <div v-else-if="theoryReview" class="theory-review-content relative max-h-[75vh] space-y-6 overflow-y-auto p-2" :data-watermark="`PERFORMA · THEORY REVIEW · ${theoryReview.applicationNumber || 'NO NUMBER'} · ${theoryReview.rating || 'NO RATING'} · OPENED BY ${theoryReview.reviewedBy.name} (${theoryReview.reviewedBy.nik})`">
        <div class="relative z-0 rounded-lg border border-default bg-muted/10 p-3 text-sm">
          <p class="font-semibold">Source: Theory examination result #{{ theoryReview.finalScoreId }}</p>
          <p class="text-muted">{{ theoryReview.name }} · {{ theoryReview.rating }} · {{ theoryReview.applicationNumber }} · {{ theoryReview.event }}</p>
          <p class="mt-1 text-muted">Opened by checker: {{ theoryReview.reviewedBy.name }} ({{ theoryReview.reviewedBy.nik }})</p>
        </div>
        <section class="space-y-3">
          <h3 class="font-semibold">Incorrect Multiple Choice ({{ theoryReview.incorrectMultipleChoice.length }})</h3>
          <p v-if="!theoryReview.incorrectMultipleChoice.length" class="text-sm text-muted">No incorrect answers.</p>
          <div v-for="(item, index) in theoryReview.incorrectMultipleChoice" :key="`mc-${item.id}-${index}`" class="space-y-2 rounded-lg border border-default p-3">
            <div class="flex gap-2"><span>{{ index + 1 }}.</span><div class="rich-question" v-html="item.question" /></div>
            <img v-if="item.image" :src="item.image" alt="Question illustration" class="max-h-64 object-contain">
            <div class="text-sm text-error">User answer: <span v-if="item.selectedAnswer" v-html="item.selectedAnswer" /><span v-else>Not answered</span></div>
          </div>
        </section>
        <section class="space-y-3">
          <h3 class="font-semibold">Essay Questions and Answers ({{ theoryReview.essay.length }})</h3>
          <p v-if="!theoryReview.essay.length" class="text-sm text-muted">No essay questions in this examination.</p>
          <div v-for="(item, index) in theoryReview.essay" :key="`essay-${item.id}-${index}`" class="space-y-2 rounded-lg border border-default p-3">
            <div class="flex gap-2"><span>{{ index + 1 }}.</span><div class="rich-question" v-html="item.question" /></div>
            <img v-if="item.image" :src="item.image" alt="Question illustration" class="max-h-64 object-contain">
            <div class="rounded bg-muted/20 p-3 text-sm"><p class="mb-1 font-medium">User answer</p><div v-if="item.answer" class="rich-question" v-html="item.answer" /><p v-else class="text-muted">Not answered</p></div>
          </div>
        </section>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isUpdateModalOpen"
    title="Update Practical Exam"
    :dismissible="!isSubmittingUpdate"
    :close="!isSubmittingUpdate"
  >
    <template #body>
      <div class="space-y-4">
        <div
          v-if="selectedRecheck"
          class="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm"
        >
          Attempt 2 of 2. Previous score:
          <strong>{{ selectedRecheck.practicalTest.score ?? '-' }}</strong>.
          Reason: {{ selectedRecheck.authorization.reason }}
          <p v-if="isCompletedRecheckUpdate" class="mt-2 text-xs">
            This recheck is already {{ selectedRecheck.authorization.status }}. Only the PDF evidence file can be updated.
          </p>
        </div>
        <UFormField label="Practical">
          <UInput
            :model-value="formatPracticalType(selectedPracticalTest?.kindOfPractical?.kind)"
            disabled
          />
        </UFormField>

        <UFormField label="Score (1-100)" required>
          <UInput
            v-model="inputScore"
            type="number"
            min="1"
            max="100"
            placeholder="Input score"
            :disabled="isCompletedRecheckUpdate"
          />
        </UFormField>

        <div
          v-if="selectedPassingGrade != null"
          class="rounded-lg border border-default bg-muted/20 p-3 text-sm"
        >
          Event passing grade:
          <strong>{{ selectedPassingGrade }}</strong>
        </div>

        <div
          v-if="isBelowPassingGrade"
          class="space-y-3 rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error"
        >
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-triangle-alert" class="mt-0.5 size-5 shrink-0" />
            <p>
              Score <strong>{{ inputScore }}</strong> is below the passing grade
              of <strong>{{ selectedPassingGrade }}</strong>. Saving it will
              make the complete theory and practical examination attempt fail.
            </p>
          </div>
          <UCheckbox
            v-model="belowPassingGradeConfirmed"
            label="I have reviewed the score and confirm this failing practical result."
          />
        </div>

        <UFormField
          label="Evaluation sheet"
          description="PDF for this Live or Simulator practical exam; kept as practical evidence and never sent to e-chain."
          :required="!(selectedRecheck?.file || selectedPracticalTest?.file)"
        >
          <label
            :for="`practical-upload-${selectedPracticalTest?.id || 'new'}`"
            class="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-upload" class="size-4 text-primary" />
              <span class="font-medium text-primary">
                {{ inputFile ? "Change evaluation sheet" : "Choose evaluation sheet" }}
              </span>
            </div>
            <span class="text-xs text-muted">PDF</span>
          </label>
          <input
            :id="`practical-upload-${selectedPracticalTest?.id || 'new'}`"
            :key="fileInputKey"
            type="file"
            accept=".pdf,application/pdf"
            class="sr-only"
            @change="onFileChange"
          />
          <p class="text-xs text-muted mt-2">
            {{
              inputFile
                ? `Selected: ${inputFile.name}`
                : selectedRecheck?.file || selectedPracticalTest?.file ? "Existing evaluation sheet will be kept." : "No evaluation sheet selected yet."
            }}
          </p>
        </UFormField>
        <UFormField label="License" description="One PDF license per rating, visible in the examinee's Operational License menu. Only this file is sent to e-chain."
          :required="!selectedRatingLicenseFile">
          <p class="mb-2 text-xs text-muted">License note: {{ selectedLicenseEventName || '-' }} · Expiry: {{ selectedLicenseExpiryDate ? formatDateTime(selectedLicenseExpiryDate) : 'Not configured' }}</p>
          <label :for="`license-upload-${selectedPracticalTest?.id || 'new'}`"
            class="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-upload" class="size-4 text-primary" />
              <span class="font-medium text-primary">{{ inputLicenseFile ? 'Change license' : 'Choose license' }}</span>
            </div>
            <span class="text-xs text-muted">PDF</span>
          </label>
          <input :id="`license-upload-${selectedPracticalTest?.id || 'new'}`" :key="`license-${fileInputKey}`"
            type="file" accept=".pdf,application/pdf" class="sr-only" @change="onLicenseFileChange" />
          <p class="text-xs text-muted mt-2">
            {{ inputLicenseFile ? `Selected: ${inputLicenseFile.name}` : selectedRatingLicenseFile ? 'Existing rating license will be kept.' : 'No license selected yet.' }}
          </p>
          <UButton v-if="selectedRatingLicenseFile" label="View current license" size="xs" variant="link"
            @click="openFilePreview(selectedRatingLicenseFile)" />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          label="Cancel"
          color="neutral"
          variant="soft"
          :disabled="isSubmittingUpdate"
          @click="closeUpdateModal"
        />
        <UButton
          label="Save"
          color="primary"
          icon="i-lucide-save"
          :loading="isSubmittingUpdate"
          :disabled="isBelowPassingGrade && !belowPassingGradeConfirmed"
          @click="submitPracticalUpdate"
        />
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isEchainConfirmModalOpen"
    title="Confirm e-chain Send"
    :dismissible="
      selectedEchainTest
        ? !sendingEchainKeys.has(getPracticalSendKey(selectedEchainTest))
        : selectedEchainRecheck
          ? !sendingEchainKeys.has(getRecheckSendKey(selectedEchainRecheck))
          : true
    "
    :close="
      selectedEchainTest
        ? !sendingEchainKeys.has(getPracticalSendKey(selectedEchainTest))
        : selectedEchainRecheck
          ? !sendingEchainKeys.has(getRecheckSendKey(selectedEchainRecheck))
          : true
    "
    :ui="{ content: 'max-w-2xl w-full' }"
  >
    <template #body>
      <div v-if="isLoadingEchainPayload" class="flex items-center gap-2 py-6 text-sm text-muted">
        <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
        Preparing data for review...
      </div>

      <div v-else-if="echainPayload" class="space-y-4">
        <div class="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
          Please verify this rating license before sending it to e-chain. The evaluation sheet stays in PERFORMA and is not sent.
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded border border-gray-200 p-3">
            <p class="text-xs text-muted">Profession</p>
            <p class="font-medium">{{ echainPayload.profession || "-" }}</p>
          </div>

          <div class="rounded border border-gray-200 p-3">
            <p class="text-xs text-muted">Rating</p>
            <p class="font-medium">{{ echainPayload.rating || "-" }}</p>
          </div>

          <div class="rounded border border-gray-200 p-3">
            <p class="text-xs text-muted">Practical Checked At</p>
            <p class="font-medium">{{ formatDateTime(echainPayload.practicalCheckedAt) }}</p>
          </div>

          <div class="rounded border border-gray-200 p-3">
            <p class="text-xs text-muted">Valid Until</p>
            <p class="font-medium">{{ formatDateTime(echainPayload.validUntil) }}</p>
          </div>
        </div>

        <div class="rounded border border-gray-200 p-3 text-sm">
          <p class="text-xs text-muted">License PDF</p>
          <p class="font-medium">{{ echainPayload.file?.fileName || "-" }}</p>
          <p class="break-all text-xs text-muted">{{ echainPayload.file?.fileUrl || "-" }}</p>
          <p class="text-xs text-muted">{{ echainPayload.file?.fileMimeType || "-" }}</p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          label="Cancel"
          color="neutral"
          variant="soft"
          :disabled="
            selectedEchainTest
              ? sendingEchainKeys.has(getPracticalSendKey(selectedEchainTest))
              : selectedEchainRecheck
                ? sendingEchainKeys.has(getRecheckSendKey(selectedEchainRecheck))
                : false
          "
          @click="closeEchainConfirmModal"
        />
        <UButton
          label="Send to e-chain"
          color="primary"
          icon="i-lucide-send"
          :loading="
            selectedEchainTest
              ? sendingEchainKeys.has(getPracticalSendKey(selectedEchainTest))
              : selectedEchainRecheck
                ? sendingEchainKeys.has(getRecheckSendKey(selectedEchainRecheck))
                : false
          "
          :disabled="isLoadingEchainPayload || !echainPayload"
          @click="confirmSendPracticalToEchain"
        />
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isFilePreviewModalOpen"
    :title="previewFileName || 'File Preview'"
    :ui="{ content: 'max-w-4xl w-full h-full' }"
  >
    <template #body>
      <div style="height: 70vh">
        <div
          v-if="previewFileType === 'image'"
          class="flex h-full items-center justify-center rounded-lg border bg-muted/20 p-2"
        >
          <img
            :src="previewFileUrl"
            :alt="previewFileName || 'Preview file'"
            class="h-full w-full rounded object-contain"
          />
        </div>

        <div
          v-else-if="previewFileType === 'pdf'"
          class="h-full rounded-lg border overflow-hidden"
        >
          <iframe
            :src="getPdfPreviewUrl(previewFileUrl)"
            style="height: 100%; width: 100%"
            title="PDF Preview"
          />
        </div>

        <div
          v-else
          class="rounded-lg border bg-muted/20 p-4 text-sm text-muted"
        >
          Preview is not available for this file type.
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton
          label="Close"
          color="neutral"
          variant="soft"
          @click="closeFilePreviewModal"
        />
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.theory-review-content::before {
  content: attr(data-watermark);
  position: absolute;
  z-index: 2;
  top: 48%;
  left: 50%;
  width: max-content;
  max-width: 90%;
  color: currentColor;
  font-size: clamp(1.1rem, 3vw, 2rem);
  font-weight: 800;
  letter-spacing: 0.08em;
  opacity: 0.09;
  pointer-events: none;
  text-align: center;
  white-space: normal;
  transform: translate(-50%, -50%) rotate(-18deg);
}
</style>
