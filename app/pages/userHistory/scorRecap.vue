<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface ScoreUserResponseItem {
  event?: {
    event?: string | null;
  } | null;
  applicationDocs?: Array<{
    id?: number;
    number?: string | null;
    appRatings?: Array<{
      id?: number;
      rating?: {
        rating?: string | null;
      } | null;
      finalScores?: Array<{
        id?: number;
        essayScore?: number | null;
        multipleChoiceScore?: number | null;
        finalScore?: number | null;
        status?: {
          status?: string | null;
        } | null;
      }> | null;
    }> | null;
  }> | null;
}

interface ScoreRecapRow {
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
  essayScore: string;
  mcScore: string;
  finalScore: string;
  status: string;
}

const { token } = useAuth();

const { data, status, error, refresh } = await useFetch<
  ScoreUserResponseItem[]
>(`${apiBaseUrl}/api/scoreUser`, {
  headers: {
    Authorization: token.value ? `Bearer ${token.value}` : "",
  },
});

function formatScore(value: unknown): string {
  const score = Number(value);
  if (!Number.isFinite(score)) return "-";
  return Number.isInteger(score) ? String(score) : score.toFixed(2);
}

function getRatingRowCount(
  appRating?: {
    finalScores?: Array<unknown> | null;
  } | null,
): number {
  const total = appRating?.finalScores?.length || 0;
  return Math.max(1, total);
}

function getApplicationDocumentRowCount(
  doc?: {
    appRatings?: Array<{ finalScores?: Array<unknown> | null }> | null;
  } | null,
): number {
  const ratings = doc?.appRatings || [];
  if (ratings.length === 0) return 1;
  return ratings.reduce((sum, rating) => sum + getRatingRowCount(rating), 0);
}

function getEventRowCount(item?: ScoreUserResponseItem | null): number {
  const docs = item?.applicationDocs || [];
  if (docs.length === 0) return 1;
  return docs.reduce(
    (sum, doc) => sum + getApplicationDocumentRowCount(doc),
    0,
  );
}

const rows = computed<ScoreRecapRow[]>(() => {
  const payload = data.value || [];
  const result: ScoreRecapRow[] = [];

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
          : [{ id: undefined, rating: { rating: "-" }, finalScores: [] }];
      const applicationDocumentRowSpan = getApplicationDocumentRowCount(doc);
      let isFirstApplicationDocumentRow = true;

      safeRatings.forEach((appRating, ratingIndex) => {
        const ratingName = appRating.rating?.rating || "-";
        const finalScores = appRating.finalScores || [];
        const safeFinalScores =
          finalScores.length > 0
            ? finalScores
            : [
                {
                  id: undefined,
                  essayScore: null,
                  multipleChoiceScore: null,
                  finalScore: null,
                  status: { status: "-" },
                },
              ];
        const ratingRowSpan = getRatingRowCount(appRating);

        safeFinalScores.forEach((score, scoreIndex) => {
          result.push({
            id: `${itemIndex}-${docIndex}-${ratingIndex}-${score.id || scoreIndex}`,
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
            showRating: scoreIndex === 0,
            ratingRowSpan,
            essayScore: formatScore(score.essayScore),
            mcScore: formatScore(score.multipleChoiceScore),
            finalScore: formatScore(score.finalScore),
            status: score.status?.status || "-",
          });
          isFirstEventRow = false;
          isFirstApplicationDocumentRow = false;
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
    err.data?.message || err.message || "Failed to fetch score recap data."
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
        <div
          v-if="status === 'pending'"
          class="flex items-center justify-center py-10 text-muted"
        >
          <UIcon name="i-lucide-loader-2" class="size-6 animate-spin mr-2" />
          Loading score recap...
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
            <h2 class="text-lg font-semibold">User Score Recap</h2>
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
                    Essay Score
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Multiple Choice Score
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Final Score
                  </th>
                  <th
                    class="px-3 py-2 text-center font-medium border border-default"
                  >
                    Status
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
                    class="px-3 py-2 text-center border border-default align-middle"
                    :rowspan="row.ratingRowSpan"
                  >
                    {{ row.rating }}
                  </td>
                  <td class="px-3 py-2 border text-center border-default">
                    {{ row.essayScore }}
                  </td>
                  <td class="px-3 py-2 border text-center border-default">
                    {{ row.mcScore }}
                  </td>
                  <td class="px-3 py-2 border text-center border-default">
                    {{ row.finalScore }}
                  </td>
                  <td class="px-3 py-2 border text-center border-default">
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
                </tr>

                <tr v-if="rows.length === 0">
                  <td
                    class="px-3 py-3 text-muted border border-default"
                    colspan="8"
                  >
                    No score recap data available.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
