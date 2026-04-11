<script setup lang="ts">
import ip from "../../utils/config.json";

interface AppRatingItem {
  id: number;
  statusId?: number;
  rating?: {
    id: number;
    rating: string;
    description?: string;
  } | null;
}

interface ApplicationDocsItem {
  id: number;
  appRatings?: AppRatingItem[];
}

interface EventUserItem {
  id: number;
  applicationDocs?: ApplicationDocsItem | null;
  applicationDoc?: ApplicationDocsItem | null;
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

interface TableRow {
  no: number;
  appRatingId: number;
  statusId: number;
  rating: string;
  quantity: number;
  persentage: number;
  minutes: number;
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

const { data, status, error, refresh } = await useFetch<ExaminationResponse>(
  `http://${ip.ipBackEnd}/api/examination`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const eventData = computed(() => data.value?.event || null);

const appRatings = computed<AppRatingItem[]>(() => {
  const eventUser = eventData.value?.eventUsers?.[0];
  return (
    eventUser?.applicationDocs?.appRatings ||
    eventUser?.applicationDoc?.appRatings ||
    []
  );
});

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
  ],
  ([fetchStatus, hasValidRange, isInRange]) => {
    if (fetchStatus !== "success") return;
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
  }));
}

async function handleAction(row: TableRow, question: EventQuestionItem) {
  if (isMultipleChoiceQuestion(question)) {
    toast.add({
      title: "Not Available",
      description: "Multiple choice examination action is not configured yet.",
      color: "warning",
    });
    return;
  }

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

    const essayPayload = await $fetch<ExaminationEssayResponse>(
      `http://${ip.ipBackEnd}/api/examinationEssay`,
      {
        method: "POST",
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

    await navigateTo({
      path: "/examination/essay",
      query: {
        eventId: String(eventId),
        appRatingId: String(row.appRatingId),
      },
    });
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error?.data?.message || "Failed to start essay examination",
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
  const statusId = Number(row.statusId || 0);
  if (isMultipleChoiceQuestion(question)) {
    return statusId === 4;
  }
  return statusId === 1;
}
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

        <div v-else-if="!eventData" class="rounded-lg border p-4 text-muted">
          No examination event data available.
        </div>

        <template v-else>
          <div
            v-if="!roomTimeWindow.hasValidRange || !roomTimeWindow.isInRange"
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
                      <UButton
                        v-if="canShowGoButton(question, row)"
                        label="Go"
                        size="md"
                        icon="i-lucide-plane"
                        color="primary"
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
                    <td class="px-3 py-3 text-muted" colspan="6">
                      No app ratings found for this question.
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
</template>
