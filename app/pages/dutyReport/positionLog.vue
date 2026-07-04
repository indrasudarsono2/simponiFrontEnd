<script setup lang="ts">
import ip from "../../utils/config.json";

interface ShiftDetail {
  id: number;
  shiftNameId: number | null;
  start: string | null;
  end: string | null;
  duration: number | null;
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

interface Cwp {
  id: number;
  ratingId: number | null;
  cwp: string | null;
  rating: Rating | null;
}

interface CwpSupervisor {
  id: number;
  cwpId: number | null;
  supervisorId: number | null;
  cwp: Cwp | null;
}

interface SupervisorDefinition {
  id: number;
  branchUnitId: number | null;
  supervisor: string | null;
  cwpSupervisors: CwpSupervisor[];
}

interface SupervisorUser {
  nik: string | null;
  name: string | null;
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
}

interface ControllerOption {
  nik: string;
  name: string | null;
  medicalCheckId: number;
  medicalCheckStatus: string;
}

interface CwpRow {
  cwpSupervisorId: number;
  cwp: Cwp | null;
  controllers: ControllerOption[];
  logBooks: {
    id: number;
    userNik: string | null;
    controllerName: string | null;
    isFinal: boolean;
    timeIn: string | null;
    timeInDate: string | null;
    timeOut: string | null;
    timeOutDate: string | null;
    duration: number | null;
  }[];
}

interface PositionLogSetup {
  dutyReport: DutyReport;
  cwpRows: CwpRow[];
  controllers: ControllerOption[];
}

interface PositionLogFormLog {
  id?: number;
  userNik: string | undefined;
  controllerName?: string | null;
  timeIn: string;
  timeInDate: string;
  timeOut: string;
  timeOutDate: string;
  duration?: number | null;
  isFinal: boolean;
  autoTimeoutDisabled?: boolean;
}

interface PositionLogFormGroup {
  cwpSupervisorId: number;
  cwpId: number;
  controllers: ControllerOption[];
  logs: PositionLogFormLog[];
}

const { token } = useAuth();
const toast = useToast();
const selectedDutyReportId = ref<number | undefined>();
const saveLoading = ref(false);
const positionLogRows = ref<PositionLogFormGroup[]>([]);
const currentUtcDate = ref(new Date());
const lastAutoSaveMessage = ref("");
const autoSubmittedWindowKeys = new Set<string>();
const finishConfirmationOpen = ref(false);
const finishConfirmationLog = ref<PositionLogFormLog | null>(null);
let utcClockInterval: ReturnType<typeof setInterval> | undefined;

const {
  data: dutyReports,
  status,
  refresh,
} = await useFetch<DutyReport[]>(`http://${ip.ipBackEnd}/api/dutyReports/my`, {
  headers: {
    Authorization: token.value ? `Bearer ${token.value}` : "",
  },
});

const dutyReportOptions = computed(() =>
  (dutyReports.value || []).map((dutyReport) => ({
    label: getDutyReportLabel(dutyReport),
    value: dutyReport.id,
  })),
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

const positionLogUrl = computed(() =>
  selectedDutyReportId.value
    ? `http://${ip.ipBackEnd}/api/positionLogs/${selectedDutyReportId.value}`
    : null,
);

const {
  data: positionLogSetup,
  status: positionLogStatus,
  refresh: refreshPositionLog,
} = await useFetch<PositionLogSetup>(() => positionLogUrl.value || "", {
  immediate: false,
  watch: false,
  headers: {
    Authorization: token.value ? `Bearer ${token.value}` : "",
  },
});

const utcClock = computed(() =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(currentUtcDate.value),
);

const shiftWindow = computed(() => {
  const shifts = selectedDutyReport.value?.shiftName?.shifts || [];
  const firstShift = shifts[0];
  const lastShift = shifts[shifts.length - 1];
  const start = firstShift?.start || "";
  const end = lastShift?.end || "";

  if (!start || !end) return null;

  const overnight = parseTimeToMinutes(start) > parseTimeToMinutes(end);

  return {
    start,
    end,
    overnight,
  };
});

const shiftWindowLabel = computed(() => {
  if (!shiftWindow.value) return "-";

  return `${shiftWindow.value.start} - ${shiftWindow.value.end}${
    shiftWindow.value.overnight ? " (overnight)" : ""
  }`;
});

const controlShiftWindows = computed(() =>
  (selectedDutyReport.value?.shiftName?.shifts || [])
    .filter((shift) => shift.isControl)
    .map((shift) => {
      const start = shift.start || "";
      const end = shift.end || "";

      if (!start || !end) return null;

      return {
        id: shift.id,
        start,
        end,
        overnight: parseTimeToMinutes(start) > parseTimeToMinutes(end),
      };
    })
    .filter(
      (
        window,
      ): window is {
        id: number;
        start: string;
        end: string;
        overnight: boolean;
      } => Boolean(window),
    ),
);

const controlShiftWindowLabel = computed(() => {
  if (!controlShiftWindows.value.length) return "-";

  return controlShiftWindows.value
    .map(
      (window) =>
        `${window.start} - ${window.end}${window.overnight ? " (overnight)" : ""}`,
    )
    .join(", ");
});

onMounted(() => {
  utcClockInterval = setInterval(() => {
    currentUtcDate.value = new Date();
    void handleAutoSubmitAtControlEnd();
  }, 1000);
});

onBeforeUnmount(() => {
  if (utcClockInterval) clearInterval(utcClockInterval);
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
  selectedDutyReportId,
  async (nextDutyReportId) => {
    if (!nextDutyReportId) {
      positionLogRows.value = [];
      return;
    }

    await refreshPositionLog();
  },
  { immediate: true },
);

watch(positionLogSetup, (nextSetup) => {
  positionLogRows.value = (nextSetup?.cwpRows || [])
    .filter((row) => row.cwp?.id)
    .map((row) => ({
      cwpSupervisorId: row.cwpSupervisorId,
      cwpId: row.cwp?.id || 0,
      controllers: row.controllers || [],
      logs: row.logBooks?.length
        ? row.logBooks.map((logBook) => ({
            id: logBook.id,
            userNik: logBook.userNik || undefined,
            controllerName: logBook.controllerName,
            timeIn: logBook.timeIn || "",
            timeInDate: logBook.timeInDate || "",
            timeOut: logBook.timeOut || "",
            timeOutDate: logBook.timeOutDate || "",
            duration: logBook.duration ?? null,
            isFinal: logBook.isFinal,
            autoTimeoutDisabled: logBook.isFinal,
          }))
        : [
            {
              userNik: undefined,
              controllerName: null,
              timeIn: "",
              timeInDate: "",
              timeOut: "",
              timeOutDate: "",
              duration: null,
              isFinal: false,
              autoTimeoutDisabled: false,
            },
          ],
    }));
});

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

function parseTimeToMinutes(value?: string | null) {
  if (!value) return 0;

  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getCurrentUtcTime() {
  const hours = String(currentUtcDate.value.getUTCHours()).padStart(2, "0");
  const minutes = String(currentUtcDate.value.getUTCMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function getCurrentUtcDateKey() {
  const year = currentUtcDate.value.getUTCFullYear();
  const month = String(currentUtcDate.value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(currentUtcDate.value.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addUtcDays(dateValue: string, days: number) {
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) return dateValue;

  const date = new Date(Date.UTC(year, month - 1, day + days));
  const utcYear = date.getUTCFullYear();
  const utcMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const utcDay = String(date.getUTCDate()).padStart(2, "0");

  return `${utcYear}-${utcMonth}-${utcDay}`;
}

function parseUtcDateTimeToMinutes(dateValue?: string, timeValue?: string) {
  if (!dateValue || !timeValue) return null;

  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours = 0, minutes = 0] = timeValue.split(":").map(Number);

  if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return Math.floor(Date.UTC(year, month - 1, day, hours, minutes) / 60000);
}

function getLogDurationMinutes(log: PositionLogFormLog) {
  const timeInMinutes = parseUtcDateTimeToMinutes(log.timeInDate, log.timeIn);
  const timeOutMinutes = parseUtcDateTimeToMinutes(
    log.timeOutDate,
    log.timeOut,
  );

  if (timeInMinutes === null || timeOutMinutes === null) return null;

  const duration = timeOutMinutes - timeInMinutes;
  return duration >= 0 ? duration : null;
}

function formatLogDuration(log: PositionLogFormLog) {
  const duration = getLogDurationMinutes(log);
  if (duration === null) return "-";

  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} h`;

  return `${hours} h ${minutes} min`;
}

function getDutyReportShiftLabel(dutyReport: DutyReport) {
  const shiftName = dutyReport.shiftName;
  if (!shiftName) return "-";

  const shifts = shiftName.shifts || [];
  const firstShift = shifts[0];
  const lastShift = shifts[shifts.length - 1];
  const start = firstShift?.start || "-";
  const end = lastShift?.end || "-";

  return `${shiftName.shift || "Shift"} (${start} - ${end})`;
}

function getDutyReportLabel(dutyReport: DutyReport) {
  return [
    formatDisplayDate(dutyReport.shiftDate),
    dutyReport.supervisorCwp?.supervisor || "Supervisor",
    getDutyReportShiftLabel(dutyReport),
  ].join(" - ");
}

function getCwpName(cwpId: number) {
  const cwpRow = positionLogSetup.value?.cwpRows.find(
    (row) => row.cwp?.id === cwpId,
  );

  const cwp = cwpRow?.cwp;
  if (!cwp) return `CWP ${cwpId}`;

  return `${cwp.cwp || `CWP ${cwpId}`}${cwp.rating?.rating ? ` - ${cwp.rating.rating}` : ""}`;
}

function getMedicalStatus(userNik?: string) {
  if (!userNik) return "-";

  return (
    positionLogSetup.value?.controllers.find(
      (controller) => controller.nik === userNik,
    )?.medicalCheckStatus || "-"
  );
}

function getControllerDisplayName(log?: PositionLogFormLog) {
  if (!log?.userNik) return "-";

  return (
    log.controllerName ||
    positionLogSetup.value?.controllers.find(
      (controller) => controller.nik === log.userNik,
    )?.name ||
    log.userNik
  );
}

function isControllerAssignedToOtherCwp(
  userNik: string,
  group: PositionLogFormGroup,
) {
  return positionLogRows.value.some(
    (positionGroup) =>
      positionGroup.cwpId !== group.cwpId &&
      positionGroup.logs.some((log) => log.userNik === userNik),
  );
}

function getControllerOptions(
  group: PositionLogFormGroup,
  currentLog?: PositionLogFormLog,
) {
  const options = group.controllers
    .filter(
      (controller) =>
        controller.nik === currentLog?.userNik ||
        !isControllerAssignedToOtherCwp(controller.nik, group),
    )
    .map((controller) => ({
      label: `${controller.name || controller.nik} (${controller.medicalCheckStatus})`,
      value: controller.nik,
    }));

  if (
    currentLog?.userNik &&
    !options.some((option) => option.value === currentLog.userNik)
  ) {
    options.unshift({
      label: getControllerDisplayName(currentLog),
      value: currentLog.userNik,
    });
  }

  return options;
}

function addLogRow(group: PositionLogFormGroup) {
  group.logs.push({
    userNik: undefined,
    controllerName: null,
    timeIn: "",
    timeInDate: "",
    timeOut: "",
    timeOutDate: "",
    duration: null,
    isFinal: false,
    autoTimeoutDisabled: false,
  });
}

function removeLogRow(group: PositionLogFormGroup, index: number) {
  group.logs.splice(index, 1);

  if (!group.logs.length) {
    addLogRow(group);
  }
}

function getFlattenedLogRows() {
  return positionLogRows.value.flatMap((group) =>
    group.logs
      .filter((log) => log.userNik || log.timeIn || log.timeOut || log.id)
      .map((log) => ({
        id: log.id,
        cwpId: group.cwpId,
        userNik: log.userNik,
        isFinal: log.isFinal,
        timeIn: log.timeIn,
        timeInDate: log.timeInDate,
        timeOut: log.timeOut,
        timeOutDate: log.timeOutDate,
        duration: getLogDurationMinutes(log),
      })),
  );
}

function getCompleteFlattenedLogRows() {
  return getFlattenedLogRows().filter((row) => row.userNik && row.timeIn);
}

function isTimeInsideControlWindow(
  timeValue: string,
  window: { start: string; end: string },
) {
  const timeMinutes = parseTimeToMinutes(timeValue);
  const startMinutes = parseTimeToMinutes(window.start);
  const endMinutes = parseTimeToMinutes(window.end);

  if (startMinutes <= endMinutes) {
    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  }

  return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
}

function findControlWindowForTime(timeValue: string) {
  return (
    controlShiftWindows.value.find((window) =>
      isTimeInsideControlWindow(timeValue, window),
    ) || null
  );
}

function getWindowEndDateForTimeIn(
  timeInDate: string,
  timeIn: string,
  window: { start: string; end: string; overnight: boolean },
) {
  if (!timeInDate) return getCurrentUtcDateKey();
  if (!window.overnight) return timeInDate;

  const timeInMinutes = parseTimeToMinutes(timeIn);
  const startMinutes = parseTimeToMinutes(window.start);

  return timeInMinutes >= startMinutes ? addUtcDays(timeInDate, 1) : timeInDate;
}

function isTimeInsideShiftWindow(timeValue: string) {
  if (!controlShiftWindows.value.length) return false;

  return Boolean(findControlWindowForTime(timeValue));
}

async function captureTime(
  log: PositionLogFormLog,
  field: "timeIn" | "timeOut",
) {
  if (!log.userNik) {
    toast.add({
      title: "Controller Required",
      description: "Please select controller before capturing time.",
      color: "warning",
    });
    return;
  }

  if (field === "timeOut" && !log.timeIn) {
    toast.add({
      title: "Time In Required",
      description: "Please capture Time In before capturing Time Out.",
      color: "warning",
    });
    return;
  }

  const currentTime = getCurrentUtcTime();
  const timeInWindow = log.timeIn ? findControlWindowForTime(log.timeIn) : null;

  if (field === "timeIn" && !isTimeInsideShiftWindow(currentTime)) {
    toast.add({
      title: "Outside Control Shift",
      description: `Current UTC time ${currentTime} is not inside control window ${controlShiftWindowLabel.value}.`,
      color: "error",
    });
    return;
  }

  if (field === "timeOut" && !timeInWindow) {
    toast.add({
      title: "Invalid Time In",
      description: "Time In is not inside a valid control window.",
      color: "error",
    });
    return;
  }

  const previousTime = log[field];
  const dateField: "timeInDate" | "timeOutDate" =
    field === "timeIn" ? "timeInDate" : "timeOutDate";
  const previousDate = log[dateField];
  const previousIsFinal = log.isFinal;
  const previousAutoTimeoutDisabled = log.autoTimeoutDisabled;

  if (field === "timeOut" && !isTimeInsideShiftWindow(currentTime)) {
    log.timeOut = timeInWindow?.end || currentTime;
    log.timeOutDate = timeInWindow
      ? getWindowEndDateForTimeIn(log.timeInDate, log.timeIn, timeInWindow)
      : getCurrentUtcDateKey();
    log.isFinal = true;
    log.autoTimeoutDisabled = true;
  } else {
    log[field] = currentTime;
    log[dateField] = getCurrentUtcDateKey();
  }

  const saved = await savePositionLogs({ auto: true });

  if (!saved) {
    log[field] = previousTime;
    log[dateField] = previousDate;
    log.isFinal = previousIsFinal;
    log.autoTimeoutDisabled = previousAutoTimeoutDisabled;
  }
}

async function handleAutoSubmitAtControlEnd() {
  if (!selectedDutyReportId.value || saveLoading.value) return;
  if (positionLogStatus.value === "pending") return;

  const currentTime = getCurrentUtcTime();
  const endingWindow = controlShiftWindows.value.find(
    (window) => window.end === currentTime,
  );

  if (!endingWindow) return;

  const autoSubmitKey = [
    selectedDutyReportId.value,
    getCurrentUtcDateKey(),
    endingWindow.id,
    endingWindow.end,
  ].join("-");

  if (autoSubmittedWindowKeys.has(autoSubmitKey)) return;

  let shouldAutoSave = false;

  for (const group of positionLogRows.value) {
    for (const log of group.logs) {
      if (!log.userNik || !log.timeIn) continue;

      const timeInWindow = findControlWindowForTime(log.timeIn);
      if (timeInWindow?.id !== endingWindow.id) continue;

      if (log.autoTimeoutDisabled) continue;

      if (log.timeOut) {
        shouldAutoSave = true;
        continue;
      }

      log.timeOut = endingWindow.end;
      log.timeOutDate = getWindowEndDateForTimeIn(
        log.timeInDate,
        log.timeIn,
        endingWindow,
      );
      shouldAutoSave = true;
    }
  }

  autoSubmittedWindowKeys.add(autoSubmitKey);

  if (!shouldAutoSave) return;

  await savePositionLogs({ auto: true });
}

function requestFinishCalculation(log: PositionLogFormLog) {
  if (log.autoTimeoutDisabled) return;

  if (!log.userNik || !log.timeIn || !log.timeOut) {
    toast.add({
      title: "Incomplete Position Log",
      description:
        "Please select controller, capture Time In, and capture Time Out before finishing calculation.",
      color: "warning",
    });
    return;
  }

  finishConfirmationLog.value = log;
  finishConfirmationOpen.value = true;
}

async function confirmFinishCalculation() {
  if (!finishConfirmationLog.value) return;

  const logToFinish = finishConfirmationLog.value;
  logToFinish.isFinal = true;
  logToFinish.autoTimeoutDisabled = true;
  finishConfirmationOpen.value = false;
  finishConfirmationLog.value = null;

  const saved = await savePositionLogs({ auto: true });

  if (!saved) {
    logToFinish.isFinal = false;
    logToFinish.autoTimeoutDisabled = false;
    return;
  }

  toast.add({
    title: "Calculation Stopped",
    description:
      "Capture buttons are hidden and this row has been sent to database. It will not be included in automatic end-window send.",
    color: "success",
  });
}

function cancelFinishCalculation() {
  finishConfirmationOpen.value = false;
  finishConfirmationLog.value = null;
}

async function savePositionLogs(options: { auto?: boolean } = {}) {
  if (!selectedDutyReportId.value) return false;

  const rowsToSave = options.auto
    ? getCompleteFlattenedLogRows()
    : getFlattenedLogRows();

  const invalidTimeRow = rowsToSave.find(
    (row) =>
      !isTimeInsideShiftWindow(row.timeIn) ||
      (row.timeOut && !isTimeInsideShiftWindow(row.timeOut)),
  );

  if (invalidTimeRow && shiftWindow.value) {
    toast.add({
      title: "Invalid Time",
      description: `Time In and Time Out must be inside control window ${controlShiftWindowLabel.value}.`,
      color: "error",
    });
    return false;
  }

  if (!options.auto) {
    saveLoading.value = true;
  }

  try {
    await $fetch(
      `http://${ip.ipBackEnd}/api/positionLogs/${selectedDutyReportId.value}`,
      {
        method: "POST",
        body: {
          rows: rowsToSave,
        },
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    if (!options.auto) {
      toast.add({
        title: "Success",
        description: "Position log has been saved to logbook.",
        color: "success",
      });

      await refreshPositionLog();
    }

    return true;
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to save position log.",
      color: "error",
    });
    return false;
  } finally {
    if (!options.auto) {
      saveLoading.value = false;
    }
  }
}

async function handleManualSave() {
  await savePositionLogs();
}
</script>

<template>
  <UDashboardPanel id="position-log">
    <template #header>
      <UDashboardNavbar title="Position Log">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="Refresh"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            @click="() => refresh()"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <UCard>
          <template #header>
            <div>
              <h2 class="font-semibold text-highlighted">Select Duty Report</h2>
              <p class="text-sm text-muted">
                Only duty reports where you are assigned as supervisor are
                shown.
              </p>
            </div>
          </template>

          <div v-if="status === 'pending'" class="py-8 text-center text-muted">
            Loading available duty reports...
          </div>

          <div
            v-else-if="!dutyReportOptions.length"
            class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-sm text-muted"
          >
            No duty report is currently assigned to you as supervisor.
          </div>

          <div v-else class="space-y-4">
            <UFormField label="Duty Report">
              <USelectMenu
                v-model="selectedDutyReportId"
                class="w-full"
                :items="dutyReportOptions"
                value-key="value"
                label-key="label"
                searchable
                placeholder="Select duty report"
              />
            </UFormField>

            <div
              v-if="selectedDutyReport"
              class="rounded-xl border border-default bg-elevated/30 p-4"
            >
              <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div class="text-xs uppercase text-muted">
                    Supervisor Assignment
                  </div>
                  <div class="font-medium text-highlighted">
                    {{ selectedDutyReport.supervisorCwp?.supervisor || "-" }}
                  </div>
                </div>
                <div>
                  <div class="text-xs uppercase text-muted">Shift</div>
                  <div class="font-medium text-highlighted">
                    {{ getDutyReportShiftLabel(selectedDutyReport) }}
                  </div>
                </div>
                <div>
                  <div class="text-xs uppercase text-muted">Date</div>
                  <div class="font-medium text-highlighted">
                    {{ formatDisplayDate(selectedDutyReport.shiftDate) }}
                  </div>
                </div>
                <div>
                  <div class="text-xs uppercase text-muted">Supervisor</div>
                  <div class="font-medium text-highlighted">
                    {{
                      selectedDutyReport.spv?.name ||
                      selectedDutyReport.supervisor ||
                      "-"
                    }}
                  </div>
                </div>
              </div>
            </div>

            <UCard>
              <template #header>
                <div
                  class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h3 class="font-semibold text-highlighted">
                      CWP Position Log
                    </h3>
                    <p class="text-sm text-muted">
                      Assign FIT controller and fill time in/out for every
                      available CWP.
                    </p>
                    <div class="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                      <UBadge color="neutral" variant="soft">
                        UTC: {{ utcClock }}
                      </UBadge>
                      <UBadge color="primary" variant="soft">
                        Shift Window: {{ shiftWindowLabel }}
                      </UBadge>
                      <UBadge color="success" variant="soft">
                        Control Window: {{ controlShiftWindowLabel }}
                      </UBadge>
                      <UBadge
                        v-if="lastAutoSaveMessage"
                        color="success"
                        variant="subtle"
                      >
                        {{ lastAutoSaveMessage }}
                      </UBadge>
                    </div>
                  </div>

                  <!-- <UButton
                    label="Save to Logbook"
                    icon="i-lucide-save"
                    color="primary"
                    :loading="saveLoading"
                    :disabled="!positionLogRows.length"
                    @click="handleManualSave"
                  /> -->
                </div>
              </template>

              <div
                v-if="positionLogStatus === 'pending'"
                class="py-8 text-center text-muted"
              >
                Loading CWP position log...
              </div>

              <div
                v-else-if="!positionLogRows.length"
                class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-sm text-muted"
              >
                No CWP is available for this duty report supervisor assignment.
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
                        CWP-RATING
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Name
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Time In
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Time Out
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Duration
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <template
                      v-for="(group, groupIndex) in positionLogRows"
                      :key="group.cwpSupervisorId"
                    >
                      <tr
                        v-for="(log, logIndex) in group.logs"
                        :key="`${group.cwpSupervisorId}-${log.id || logIndex}`"
                      >
                        <td
                          v-if="logIndex === 0"
                          class="border border-default px-4 py-3 align-top"
                          :rowspan="group.logs.length"
                        >
                          {{ groupIndex + 1 }}
                        </td>
                        <td
                          v-if="logIndex === 0"
                          class="border border-default px-4 py-3 align-top"
                          :rowspan="group.logs.length"
                        >
                          <div class="font-medium text-highlighted">
                            {{ getCwpName(group.cwpId) }}
                          </div>
                          <UButton
                            class="mt-2"
                            label="Add Controller"
                            icon="i-lucide-plus"
                            color="neutral"
                            variant="outline"
                            size="xs"
                            @click="addLogRow(group)"
                          />
                        </td>
                        <td class="border border-default px-4 py-3 align-top">
                          <USelectMenu
                            v-model="log.userNik"
                            class="w-full min-w-56"
                            :items="getControllerOptions(group, log)"
                            value-key="value"
                            label-key="label"
                            searchable
                            :disabled="!group.controllers.length || log.isFinal"
                            placeholder="Select FIT controller"
                          />
                          <p
                            v-if="!group.controllers.length"
                            class="mt-1 text-xs text-warning"
                          >
                            No available FIT controller with valid matching
                            rating for this duty date.
                          </p>
                          <div class="mt-1">
                            <UBadge
                              :color="log.userNik ? 'success' : 'neutral'"
                              variant="soft"
                            >
                              {{ getMedicalStatus(log.userNik) }}
                            </UBadge>
                          </div>
                        </td>
                        <td class="border border-default px-4 py-3 align-top">
                          <div
                            class="flex min-w-44 flex-wrap items-center gap-2"
                          >
                            <UBadge
                              :color="log.timeIn ? 'success' : 'neutral'"
                              variant="soft"
                              class="min-w-16 justify-center"
                            >
                              {{ log.timeIn || "--:--" }}
                            </UBadge>
                            <UButton
                              v-if="
                                !log.isFinal &&
                                !log.autoTimeoutDisabled &&
                                !log.timeIn
                              "
                              label="Capture"
                              icon="i-lucide-clock"
                              color="success"
                              variant="soft"
                              size="xs"
                              :disabled="!controlShiftWindows.length"
                              @click="captureTime(log, 'timeIn')"
                            />
                          </div>
                        </td>
                        <td class="border border-default px-4 py-3 align-top">
                          <div
                            class="flex min-w-44 flex-wrap items-center gap-2"
                          >
                            <UBadge
                              :color="log.timeOut ? 'success' : 'neutral'"
                              variant="soft"
                              class="min-w-16 justify-center"
                            >
                              {{ log.timeOut || "--:--" }}
                            </UBadge>
                            <UButton
                              v-if="
                                !log.isFinal &&
                                !log.autoTimeoutDisabled &&
                                log.timeIn
                              "
                              label="Capture"
                              icon="i-lucide-clock"
                              color="success"
                              variant="soft"
                              size="xs"
                              :disabled="!controlShiftWindows.length"
                              @click="captureTime(log, 'timeOut')"
                            />
                          </div>
                        </td>
                        <td class="border border-default px-4 py-3 align-top">
                          <UBadge
                            :color="
                              getLogDurationMinutes(log) !== null
                                ? 'primary'
                                : 'neutral'
                            "
                            variant="soft"
                          >
                            {{ formatLogDuration(log) }}
                          </UBadge>
                        </td>
                        <td class="border border-default px-4 py-3 align-top">
                          <div class="flex flex-wrap items-center gap-2">
                            <UBadge
                              v-if="log.isFinal"
                              color="success"
                              variant="solid"
                            >
                              Final Result
                            </UBadge>
                            <UButton
                              v-if="!log.isFinal"
                              :label="
                                log.autoTimeoutDisabled
                                  ? 'Finished'
                                  : 'Finish Calculation'
                              "
                              :icon="
                                log.autoTimeoutDisabled
                                  ? 'i-lucide-check-circle'
                                  : 'i-lucide-shield-check'
                              "
                              :color="
                                log.autoTimeoutDisabled ? 'success' : 'neutral'
                              "
                              variant="soft"
                              size="sm"
                              :disabled="log.autoTimeoutDisabled"
                              @click="requestFinishCalculation(log)"
                            />
                            <UButton
                              v-if="!log.isFinal"
                              icon="i-lucide-trash-2"
                              color="error"
                              variant="soft"
                              size="sm"
                              :disabled="saveLoading"
                              @click="removeLogRow(group, logIndex)"
                            />
                          </div>
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </UCard>
          </div>
        </UCard>
      </div>

      <UModal
        v-model:open="finishConfirmationOpen"
        title="Stop Calculation?"
        description="This will lock the current Time In and Time Out for this row."
      >
        <template #body>
          <div class="space-y-3 text-sm">
            <p>
              Are you sure you want to stop calculation for this controller?
            </p>
            <div class="rounded-lg border border-default bg-elevated/30 p-3">
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <div class="text-xs uppercase text-muted">Time In</div>
                  <div class="font-medium text-highlighted">
                    {{ finishConfirmationLog?.timeIn || "--:--" }}
                  </div>
                </div>
                <div>
                  <div class="text-xs uppercase text-muted">Time Out</div>
                  <div class="font-medium text-highlighted">
                    {{ finishConfirmationLog?.timeOut || "--:--" }}
                  </div>
                </div>
              </div>
            </div>
            <p class="text-muted">
              After confirmation, capture buttons disappear. The row can still
              be sent using Save or automatically sent at the end of the control
              window.
            </p>
          </div>
        </template>

        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              @click="cancelFinishCalculation"
            />
            <UButton
              label="Yes, Stop Calculation"
              icon="i-lucide-check"
              color="success"
              @click="confirmFinishCalculation"
            />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
