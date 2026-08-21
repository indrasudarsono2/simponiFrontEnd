<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface ShiftDetail {
  id: number;
  start: string | null;
  end: string | null;
  isControl: boolean;
}

interface ShiftName {
  id: number;
  shift: string | null;
  shifts: ShiftDetail[];
}

interface Rating {
  id: number;
  rating: string | null;
}

interface CwpFrequency {
  id: number;
  cwpId: number | null;
  frequency: string | null;
  isPrimary: boolean | null;
  statusFrequencies?: StatusFrequency[];
}

interface Cwp {
  id: number;
  cwp: string | null;
  rating: Rating | null;
  cwpFrequencies?: CwpFrequency[];
}

interface CwpSupervisor {
  id: number;
  cwpId: number | null;
  supervisorId: number | null;
  cwp: Cwp | null;
}

interface SupervisorDefinition {
  id: number;
  supervisor: string | null;
  cwpSupervisors: CwpSupervisor[];
}

interface SupervisorUser {
  nik: string | null;
  name: string | null;
}

interface StatusFreqOption {
  id: number;
  status: string | null;
}

interface StatusFrequency {
  id: number;
  dutyReportId: number | null;
  cwpFrequencyId: number | null;
  statusFreqId: number | null;
  remark: string | null;
  statusFreq: StatusFreqOption | null;
}

interface DutyReport {
  id: number;
  supervisorId: number | null;
  shiftNameId: number | null;
  supervisor: string | null;
  others: string | null;
  shiftDate: string | null;
  supervisorCwp: SupervisorDefinition | null;
  shiftName: ShiftName | null;
  spv: SupervisorUser | null;
  statusFrequencies?: StatusFrequency[];
  frequencyStatus?: SupervisorDefinition[];
}

interface DutyReportFrequencyRow {
  cwpId: number | null;
  cwp: string | null;
  rating: string | null;
  cwpFrequencyId: number;
  frequency: string | null;
  isPrimary: boolean | null;
  statusFrequencyId: number | null;
  statusFreqId: number | undefined;
  status: string | null;
  remark: string;
}

interface DutyReportFrequencyResponse {
  dutyReportId: number;
  statusOptions: StatusFreqOption[];
  statusFrequencies: StatusFrequency[];
  rows: DutyReportFrequencyRow[];
}

const { token } = useAuth();
const toast = useToast();
const selectedDutyReportId = ref<number | undefined>();
const loadedDutyReportId = ref<number | undefined>();
const frequencyRows = ref<DutyReportFrequencyRow[]>([]);
const savingFrequencyIds = ref<number[]>([]);

const {
  data: dutyReports,
  status: dutyReportsStatus,
  refresh: refreshDutyReports,
} = await useFetch<DutyReport[]>(`${apiBaseUrl}/api/dutyReports/my`, {
  headers: {
    Authorization: token.value ? `Bearer ${token.value}` : "",
  },
});

const {
  data: statusFreqs,
  status: statusFreqStatus,
  refresh: refreshStatusFreqs,
} = await useFetch<StatusFreqOption[]>(
  `${apiBaseUrl}/api/statusFreqs`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const selectedDutyReport = computed(() => {
  const reports = dutyReports.value || [];

  if (!reports.length) return null;

  return (
    reports.find(
      (dutyReport) => dutyReport.id === selectedDutyReportId.value,
    ) || reports[0]
  );
});

const loadedDutyReport = computed(() => {
  const reports = dutyReports.value || [];

  if (!loadedDutyReportId.value) return null;

  return (
    reports.find((dutyReport) => dutyReport.id === loadedDutyReportId.value) ||
    null
  );
});

const dutyReportOptions = computed(() =>
  (dutyReports.value || []).map((dutyReport) => ({
    label: getDutyReportLabel(dutyReport),
    value: dutyReport.id,
  })),
);

const frequencyUrl = computed(() =>
  loadedDutyReport.value?.id
    ? `${apiBaseUrl}/api/dutyReports/${loadedDutyReport.value.id}/frequencies`
    : null,
);

const {
  data: frequencyData,
  status: frequencyStatus,
  refresh: refreshFrequencyData,
} = await useFetch<DutyReportFrequencyResponse>(
  () => frequencyUrl.value || "",
  {
    immediate: false,
    watch: false,
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const statusFrequencyOptions = computed(() =>
  (statusFreqs.value || []).map((status) => ({
    label: status.status || `Status ${status.id}`,
    value: status.id,
  })),
);

const frequencyGroups = computed(() => {
  const groups: {
    cwpId: number | null;
    cwp: string | null;
    rating: string | null;
    rows: DutyReportFrequencyRow[];
  }[] = [];

  for (const row of frequencyRows.value) {
    let group = groups.find((item) => item.cwpId === row.cwpId);

    if (!group) {
      group = {
        cwpId: row.cwpId,
        cwp: row.cwp,
        rating: row.rating,
        rows: [],
      };
      groups.push(group);
    }

    group.rows.push(row);
  }

  return groups;
});

watch(
  dutyReports,
  (nextDutyReports) => {
    if (!nextDutyReports?.length) {
      selectedDutyReportId.value = undefined;
      return;
    }

    const hasSelectedReport = nextDutyReports.some(
      (dutyReport) => dutyReport.id === selectedDutyReportId.value,
    );

    if (!hasSelectedReport) {
      selectedDutyReportId.value = nextDutyReports[0]?.id;
    }
  },
  { immediate: true },
);

watch(
  [loadedDutyReport, frequencyData],
  () => {
    frequencyRows.value = buildFrequencyRows();
  },
  { immediate: true },
);

function buildFrequencyRows() {
  const apiRows = frequencyData.value?.rows || [];
  const selectedStatusFrequencies =
    loadedDutyReport.value?.statusFrequencies || [];
  const apiStatusFrequencies = frequencyData.value?.statusFrequencies || [];
  const mergedStatusFrequencies = [
    ...selectedStatusFrequencies,
    ...apiStatusFrequencies.filter(
      (apiStatusFrequency) =>
        !selectedStatusFrequencies.some(
          (selectedStatusFrequency) =>
            selectedStatusFrequency.cwpFrequencyId ===
            apiStatusFrequency.cwpFrequencyId,
        ),
    ),
  ];
  const apiRowMap = new Map(apiRows.map((row) => [row.cwpFrequencyId, row]));
  const statusFrequencyMap = new Map(
    mergedStatusFrequencies
      .filter((statusFrequency) => statusFrequency.cwpFrequencyId)
      .map((statusFrequency) => [
        statusFrequency.cwpFrequencyId,
        statusFrequency,
      ]),
  );
  const frequencyStatusSupervisors = loadedDutyReport.value?.frequencyStatus
    ?.length
    ? loadedDutyReport.value.frequencyStatus
    : loadedDutyReport.value?.supervisorCwp
      ? [loadedDutyReport.value.supervisorCwp]
      : [];

  return frequencyStatusSupervisors.flatMap((supervisor) =>
    (supervisor.cwpSupervisors || []).flatMap((cwpSupervisor) => {
      const cwp = cwpSupervisor.cwp;

      return (cwp?.cwpFrequencies || []).map((frequency) => {
        const statusFrequency =
          statusFrequencyMap.get(frequency.id) ||
          frequency.statusFrequencies?.[0] ||
          null;
        const apiRow = apiRowMap.get(frequency.id);

        return {
          cwpId: cwp?.id || null,
          cwp: cwp?.cwp || null,
          rating: cwp?.rating?.rating || null,
          cwpFrequencyId: frequency.id,
          frequency: frequency.frequency,
          isPrimary: frequency.isPrimary,
          statusFrequencyId:
            statusFrequency?.id || apiRow?.statusFrequencyId || null,
          statusFreqId:
            statusFrequency?.statusFreqId || apiRow?.statusFreqId || undefined,
          status: statusFrequency?.statusFreq?.status || apiRow?.status || null,
          remark: statusFrequency?.remark || apiRow?.remark || "",
        };
      });
    }),
  );
}

function isSavingFrequency(cwpFrequencyId: number) {
  return savingFrequencyIds.value.includes(cwpFrequencyId);
}

async function saveFrequencyRow(row: DutyReportFrequencyRow) {
  if (!loadedDutyReport.value?.id) {
    toast.add({
      title: "Duty Report Required",
      description: "Please select duty report first.",
      color: "warning",
    });
    return;
  }

  if (!row.statusFreqId) {
    toast.add({
      title: "Status Required",
      description: "Please select status frequency before saving.",
      color: "warning",
    });
    return;
  }

  savingFrequencyIds.value = [...savingFrequencyIds.value, row.cwpFrequencyId];

  try {
    const response = await $fetch<{
      statusFrequency?: StatusFrequency;
    }>(
      `${apiBaseUrl}/api/dutyReports/${loadedDutyReport.value.id}/frequencies/${row.cwpFrequencyId}`,
      {
        method: "PUT",
        body: {
          statusFreqId: row.statusFreqId,
          remark: row.remark,
        },
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    if (response.statusFrequency) {
      row.statusFrequencyId = response.statusFrequency.id;
      row.statusFreqId = response.statusFrequency.statusFreqId || undefined;
      row.remark = response.statusFrequency.remark || row.remark;
      row.status =
        statusFrequencyOptions.value.find(
          (status) => status.value === row.statusFreqId,
        )?.label || row.status;
    }

    toast.add({
      title: "Saved",
      description: "Frequency status has been sent successfully.",
      color: "success",
    });
  } catch (error: any) {
    toast.add({
      title: "Save Failed",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to save frequency status.",
      color: "error",
    });
  } finally {
    savingFrequencyIds.value = savingFrequencyIds.value.filter(
      (id) => id !== row.cwpFrequencyId,
    );
  }
}

async function refreshFrequencyStatusPage() {
  await Promise.all([refreshDutyReports(), refreshStatusFreqs()]);
  if (frequencyUrl.value) await refreshFrequencyData();
}

async function loadSelectedDutyReportFrequencies() {
  if (!selectedDutyReportId.value) {
    toast.add({
      title: "Duty Report Required",
      description: "Please select duty report before loading data.",
      color: "warning",
    });
    return;
  }

  loadedDutyReportId.value = selectedDutyReportId.value;
  frequencyRows.value = [];
  await nextTick();

  if (frequencyUrl.value) {
    await refreshFrequencyData();
  }

  toast.add({
    title: "Loaded",
    description: "Frequency status data has been loaded.",
    color: "success",
  });
}

function getDutyReportLabel(dutyReport: DutyReport) {
  return [
    formatDisplayDate(dutyReport.shiftDate),
    dutyReport.supervisorCwp?.supervisor || "Supervisor",
    formatShiftLabel(dutyReport.shiftName),
  ].join(" - ");
}

function formatDisplayDate(value?: string | null) {
  if (!value) return "-";

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "-";

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShiftLabel(shiftName: DutyReport["shiftName"]) {
  if (!shiftName) return "-";

  const shifts = shiftName.shifts || [];
  const firstShift = shifts[0];
  const lastShift = shifts[shifts.length - 1];
  const start = firstShift?.start || "-";
  const end = lastShift?.end || "-";

  return `${shiftName.shift || "Shift"} (${start} - ${end})`;
}
</script>

<template>
  <UDashboardPanel id="frequency-status">
    <template #header>
      <UDashboardNavbar title="Frequency Status">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="Refresh"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            @click="refreshFrequencyStatusPage"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <UCard>
          <template #header>
            <div class="flex flex-col gap-1">
              <h2 class="font-semibold text-highlighted">Load Duty Report</h2>
              <p class="text-sm text-muted">
                Select today&apos;s duty report to manage CWP frequency status.
              </p>
            </div>
          </template>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div class="space-y-3">
              <UFormField label="Duty Report">
                <USelectMenu
                  v-model="selectedDutyReportId"
                  class="w-full"
                  :items="dutyReportOptions"
                  value-key="value"
                  label-key="label"
                  placeholder="Select duty report"
                  :loading="dutyReportsStatus === 'pending'"
                />
              </UFormField>

              <UButton
                label="Submit"
                icon="i-lucide-search"
                color="primary"
                :loading="frequencyStatus === 'pending'"
                :disabled="!selectedDutyReportId"
                @click="loadSelectedDutyReportFrequencies"
              />
            </div>

            <div
              class="rounded-lg border border-default bg-elevated/30 p-3 text-sm"
            >
              <div class="text-xs uppercase text-muted">Loaded</div>
              <div class="font-medium text-highlighted">
                {{
                  loadedDutyReport
                    ? getDutyReportLabel(loadedDutyReport)
                    : "-"
                }}
              </div>
              <div class="mt-1 text-xs text-muted">
                Supervisor:
                {{
                  loadedDutyReport?.spv?.name ||
                  loadedDutyReport?.supervisor ||
                  "-"
                }}
              </div>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex flex-col gap-1">
              <h2 class="font-semibold text-highlighted">
                Frequency Status Data
              </h2>
              <p class="text-sm text-muted">
                Fill status and remarks for every CWP frequency in the selected
                duty report.
              </p>
            </div>
          </template>

          <div
            v-if="dutyReportsStatus === 'pending'"
            class="rounded-xl border border-default bg-elevated/20 p-6 text-center text-sm text-muted"
          >
            Loading duty reports...
          </div>

          <div
            v-else-if="!dutyReports?.length"
            class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
          >
            No duty report found for today where you are the supervisor.
          </div>

          <div
            v-else-if="frequencyStatus === 'pending'"
            class="rounded-xl border border-default bg-elevated/20 p-6 text-center text-sm text-muted"
          >
            Loading frequency status...
          </div>

          <div
            v-else-if="!frequencyRows.length"
            class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
          >
            Select duty report and click Submit to load frequency status data.
          </div>

          <div v-else class="overflow-x-auto rounded-lg border border-default">
            <table class="w-full border-collapse text-sm">
              <thead class="bg-elevated/50">
                <tr>
                  <th class="border border-default px-4 py-3 text-left">No</th>
                  <th class="border border-default px-4 py-3 text-left">CWP</th>
                  <th class="border border-default px-4 py-3 text-left">
                    Frequency
                  </th>
                  <th class="border border-default px-4 py-3 text-left">
                    Is Primary
                  </th>
                  <th class="border border-default px-4 py-3 text-left">
                    Status Frequency
                  </th>
                  <th
                    class="w-[560px] border border-default px-4 py-3 text-left"
                  >
                    Remark
                  </th>
                  <th class="border border-default px-4 py-3 text-left">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <template
                  v-for="(group, groupIndex) in frequencyGroups"
                  :key="group.cwpId || groupIndex"
                >
                  <tr
                    v-for="(row, rowIndex) in group.rows"
                    :key="row.cwpFrequencyId"
                  >
                    <td
                      v-if="rowIndex === 0"
                      class="border border-default px-4 py-3 align-top"
                      :rowspan="group.rows.length"
                    >
                      {{ groupIndex + 1 }}
                    </td>
                    <td
                      v-if="rowIndex === 0"
                      class="border border-default px-4 py-3 align-top"
                      :rowspan="group.rows.length"
                    >
                      <div class="font-medium text-highlighted">
                        {{ group.cwp || "-" }}
                      </div>
                      <div v-if="group.rating" class="text-xs text-muted">
                        {{ group.rating }}
                      </div>
                    </td>
                    <td class="border border-default px-4 py-3 align-top">
                      {{ row.frequency || "-" }}
                    </td>
                    <td class="border border-default px-4 py-3 align-top">
                      <UBadge
                        :color="row.isPrimary ? 'success' : 'neutral'"
                        variant="soft"
                      >
                        {{ row.isPrimary ? "Primary" : "Secondary" }}
                      </UBadge>
                    </td>
                    <td class="border border-default px-4 py-3 align-top">
                      <USelectMenu
                        v-model="row.statusFreqId"
                        class="min-w-52"
                        :items="statusFrequencyOptions"
                        value-key="value"
                        label-key="label"
                        placeholder="Select status"
                        :loading="statusFreqStatus === 'pending'"
                        :disabled="!statusFrequencyOptions.length"
                      />
                      <p
                        v-if="!statusFrequencyOptions.length"
                        class="mt-1 text-xs text-warning"
                      >
                        No status frequency data found.
                      </p>
                    </td>
                    <td
                      class="w-[560px] border border-default px-4 py-3 align-top"
                    >
                      <RichTextEditor
                        v-model="row.remark"
                        placeholder="Write remark..."
                      />
                    </td>
                    <td class="border border-default px-4 py-3 align-top">
                      <UButton
                        label="Save"
                        icon="i-lucide-save"
                        color="primary"
                        size="sm"
                        :loading="isSavingFrequency(row.cwpFrequencyId)"
                        @click="saveFrequencyRow(row)"
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
</template>
