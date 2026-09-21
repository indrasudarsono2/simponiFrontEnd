<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import ApplicationDocModal from "../../components/verification/ApplicationDocModal.vue";
import {
  CalendarDate,
  DateFormatter,
  getLocalTimeZone,
  parseDate,
} from "@internationalized/date";

interface BranchOption {
  id: number;
  branch?: string | null;
}

interface ScoreRecapRow {
  id: number;
  appRatingId?: number | null;
  hasEvidence?: boolean;
  scoreDate: string;
  branch?: BranchOption | null;
  user?: { nik?: string | null; name?: string | null } | null;
  event?: {
    event?: string | null;
    startDate?: string | null;
    finishDate?: string | null;
    passingGrade?: number | null;
  } | null;
  applicationDocument?: string | null;
  relatedDocuments?: RelatedDocuments | null;
  remarkDoc?: string | null;
  rating?: string | null;
  multipleChoiceScore?: number | null;
  essayScore?: number | null;
  theoryScore?: number | null;
  practicalScores?: Array<{
    attempt: number;
    kind?: string | null;
    score?: number | null;
    checker?: { nik?: string | null; name?: string | null } | null;
  }> | null;
  status?: string | null;
}

interface RelatedDocuments {
  applicationDocument: Record<string, any>;
  userData: Record<string, any>;
}

interface EvidenceItem {
  id: number;
  file?: string | null;
  createdAt?: string | null;
}

interface ScoreRecapResponse {
  branches: BranchOption[];
  professions: ProfessionOption[];
  events: ScoreRecapEvent[];
  rows: ScoreRecapRow[];
}

interface ProfessionOption {
  id: number;
  profession?: { id?: number; profession?: string | null } | null;
}

interface ScoreRecapEvent {
  id: number;
  event?: string | null;
  createdAt?: string | null;
}

const { token } = useAuth();
const toast = useToast();
const df = new DateFormatter("en-US", { dateStyle: "medium" });

function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = new Date();
const ALL_BRANCHES_ID = 0;
const startDate = ref(toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)));
const endDate = ref(toDateInput(today));
const selectedBranchId = ref<number | undefined>(ALL_BRANCHES_ID);
const selectedProfessionId = ref<number | undefined>();
const selectedEventIds = ref<number[]>([]);
const professions = ref<ProfessionOption[]>([]);
const events = ref<ScoreRecapEvent[]>([]);
const professionsLoading = ref(false);
const eventsLoading = ref(false);
const loading = ref(false);
const evidenceLoadingId = ref<number | null>(null);
const isEvidenceModalOpen = ref(false);
const evidenceItems = ref<EvidenceItem[]>([]);
const isRelatedDocumentsModalOpen = ref(false);
const selectedRelatedDocuments = ref<RelatedDocuments | null>(null);
const reportError = ref("");
const selectedStatus = ref<"SUCCESS" | "FAILED" | null>(null);
const ALL_FACET_VALUES = "__ALL__";
const selectedRemarkDoc = ref(ALL_FACET_VALUES);
const selectedRating = ref(ALL_FACET_VALUES);
let eventRequestId = 0;

function parseDateString(value: string): CalendarDate | null {
  if (!value) return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

function formatCalendarDate(value?: CalendarDate): string {
  if (!value) return "";
  return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

const dateRange = computed({
  get: () => ({
    start: parseDateString(startDate.value) ?? undefined,
    end: parseDateString(endDate.value) ?? undefined,
  }),
  set: (value: { start?: CalendarDate; end?: CalendarDate }) => {
    startDate.value = formatCalendarDate(value.start);
    endDate.value = formatCalendarDate(value.end);
  },
});

const { data, error: initialError } = await useFetch<ScoreRecapResponse>(
  `${apiBaseUrl}/api/pfcScore/scoreRecap`,
  {
    credentials: "include",
    headers: { Authorization: token.value ? `Bearer ${token.value}` : "" },
  },
);

const branches = computed(() => data.value?.branches || []);
const rows = computed(() => data.value?.rows || []);
const isAllBranches = computed(() => selectedBranchId.value === ALL_BRANCHES_ID);
const branchOptions = computed(() =>
  [
    { label: "All Branches", value: ALL_BRANCHES_ID },
    ...branches.value.map((branch) => ({
      label: branch.branch || `Branch ${branch.id}`,
      value: branch.id,
    })),
  ],
);
const eventOptions = computed(() =>
  events.value.map((event) => ({
    label: `${event.event || `Event ${event.id}`} (${formatDate(event.createdAt)})`,
    value: event.id,
  })),
);
const professionOptions = computed(() =>
  professions.value.map((item) => ({
    label: item.profession?.profession || `Profession ${item.id}`,
    value: item.id,
  })),
);

const passedCount = computed(
  () => rows.value.filter((row) => row.status?.toUpperCase() === "SUCCESS").length,
);
const failedCount = computed(
  () => rows.value.filter((row) => row.status?.toUpperCase() === "FAILED").length,
);
const remarkDocOptions = computed(() => {
  const availableRows = selectedRating.value === ALL_FACET_VALUES
    ? rows.value
    : rows.value.filter((row) => row.rating === selectedRating.value);
  const values = [...new Set(availableRows.map((row) => row.remarkDoc).filter((value): value is string => Boolean(value)))].sort();
  return [{ label: "All Remarks", value: ALL_FACET_VALUES }, ...values.map((value) => ({ label: value, value }))];
});
const ratingOptions = computed(() => {
  const availableRows = selectedRemarkDoc.value === ALL_FACET_VALUES
    ? rows.value
    : rows.value.filter((row) => row.remarkDoc === selectedRemarkDoc.value);
  const values = [...new Set(availableRows.map((row) => row.rating).filter((value): value is string => Boolean(value)))].sort();
  return [{ label: "All Ratings", value: ALL_FACET_VALUES }, ...values.map((value) => ({ label: value, value }))];
});
const filteredRows = computed(() => rows.value.filter((row) =>
  (!selectedStatus.value || row.status?.toUpperCase() === selectedStatus.value) &&
  (selectedRemarkDoc.value === ALL_FACET_VALUES || row.remarkDoc === selectedRemarkDoc.value) &&
  (selectedRating.value === ALL_FACET_VALUES || row.rating === selectedRating.value),
));
const representedBranches = computed(
  () => new Set(rows.value.map((row) => row.branch?.id).filter(Boolean)).size,
);

function formatScore(value?: number | null): string {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  return Number(value).toFixed(Number.isInteger(Number(value)) ? 0 : 2);
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function statusColor(status?: string | null) {
  const normalized = status?.toUpperCase();
  if (normalized === "SUCCESS") return "success";
  if (normalized === "FAILED") return "error";
  if (normalized?.includes("RECHECK")) return "warning";
  return "neutral";
}

function resolveEvidenceUrl(filePath?: string | null): string {
  if (!filePath) return "";
  if (/^https?:\/\//i.test(filePath)) return filePath;
  return `${apiBaseUrl}${filePath}`;
}

function openRelatedDocuments(row: ScoreRecapRow) {
  selectedRelatedDocuments.value = row.relatedDocuments || null;
  isRelatedDocumentsModalOpen.value = true;
}

function formatEvidenceTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

async function openEvidence(row: ScoreRecapRow) {
  if (!row.appRatingId || !row.hasEvidence) return;
  evidenceLoadingId.value = row.appRatingId;
  evidenceItems.value = [];
  isEvidenceModalOpen.value = true;
  try {
    const response = await $fetch<EvidenceItem[] | EvidenceItem>(
      `${apiBaseUrl}/api/scoreCheckerEvidance`,
      {
        method: "POST",
        credentials: "include",
        headers: { Authorization: token.value ? `Bearer ${token.value}` : "" },
        body: { appRatingId: row.appRatingId },
      },
    );
    evidenceItems.value = Array.isArray(response) ? response : [response];
  } catch (error: any) {
    toast.add({
      title: "Failed to load evidence",
      description: error?.data?.message || error?.message,
      color: "error",
    });
    isEvidenceModalOpen.value = false;
  } finally {
    evidenceLoadingId.value = null;
  }
}

function toggleStatusFilter(status: "SUCCESS" | "FAILED") {
  selectedStatus.value = selectedStatus.value === status ? null : status;
}

async function loadRecap() {
  if (!startDate.value || !endDate.value || selectedBranchId.value == null || !selectedProfessionId.value) {
    toast.add({ title: "Date range, branch, and profession are required", color: "warning" });
    return;
  }
  if (startDate.value > endDate.value) {
    toast.add({
      title: "Invalid date range",
      description: "Start date cannot be later than end date.",
      color: "error",
    });
    return;
  }
  if (!isAllBranches.value && selectedEventIds.value.length === 0) {
    toast.add({ title: "Select at least one event", color: "warning" });
    return;
  }

  loading.value = true;
  reportError.value = "";
  selectedRemarkDoc.value = ALL_FACET_VALUES;
  selectedRating.value = ALL_FACET_VALUES;
  selectedStatus.value = null;
  try {
    data.value = await $fetch<ScoreRecapResponse>(
      `${apiBaseUrl}/api/pfcScore/scoreRecap`,
      {
        credentials: "include",
        headers: { Authorization: token.value ? `Bearer ${token.value}` : "" },
        query: isAllBranches.value ? {
          mode: "scores",
          startDate: startDate.value,
          endDate: endDate.value,
          branchId: "all",
          professionId: selectedProfessionId.value,
        } : {
          mode: "scores",
          startDate: startDate.value,
          endDate: endDate.value,
          branchId: selectedBranchId.value,
          professionInBranchId: selectedProfessionId.value,
          eventIds: selectedEventIds.value.join(","),
        },
      },
    );
  } catch (error) {
    const value = error as { data?: { message?: string }; message?: string };
    reportError.value = value.data?.message || value.message || "Failed to load score recap.";
    toast.add({ title: "Failed to load score recap", color: "error" });
  } finally {
    loading.value = false;
  }
}

async function loadEvents() {
  const requestId = ++eventRequestId;
  events.value = [];
  selectedEventIds.value = [];
  if (isAllBranches.value) return;
  if (!startDate.value || !endDate.value || !selectedBranchId.value || !selectedProfessionId.value) return;
  if (startDate.value > endDate.value) return;

  eventsLoading.value = true;
  reportError.value = "";
  try {
    const response = await $fetch<ScoreRecapResponse>(
      `${apiBaseUrl}/api/pfcScore/scoreRecap`,
      {
        credentials: "include",
        headers: { Authorization: token.value ? `Bearer ${token.value}` : "" },
        query: {
          mode: "events",
          startDate: startDate.value,
          endDate: endDate.value,
          branchId: selectedBranchId.value,
          professionInBranchId: selectedProfessionId.value,
        },
      },
    );
    if (requestId === eventRequestId) events.value = response.events || [];
  } catch (error) {
    if (requestId !== eventRequestId) return;
    const value = error as { data?: { message?: string }; message?: string };
    reportError.value = value.data?.message || value.message || "Failed to load events.";
  } finally {
    if (requestId === eventRequestId) eventsLoading.value = false;
  }
}

async function loadProfessions() {
  professions.value = [];
  selectedProfessionId.value = undefined;
  selectedEventIds.value = [];
  events.value = [];
  if (selectedBranchId.value == null) return;

  professionsLoading.value = true;
  reportError.value = "";
  try {
    const response = await $fetch<ScoreRecapResponse>(
      `${apiBaseUrl}/api/pfcScore/scoreRecap`,
      {
        credentials: "include",
        headers: { Authorization: token.value ? `Bearer ${token.value}` : "" },
        query: {
          mode: "professions",
          branchId: isAllBranches.value ? "all" : selectedBranchId.value,
        },
      },
    );
    professions.value = response.professions || [];
  } catch (error) {
    const value = error as { data?: { message?: string }; message?: string };
    reportError.value = value.data?.message || value.message || "Failed to load professions.";
  } finally {
    professionsLoading.value = false;
  }
}

watch(selectedBranchId, loadProfessions, { immediate: true });
watch([startDate, endDate, selectedBranchId, selectedProfessionId], loadEvents);

const errorMessage = computed(() => {
  if (reportError.value) return reportError.value;
  const value = initialError.value as { data?: { message?: string }; message?: string } | null;
  return value?.data?.message || value?.message || "";
});
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Performance Check Score Recap">
        <template #leading><UDashboardSidebarCollapse /></template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UCard>
          <template #header>
            <div>
              <h2 class="font-semibold">Report Filter</h2>
              <p class="text-sm text-muted">Choose a date range, branch, and profession. For a specific branch, select one or more matching events.</p>
            </div>
          </template>

          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5 xl:items-end">
            <UFormField label="Date Range" required>
              <UPopover :content="{ align: 'start' }" :modal="true">
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-calendar"
                  class="w-full justify-between"
                >
                  <span class="truncate">
                    <template v-if="dateRange.start">
                      <template v-if="dateRange.end">
                        {{ df.format(dateRange.start.toDate(getLocalTimeZone())) }}
                        -
                        {{ df.format(dateRange.end.toDate(getLocalTimeZone())) }}
                      </template>
                      <template v-else>
                        {{ df.format(dateRange.start.toDate(getLocalTimeZone())) }}
                      </template>
                    </template>
                    <template v-else>Pick a date range</template>
                  </span>
                  <template #trailing>
                    <UIcon
                      name="i-lucide-chevron-down"
                      class="size-5 shrink-0 text-dimmed"
                    />
                  </template>
                </UButton>

                <template #content>
                  <UCalendar
                    v-model="dateRange"
                    class="p-2"
                    :number-of-months="2"
                    range
                  />
                </template>
              </UPopover>
            </UFormField>
            <UFormField label="Branch">
              <USelect
                v-model="selectedBranchId"
                :items="branchOptions"
                value-key="value"
                placeholder="Select branch"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Profession">
              <USelect
                v-model="selectedProfessionId"
                :items="professionOptions"
                value-key="value"
                placeholder="Select profession"
                :loading="professionsLoading"
                :disabled="selectedBranchId == null || professionsLoading"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Events">
              <USelect
                v-model="selectedEventIds"
                :items="eventOptions"
                value-key="value"
                placeholder="Select events"
                :loading="eventsLoading"
                :disabled="isAllBranches || !selectedProfessionId || eventsLoading"
                multiple
                class="w-full"
              />
              <p v-if="isAllBranches" class="mt-1 text-xs text-muted">
                All matching events will be included.
              </p>
            </UFormField>
            <UButton
              label="Show Recap"
              icon="i-lucide-search"
              :loading="loading"
              block
              @click="loadRecap"
            />
          </div>
        </UCard>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UCard><p class="text-sm text-muted">Total Results</p><p class="text-2xl font-semibold">{{ rows.length }}</p></UCard>
          <UCard><p class="text-sm text-muted">Branches</p><p class="text-2xl font-semibold">{{ representedBranches }}</p></UCard>
          <UCard
            class="cursor-pointer transition hover:ring-2 hover:ring-success/40"
            :class="selectedStatus === 'SUCCESS' ? 'ring-2 ring-success' : ''"
            role="button"
            tabindex="0"
            :aria-pressed="selectedStatus === 'SUCCESS'"
            @click="toggleStatusFilter('SUCCESS')"
            @keydown.enter.prevent="toggleStatusFilter('SUCCESS')"
            @keydown.space.prevent="toggleStatusFilter('SUCCESS')"
          >
            <p class="text-sm text-muted">Passed</p><p class="text-2xl font-semibold text-success">{{ passedCount }}</p>
          </UCard>
          <UCard
            class="cursor-pointer transition hover:ring-2 hover:ring-error/40"
            :class="selectedStatus === 'FAILED' ? 'ring-2 ring-error' : ''"
            role="button"
            tabindex="0"
            :aria-pressed="selectedStatus === 'FAILED'"
            @click="toggleStatusFilter('FAILED')"
            @keydown.enter.prevent="toggleStatusFilter('FAILED')"
            @keydown.space.prevent="toggleStatusFilter('FAILED')"
          >
            <p class="text-sm text-muted">Failed</p><p class="text-2xl font-semibold text-error">{{ failedCount }}</p>
          </UCard>
        </div>

        <UCard v-if="rows.length">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Remark Document">
              <USelect
                v-model="selectedRemarkDoc"
                :items="remarkDocOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Rating">
              <USelect
                v-model="selectedRating"
                :items="ratingOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>

        <div v-if="errorMessage" class="rounded-lg border border-error/30 bg-error/5 p-4 text-error">
          {{ errorMessage }}
        </div>

        <UCard v-else>
          <template #header><h2 class="font-semibold">Score Recap</h2></template>
          <div class="overflow-x-auto rounded-lg border border-default">
            <table class="min-w-[1280px] w-full border-collapse text-sm">
              <thead class="bg-muted/40">
                <tr>
                  <th class="border border-default px-3 py-2 text-center">No</th>
                  <th class="border border-default px-3 py-2 text-center">Score Date</th>
                  <th class="border border-default px-3 py-2 text-center">Branch</th>
                  <th class="border border-default px-3 py-2 text-center">NIK</th>
                  <th class="border border-default px-3 py-2 text-center">Name</th>
                  <th class="border border-default px-3 py-2 text-center">Event</th>
                  <th class="border border-default px-3 py-2 text-center">Application Document</th>
                  <th class="border border-default px-3 py-2 text-center">Rating</th>
                  <th class="border border-default px-3 py-2 text-center">MC</th>
                  <th class="border border-default px-3 py-2 text-center">Essay</th>
                  <th class="border border-default px-3 py-2 text-center">Theory</th>
                  <th class="border border-default px-3 py-2 text-center">Practical Scores and Checkers</th>
                  <th class="border border-default px-3 py-2 text-center">Status</th>
                  <th class="border border-default px-3 py-2 text-center">Evidence</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in filteredRows" :key="row.id">
                  <td class="border border-default px-3 py-2 text-center">{{ index + 1 }}</td>
                  <td class="border border-default px-3 py-2 text-center">{{ formatDate(row.scoreDate) }}</td>
                  <td class="border border-default px-3 py-2">{{ row.branch?.branch || '-' }}</td>
                  <td class="border border-default px-3 py-2 text-center">{{ row.user?.nik || '-' }}</td>
                  <td class="border border-default px-3 py-2">{{ row.user?.name || '-' }}</td>
                  <td class="border border-default px-3 py-2">{{ row.event?.event || '-' }}</td>
                  <td class="border border-default px-3 py-2 text-center">{{ row.applicationDocument || '-' }}</td>
                  <td class="border border-default px-3 py-2 text-center">{{ row.rating || '-' }}</td>
                  <td class="border border-default px-3 py-2 text-center">{{ formatScore(row.multipleChoiceScore) }}</td>
                  <td class="border border-default px-3 py-2 text-center">{{ formatScore(row.essayScore) }}</td>
                  <td class="border border-default px-3 py-2 text-center">{{ formatScore(row.theoryScore) }}</td>
                  <td class="border border-default px-3 py-2">
                    <div
                      v-if="row.practicalScores?.length"
                      class="min-w-64 space-y-2"
                    >
                      <div
                        v-for="(practical, practicalIndex) in row.practicalScores"
                        :key="`${row.id}-${practical.attempt}-${practicalIndex}`"
                        class="rounded-md border border-default bg-muted/20 p-2"
                      >
                        <div class="flex items-center justify-between gap-3">
                          <span class="font-medium">{{ practical.kind || 'Practical' }}</span>
                          <UBadge
                            :color="practical.attempt === 2 ? 'warning' : 'neutral'"
                            variant="soft"
                            size="xs"
                          >
                            Attempt {{ practical.attempt }}
                          </UBadge>
                        </div>
                        <div class="mt-1 text-sm">
                          <span class="font-medium">Score:</span>
                          {{ formatScore(practical.score) }}
                        </div>
                        <div class="text-xs text-muted">
                          Checker: {{ practical.checker?.name || '-' }}
                          <span v-if="practical.checker?.nik">
                            ({{ practical.checker.nik }})
                          </span>
                        </div>
                      </div>
                    </div>
                    <span v-else class="block text-center">-</span>
                  </td>
                  <td class="border border-default px-3 py-2 text-center">
                    <UBadge :color="statusColor(row.status)" variant="soft">{{ row.status || '-' }}</UBadge>
                  </td>
                  <td class="border border-default px-3 py-2 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <UButton
                        v-if="row.hasEvidence"
                        icon="i-lucide-eye"
                        color="primary"
                        variant="soft"
                        size="xs"
                        :loading="evidenceLoadingId === row.appRatingId"
                        aria-label="View evidence"
                        @click="openEvidence(row)"
                      />
                      <UButton
                        v-if="row.relatedDocuments"
                        icon="i-lucide-folder-search"
                        color="neutral"
                        variant="soft"
                        size="xs"
                        aria-label="View related documents"
                        @click="openRelatedDocuments(row)"
                      />
                      <span v-if="!row.hasEvidence && !row.relatedDocuments">-</span>
                    </div>
                  </td>
                </tr>
                <tr v-if="filteredRows.length === 0">
                  <td colspan="14" class="border border-default px-3 py-8 text-center text-muted">
                    {{ selectedStatus
                      ? `No ${selectedStatus === 'SUCCESS' ? 'passed' : 'failed'} scores were found.`
                      : 'No scores were found for the selected period and branch.' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>

        <UModal v-model:open="isEvidenceModalOpen" title="Evidence" :ui="{ content: 'max-w-4xl w-full' }">
          <template #body>
            <div v-if="evidenceLoadingId" class="flex items-center justify-center gap-2 py-10 text-muted">
              <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
              Loading evidence...
            </div>
            <div v-else-if="evidenceItems.length" class="grid grid-cols-1 gap-3 md:grid-cols-2 max-h-[65vh] overflow-auto">
              <a
                v-for="item in evidenceItems"
                :key="item.id"
                :href="resolveEvidenceUrl(item.file)"
                target="_blank"
                rel="noopener noreferrer"
                class="block rounded-lg border border-default bg-muted/20 p-2"
              >
                <img :src="resolveEvidenceUrl(item.file)" :alt="`Evidence ${item.id}`" class="h-56 w-full rounded-md object-cover" />
                <p class="mt-2 text-xs text-muted">Time: {{ formatEvidenceTime(item.createdAt) }}</p>
              </a>
            </div>
            <p v-else class="text-sm text-muted">No evidence data.</p>
          </template>
        </UModal>

        <div
          v-if="isRelatedDocumentsModalOpen && selectedRelatedDocuments"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            class="absolute inset-0 bg-black/50 backdrop-blur-sm"
            @click="isRelatedDocumentsModalOpen = false"
          />
          <div class="relative w-full max-w-[95vw] h-full max-h-[90vh]">
            <ApplicationDocModal
              :is-open="true"
              :application-doc="selectedRelatedDocuments.applicationDocument"
              :user-data="selectedRelatedDocuments.userData"
              @close="isRelatedDocumentsModalOpen = false"
            />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
