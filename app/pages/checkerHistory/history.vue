<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface CheckerHistoryEventItem {
  id: number;
  event: string;
  session?: {
    id: number;
    session: string;
  } | null;
}

interface CheckerHistoryRemarkItem {
  id: number;
  remark: string;
  events: CheckerHistoryEventItem[];
}

interface CheckerHistoryPracticalTestItem {
  id?: number;
  score?: number | null;
  file?: string | null;
  kindOfPractical?: {
    kind?: string | null;
  } | null;
  checkerGroup?: {
    userChecker?: {
      name?: string | null;
    } | null;
  } | null;
}

interface CheckerHistoryAppRatingItem {
  id?: number;
  rating?: {
    id?: number;
    rating?: string | null;
  } | null;
  status?: {
    status?: string | null;
  } | null;
  finalScores?: Array<{
    finalScore?: number | null;
    cwpSnapshots?: Array<{
      cwpId: number;
      cwpName?: string | null;
      sectorName?: string | null;
      frequencies?: Array<{
        id: number;
        frequency?: string | null;
        isPrimary?: boolean | null;
      }> | null;
    }> | null;
    event?: {
      sector?: {
        sector?: string | null;
        sectorCwps?: Array<{
          cwp?: {
            id: number;
            cwp?: string | null;
            ratingId?: number | null;
            cwpFrequencies?: Array<{
              id: number;
              frequency?: string | null;
              isPrimary?: boolean | null;
            }> | null;
          } | null;
        }> | null;
      } | null;
    } | null;
    status?: {
      status?: string | null;
    } | null;
  }> | null;
  practicalTests?: CheckerHistoryPracticalTestItem[] | null;
}

interface CheckerHistoryApplicationDocItem {
  id?: number;
  number?: string | null;
  license?: {
    file?: string | null;
  } | null;
  medex?: {
    file?: string | null;
    expired?: string | null;
  } | null;
  ielp?: {
    file?: string | null;
    expired?: string | null;
  } | null;
  logbook?: {
    file?: string | null;
  } | null;
  licenseNumber?: string | null;
  appRatings?: CheckerHistoryAppRatingItem[] | null;
}

interface CheckerHistoryResultItem {
  id?: number;
  user?: {
    name?: string | null;
    licenseUserId?: string | null;
  } | null;
  applicationDocs?: CheckerHistoryApplicationDocItem[] | null;
}

interface CheckerHistorySearchResponse {
  event?: {
    event?: string | null;
    session?: {
      session?: string | null;
    } | null;
    remarkDoc?: {
      remark?: string | null;
    } | null;
  } | null;
  sortEventUser?: CheckerHistoryResultItem[] | null;
}

interface CheckerHistoryRow {
  id: string;
  no: number;
  showNo: boolean;
  noRowSpan: number;
  name: string;
  showName: boolean;
  nameRowSpan: number;
  applicationDocNumber: string;
  showApplicationDocNumber: boolean;
  applicationDocNumberRowSpan: number;
  showFile: boolean;
  fileRowSpan: number;
  licenseFile: string | null;
  medexFile: string | null;
  ielpFile: string | null;
  logbookFile: string | null;
  rating: string;
  authorityCwps: Array<{
    id: number;
    name: string;
    sector: string;
    frequencies: Array<{ id: number; frequency: string; isPrimary: boolean }>;
  }>;
  showRating: boolean;
  ratingRowSpan: number;
  remark: string;
  showRemark: boolean;
  remarkRowSpan: number;
  score: string;
  practicalTestFile: string | null;
  practicalTestLabel: string;
  kind: string;
  practicalScore: string;
}

const { token } = useAuth();
const toast = useToast();

const selectedRemarkId = ref<number | undefined>(undefined);
const selectedSessionId = ref<number | undefined>(undefined);
const selectedEventIds = ref<number[]>([]);
const resultLoading = ref(false);
const resultData = ref<CheckerHistoryResultItem[] | null>(null);
const selectedEventMeta = ref<CheckerHistorySearchResponse["event"] | null>(null);

const isAuthorityModalOpen = ref(false);
const selectedAuthority = ref<{
  user: string;
  applicationDoc: string;
  rating: string;
  cwps: Array<{
    id: number;
    name: string;
    sector: string;
    frequencies: Array<{ id: number; frequency: string; isPrimary: boolean }>;
  }>;
} | null>(null);

const isFileModalOpen = ref(false);
const selectedFilePath = ref<string | null>(null);
const selectedFileTitle = ref<string>("File Preview");

const { data, status, error, refresh } = await useFetch<
  CheckerHistoryRemarkItem[]
>(`${apiBaseUrl}/api/checkerHistory`, {
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
  const events = (selectedRemarkItem.value?.events || []).filter(
    (item) => item.session?.id === selectedSessionId.value,
  );

  return events.map((item) => ({
    label: item.event || "-",
    value: item.id,
  }));
});

const sessionOptions = computed(() => {
  const events = selectedRemarkItem.value?.events || [];
  const sessionMap = new Map<number, string>();

  events.forEach((item) => {
    if (!item.session?.id) return;
    sessionMap.set(item.session.id, item.session.session || "-");
  });

  return Array.from(sessionMap.entries()).map(([id, session]) => ({
    label: session,
    value: id,
  }));
});

watch(selectedRemarkId, () => {
  selectedSessionId.value = undefined;
  selectedEventIds.value = [];
});

watch(selectedSessionId, () => {
  selectedEventIds.value = [];
});

function formatScore(value: unknown): string {
  const score = Number(value);
  if (!Number.isFinite(score)) return "-";
  return Number.isInteger(score) ? String(score) : score.toFixed(2);
}

function formatDateOnly(value?: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${day}-${month}-${year}`;
}

function getFinalScoreAt(
  appRating: CheckerHistoryAppRatingItem | null | undefined,
  index: number,
): string {
  const score = appRating?.finalScores?.[index]?.finalScore;
  return formatScore(score);
}

function getAuthorityCwps(appRating?: CheckerHistoryAppRatingItem | null) {
  const ratingId = appRating?.rating?.id;
  if (!ratingId) return [];

  const authorities = new Map<
    number,
    {
      id: number;
      name: string;
      sector: string;
      frequencies: Array<{ id: number; frequency: string; isPrimary: boolean }>;
    }
  >();

  const snapshots = (appRating?.finalScores || []).flatMap(
    (finalScore) => finalScore.cwpSnapshots || [],
  );
  if (snapshots.length > 0) {
    for (const snapshot of snapshots) {
      if (!snapshot.cwpId) continue;
      authorities.set(snapshot.cwpId, {
        id: snapshot.cwpId,
        name: snapshot.cwpName || `CWP ${snapshot.cwpId}`,
        sector: snapshot.sectorName || "-",
        frequencies: (snapshot.frequencies || []).map((item) => ({
          id: item.id,
          frequency: item.frequency || "-",
          isPrimary: Boolean(item.isPrimary),
        })),
      });
    }

    return Array.from(authorities.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  // Transitional fallback for a legacy score that could not be backfilled.
  for (const finalScore of appRating?.finalScores || []) {
    const sector = finalScore.event?.sector;
    for (const sectorCwp of sector?.sectorCwps || []) {
      const cwp = sectorCwp.cwp;
      if (!cwp?.id || cwp.ratingId !== ratingId) continue;
      authorities.set(cwp.id, {
        id: cwp.id,
        name: cwp.cwp || `CWP ${cwp.id}`,
        sector: sector?.sector || "-",
        frequencies: (cwp.cwpFrequencies || []).map((item) => ({
          id: item.id,
          frequency: item.frequency || "-",
          isPrimary: Boolean(item.isPrimary),
        })),
      });
    }
  }

  return Array.from(authorities.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

function openAuthorityModal(row: CheckerHistoryRow) {
  selectedAuthority.value = {
    user: row.name,
    applicationDoc: row.applicationDocNumber,
    rating: row.rating,
    cwps: row.authorityCwps,
  };
  isAuthorityModalOpen.value = true;
}

function closeAuthorityModal() {
  isAuthorityModalOpen.value = false;
  selectedAuthority.value = null;
}

function getRatingRowCount(
  appRating?: CheckerHistoryAppRatingItem | null,
): number {
  const practicalCount = appRating?.practicalTests?.length || 0;
  const finalScoreCount = appRating?.finalScores?.length || 0;
  const total = Math.max(practicalCount, finalScoreCount);
  return Math.max(1, total);
}

function getApplicationDocRowCount(
  doc?: CheckerHistoryApplicationDocItem | null,
): number {
  const ratings = doc?.appRatings || [];
  if (ratings.length === 0) return 1;
  return ratings.reduce((sum, rating) => sum + getRatingRowCount(rating), 0);
}

function getItemRowCount(item?: CheckerHistoryResultItem | null): number {
  const docs = item?.applicationDocs || [];
  if (docs.length === 0) return 1;
  return docs.reduce((sum, doc) => sum + getApplicationDocRowCount(doc), 0);
}

const rows = computed<CheckerHistoryRow[]>(() => {
  const payload = resultData.value || [];
  const result: CheckerHistoryRow[] = [];

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
              license: { file: null },
              medex: { file: null },
              ielp: { file: null },
              logbook: { file: null },
              appRatings: [] as CheckerHistoryAppRatingItem[],
            },
          ];

    const itemRowSpan = getItemRowCount(item);
    let isFirstItemRow = true;

    safeDocs.forEach((doc, docIndex) => {
      const ratings = doc.appRatings || [];
      const safeRatings =
        ratings.length > 0
          ? ratings
          : [
              {
                id: undefined,
                rating: { rating: "-" },
                finalScores: [],
                practicalTests: [],
              },
            ];

      const docRowSpan = getApplicationDocRowCount(doc);
      let isFirstDocRow = true;

      safeRatings.forEach((appRating, ratingIndex) => {
        const ratingRowSpan = getRatingRowCount(appRating);
        const tests = appRating.practicalTests || [];

        Array.from({ length: ratingRowSpan }).forEach((_, rowIndex) => {
          const test = tests[rowIndex];
          result.push({
            id: `${item.id || itemIndex}-${doc.id || docIndex}-${appRating.id || ratingIndex}-${test?.id || rowIndex}`,
            no: itemIndex + 1,
            showNo: isFirstItemRow,
            noRowSpan: itemRowSpan,
            name: userName,
            showName: isFirstItemRow,
            nameRowSpan: itemRowSpan,
            applicationDocNumber: doc.number || "-",
            showApplicationDocNumber: isFirstDocRow,
            applicationDocNumberRowSpan: docRowSpan,
            showFile: isFirstDocRow,
            fileRowSpan: docRowSpan,
            licenseFile: doc.license?.file || null,
            medexFile: doc.medex?.file || null,
            ielpFile: doc.ielp?.file || null,
            logbookFile: doc.logbook?.file || null,
            rating: appRating.rating?.rating || "-",
            authorityCwps: getAuthorityCwps(appRating),
            showRating: rowIndex === 0,
            ratingRowSpan,
            remark: getRatingRemark(appRating),
            showRemark: rowIndex === 0,
            remarkRowSpan: ratingRowSpan,
            score: getFinalScoreAt(appRating, rowIndex),
            practicalTestFile: test?.file || null,
            practicalTestLabel: test?.file ? "Open" : "-",
            kind: test?.kindOfPractical?.kind || "-",
            practicalScore: formatScore(test?.score),
          });

          isFirstItemRow = false;
          isFirstDocRow = false;
        });
      });
    });
  });

  return result;
});

async function handleSearch() {
  if (selectedEventIds.value.length === 0) {
    toast.add({
      title: "Validation",
      description: "Please select at least one event.",
      color: "warning",
    });
    return;
  }

  try {
    resultLoading.value = true;
    const response = await $fetch<
      CheckerHistorySearchResponse | CheckerHistorySearchResponse[]
    >(`${apiBaseUrl}/api/checkerHistory`, {
      method: "POST",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
      body: {
        eventId: selectedEventIds.value,
      },
    });

    const responseList = Array.isArray(response) ? response : [response];
    const users = responseList.flatMap((item) => item.sortEventUser || []);
    resultData.value = users;
    selectedEventMeta.value = responseList[0]?.event || null;

    toast.add({
      title: "Success",
      description: "Checker history loaded successfully.",
      color: "success",
    });
  } catch (fetchError: any) {
    const message =
      fetchError?.data?.message ||
      fetchError?.message ||
      "Failed to load checker history.";
    toast.add({
      title: "Error",
      description: message,
      color: "error",
    });
  } finally {
    resultLoading.value = false;
  }
}

function resolveFileUrl(filePath?: string | null): string | null {
  if (!filePath) return null;
  if (/^https?:\/\//i.test(filePath)) return filePath;
  return `${apiBaseUrl}${filePath}`;
}

function getFileExtension(filePath?: string | null): string {
  if (!filePath) return "";
  const cleanPath = filePath.split("?")[0] ?? "";
  const ext = cleanPath.split(".").pop();
  return (ext || "").toLowerCase();
}

function isImageFile(filePath?: string | null): boolean {
  const ext = getFileExtension(filePath);
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);
}

function isPdfFile(filePath?: string | null): boolean {
  return getFileExtension(filePath) === "pdf";
}

function openFileModal(filePath: string | null, title: string) {
  if (!filePath) return;
  selectedFilePath.value = filePath;
  selectedFileTitle.value = title;
  isFileModalOpen.value = true;
}

function closeFileModal() {
  isFileModalOpen.value = false;
  selectedFilePath.value = null;
  selectedFileTitle.value = "File Preview";
}

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

const printTitle = computed(() => {
  const remark = selectedEventMeta.value?.remarkDoc?.remark || "-";
  const session = selectedEventMeta.value?.session?.session || "-";
  return `${remark} ${session}`;
});

function getRatingRemark(appRating?: CheckerHistoryAppRatingItem | null): string {
  const finalScores = appRating?.finalScores || [];
  const latestFinalScore = finalScores[finalScores.length - 1];
  return (
    latestFinalScore?.status?.status ||
    appRating?.status?.status ||
    "-"
  );
}

interface PrintRow {
  id: string;
  no: number;
  showNo: boolean;
  noRowSpan: number;
  name: string;
  showName: boolean;
  nameRowSpan: number;
  licenseNumber: string;
  showLicenseNumber: boolean;
  licenseNumberRowSpan: number;
  validIelp: string;
  showValidIelp: boolean;
  validIelpRowSpan: number;
  validMedex: string;
  showValidMedex: boolean;
  validMedexRowSpan: number;
  rating: string;
  showRating: boolean;
  ratingRowSpan: number;
  finalScore: string;
  practicalTest: string;
  checkerName: string;
  practicalTestScore: string;
  remark: string;
  showRemark: boolean;
  remarkRowSpan: number;
}

const printRows = computed<PrintRow[]>(() => {
  const payload = resultData.value || [];
  const result: PrintRow[] = [];

  payload.forEach((item, itemIndex) => {
    const userName = item.user?.name || "-";
    const licenseNo = item.user?.licenseUserId || "-";
    const docs = item.applicationDocs || [];
    const safeDocs =
      docs.length > 0
        ? docs
        : [
            {
              id: undefined,
              medex: { expired: null },
              ielp: { expired: null },
              appRatings: [] as CheckerHistoryAppRatingItem[],
            },
          ];

    const userRowSpan = Math.max(
      1,
      safeDocs.reduce((docSum, doc) => {
        const ratings = doc.appRatings || [];
        if (ratings.length === 0) return docSum + 1;
        const ratingRows = ratings.reduce((ratingSum, rating) => {
          return ratingSum + getRatingRowCount(rating);
        }, 0);
        return docSum + Math.max(1, ratingRows);
      }, 0),
    );

    let isFirstUserRow = true;

    safeDocs.forEach((doc, docIndex) => {
      const validIelp = formatDateOnly(doc.ielp?.expired);
      const validMedex = formatDateOnly(doc.medex?.expired);
      const ratings = doc.appRatings || [];
      const safeRatings =
        ratings.length > 0
          ? ratings
          : [
              {
                id: undefined,
                rating: { rating: "-" },
                finalScores: [],
                practicalTests: [],
              },
            ];

      safeRatings.forEach((rating, ratingIndex) => {
        const tests = rating.practicalTests || [];
        const ratingRowSpan = getRatingRowCount(rating);

        Array.from({ length: ratingRowSpan }).forEach((_, rowIndex) => {
          const test = tests[rowIndex];
          result.push({
            id: `${item.id || itemIndex}-${doc.id || docIndex}-${rating.id || ratingIndex}-${test?.id || rowIndex}`,
            no: itemIndex + 1,
            showNo: isFirstUserRow,
            noRowSpan: userRowSpan,
            name: userName,
            showName: isFirstUserRow,
            nameRowSpan: userRowSpan,
            licenseNumber: licenseNo,
            showLicenseNumber: isFirstUserRow,
            licenseNumberRowSpan: userRowSpan,
            validIelp,
            showValidIelp: isFirstUserRow,
            validIelpRowSpan: userRowSpan,
            validMedex,
            showValidMedex: isFirstUserRow,
            validMedexRowSpan: userRowSpan,
            rating: rating.rating?.rating || "-",
            showRating: rowIndex === 0,
            ratingRowSpan,
            finalScore: getFinalScoreAt(rating, rowIndex),
            practicalTest: test?.kindOfPractical?.kind || "-",
            checkerName: test?.checkerGroup?.userChecker?.name || "-",
            practicalTestScore: formatScore(test?.score),
            remark: getRatingRemark(rating),
            showRemark: rowIndex === 0,
            remarkRowSpan: ratingRowSpan,
          });

          isFirstUserRow = false;
        });
      });
    });
  });

  return result;
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function handlePrintPdf() {
  if (printRows.value.length === 0) {
    toast.add({
      title: "Validation",
      description: "No data available to print.",
      color: "warning",
    });
    return;
  }

  const rowsHtml = printRows.value
    .map((row) => {
      return `<tr>
${row.showNo ? `<td rowspan="${row.noRowSpan}" class="center">${row.no}</td>` : ""}
${row.showName ? `<td rowspan="${row.nameRowSpan}">${escapeHtml(row.name)}</td>` : ""}
${row.showLicenseNumber ? `<td rowspan="${row.licenseNumberRowSpan}" class="center">${escapeHtml(row.licenseNumber)}</td>` : ""}
${row.showValidIelp ? `<td rowspan="${row.validIelpRowSpan}" class="center">${escapeHtml(row.validIelp)}</td>` : ""}
${row.showValidMedex ? `<td rowspan="${row.validMedexRowSpan}" class="center">${escapeHtml(row.validMedex)}</td>` : ""}
${row.showRating ? `<td rowspan="${row.ratingRowSpan}" class="center">${escapeHtml(row.rating)}</td>` : ""}
<td class="center">${escapeHtml(row.finalScore)}</td>
<td class="center">${escapeHtml(row.practicalTest)}</td>
<td>${escapeHtml(row.checkerName)}</td>
<td class="center">${escapeHtml(row.practicalTestScore)}</td>
${row.showRemark ? `<td rowspan="${row.remarkRowSpan}" class="center">${escapeHtml(row.remark)}</td>` : ""}
</tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Checker History Print</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
    h1 { margin: 0 0 16px; font-size: 18px; text-align: center; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #333; padding: 6px; vertical-align: middle; }
    th { background: #f3f4f6; text-align: center; }
    .center { text-align: center; }
  </style>
</head>
<body>
  <h1>${escapeHtml(printTitle.value)}</h1>
  <table>
    <thead>
      <tr>
        <th>No</th>
        <th>Name</th>
        <th>License Number</th>
        <th>Valid IELP</th>
        <th>Valid MEDEX</th>
        <th>Rating</th>
        <th>Final Score</th>
        <th>Practical Test</th>
        <th>Checker Name</th>
        <th>Practical Test</th>
        <th>Remark</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) {
    toast.add({
      title: "Error",
      description: "Unable to open print window.",
      color: "error",
    });
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Checker History">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Filter History</h2>
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

          <div v-else class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <UFormField label="Remark">
              <USelect
                v-model="selectedRemarkId"
                :items="remarkOptions"
                placeholder="Select remark"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Session">
              <USelect
                v-model="selectedSessionId"
                :items="sessionOptions"
                :disabled="!selectedRemarkId"
                placeholder="Select session"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Event">
              <USelect
                v-model="selectedEventIds"
                :items="eventOptions"
                multiple
                :disabled="!selectedRemarkId || !selectedSessionId"
                placeholder="Select event(s)"
                class="w-full"
              />
            </UFormField>

            <div class="flex items-end">
              <UButton
                label="Search"
                color="primary"
                icon="i-lucide-search"
                :loading="resultLoading"
                :disabled="selectedEventIds.length === 0 || resultLoading"
                class="w-full md:w-auto"
                @click="handleSearch"
              />
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-lg font-semibold">Result</h2>
              <UButton
                label="Print PDF"
                color="success"
                icon="i-lucide-printer"
                variant="outline"
                :disabled="rows.length === 0"
                @click="handlePrintPdf"
              />
            </div>
          </template>

          <div
            v-if="resultLoading"
            class="flex items-center gap-2 text-muted py-2"
          >
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
            Loading checker history...
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
                    ApplicationDocNumber
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Name
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    File
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Rating
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Score
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Kind
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Practical Score
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Remark
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
                    v-if="row.showApplicationDocNumber"
                    class="px-3 py-2 border border-default align-middle text-center"
                    :rowspan="row.applicationDocNumberRowSpan"
                  >
                    {{ row.applicationDocNumber }}
                  </td>
                  <td
                    v-if="row.showName"
                    class="px-3 py-2 border border-default align-middle"
                    :rowspan="row.nameRowSpan"
                  >
                    {{ row.name }}
                  </td>

                  <td
                    v-if="row.showFile"
                    class="px-3 py-2 border border-default align-middle"
                    :rowspan="row.fileRowSpan"
                  >
                    <div class="flex items-center justify-center gap-2">
                      <UTooltip v-if="row.licenseFile" text="License">
                        <UButton
                          icon="i-lucide-id-card"
                          color="success"
                          variant="soft"
                          size="xs"
                          @click="
                            openFileModal(row.licenseFile, 'License Preview')
                          "
                        />
                      </UTooltip>

                      <UTooltip v-if="row.medexFile" text="Medex">
                        <UButton
                          icon="i-lucide-heart-pulse"
                          color="success"
                          variant="soft"
                          size="xs"
                          @click="openFileModal(row.medexFile, 'Medex Preview')"
                        />
                      </UTooltip>

                      <UTooltip v-if="row.ielpFile" text="IELP">
                        <UButton
                          icon="i-lucide-badge-check"
                          color="success"
                          variant="soft"
                          size="xs"
                          @click="openFileModal(row.ielpFile, 'IELP Preview')"
                        />
                      </UTooltip>

                      <UTooltip v-if="row.logbookFile" text="Logbook">
                        <UButton
                          icon="i-lucide-book-open"
                          color="success"
                          variant="soft"
                          size="xs"
                          @click="
                            openFileModal(row.logbookFile, 'Logbook Preview')
                          "
                        />
                      </UTooltip>
                      <span
                        v-if="
                          !row.licenseFile &&
                          !row.medexFile &&
                          !row.ielpFile &&
                          !row.logbookFile
                        "
                      >
                        -
                      </span>
                    </div>
                  </td>

                  <td
                    v-if="row.showRating"
                    class="px-3 py-2 border border-default align-middle text-center"
                    :rowspan="row.ratingRowSpan"
                  >
                    <UButton
                      :label="row.rating"
                      color="primary"
                      variant="link"
                      size="sm"
                      :disabled="row.rating === '-'"
                      @click="openAuthorityModal(row)"
                    />
                  </td>

                  <td
                    class="px-3 py-2 border border-default text-center"
                  >
                    {{ row.score }}
                  </td>
                  <td class="px-3 py-2 border border-default text-center">
                    {{ row.kind }}
                  </td>

                  <td class="px-3 py-2 border border-default text-center">
                    {{ row.practicalScore }}
                  </td>
                  <td
                    v-if="row.showRemark"
                    class="px-3 py-2 border border-default align-middle text-center"
                    :rowspan="row.remarkRowSpan"
                  >
                    {{ row.remark }}
                  </td>
                </tr>

                <tr v-if="rows.length === 0">
                  <td
                    class="px-3 py-3 text-muted border border-default text-center"
                    colspan="10"
                  >
                    No checker history data available.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>

        <UModal
          :open="isAuthorityModalOpen"
          :title="`Authority CWP - ${selectedAuthority?.rating || ''}`"
          description="CWP authority from the final score event sector"
          :ui="{ content: 'max-w-lg' }"
          @update:open="(value) => (!value ? closeAuthorityModal() : null)"
        >
          <template #body>
            <div v-if="selectedAuthority" class="space-y-4">
              <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt class="text-muted">Name</dt>
                <dd class="font-medium">{{ selectedAuthority.user }}</dd>
                <dt class="text-muted">Application document</dt>
                <dd class="font-medium">{{ selectedAuthority.applicationDoc }}</dd>
                <dt class="text-muted">Rating</dt>
                <dd class="font-medium">{{ selectedAuthority.rating }}</dd>
              </dl>

              <div
                v-if="selectedAuthority.cwps.length === 0"
                class="rounded-lg border border-default bg-muted/20 p-4 text-sm text-muted"
              >
                No CWP authority is configured for this rating in the examination sector.
              </div>

              <ul v-else class="divide-y divide-default rounded-lg border border-default">
                <li
                  v-for="cwp in selectedAuthority.cwps"
                  :key="cwp.id"
                  class="flex items-start justify-between gap-3 p-3"
                >
                  <div class="space-y-2">
                    <span class="font-medium">{{ cwp.name }}</span>
                    <div v-if="cwp.frequencies.length" class="flex flex-wrap gap-1.5">
                      <UBadge
                        v-for="frequency in cwp.frequencies"
                        :key="frequency.id"
                        :color="frequency.isPrimary ? 'success' : 'neutral'"
                        variant="soft"
                      >
                        {{ frequency.frequency }}
                        {{ frequency.isPrimary ? '(Primary)' : '(Secondary)' }}
                      </UBadge>
                    </div>
                    <p v-else class="text-xs text-muted">No frequency configured</p>
                  </div>
                  <UBadge color="neutral" variant="outline">{{ cwp.sector }}</UBadge>
                </li>
              </ul>
            </div>
          </template>

          <template #footer>
            <div class="flex w-full justify-end">
              <UButton
                label="Close"
                color="neutral"
                variant="soft"
                @click="closeAuthorityModal"
              />
            </div>
          </template>
        </UModal>

        <UModal
          :open="isFileModalOpen"
          :title="selectedFileTitle"
          :ui="{ content: 'max-w-4xl w-full h-full' }"
          @update:open="(value) => (!value ? closeFileModal() : null)"
        >
          <template #body>
            <div style="height: 70vh">
              <div
                v-if="isImageFile(selectedFilePath)"
                class="flex h-full items-center justify-center rounded-lg border border-default bg-muted/20 p-2"
              >
                <img
                  :src="resolveFileUrl(selectedFilePath) || ''"
                  :alt="selectedFileTitle"
                  class="h-full w-full rounded object-contain"
                />
              </div>

              <div
                v-else-if="isPdfFile(selectedFilePath)"
                class="h-full rounded-lg border border-default overflow-hidden"
              >
                <iframe
                  :src="resolveFileUrl(selectedFilePath) || ''"
                  style="height: 100%; width: 100%"
                  :title="selectedFileTitle"
                />
              </div>

              <div
                v-else
                class="rounded-lg border border-default bg-muted/20 p-4 text-sm text-muted"
              >
                Preview is not available for this file type.
              </div>
            </div>
          </template>

          <template #footer>
            <div class="flex items-center justify-end gap-2 w-full">
              <a
                :href="resolveFileUrl(selectedFilePath) || '#'"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-primary hover:underline"
              >
                Open file in new tab
              </a>
              <UButton
                label="Close"
                color="neutral"
                variant="soft"
                @click="closeFileModal"
              />
            </div>
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>
