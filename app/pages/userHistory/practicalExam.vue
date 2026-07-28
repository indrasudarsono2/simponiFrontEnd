<script setup lang="ts">
import ip from "../../utils/config.json";

interface PracticalTestItem {
  id?: number;
  score?: number | null;
  file?: string | null;
  createdAt?: string | null;
  kindOfPractical?: {
    kind?: string | null;
  } | null;
  checkerGroup?: {
    userChecker?: {
      name?: string | null;
    } | null;
  } | null;
  recheckAttempts?: PracticalRecheckAttemptItem[] | null;
}

interface PracticalRecheckAttemptItem {
  id?: number;
  score?: number | null;
  file?: string | null;
  updatedAt?: string | null;
  authorization?: {
    status?: string | null;
  } | null;
  checkerGroup?: {
    userChecker?: {
      name?: string | null;
    } | null;
  } | null;
}

interface AppRatingItem {
  id?: number;
  rating?: {
    rating?: string | null;
  } | null;
  status?: {
    status?: string | null;
  } | null;
  practicalTests?: PracticalTestItem[] | null;
}

interface ApplicationDocItem {
  id?: number;
  number?: string | null;
  appRatings?: AppRatingItem[] | null;
}

interface ScoreUserPracticalResponseItem {
  event?: {
    event?: string | null;
  } | null;
  applicationDocs?: ApplicationDocItem[] | null;
}

interface PracticalExamRow {
  id: string;
  no: number;
  showNo: boolean;
  noRowSpan: number;
  event: string;
  showEvent: boolean;
  eventRowSpan: number;
  applicationDocument: string;
  showApplicationDocument: boolean;
  applicationDocumentRowSpan: number;
  rating: string;
  showRating: boolean;
  ratingRowSpan: number;
  status: string;
  showStatus: boolean;
  statusRowSpan: number;
  attempt: string;
  attemptStatus: string | null;
  kindOfPractical: string;
  checkerName: string;
  score: string;
  examDate: string;
  file: string | null;
}

const { token } = useAuth();
const isFileModalOpen = ref(false);
const selectedFilePath = ref<string | null>(null);

const { data, status, error, refresh } = await useFetch<
  ScoreUserPracticalResponseItem[]
>(`http://${ip.ipBackEnd}/api/scoreUserPractical`, {
  headers: {
    Authorization: token.value ? `Bearer ${token.value}` : "",
  },
});

function formatScore(value: unknown): string {
  const score = Number(value);
  if (!Number.isFinite(score)) return "-";
  return Number.isInteger(score) ? String(score) : score.toFixed(2);
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
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

function getRatingRowCount(appRating?: AppRatingItem | null): number {
  const count = (appRating?.practicalTests || []).reduce(
    (sum, test) => sum + 1 + (test.recheckAttempts?.length || 0),
    0,
  );
  return Math.max(1, count);
}

function getApplicationDocumentRowCount(
  doc?: ApplicationDocItem | null,
): number {
  const ratings = doc?.appRatings || [];
  if (ratings.length === 0) return 1;
  return ratings.reduce((sum, rating) => sum + getRatingRowCount(rating), 0);
}

function getEventRowCount(
  item?: ScoreUserPracticalResponseItem | null,
): number {
  const docs = item?.applicationDocs || [];
  if (docs.length === 0) return 1;
  return docs.reduce(
    (sum, doc) => sum + getApplicationDocumentRowCount(doc),
    0,
  );
}

const rows = computed<PracticalExamRow[]>(() => {
  const payload = data.value || [];
  const result: PracticalExamRow[] = [];

  payload.forEach((item, itemIndex) => {
    const eventName = item.event?.event || "-";
    const docs = item.applicationDocs || [];
    const safeDocs =
      docs.length > 0 ? docs : [{ id: undefined, number: "-", appRatings: [] }];
    const eventRowSpan = getEventRowCount(item);
    let isFirstEventRow = true;

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
      const applicationDocumentRowSpan = getApplicationDocumentRowCount(doc);
      let isFirstApplicationDocumentRow = true;

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
                  kindOfPractical: { kind: "-" },
                  checkerGroup: { userChecker: { name: "-" } },
                },
              ];
        const ratingRowSpan = getRatingRowCount(appRating);

        let ratingRowIndex = 0;
        safeTests.forEach((test, testIndex) => {
          const attempts = [
            {
              id: `original-${test.id || testIndex}`,
              label: "Attempt 1",
              status: null,
              checkerName: test.checkerGroup?.userChecker?.name || "-",
              score: test.score,
              examDate: test.createdAt,
              file: test.file || null,
            },
            ...(test.recheckAttempts || []).map((attempt) => ({
              id: `recheck-${attempt.id}`,
              label: "Attempt 2 (Recheck)",
              status: attempt.authorization?.status || "ACTIVE",
              checkerName:
                attempt.checkerGroup?.userChecker?.name || "Unassigned",
              score: attempt.score,
              examDate: attempt.score == null ? null : attempt.updatedAt,
              file: attempt.file || null,
            })),
          ];

          attempts.forEach((attempt) => {
            result.push({
              id: `${itemIndex}-${docIndex}-${ratingIndex}-${attempt.id}`,
              no: itemIndex + 1,
              showNo: isFirstEventRow,
              noRowSpan: eventRowSpan,
              event: eventName,
              showEvent: isFirstEventRow,
              eventRowSpan,
              applicationDocument: documentNumber,
              showApplicationDocument: isFirstApplicationDocumentRow,
              applicationDocumentRowSpan,
              rating: ratingName,
              showRating: ratingRowIndex === 0,
              ratingRowSpan,
              status: ratingStatus,
              showStatus: ratingRowIndex === 0,
              statusRowSpan: ratingRowSpan,
              attempt: attempt.label,
              attemptStatus: attempt.status,
              kindOfPractical: test.kindOfPractical?.kind || "-",
              checkerName: attempt.checkerName,
              score: formatScore(attempt.score),
              examDate: formatDate(attempt.examDate),
              file: attempt.file,
            });

            isFirstEventRow = false;
            isFirstApplicationDocumentRow = false;
            ratingRowIndex += 1;
          });
        });
      });
    });
  });

  return result;
});

const errorMessage = computed(() => {
  if (!error.value) return "";
  const err = error.value as {
    data?: { message?: string };
    message?: string;
  };
  return (
    err.data?.message || err.message || "Failed to fetch practical exam data."
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
        <div
          v-if="status === 'pending'"
          class="flex items-center justify-center py-10 text-muted"
        >
          <UIcon name="i-lucide-loader-2" class="size-6 animate-spin mr-2" />
          Loading practical exam recap...
        </div>

        <div
          v-else-if="error"
          class="rounded-lg border border-error/30 bg-error/5 p-4 space-y-2"
        >
          <p class="font-medium text-error">{{ errorMessage }}</p>
          <UButton
            label="Retry"
            color="error"
            variant="outline"
            icon="i-lucide-refresh-cw"
            @click="refresh()"
          />
        </div>

        <UCard v-else>
          <template #header>
            <h2 class="text-lg font-semibold">Practical Exam Recap</h2>
          </template>

          <div class="overflow-x-auto rounded-lg border">
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
                    Event
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Application Document
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
                    Attempt
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Kind of Practical
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Checker Name
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Score
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Exam Date
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
                    v-if="row.showEvent"
                    class="px-3 py-2 border border-default align-middle"
                    :rowspan="row.eventRowSpan"
                  >
                    {{ row.event }}
                  </td>
                  <td
                    v-if="row.showApplicationDocument"
                    class="px-3 py-2 border border-default align-middle"
                    :rowspan="row.applicationDocumentRowSpan"
                  >
                    {{ row.applicationDocument }}
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
                        row.status === 'SUCCESS'
                          ? 'success'
                          : row.status === 'FAILED'
                            ? 'error'
                            : row.status === 'RECHECK'
                              ? 'warning'
                              : 'neutral'
                      "
                      variant="soft"
                    >
                      {{ row.status }}
                    </UBadge>
                  </td>
                  <td class="px-3 py-2 border border-default text-center">
                    <div class="flex flex-col items-center gap-1">
                      <span>{{ row.attempt }}</span>
                      <UBadge
                        v-if="row.attemptStatus"
                        :color="
                          row.attemptStatus === 'SUCCESS'
                            ? 'success'
                            : row.attemptStatus === 'FAILED'
                              ? 'error'
                              : 'warning'
                        "
                        variant="soft"
                        size="xs"
                      >
                        {{ row.attemptStatus }}
                      </UBadge>
                    </div>
                  </td>
                  <td class="px-3 py-2 border border-default text-center">
                    {{ row.kindOfPractical }}
                  </td>
                  <td class="px-3 py-2 border border-default text-center">
                    {{ row.checkerName }}
                  </td>
                  <td class="px-3 py-2 border border-default text-center">
                    {{ row.score }}
                  </td>
                  <td class="px-3 py-2 border border-default text-center">
                    {{ row.examDate }}
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
                    <span v-else>-</span>
                  </td>
                </tr>

                <tr v-if="rows.length === 0">
                  <td
                    class="px-3 py-3 text-muted border border-default"
                    colspan="11"
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
