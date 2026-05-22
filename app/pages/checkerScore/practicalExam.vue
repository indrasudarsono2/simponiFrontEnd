<script setup lang="ts">
import ip from "../../utils/config.json";

interface ScoreCheckerEventItem {
  id: number;
  event: string;
}

interface ScoreCheckerRemarkItem {
  id: number;
  remark: string;
  events: ScoreCheckerEventItem[];
}

interface PracticalTestItem {
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

interface ScoreCheckerAppRatingItem {
  id?: number;
  rating?: {
    rating?: string | null;
  } | null;
  status?: {
    status?: string | null;
  } | null;
  practicalTests?: PracticalTestItem[] | null;
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

interface PracticalExamRow {
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
  status: string;
  showStatus: boolean;
  statusRowSpan: number;
  kindOfPractical: string;
  checker: string;
  score: string;
  file: string | null;
}

const { token } = useAuth();
const toast = useToast();

const selectedRemarkId = ref<number | undefined>(undefined);
const selectedEventId = ref<number | undefined>(undefined);
const resultLoading = ref(false);
const resultData = ref<ScoreCheckerResultItem[] | null>(null);

const isFileModalOpen = ref(false);
const selectedFilePath = ref<string | null>(null);

const { data, status, error, refresh } = await useFetch<
  ScoreCheckerRemarkItem[]
>(`http://${ip.ipBackEnd}/api/scoreCheckerPractical`, {
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

function resolveFileUrl(filePath?: string | null): string | null {
  if (!filePath) return null;
  if (/^https?:\/\//i.test(filePath)) return filePath;
  return `http://${ip.ipBackEnd}${filePath}`;
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

function openFileModal(filePath: string | null) {
  if (!filePath) return;
  selectedFilePath.value = filePath;
  isFileModalOpen.value = true;
}

function closeFileModal() {
  isFileModalOpen.value = false;
  selectedFilePath.value = null;
}

function getRatingRowCount(
  appRating?: ScoreCheckerAppRatingItem | null,
): number {
  const total = appRating?.practicalTests?.length || 0;
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

const rows = computed<PracticalExamRow[]>(() => {
  const payload = resultData.value || [];
  const result: PracticalExamRow[] = [];

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
                status: { status: "-" },
                practicalTests: [],
              },
            ];
      const applicationDocRowSpan = getApplicationDocRowCount(doc);
      let isFirstDocumentRow = true;

      safeRatings.forEach((appRating, ratingIndex) => {
        const ratingName = appRating.rating?.rating || "-";
        const ratingStatus = appRating.status?.status || "-";
        const tests = appRating.practicalTests || [];
        const safeTests =
          tests.length > 0
            ? tests
            : [
                {
                  id: undefined,
                  score: null,
                  file: null,
                  kindOfPractical: { kind: "-" },
                  checkerGroup: { userChecker: { name: "-" } },
                },
              ];
        const ratingRowSpan = getRatingRowCount(appRating);

        safeTests.forEach((test, testIndex) => {
          result.push({
            id: `${item.id || itemIndex}-${doc.id || docIndex}-${appRating.id || ratingIndex}-${test.id || testIndex}`,
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
            showRating: testIndex === 0,
            ratingRowSpan,
            status: ratingStatus,
            showStatus: testIndex === 0,
            statusRowSpan: ratingRowSpan,
            kindOfPractical: test.kindOfPractical?.kind || "-",
            checker: test.checkerGroup?.userChecker?.name || "-",
            score: formatScore(test.score),
            file: test.file || null,
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
    >(`http://${ip.ipBackEnd}/api/scoreCheckerPractical`, {
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
      description: "Practical exam data loaded successfully.",
      color: "success",
    });
  } catch (fetchError: any) {
    const message =
      fetchError?.data?.message ||
      fetchError?.message ||
      "Failed to load practical exam data.";
    toast.add({
      title: "Error",
      description: message,
      color: "error",
    });
  } finally {
    resultLoading.value = false;
  }
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
            Loading practical exam result...
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
                    Status
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Kind of Practical
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Checker
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Score
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    File
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
                  <td
                    v-if="row.showStatus"
                    class="px-3 py-2 border border-default align-middle text-center"
                    :rowspan="row.statusRowSpan"
                  >
                    <UBadge
                      :color="
                        row.status?.toUpperCase() === 'SUCCESS'
                          ? 'success'
                          : row.status?.toUpperCase() === 'FAILED'
                            ? 'error'
                            : row.status?.toUpperCase() === 'RECHECK'
                              ? 'warning'
                              : 'neutral'
                      "
                      variant="soft"
                    >
                      {{ row.status }}
                    </UBadge>
                  </td>
                  <td class="px-3 py-2 border border-default text-center">
                    {{ row.kindOfPractical }}
                  </td>
                  <td class="px-3 py-2 border border-default text-center">
                    {{ row.checker }}
                  </td>
                  <td class="px-3 py-2 border border-default text-center">
                    {{ row.score }}
                  </td>
                  <td class="px-3 py-2 border border-default text-center">
                    <UButton
                      v-if="row.file"
                      icon="i-lucide-eye"
                      color="primary"
                      variant="soft"
                      size="xs"
                      @click="openFileModal(row.file)"
                    />
                  </td>
                </tr>

                <tr v-if="rows.length === 0">
                  <td
                    class="px-3 py-3 text-muted border border-default text-center"
                    colspan="9"
                  >
                    No practical exam data available.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>

        <UModal
          :open="isFileModalOpen"
          title="Practical Test File"
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
                  alt="Practical test file"
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
                  title="Practical test file"
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

