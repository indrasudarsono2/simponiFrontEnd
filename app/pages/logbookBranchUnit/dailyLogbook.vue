<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

const { token } = useAuth();
const toast = useToast();

// ── Date ──
const selectedDate = ref("");
const loading = ref(false);
const dutyReports = ref<DutyReport[]>([]);

// ── TAB ──
const selectedShiftNameId = ref<number | undefined>(undefined);

interface DutyReport {
  id: number;
  shiftDate: string;
  onGoingIssue: any;
  onGoingIssueLinks?: {
    id: number;
    attachedAt: string;
    onGoingIssue: any;
  }[];
  spv: { name: string } | null;
  supervisorCwp: {
    supervisor: string;
    cwpSupervisors: {
      cwp: {
        cwp: string;
        rating: { rating: string } | null;
        cwpFrequencies: { id: number; frequency: string; isPrimary: boolean }[];
      };
    }[];
  } | null;
  shiftName: {
    id: number;
    shift: string;
    shifts: {
      id: number;
      start: string;
      end: string;
      duration: number;
      isControl: boolean;
    }[];
  } | null;
  statusFrequencies: {
    id: number;
    statusFreq: { status: string } | null;
    remark: string | null;
    cwpFrequency: {
      id: number;
      frequency: string;
      isPrimary: boolean;
      cwp: { cwp: string } | null;
    } | null;
  }[];
  logBooks: {
    id: number;
    userNik: string;
    timeIn: string | null;
    timeOut: string | null;
    duration: number | null;
    isFinal: boolean;
    user: { nik: string; name: string } | null;
    supervisorLogBook: { nik: string; name: string } | null;
    shift: {
      id: number;
      start: string | null;
      end: string | null;
      duration: number | null;
      shiftName: { id: number; shift: string } | null;
    } | null;
    cwp: {
      id: number;
      cwp: string;
      rating: { id: number; rating: string } | null;
    } | null;
  }[];
  lhdReports?: {
    id: number;
    time: string | null;
    message: string | null;
    lhdBook: {
      id: number;
      code: string | null;
      lhd: string | null;
    } | null;
  }[];
  otherReports?: {
    id: number;
    time: string | null;
    report: string | null;
  }[];
}

// ── Shift Tabs ──
const shiftTabs = computed(() => {
  const shifts = new Map<number, DutyReport["shiftName"]>();

  for (const report of dutyReports.value) {
    if (report.shiftName?.id) shifts.set(report.shiftName.id, report.shiftName);
  }

  return Array.from(shifts.values()).map((shiftName) => ({
    label: formatShiftLabel(shiftName),
    value: shiftName?.id,
  }));
});

// ── Selected Duty Report ──
const selectedReports = computed(() =>
  dutyReports.value.filter(
    (report) => report.shiftName?.id === selectedShiftNameId.value,
  ),
);

// ── Recap Data Rows ──
const recapRows = computed(() => {
  return selectedReports.value;
});

// ── Position Log Rows ──
const positionLogRows = computed(() => {
  return selectedReports.value.flatMap((report) => report.logBooks || []);
});

const lhdReportRows = computed(() =>
  selectedReports.value.flatMap((dutyReport) =>
    (dutyReport.lhdReports || []).map((lhdReport) => ({
      dutyReport,
      lhdReport,
    })),
  ),
);

const otherReportRows = computed(() =>
  selectedReports.value.flatMap((dutyReport) =>
    (dutyReport.otherReports || []).map((otherReport) => ({
      dutyReport,
      otherReport,
    })),
  ),
);

// ── Frequency Status Rows (with rowspan metadata) ──
const frequencyStatusRows = computed(() => {
  const rows: any[] = [];

  for (const report of selectedReports.value) {
    const cwpSupervisors = report.supervisorCwp?.cwpSupervisors || [];

    for (const cs of cwpSupervisors) {
      const cwp = cs.cwp;
      if (!cwp) continue;
      for (const freq of cwp.cwpFrequencies || []) {
        const matchedStatus = (report.statusFrequencies || []).find(
          (sf) => sf.cwpFrequency?.id === freq.id,
        );
        rows.push({
          dutyReportId: report.id,
          cwp: cwp.cwp,
          rating: cwp.rating?.rating || null,
          frequency: freq.frequency,
          isPrimary: freq.isPrimary,
          status: matchedStatus?.statusFreq?.status || null,
          remark: matchedStatus?.remark || null,
        });
      }
    }
  }

  // Calculate rowspan for CWP and Rating columns, and assign group numbers
  let i = 0;
  let groupNo = 1;
  while (i < rows.length) {
    const currentGroup = `${rows[i].dutyReportId}-${rows[i].cwp}`;
    let span = 1;
    while (
      i + span < rows.length &&
      `${rows[i + span].dutyReportId}-${rows[i + span].cwp}` === currentGroup
    ) {
      span++;
    }
    rows[i]._rowspanCwp = span;
    rows[i]._isFirstInGroup = true;
    rows[i]._groupNo = groupNo;
    for (let j = 1; j < span; j++) {
      rows[i + j]._rowspanCwp = 0;
      rows[i + j]._isFirstInGroup = false;
    }
    i += span;
    groupNo++;
  }

  return rows;
});

// ── Watch tabs ──
watch(shiftTabs, (nextTabs) => {
  if (!nextTabs.length) {
    selectedShiftNameId.value = undefined;
    return;
  }
  const hasSelected = nextTabs.some(
    (tab) => tab.value === selectedShiftNameId.value,
  );
  if (!hasSelected) selectedShiftNameId.value = nextTabs[0]?.value;
});

// ── Formatters ──
function formatShiftLabel(
  shiftName: {
    id: number;
    shift: string;
    shifts: { start: string; end: string }[];
  } | null,
) {
  if (!shiftName) return "-";
  const shifts = shiftName.shifts || [];
  const firstShift = shifts[0];
  const lastShift = shifts[shifts.length - 1];
  const startTime = formatTimeOnly(firstShift?.start);
  const endTime = formatTimeOnly(lastShift?.end);
  return `${shiftName.shift || "Shift"} (${startTime}-${endTime} UTC)`;
}

function formatTimeOnly(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatSupervisorCwps(supervisorCwp: DutyReport["supervisorCwp"]) {
  const cwpRows = supervisorCwp?.cwpSupervisors || [];
  if (!cwpRows.length) return "-";
  return cwpRows.map((row) => row.cwp?.cwp || "-").join(", ");
}

function formatDisplayDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value + "T12:00:00Z");
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return `${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
    timeZone: "UTC",
  }).format(date)} UTC`;
}

function formatUtcTime(value?: string | null) {
  if (!value) return "-";
  const trimmed = String(value).trim();

  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} UTC`;
    }
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return "-";

  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes} UTC`;
}

function getRelatedOnGoingIssues(report: DutyReport) {
  const linkedIssues = (report.onGoingIssueLinks || []).map((link) => ({
    issue: link.onGoingIssue,
    attachedAt: link.attachedAt,
  }));
  if (linkedIssues.length) return linkedIssues;
  return report.onGoingIssue
    ? [{ issue: report.onGoingIssue, attachedAt: null }]
    : [];
}

function formatOnGoingIssue(issue: any) {
  return issue.equipment?.equipment || issue.other || `Issue ${issue.id}`;
}

function formatDuration(value?: number | null) {
  if (value === null || value === undefined) return "-";
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

// ── Load ──
async function loadDailyLogbook() {
  if (!selectedDate.value) {
    toast.add({
      title: "Date Required",
      description: "Please choose a date first.",
      color: "warning",
    });
    return;
  }

  loading.value = true;

  try {
    const response = await $fetch<{ dailyReport: DutyReport[] }>(
      `${apiBaseUrl}/api/dailyLogbook?date=${selectedDate.value}`,
      {
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );
    dutyReports.value = response.dailyReport;
    selectedShiftNameId.value = shiftTabs.value[0]?.value;

    toast.add({
      title: "Loaded",
      description: "Daily logbook data has been loaded.",
      color: "success",
    });
  } catch (error: any) {
    toast.add({
      title: "Load Failed",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to load daily logbook.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UDashboardPanel id="daily-logbook">
    <template #header>
      <UDashboardNavbar title="Daily Logbook">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <!-- Date Picker Card -->
        <UCard>
          <template #header>
            <div class="flex flex-col gap-1">
              <h2 class="font-semibold text-highlighted">Select Date</h2>
              <p class="text-sm text-muted">
                Choose the date to view daily logbook data.
              </p>
            </div>
          </template>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <UFormField label="Date" required>
              <UInput v-model="selectedDate" type="date" class="w-full" />
            </UFormField>

            <div class="rounded-lg border border-default bg-elevated/30 p-3">
              <div class="text-xs uppercase text-muted">Selected Date</div>
              <div class="font-medium text-highlighted">
                {{ formatDisplayDate(selectedDate) }}
              </div>
            </div>
          </div>

          <div class="mt-4">
            <UButton
              label="Load Data"
              icon="i-lucide-search"
              color="primary"
              :loading="loading"
              :disabled="!selectedDate"
              @click="loadDailyLogbook"
            />
          </div>
        </UCard>

        <!-- Loading State -->
        <div v-if="loading" class="py-8 text-center text-muted">
          Loading daily logbook data...
        </div>

        <!-- Empty State -->
        <div
          v-else-if="!dutyReports.length"
          class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
        >
          Choose date and click Load Data to show daily logbook.
        </div>

        <!-- Data Loaded -->
        <template v-else>
          <!-- Shift Tabs -->
          <UTabs
            v-if="shiftTabs.length"
            v-model="selectedShiftNameId"
            :items="shiftTabs"
            :content="false"
            size="lg"
          />

          <!-- No shift selected -->
          <div
            v-if="!recapRows.length"
            class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
          >
            No shift data available.
          </div>

          <template v-else>
            <!-- 1. Recap Data UCard -->
            <UCard>
              <template #header>
                <div class="flex flex-col gap-1">
                  <h2 class="font-semibold text-highlighted">Recap Data</h2>
                  <p class="text-sm text-muted">
                    Duty report recap for the selected shift.
                  </p>
                </div>
              </template>

              <div class="overflow-x-auto rounded-lg border border-default">
                <table class="min-w-full border-collapse text-sm">
                  <thead class="bg-elevated/50">
                    <tr>
                      <th class="border border-default px-4 py-3 text-left">
                        No
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Supervisor Assignment
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Shift
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        On Going Issue
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Supervisor
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Shift Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, index) in recapRows" :key="row.id">
                      <td class="border border-default px-4 py-3 align-top">
                        {{ index + 1 }}
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        <div class="font-medium text-highlighted">
                          {{ row.supervisorCwp?.supervisor || "-" }}
                        </div>
                        <div class="text-xs text-muted">
                          {{ formatSupervisorCwps(row.supervisorCwp) }}
                        </div>
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        {{ formatShiftLabel(row.shiftName) }}
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        <div
                          v-if="getRelatedOnGoingIssues(row).length"
                          class="min-w-64 space-y-3"
                        >
                          <div
                            v-for="related in getRelatedOnGoingIssues(row)"
                            :key="related.issue.id"
                            class="rounded-lg border border-default bg-elevated/30 p-3"
                          >
                            <div class="flex items-start justify-between gap-2">
                              <div class="font-medium text-highlighted">
                                {{ formatOnGoingIssue(related.issue) }}
                              </div>
                              <UBadge
                                :color="
                                  related.issue.isClosed ? 'neutral' : 'warning'
                                "
                                variant="soft"
                                size="xs"
                              >
                                {{ related.issue.isClosed ? "Closed" : "Active" }}
                              </UBadge>
                            </div>

                            <div
                              v-if="
                                related.issue.equipment?.equipment &&
                                related.issue.other
                              "
                              class="mt-1 text-xs text-muted"
                            >
                              {{ related.issue.other }}
                            </div>

                            <div class="mt-2 space-y-1 text-xs text-muted">
                              <div>
                                Reporter:
                                {{ related.issue.reporterUser?.name || "-" }}
                              </div>
                              <div>
                                Started: {{ formatDateTime(related.issue.start) }}
                              </div>
                              <div v-if="related.attachedAt">
                                Linked to report:
                                {{ formatDateTime(related.attachedAt) }}
                              </div>
                              <div v-if="related.issue.messages?.[0]">
                                Latest update:
                                {{ related.issue.messages[0].message || "-" }}
                              </div>
                            </div>
                          </div>
                        </div>
                        <span v-else>-</span>
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        {{ row.spv?.name || "-" }}
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        {{ formatDisplayDate(row.shiftDate) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </UCard>

            <!-- 2. Position Log UCard -->
            <UCard>
              <template #header>
                <div class="flex flex-col gap-1">
                  <h2 class="font-semibold text-highlighted">Position Log</h2>
                  <p class="text-sm text-muted">
                    Logbook entries for the selected shift.
                  </p>
                </div>
              </template>

              <div
                v-if="!positionLogRows.length"
                class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
              >
                No logbook entries found for this shift.
              </div>

              <div
                v-else
                class="overflow-x-auto rounded-lg border border-default"
              >
                <table class="min-w-full border-collapse text-sm">
                  <thead class="bg-elevated/50">
                    <tr>
                      <th class="border border-default px-4 py-3 text-center">
                        No
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        User
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        CWP
                      </th>
                      <th class="border border-default px-4 py-3 text-center">
                        Time In
                      </th>
                      <th class="border border-default px-4 py-3 text-center">
                        Time Out
                      </th>
                      <th class="border border-default px-4 py-3 text-center">
                        Duration
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Rating
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Supervisor
                      </th>
                      <th class="border border-default px-4 py-3 text-center">
                        Final
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, index) in positionLogRows" :key="row.id">
                      <td class="border border-default px-4 py-3 text-center">
                        {{ index + 1 }}
                      </td>
                      <td class="border border-default px-4 py-3">
                        <div class="font-medium">
                          {{ row.user?.name || "-" }}
                        </div>
                        <div class="text-xs text-muted">
                          {{ row.user?.nik || "-" }}
                        </div>
                      </td>
                      <td class="border border-default px-4 py-3">
                        {{ row.cwp?.cwp || "-" }}
                      </td>
                      <td class="border border-default px-4 py-3 text-center">
                        {{ formatUtcTime(row.timeIn) }}
                      </td>
                      <td class="border border-default px-4 py-3 text-center">
                        {{ formatUtcTime(row.timeOut) }}
                      </td>
                      <td class="border border-default px-4 py-3 text-center">
                        {{ formatDuration(row.duration) }}
                      </td>
                      <td class="border border-default px-4 py-3">
                        {{ row.cwp?.rating?.rating || "-" }}
                      </td>
                      <td class="border border-default px-4 py-3">
                        {{ row.supervisorLogBook?.name || "-" }}
                      </td>
                      <td class="border border-default px-4 py-3 text-center">
                        <UBadge
                          :color="row.isFinal ? 'success' : 'warning'"
                          variant="soft"
                          size="sm"
                        >
                          {{ row.isFinal ? "Yes" : "No" }}
                        </UBadge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </UCard>

            <!-- 3. Frequency Status UCard -->
            <UCard>
              <template #header>
                <div class="flex flex-col gap-1">
                  <h2 class="font-semibold text-highlighted">
                    Frequency Status
                  </h2>
                  <p class="text-sm text-muted">
                    CWP frequency status for the selected shift.
                  </p>
                </div>
              </template>

              <div
                v-if="!frequencyStatusRows.length"
                class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
              >
                No frequency status data found for this shift.
              </div>

              <div
                v-else
                class="overflow-x-auto rounded-lg border border-default"
              >
                <table class="min-w-full border-collapse text-sm">
                  <thead class="bg-elevated/50">
                    <tr>
                      <th class="border border-default px-4 py-3 text-center">
                        No
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        CWP
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Rating
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Frequency
                      </th>
                      <th class="border border-default px-4 py-3 text-center">
                        Primary
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Status
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Remark
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(row, index) in frequencyStatusRows"
                      :key="index"
                    >
                      <td
                        v-if="row._isFirstInGroup"
                        :rowspan="row._rowspanCwp"
                        class="border border-default px-4 py-3 text-center align-top"
                      >
                        {{ row._groupNo }}
                      </td>
                      <td
                        v-if="row._isFirstInGroup"
                        :rowspan="row._rowspanCwp"
                        class="border border-default px-4 py-3 font-medium align-top"
                      >
                        {{ row.cwp || "-" }}
                      </td>
                      <td
                        v-if="row._isFirstInGroup"
                        :rowspan="row._rowspanCwp"
                        class="border border-default px-4 py-3 align-top"
                      >
                        {{ row.rating || "-" }}
                      </td>
                      <td class="border border-default px-4 py-3">
                        {{ row.frequency || "-" }}
                      </td>
                      <td class="border border-default px-4 py-3 text-center">
                        <UBadge
                          :color="row.isPrimary ? 'success' : 'neutral'"
                          variant="soft"
                          size="sm"
                        >
                          {{ row.isPrimary ? "Yes" : "No" }}
                        </UBadge>
                      </td>
                      <td class="border border-default px-4 py-3">
                        <UBadge
                          v-if="row.status"
                          :color="
                            row.status === 'OPEN'
                              ? 'warning'
                              : row.status === 'CLOSED'
                                ? 'success'
                                : 'neutral'
                          "
                          variant="soft"
                          size="sm"
                        >
                          {{ row.status }}
                        </UBadge>
                        <span v-else>-</span>
                      </td>
                      <td
                        class="border border-default px-4 py-3 text-muted"
                        v-html="row.remark || '-'"
                      ></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </UCard>

            <!-- 4. LHD Report UCard -->
            <UCard>
              <template #header>
                <div class="flex flex-col gap-1">
                  <h2 class="font-semibold text-highlighted">LHD Report</h2>
                  <p class="text-sm text-muted">
                    Large Heading Deviation occurrences for the selected shift.
                  </p>
                </div>
              </template>

              <div
                v-if="!lhdReportRows.length"
                class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
              >
                No LHD occurrence found for this shift.
              </div>

              <div
                v-else
                class="overflow-x-auto rounded-lg border border-default"
              >
                <table class="min-w-full border-collapse text-sm">
                  <thead class="bg-elevated/50">
                    <tr>
                      <th class="border border-default px-4 py-3 text-left">
                        No
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Supervisor / CWP
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        ICAO Code
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        LHD Classification
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Occurrence Time
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="({ dutyReport, lhdReport }, index) in lhdReportRows"
                      :key="lhdReport.id"
                    >
                      <td class="border border-default px-4 py-3 align-top">
                        {{ index + 1 }}
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        <div class="font-medium text-highlighted">
                          {{ dutyReport.spv?.name || "-" }}
                        </div>
                        <div class="text-xs text-muted">
                          {{ formatSupervisorCwps(dutyReport.supervisorCwp) }}
                        </div>
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        <UBadge color="neutral" variant="soft">
                          {{ lhdReport.lhdBook?.code || "-" }}
                        </UBadge>
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        {{ lhdReport.lhdBook?.lhd || "-" }}
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        {{ formatDateTime(lhdReport.time) }}
                      </td>
                      <td
                        class="border border-default px-4 py-3 align-top whitespace-pre-wrap text-muted"
                      >
                        {{ lhdReport.message || "-" }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </UCard>

            <!-- 5. Other Report UCard -->
            <UCard>
              <template #header>
                <div class="flex flex-col gap-1">
                  <h2 class="font-semibold text-highlighted">Other Report</h2>
                  <p class="text-sm text-muted">
                    Other operational reports for the selected shift.
                  </p>
                </div>
              </template>

              <div
                v-if="!otherReportRows.length"
                class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
              >
                No other report found for this shift.
              </div>

              <div
                v-else
                class="overflow-x-auto rounded-lg border border-default"
              >
                <table class="min-w-full border-collapse text-sm">
                  <thead class="bg-elevated/50">
                    <tr>
                      <th class="border border-default px-4 py-3 text-left">
                        No
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Supervisor / CWP
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Report Time
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Report
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="({ dutyReport, otherReport }, index) in otherReportRows"
                      :key="otherReport.id"
                    >
                      <td class="border border-default px-4 py-3 align-top">
                        {{ index + 1 }}
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        <div class="font-medium text-highlighted">
                          {{ dutyReport.spv?.name || "-" }}
                        </div>
                        <div class="text-xs text-muted">
                          {{ formatSupervisorCwps(dutyReport.supervisorCwp) }}
                        </div>
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        {{ formatDateTime(otherReport.time) }}
                      </td>
                      <td
                        class="border border-default px-4 py-3 align-top whitespace-pre-wrap text-muted"
                      >
                        {{ otherReport.report || "-" }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </UCard>
          </template>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
