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
  branchUnitId: number | null;
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
}

interface Sector {
  id: number;
  sector: string | null;
}

interface SectorCwp {
  id: number;
  cwpId: number | null;
  sectorId: number | null;
  sector: Sector | null;
}

interface Cwp {
  id: number;
  cwp: string | null;
  rating: Rating | null;
  cwpFrequencies?: CwpFrequency[];
  sectorCwps?: SectorCwp[];
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

interface CwpSupervisorResponse {
  supervisors: SupervisorDefinition[];
}

interface OnGoingIssue {
  id: number;
  other: string | null;
  start?: string | null;
  finish?: string | null;
  isClosed?: boolean;
  escalationEnabled?: boolean;
  escalationCancelledAt?: string | null;
  equipment?: {
    id?: number;
    equipment: string | null;
  } | null;
  reporterUser?: {
    nik: string;
    name: string | null;
  } | null;
  messages?: IssueMessage[];
  dutyReportLinks?: IssueLink[];
  escalationSchedule?: EscalationScheduleItem[];
}

interface EscalationEmailStatus {
  id: number;
  recipientNik: string | null;
  status: string;
  attempts: number;
  sentAt: string | null;
  lastError: string | null;
}

interface EscalationActorSummary {
  nik: string | null;
  name: string | null;
  emailConfigured: boolean;
}

interface EscalationScheduleItem {
  escalationLevelId: number;
  level: number | null;
  time: number | null;
  dueAt: string;
  estimatedExecutionAt: string;
  status: string;
  triggeredAt: string | null;
  emails: EscalationEmailStatus[];
  actors: EscalationActorSummary[];
}

interface IssueMessage {
  id: number;
  message: string | null;
  createdAt: string;
}

interface IssueLink {
  id: number;
  dutyReportId: number;
  attachedAt: string;
}

interface EquipmentOption {
  id: number;
  equipment: string | null;
}

interface OnGoingIssueResponse {
  issues: OnGoingIssue[];
  equipments: EquipmentOption[];
}

interface DutyReportDeletionSummary {
  dutyReport: {
    id: number;
    shiftDate: string | null;
    supervisorAssignment: string | null;
    shift: string | null;
  };
  dependencies: {
    onGoingIssues: number;
    statusFrequencies: number;
    logBooks: number;
    lhdReports: number;
  };
}

interface SupervisorUser {
  nik: string | null;
  name: string | null;
}

interface DutyReport {
  id: number;
  supervisorId: number | null;
  shiftNameId: number | null;
  onGoingIssueId: number | null;
  supervisor: string | null;
  shiftDate: string | null;
  supervisorCwp: SupervisorDefinition | null;
  shiftName: ShiftName | null;
  onGoingIssue: OnGoingIssue | null;
  spv: SupervisorUser | null;
}

interface LhdBook {
  id: number;
  code: string | null;
  lhd: string | null;
}

interface LhdReport {
  id: number;
  dutyReportId: number | null;
  lhdId: number | null;
  message: string | null;
  time: string | null;
  lhdBook: LhdBook | null;
}

const { token } = useAuth();
const toast = useToast();
const activeShiftNameId = ref<number | undefined>();
const activeSupervisorId = ref<number | undefined>();
const issueLoading = ref(false);
const issueActionKey = ref("");
const onGoingIssues = ref<OnGoingIssue[]>([]);
const equipmentOptions = ref<EquipmentOption[]>([]);
const selectedIssueDutyReportId = ref<number | undefined>();
const selectedLhdDutyReportId = ref<number | undefined>();
const lhdBooks = ref<LhdBook[]>([]);
const lhdReports = ref<LhdReport[]>([]);
const lhdLoading = ref(false);
const lhdSaving = ref(false);
const lhdActionKey = ref("");
const editingLhdReportId = ref<number | null>(null);
const lhdDeleteTarget = ref<LhdReport | null>(null);
const lhdForm = reactive({
  lhdId: undefined as number | undefined,
  time: "",
  message: "",
});
const selectedOpenIssueId = ref<number | undefined>();
const issueMessageDrafts = reactive<Record<number, string>>({});
const cancelEscalationModalOpen = ref(false);
const cancelEscalationLoading = ref(false);
const escalationIssueToCancel = ref<OnGoingIssue | null>(null);
const escalationLevelToCancel = ref<EscalationScheduleItem | null>(null);
const deleteModalOpen = ref(false);
const deleteSummaryLoading = ref(false);
const deleteLoading = ref(false);
const deleteAcknowledged = ref(false);
const deleteSummary = ref<DutyReportDeletionSummary | null>(null);
const loadDutyReportLoading = ref(false);
const createDutyReportModalOpen = ref(false);
const createDutyReportLoading = ref(false);
const pendingDutyReport = ref<{
  supervisorId: number;
  shiftNameId: number;
  date: string;
} | null>(null);
const newIssue = reactive<{
  equipmentId: number | undefined;
  other: string;
  message: string;
}>({
  equipmentId: undefined,
  other: "",
  message: "",
});
const todayLocalDate = formatLocalDateInput(new Date());
const selectedShiftDate = ref(todayLocalDate);
const confirmedDutyReportFilter = ref<{
  supervisorId: number;
  shiftNameId: number;
  date: string;
} | null>({
  supervisorId: 0,
  shiftNameId: 0,
  date: todayLocalDate,
});

const {
  data: shiftNames,
  status,
  refresh,
} = await useFetch<ShiftName[]>(`http://${ip.ipBackEnd}/api/shifts`, {
  headers: {
    Authorization: token.value ? `Bearer ${token.value}` : "",
  },
});

const {
  data: cwpSupervisorData,
  status: supervisorsStatus,
  refresh: refreshSupervisors,
} = await useFetch<CwpSupervisorResponse>(
  `http://${ip.ipBackEnd}/api/cwpSupervisors`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const dutyReportUrl = computed(() => {
  if (!confirmedDutyReportFilter.value) return null;

  const params = new URLSearchParams({
    date: confirmedDutyReportFilter.value.date,
  });

  return `http://${ip.ipBackEnd}/api/dutyReports?${params.toString()}`;
});

const { data: dutyReports, status: dutyReportsStatus } = await useFetch<
  DutyReport[]
>(() => dutyReportUrl.value || "", {
  immediate: true,
  watch: false,
  headers: {
    Authorization: token.value ? `Bearer ${token.value}` : "",
  },
});

const shiftTabs = computed(() =>
  (shiftNames.value || []).map((shiftName) => ({
    label: shiftName.shift || `Shift ${shiftName.id}`,
    value: shiftName.id,
  })),
);

const relatedSupervisors = computed(
  () => cwpSupervisorData.value?.supervisors || [],
);

const supervisorTabs = computed(() =>
  relatedSupervisors.value.map((supervisor) => ({
    label: supervisor.supervisor || `Supervisor ${supervisor.id}`,
    value: supervisor.id,
  })),
);

const activeSupervisor = computed(() => {
  if (!relatedSupervisors.value.length) return null;

  return (
    relatedSupervisors.value.find(
      (supervisor) => supervisor.id === activeSupervisorId.value,
    ) || relatedSupervisors.value[0]
  );
});

const dutyReportIssueOptions = computed(() =>
  (dutyReports.value || []).map((dutyReport) => ({
    label: `${formatSupervisorAssignment(dutyReport.supervisorCwp)} · ${formatShiftLabel(dutyReport.shiftName)} · ${formatDisplayDate(dutyReport.shiftDate)}`,
    value: dutyReport.id,
  })),
);

const lhdBookOptions = computed(() =>
  lhdBooks.value.map((item) => ({
    label:
      [item.code, item.lhd].filter(Boolean).join(" — ") || `LHD ${item.id}`,
    value: item.id,
  })),
);

const linkedIssues = computed(() => {
  if (!selectedIssueDutyReportId.value) return [];

  return onGoingIssues.value.filter((issue) =>
    issue.dutyReportLinks?.some(
      (link) => link.dutyReportId === selectedIssueDutyReportId.value,
    ),
  );
});

const availableOpenIssues = computed(() => {
  const linkedIds = new Set(linkedIssues.value.map((issue) => issue.id));
  return onGoingIssues.value.filter(
    (issue) => !issue.isClosed && !linkedIds.has(issue.id),
  );
});

const openIssueOptions = computed(() =>
  availableOpenIssues.value.map((issue) => ({
    label: getIssueTitle(issue),
    value: issue.id,
  })),
);

function refreshDutyReportData() {
  refresh();
  refreshSupervisors();
  if (dutyReportUrl.value) loadDutyReportTableData();
  loadLhdBooks();
  if (selectedLhdDutyReportId.value) loadLhdReports();
}

function resetLhdForm() {
  editingLhdReportId.value = null;
  lhdForm.lhdId = undefined;
  lhdForm.time = "";
  lhdForm.message = "";
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatLhdTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function loadLhdBooks() {
  try {
    lhdBooks.value = await $fetch<LhdBook[]>(
      `http://${ip.ipBackEnd}/api/lhdBooks`,
      {
        headers: { Authorization: token.value ? `Bearer ${token.value}` : "" },
      },
    );
  } catch (error: unknown) {
    toast.add({
      title: "Load Failed",
      description: getRequestError(error, "Failed to load ICAO LHD codes."),
      color: "error",
    });
  }
}

async function loadLhdReports() {
  if (!selectedLhdDutyReportId.value) {
    lhdReports.value = [];
    return;
  }

  lhdLoading.value = true;
  try {
    lhdReports.value = await $fetch<LhdReport[]>(
      `http://${ip.ipBackEnd}/api/dutyReports/${selectedLhdDutyReportId.value}/lhdReports`,
      {
        headers: { Authorization: token.value ? `Bearer ${token.value}` : "" },
      },
    );
  } catch (error: unknown) {
    toast.add({
      title: "Load Failed",
      description: getRequestError(error, "Failed to load LHD occurrences."),
      color: "error",
    });
  } finally {
    lhdLoading.value = false;
  }
}

async function saveLhdReport() {
  if (
    !selectedLhdDutyReportId.value ||
    !lhdForm.lhdId ||
    !lhdForm.time ||
    !lhdForm.message.trim()
  ) {
    toast.add({
      title: "Incomplete LHD Report",
      description: "ICAO code, occurrence time, and details are required.",
      color: "warning",
    });
    return;
  }

  lhdSaving.value = true;
  try {
    const baseUrl = `http://${ip.ipBackEnd}/api/dutyReports/${selectedLhdDutyReportId.value}/lhdReports`;
    await $fetch(
      editingLhdReportId.value
        ? `${baseUrl}/${editingLhdReportId.value}`
        : baseUrl,
      {
        method: editingLhdReportId.value ? "PUT" : "POST",
        body: {
          lhdId: lhdForm.lhdId,
          time: new Date(lhdForm.time).toISOString(),
          message: lhdForm.message.trim(),
        },
        headers: { Authorization: token.value ? `Bearer ${token.value}` : "" },
      },
    );

    toast.add({
      title: editingLhdReportId.value
        ? "LHD Report Updated"
        : "LHD Occurrence Reported",
      description: "The LHD occurrence has been saved to this duty report.",
      color: "success",
    });
    resetLhdForm();
    await loadLhdReports();
  } catch (error: unknown) {
    toast.add({
      title: "Save Failed",
      description: getRequestError(error, "Failed to save the LHD report."),
      color: "error",
    });
  } finally {
    lhdSaving.value = false;
  }
}

function editLhdReport(report: LhdReport) {
  editingLhdReportId.value = report.id;
  lhdForm.lhdId = report.lhdId || undefined;
  lhdForm.time = toDateTimeLocal(report.time);
  lhdForm.message = report.message || "";
}

async function deleteLhdReport() {
  const report = lhdDeleteTarget.value;
  if (!report || !selectedLhdDutyReportId.value) return;

  lhdActionKey.value = `delete-${report.id}`;
  try {
    await $fetch(
      `http://${ip.ipBackEnd}/api/dutyReports/${selectedLhdDutyReportId.value}/lhdReports/${report.id}`,
      {
        method: "DELETE",
        headers: { Authorization: token.value ? `Bearer ${token.value}` : "" },
      },
    );
    if (editingLhdReportId.value === report.id) resetLhdForm();
    lhdDeleteTarget.value = null;
    await loadLhdReports();
    toast.add({ title: "LHD Report Deleted", color: "success" });
  } catch (error: unknown) {
    toast.add({
      title: "Delete Failed",
      description: getRequestError(error, "Failed to delete the LHD report."),
      color: "error",
    });
  } finally {
    lhdActionKey.value = "";
  }
}

async function loadDutyReportTableData() {
  if (!dutyReportUrl.value) return;

  try {
    dutyReports.value = await $fetch<DutyReport[]>(dutyReportUrl.value, {
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });
  } catch (error: unknown) {
    toast.add({
      title: "Load Failed",
      description: getRequestError(error, "Failed to load duty report data."),
      color: "error",
    });
  }
}

function getRequestError(error: unknown, fallback: string) {
  if (typeof error !== "object" || error === null) return fallback;

  const requestError = error as {
    data?: { message?: string; statusMessage?: string };
    message?: string;
  };

  return (
    requestError.data?.message ||
    requestError.data?.statusMessage ||
    requestError.message ||
    fallback
  );
}

function getIssueTitle(issue: OnGoingIssue) {
  return (
    issue.equipment?.equipment || issue.other || `Ongoing Issue #${issue.id}`
  );
}

function getIssueDescription(issue: OnGoingIssue) {
  if (issue.equipment?.equipment && issue.other) return issue.other;
  return issue.equipment?.equipment
    ? "No additional description."
    : issue.other;
}

function formatIssueDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getEscalationStatusColor(status: string) {
  if (status === "SENT") return "success" as const;
  if (status === "FAILED" || status === "NO_RECIPIENTS") {
    return "error" as const;
  }
  if (status === "QUEUED" || status === "DUE") return "warning" as const;
  if (status === "CANCELLED") return "neutral" as const;
  return "info" as const;
}

function getEscalationRecipients(item: EscalationScheduleItem) {
  const names = item.actors
    .map((actor) => actor.name || actor.nik)
    .filter(Boolean);
  return names.length ? names.join(", ") : "No escalation actors configured";
}

function getEscalationDeliverySummary(item: EscalationScheduleItem) {
  if (!item.emails.length) return null;
  const sent = item.emails.filter((email) => email.status === "SENT").length;
  return `${sent}/${item.emails.length} email${item.emails.length === 1 ? "" : "s"} sent`;
}

async function loadOnGoingIssues() {
  issueLoading.value = true;
  try {
    const response = await $fetch<OnGoingIssueResponse>(
      `http://${ip.ipBackEnd}/api/onGoingIssues`,
      {
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );
    onGoingIssues.value = response.issues || [];
    equipmentOptions.value = response.equipments || [];
  } catch (error: unknown) {
    toast.add({
      title: "Issue Load Failed",
      description: getRequestError(error, "Failed to load ongoing issues."),
      color: "error",
    });
  } finally {
    issueLoading.value = false;
  }
}

async function attachExistingIssue() {
  if (!selectedIssueDutyReportId.value || !selectedOpenIssueId.value) return;

  issueActionKey.value = "attach";
  try {
    await $fetch(
      `http://${ip.ipBackEnd}/api/dutyReports/${selectedIssueDutyReportId.value}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
        body: { onGoingIssueId: selectedOpenIssueId.value },
      },
    );
    selectedOpenIssueId.value = undefined;
    await loadOnGoingIssues();
    toast.add({
      title: "Issue Linked",
      description: "The ongoing issue is now included in this duty report.",
      color: "success",
    });
  } catch (error: unknown) {
    toast.add({
      title: "Link Failed",
      description: getRequestError(error, "Failed to link the issue."),
      color: "error",
    });
  } finally {
    issueActionKey.value = "";
  }
}

async function createAndAttachIssue() {
  if (!selectedIssueDutyReportId.value) return;
  if (!newIssue.equipmentId && !newIssue.other.trim()) {
    toast.add({
      title: "Issue Details Required",
      description: "Select equipment or describe the ongoing issue.",
      color: "warning",
    });
    return;
  }

  issueActionKey.value = "create";
  try {
    await $fetch(`http://${ip.ipBackEnd}/api/onGoingIssues`, {
      method: "POST",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
      body: {
        dutyReportId: selectedIssueDutyReportId.value,
        equipmentId: newIssue.equipmentId,
        other: newIssue.other,
        message: newIssue.message,
      },
    });
    newIssue.equipmentId = undefined;
    newIssue.other = "";
    newIssue.message = "";
    await loadOnGoingIssues();
    toast.add({
      title: "Issue Created",
      description: "The issue was created and linked to this duty report.",
      color: "success",
    });
  } catch (error: unknown) {
    toast.add({
      title: "Create Failed",
      description: getRequestError(error, "Failed to create the issue."),
      color: "error",
    });
  } finally {
    issueActionKey.value = "";
  }
}

async function addIssueMessage(issue: OnGoingIssue) {
  const message = issueMessageDrafts[issue.id]?.trim();
  if (!message) return;

  issueActionKey.value = `message-${issue.id}`;
  try {
    await $fetch(
      `http://${ip.ipBackEnd}/api/onGoingIssues/${issue.id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
        body: { message },
      },
    );
    issueMessageDrafts[issue.id] = "";
    await loadOnGoingIssues();
  } catch (error: unknown) {
    toast.add({
      title: "Update Failed",
      description: getRequestError(error, "Failed to add the issue update."),
      color: "error",
    });
  } finally {
    issueActionKey.value = "";
  }
}

async function closeIssue(issue: OnGoingIssue) {
  if (!window.confirm(`Close “${getIssueTitle(issue)}”?`)) return;

  issueActionKey.value = `close-${issue.id}`;
  try {
    await $fetch(`http://${ip.ipBackEnd}/api/onGoingIssues/${issue.id}/close`, {
      method: "PATCH",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });
    await loadOnGoingIssues();
    toast.add({
      title: "Issue Closed",
      description: "The issue has been marked as resolved.",
      color: "success",
    });
  } catch (error: unknown) {
    toast.add({
      title: "Close Failed",
      description: getRequestError(error, "Failed to close the issue."),
      color: "error",
    });
  } finally {
    issueActionKey.value = "";
  }
}

function openCancelEscalation(
  issue: OnGoingIssue,
  level: EscalationScheduleItem | null = null,
) {
  escalationIssueToCancel.value = issue;
  escalationLevelToCancel.value = level;
  cancelEscalationModalOpen.value = true;
}

async function confirmCancelEscalation() {
  const issue = escalationIssueToCancel.value;
  if (!issue) return;

  cancelEscalationLoading.value = true;
  try {
    const endpoint = escalationLevelToCancel.value
      ? `http://${ip.ipBackEnd}/api/onGoingIssues/${issue.id}/escalations/${escalationLevelToCancel.value.escalationLevelId}/cancel`
      : `http://${ip.ipBackEnd}/api/onGoingIssues/${issue.id}/escalation/cancel`;

    await $fetch(endpoint, {
      method: "PATCH",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });
    cancelEscalationModalOpen.value = false;
    escalationIssueToCancel.value = null;
    const cancelledLevel = escalationLevelToCancel.value;
    escalationLevelToCancel.value = null;
    await loadOnGoingIssues();
    toast.add({
      title: "Escalation Cancelled",
      description: cancelledLevel
        ? `Escalation Level ${cancelledLevel.level} and its unsent notifications were cancelled.`
        : "Future escalation levels and unsent notifications were cancelled.",
      color: "success",
    });
  } catch (error: unknown) {
    toast.add({
      title: "Cancellation Failed",
      description: getRequestError(error, "Failed to cancel escalation."),
      color: "error",
    });
  } finally {
    cancelEscalationLoading.value = false;
  }
}

async function detachIssue(issue: OnGoingIssue) {
  if (!selectedIssueDutyReportId.value) return;

  issueActionKey.value = `detach-${issue.id}`;
  try {
    await $fetch(
      `http://${ip.ipBackEnd}/api/dutyReports/${selectedIssueDutyReportId.value}/issues/${issue.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );
    await loadOnGoingIssues();
  } catch (error: unknown) {
    toast.add({
      title: "Detach Failed",
      description: getRequestError(error, "Failed to detach the issue."),
      color: "error",
    });
  } finally {
    issueActionKey.value = "";
  }
}

async function openDeleteConfirmation(dutyReportId: number) {
  deleteSummaryLoading.value = true;
  deleteAcknowledged.value = false;
  deleteSummary.value = null;
  deleteModalOpen.value = true;

  try {
    deleteSummary.value = await $fetch<DutyReportDeletionSummary>(
      `http://${ip.ipBackEnd}/api/dutyReports/${dutyReportId}/deletion-summary`,
      {
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );
  } catch (error: unknown) {
    deleteModalOpen.value = false;
    toast.add({
      title: "Unable to Review Deletion",
      description: getRequestError(
        error,
        "Failed to load related duty report records.",
      ),
      color: "error",
    });
  } finally {
    deleteSummaryLoading.value = false;
  }
}

async function confirmDeleteDutyReport() {
  if (!deleteSummary.value?.dutyReport.id || !deleteAcknowledged.value) return;

  deleteLoading.value = true;
  try {
    await $fetch(
      `http://${ip.ipBackEnd}/api/dutyReports/${deleteSummary.value.dutyReport.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    deleteModalOpen.value = false;
    deleteSummary.value = null;
    await Promise.all([loadDutyReportTableData(), loadOnGoingIssues()]);
    toast.add({
      title: "Duty Report Deleted",
      description:
        "The duty report and its owned operational records were removed. Shared ongoing issues were kept.",
      color: "success",
    });
  } catch (error: unknown) {
    toast.add({
      title: "Delete Failed",
      description: getRequestError(error, "Failed to delete the duty report."),
      color: "error",
    });
  } finally {
    deleteLoading.value = false;
  }
}

onMounted(() => {
  loadDutyReportTableData();
  loadOnGoingIssues();
  loadLhdBooks();
});

async function loadDutyReports() {
  if (!activeShiftNameId.value || !activeSupervisorId.value) {
    toast.add({
      title: "Selection Required",
      description: "Please select operation shift and supervisor first.",
      color: "warning",
    });
    return;
  }

  if (!selectedShiftDate.value) {
    toast.add({
      title: "Date Required",
      description: "Date should be filled in LOCAL TIME.",
      color: "warning",
    });
    return;
  }

  if (selectedShiftDate.value < todayLocalDate) {
    toast.add({
      title: "Invalid Date",
      description: "Past date is not allowed. Date should be in LOCAL TIME.",
      color: "error",
    });
    selectedShiftDate.value = todayLocalDate;
    return;
  }

  const requestedReport = {
    supervisorId: activeSupervisorId.value,
    shiftNameId: activeShiftNameId.value,
    date: selectedShiftDate.value,
  };

  loadDutyReportLoading.value = true;
  try {
    const reports = await $fetch<DutyReport[]>(
      `http://${ip.ipBackEnd}/api/dutyReports?date=${requestedReport.date}`,
      {
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    const existingReport = reports.find(
      (report) =>
        report.supervisorId === requestedReport.supervisorId &&
        report.shiftNameId === requestedReport.shiftNameId,
    );

    if (!existingReport) {
      pendingDutyReport.value = requestedReport;
      createDutyReportModalOpen.value = true;
      return;
    }

    confirmedDutyReportFilter.value = requestedReport;
    dutyReports.value = reports;

    toast.add({
      title: "Duty Report Loaded",
      description: "The existing duty report data has been loaded.",
      color: "success",
    });
  } catch (error: unknown) {
    toast.add({
      title: "Load Failed",
      description: getRequestError(error, "Failed to check duty report data."),
      color: "error",
    });
  } finally {
    loadDutyReportLoading.value = false;
  }
}

async function confirmCreateDutyReport() {
  if (!pendingDutyReport.value) return;

  const requestedReport = pendingDutyReport.value;
  createDutyReportLoading.value = true;

  try {
    const response = await $fetch<{ alreadyExists?: boolean }>(
      `http://${ip.ipBackEnd}/api/dutyReports/supervisor`,
      {
        method: "POST",
        body: requestedReport,
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    confirmedDutyReportFilter.value = requestedReport;
    createDutyReportModalOpen.value = false;
    pendingDutyReport.value = null;
    await nextTick();
    await loadDutyReportTableData();

    toast.add({
      title: response.alreadyExists
        ? "Duty Report Loaded"
        : "Duty Report Created",
      description: response.alreadyExists
        ? "Another request already created this duty report, so its data was loaded."
        : "The new duty report has been created successfully.",
      color: "success",
    });
  } catch (error: unknown) {
    toast.add({
      title: "Creation Failed",
      description: getRequestError(error, "Failed to create the duty report."),
      color: "error",
    });
  } finally {
    createDutyReportLoading.value = false;
  }
}

function cancelCreateDutyReport() {
  createDutyReportModalOpen.value = false;
  pendingDutyReport.value = null;
}

const pendingShiftLabel = computed(() => {
  const shift = (shiftNames.value || []).find(
    (item) => item.id === pendingDutyReport.value?.shiftNameId,
  );
  return formatShiftLabel(shift || null);
});

const pendingSupervisorLabel = computed(() => {
  const supervisor = relatedSupervisors.value.find(
    (item) => item.id === pendingDutyReport.value?.supervisorId,
  );
  return supervisor?.supervisor || "-";
});

const activeShiftName = computed(() => {
  const shifts = shiftNames.value || [];

  if (!shifts.length) return null;

  return (
    shifts.find((shiftName) => shiftName.id === activeShiftNameId.value) ||
    shifts[0]
  );
});

watch(
  shiftNames,
  (nextShiftNames) => {
    if (!nextShiftNames?.length) {
      activeShiftNameId.value = undefined;
      return;
    }

    const hasActiveShift = nextShiftNames.some(
      (shiftName) => shiftName.id === activeShiftNameId.value,
    );

    if (!hasActiveShift) {
      activeShiftNameId.value = nextShiftNames[0]?.id;
    }
  },
  { immediate: true },
);

watch(
  relatedSupervisors,
  (nextSupervisors) => {
    if (!nextSupervisors?.length) {
      activeSupervisorId.value = undefined;
      return;
    }

    const hasActiveSupervisor = nextSupervisors.some(
      (supervisor) => supervisor.id === activeSupervisorId.value,
    );

    if (!hasActiveSupervisor) {
      activeSupervisorId.value = nextSupervisors[0]?.id;
    }
  },
  { immediate: true },
);

watch(
  dutyReports,
  (nextDutyReports) => {
    if (!nextDutyReports?.length) {
      selectedIssueDutyReportId.value = undefined;
      selectedLhdDutyReportId.value = undefined;
      return;
    }

    const stillAvailable = nextDutyReports.some(
      (dutyReport) => dutyReport.id === selectedIssueDutyReportId.value,
    );
    if (!stillAvailable) {
      selectedIssueDutyReportId.value = nextDutyReports[0]?.id;
    }

    const lhdReportStillAvailable = nextDutyReports.some(
      (dutyReport) => dutyReport.id === selectedLhdDutyReportId.value,
    );
    if (!lhdReportStillAvailable) {
      selectedLhdDutyReportId.value = nextDutyReports[0]?.id;
    }
  },
  { immediate: true },
);

watch(
  selectedLhdDutyReportId,
  async () => {
    resetLhdForm();
    await loadLhdReports();
  },
  { immediate: true },
);

function formatDuration(duration: number | null) {
  if (duration === null || duration === undefined) return "-";

  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  if (!hours) return `${minutes} minutes`;
  if (!minutes) return `${hours} hours`;

  return `${hours} hours ${minutes} minutes`;
}

function formatLocalDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

function extractTime(value: string | null | undefined) {
  if (!value) return null;

  const trimmed = String(value).trim();

  // ISO 8601 / RFC 2822 date strings
  const date = new Date(trimmed);
  if (!Number.isNaN(date.getTime())) {
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();

    return {
      hours: String(hours).padStart(2, "0"),
      minutes: String(minutes).padStart(2, "0"),
      totalMinutes: hours * 60 + minutes,
    };
  }

  // Time-only strings: "HH:mm" or "HH:mm:ss"
  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

    return {
      hours: String(hours).padStart(2, "0"),
      minutes: String(minutes).padStart(2, "0"),
      totalMinutes: hours * 60 + minutes,
    };
  }

  return null;
}

function formatMinutes(totalMinutes: number) {
  const normalized = totalMinutes % (24 * 60);
  const hours = String(Math.floor(normalized / 60)).padStart(2, "0");
  const minutes = String(normalized % 60).padStart(2, "0");

  return `${hours}:${minutes}`;
}

type ParsedShift = {
  startMinutes: number;
  endMinutes: number;
  isControl?: boolean;
};

function getShiftDebug(shiftName: DutyReport["shiftName"]) {
  if (!shiftName) {
    return { label: "-", parsedShifts: [] as ParsedShift[] };
  }

  const rawShifts = shiftName.shifts || [];
  if (!rawShifts.length) {
    return {
      label: `${shiftName.shift || "Shift"}(-)`,
      parsedShifts: [] as ParsedShift[],
    };
  }

  const parsedShifts: ParsedShift[] = rawShifts
    .map((shift) => {
      const start = extractTime(shift.start);
      const end = extractTime(shift.end);

      if (!start || !end) return null;

      const startMinutes = start.totalMinutes;
      let endMinutes = end.totalMinutes;

      if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
      }

      return { startMinutes, endMinutes, isControl: shift.isControl };
    })
    .filter(Boolean) as ParsedShift[];

  if (!parsedShifts.length) {
    return {
      label: `${shiftName.shift || "Shift"}(-)`,
      parsedShifts: [] as ParsedShift[],
    };
  }

  // Normalize control (on-duty) intervals chronologically, ignoring rest
  // segments when computing the displayed shift span so that overnight
  // shifts (e.g. 23:00-01:00 with a 01:00-03:00 rest) show the correct
  // overall range (e.g. 23:00-05:00) instead of being clipped.
  const controlShifts = parsedShifts
    .filter((shift) => shift.isControl)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const overnightControl = controlShifts.find(
    (shift) => shift.endMinutes >= 24 * 60,
  );
  const normalizedControls: ParsedShift[] = controlShifts
    .map((shift) => {
      const shouldMoveToNextDay =
        overnightControl && shift.startMinutes < overnightControl.startMinutes;

      return {
        startMinutes: shift.startMinutes + (shouldMoveToNextDay ? 24 * 60 : 0),
        endMinutes: shift.endMinutes + (shouldMoveToNextDay ? 24 * 60 : 0),
      };
    })
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const spanShifts =
    normalizedControls.length > 0 ? normalizedControls : parsedShifts;

  const firstShift = spanShifts[0];
  const lastShift = spanShifts[spanShifts.length - 1];

  if (!firstShift || !lastShift) {
    return {
      label: `${shiftName.shift || "Shift"}(-)`,
      parsedShifts,
    };
  }

  const label = `${shiftName.shift || "Shift"} (${formatMinutes(firstShift.startMinutes)}-${formatMinutes(lastShift.endMinutes)})`;

  return { label, parsedShifts };
}

function formatShiftLabel(shiftName: DutyReport["shiftName"]) {
  return getShiftDebug(shiftName).label;
}

function formatOnGoingIssue(issue: OnGoingIssue | null) {
  if (!issue) return "-";

  return issue.equipment?.equipment || issue.other || `Issue ${issue.id}`;
}

function formatDutyReportOnGoingIssues(
  dutyReportId: number,
  legacyIssue: OnGoingIssue | null,
) {
  const titles = onGoingIssues.value
    .filter((issue) =>
      issue.dutyReportLinks?.some((link) => link.dutyReportId === dutyReportId),
    )
    .map(getIssueTitle);

  if (titles.length) return titles.join(", ");
  return formatOnGoingIssue(legacyIssue);
}

function formatCwp(cwp: Cwp | null | undefined) {
  if (!cwp) return "-";

  return cwp.cwp || "-";
}

function formatSupervisorCwps(
  supervisor: SupervisorDefinition | null | undefined,
) {
  const cwpRows = supervisor?.cwpSupervisors || [];

  if (!cwpRows.length) return "-";

  return cwpRows.map((item) => formatCwp(item.cwp)).join(", ");
}

function formatSupervisorAssignment(
  supervisor: SupervisorDefinition | null | undefined,
) {
  if (!supervisor) return "-";

  return supervisor.supervisor || "-";
}

const renderedRows = computed(() =>
  (dutyReports.value || []).map((dutyReport, index) => {
    const shiftDebug = getShiftDebug(dutyReport.shiftName);

    return {
      no: index + 1,
      id: dutyReport.id,
      supervisorAssignment: formatSupervisorAssignment(
        dutyReport.supervisorCwp,
      ),
      handledCwp: formatSupervisorCwps(dutyReport.supervisorCwp),
      shift: shiftDebug.label,
      shiftParsedShifts: shiftDebug.parsedShifts,
      onGoingIssue: formatDutyReportOnGoingIssues(
        dutyReport.id,
        dutyReport.onGoingIssue,
      ),
      supervisor: dutyReport.spv?.name || dutyReport.supervisor || "-",
      shiftDate: formatDisplayDate(dutyReport.shiftDate),
    };
  }),
);
</script>

<template>
  <UDashboardPanel id="duty-report">
    <template #header>
      <UDashboardNavbar title="Duty Report">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="Refresh"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            @click="refreshDutyReportData"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <UCard>
          <template #header>
            <div class="flex flex-col gap-3">
              <div>
                <h2 class="font-semibold text-highlighted">
                  Operation Shift Tabs
                </h2>
                <p class="text-sm text-muted">
                  Select a related shift name to prepare its duty report.
                </p>
              </div>

              <UTabs
                v-if="shiftTabs.length"
                v-model="activeShiftNameId"
                :items="shiftTabs"
                :content="false"
                size="lg"
              />
            </div>
          </template>

          <div v-if="status === 'pending'" class="py-8 text-center text-muted">
            Loading related shifts...
          </div>

          <div
            v-else-if="!shiftTabs.length"
            class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-sm text-muted"
          >
            No related shift name found for your branch unit.
          </div>

          <div v-else-if="activeShiftName" class="space-y-4">
            <div class="rounded-xl border border-default bg-elevated/30 p-4">
              <div class="text-xs uppercase text-muted">Selected Shift</div>
              <div class="text-lg font-semibold text-highlighted">
                {{ activeShiftName.shift || "-" }}
              </div>
            </div>

            <div class="overflow-x-auto rounded-lg border border-default">
              <table class="w-full min-w-full border-collapse text-sm">
                <thead class="bg-elevated/50">
                  <tr>
                    <th class="border border-default px-4 py-3 text-left">
                      No
                    </th>
                    <th class="border border-default px-4 py-3 text-left">
                      Start
                    </th>
                    <th class="border border-default px-4 py-3 text-left">
                      End
                    </th>
                    <th class="border border-default px-4 py-3 text-left">
                      Duration
                    </th>
                    <th class="border border-default px-4 py-3 text-left">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(shiftDetail, index) in activeShiftName.shifts"
                    :key="shiftDetail.id"
                  >
                    <td class="border border-default px-4 py-3">
                      {{ index + 1 }}
                    </td>
                    <td class="border border-default px-4 py-3">
                      {{ shiftDetail.start || "-" }}
                    </td>
                    <td class="border border-default px-4 py-3">
                      {{ shiftDetail.end || "-" }}
                    </td>
                    <td class="border border-default px-4 py-3 text-muted">
                      {{ formatDuration(shiftDetail.duration) }}
                    </td>
                    <td class="border border-default px-4 py-3">
                      <UBadge
                        :color="shiftDetail.isControl ? 'success' : 'neutral'"
                        variant="soft"
                      >
                        {{ shiftDetail.isControl ? "On Duty" : "Rest" }}
                      </UBadge>
                    </td>
                  </tr>

                  <tr v-if="!activeShiftName.shifts?.length">
                    <td
                      colspan="5"
                      class="border border-default px-4 py-6 text-center text-muted"
                    >
                      No shift detail found.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex flex-col gap-3">
              <div>
                <h2 class="font-semibold text-highlighted">
                  Related Supervisors
                </h2>
                <p class="text-sm text-muted">
                  Select a supervisor assignment related to your branch unit.
                </p>
              </div>

              <UTabs
                v-if="supervisorTabs.length"
                v-model="activeSupervisorId"
                :items="supervisorTabs"
                :content="false"
                size="lg"
              />
            </div>
          </template>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <div
                v-if="supervisorsStatus === 'pending'"
                class="py-8 text-center text-muted"
              >
                Loading related supervisors...
              </div>

              <div
                v-else-if="!supervisorTabs.length"
                class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-sm text-muted"
              >
                No related supervisor assignment found.
              </div>

              <div
                v-else-if="activeSupervisor"
                class="rounded-xl border border-default bg-elevated/30 p-4"
              >
                <div class="text-xs uppercase text-muted">
                  Selected Supervisor
                </div>
                <div class="text-lg font-semibold text-highlighted">
                  {{ activeSupervisor.supervisor || "-" }}
                </div>
                <div class="mt-2 text-sm text-muted">
                  Handled CWP: {{ formatSupervisorCwps(activeSupervisor) }}
                </div>
              </div>
            </div>

            <div class="rounded-xl border border-default bg-elevated/30 p-4">
              <div class="mb-4">
                <h3 class="font-semibold text-highlighted">Load Duty Report</h3>
                <p class="text-sm text-muted">
                  Confirm shift, supervisor, and local date before loading data.
                </p>
              </div>

              <div class="space-y-3 text-sm">
                <div class="rounded-lg border border-default bg-default p-3">
                  <div class="text-xs uppercase text-muted">Shift</div>
                  <USelectMenu
                    v-model="activeShiftNameId"
                    class="mt-2 w-full"
                    :items="shiftTabs"
                    value-key="value"
                    label-key="label"
                    placeholder="Select shift"
                  />
                </div>

                <div class="rounded-lg border border-default bg-default p-3">
                  <div class="text-xs uppercase text-muted">Supervisor</div>
                  <USelectMenu
                    v-model="activeSupervisorId"
                    class="mt-2 w-full"
                    :items="supervisorTabs"
                    value-key="value"
                    label-key="label"
                    placeholder="Select supervisor"
                  />
                </div>

                <UFormField label="Date" required>
                  <UInput
                    v-model="selectedShiftDate"
                    class="w-full"
                    type="date"
                    :min="todayLocalDate"
                  />
                </UFormField>

                <UAlert
                  color="warning"
                  variant="soft"
                  icon="i-lucide-info"
                  title="Local Time Date"
                  description="Date should be selected in LOCAL TIME format."
                />

                <UButton
                  label="Assign Supervisor"
                  icon="i-lucide-pencil"
                  color="primary"
                  block
                  :loading="loadDutyReportLoading"
                  :disabled="
                    !activeShiftNameId ||
                    !activeSupervisorId ||
                    !selectedShiftDate
                  "
                  @click="loadDutyReports"
                />
              </div>
            </div>
          </div>
        </UCard>

        <UModal
          v-model:open="createDutyReportModalOpen"
          title="Create New Duty Report?"
          description="No duty report exists for this exact shift, supervisor assignment, and date."
          :dismissible="!createDutyReportLoading"
        >
          <template #body>
            <div class="space-y-4">
              <UAlert
                color="warning"
                variant="soft"
                icon="i-lucide-file-plus-2"
                title="A new database record will be created"
                description="Continue only if you intend to start a new duty report for the selection below."
              />

              <div
                class="space-y-3 rounded-xl border border-default bg-elevated/30 p-4 text-sm"
              >
                <div class="flex items-start justify-between gap-4">
                  <span class="text-muted">Supervisor Assignment</span>
                  <span class="text-right font-medium text-highlighted">
                    {{ pendingSupervisorLabel }}
                  </span>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <span class="text-muted">Shift</span>
                  <span class="text-right font-medium text-highlighted">
                    {{ pendingShiftLabel }}
                  </span>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <span class="text-muted">Date</span>
                  <span class="text-right font-medium text-highlighted">
                    {{ formatDisplayDate(pendingDutyReport?.date) }}
                  </span>
                </div>
              </div>

              <div class="flex justify-end gap-2">
                <UButton
                  label="Cancel"
                  color="neutral"
                  variant="subtle"
                  :disabled="createDutyReportLoading"
                  @click="cancelCreateDutyReport"
                />
                <UButton
                  label="Create Duty Report"
                  icon="i-lucide-file-plus-2"
                  color="primary"
                  :loading="createDutyReportLoading"
                  @click="confirmCreateDutyReport"
                />
              </div>
            </div>
          </template>
        </UModal>

        <UCard>
          <template #header>
            <div>
              <h2 class="font-semibold text-highlighted">
                Supervisor Assignment
              </h2>
            </div>
          </template>

          <div
            v-if="dutyReportsStatus === 'pending'"
            class="py-8 text-center text-muted"
          >
            Loading duty reports...
          </div>

          <div
            v-else-if="!renderedRows.length"
            class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-sm text-muted"
          >
            No duty report rows found.
          </div>

          <div v-else class="overflow-x-auto rounded-lg border border-default">
            <table class="w-full min-w-full border-collapse text-sm">
              <thead class="bg-elevated/50">
                <tr>
                  <th class="border border-default px-4 py-3 text-left">No</th>
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
                    Shift date
                  </th>
                  <th class="border border-default px-4 py-3 text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in renderedRows" :key="row.id">
                  <td class="border border-default px-4 py-3">
                    {{ row.no }}
                  </td>
                  <td class="border border-default px-4 py-3">
                    <div class="font-semibold text-highlighted">
                      {{ row.supervisorAssignment }}
                    </div>
                    <div class="text-xs text-muted">
                      {{ row.handledCwp }}
                    </div>
                  </td>
                  <td class="border border-default px-4 py-3">
                    {{ row.shift }}
                  </td>
                  <td class="border border-default px-4 py-3">
                    {{ row.onGoingIssue }}
                  </td>
                  <td class="border border-default px-4 py-3">
                    {{ row.supervisor }}
                  </td>
                  <td class="border border-default px-4 py-3">
                    {{ row.shiftDate }}
                  </td>
                  <td class="border border-default px-4 py-3 text-center">
                    <UButton
                      label="Delete"
                      icon="i-lucide-trash-2"
                      color="error"
                      variant="soft"
                      size="sm"
                      @click="openDeleteConfirmation(row.id)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>

        <UModal
          v-model:open="deleteModalOpen"
          title="Delete Duty Report"
          description="Review all related records before confirming deletion."
          :dismissible="!deleteLoading"
          :ui="{ content: 'max-w-2xl' }"
        >
          <template #body>
            <div
              v-if="deleteSummaryLoading"
              class="py-8 text-center text-muted"
            >
              Checking related duty report records...
            </div>

            <div v-else-if="deleteSummary" class="space-y-4">
              <UAlert
                color="error"
                variant="soft"
                icon="i-lucide-triangle-alert"
                title="This deletion affects related operational data"
                description="The duty report, frequency statuses, logbooks, and LHD records listed below will be removed. Ongoing issues will remain available but will be detached from this report."
              />

              <div class="rounded-xl border border-default bg-elevated/30 p-4">
                <div class="font-semibold text-highlighted">
                  {{
                    deleteSummary.dutyReport.supervisorAssignment ||
                    `Duty Report #${deleteSummary.dutyReport.id}`
                  }}
                </div>
                <div class="mt-1 text-sm text-muted">
                  {{ deleteSummary.dutyReport.shift || "Unknown shift" }} ·
                  {{ formatDisplayDate(deleteSummary.dutyReport.shiftDate) }}
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div
                  class="rounded-lg border border-warning/40 bg-warning/5 p-3 text-center"
                >
                  <div class="text-2xl font-semibold text-warning">
                    {{ deleteSummary.dependencies.onGoingIssues }}
                  </div>
                  <div class="text-xs text-muted">Ongoing Issues</div>
                  <div class="mt-1 text-[11px] text-muted">
                    Will be detached
                  </div>
                </div>
                <div
                  class="rounded-lg border border-error/40 bg-error/5 p-3 text-center"
                >
                  <div class="text-2xl font-semibold text-error">
                    {{ deleteSummary.dependencies.statusFrequencies }}
                  </div>
                  <div class="text-xs text-muted">Frequency Statuses</div>
                  <div class="mt-1 text-[11px] text-muted">Will be removed</div>
                </div>
                <div
                  class="rounded-lg border border-error/40 bg-error/5 p-3 text-center"
                >
                  <div class="text-2xl font-semibold text-error">
                    {{ deleteSummary.dependencies.logBooks }}
                  </div>
                  <div class="text-xs text-muted">Logbooks</div>
                  <div class="mt-1 text-[11px] text-muted">Will be removed</div>
                </div>
                <div
                  class="rounded-lg border border-error/40 bg-error/5 p-3 text-center"
                >
                  <div class="text-2xl font-semibold text-error">
                    {{ deleteSummary.dependencies.lhdReports }}
                  </div>
                  <div class="text-xs text-muted">LHD Records</div>
                  <div class="mt-1 text-[11px] text-muted">Will be removed</div>
                </div>
              </div>

              <UCheckbox
                v-model="deleteAcknowledged"
                label="I understand which records will be affected and want to delete this duty report."
                :disabled="deleteLoading"
              />

              <div class="flex justify-end gap-2">
                <UButton
                  label="Cancel"
                  color="neutral"
                  variant="subtle"
                  :disabled="deleteLoading"
                  @click="
                    () => {
                      deleteModalOpen = false;
                    }
                  "
                />
                <UButton
                  label="Delete Duty Report"
                  icon="i-lucide-trash-2"
                  color="error"
                  :loading="deleteLoading"
                  :disabled="!deleteAcknowledged"
                  @click="confirmDeleteDutyReport"
                />
              </div>
            </div>
          </template>
        </UModal>

        <UModal
          :open="Boolean(lhdDeleteTarget)"
          title="Delete LHD Report?"
          description="This removes the reported occurrence from the duty report."
          :dismissible="!lhdActionKey"
          @update:open="
            (open) => {
              if (!open && !lhdActionKey) lhdDeleteTarget = null;
            }
          "
        >
          <template #body>
            <div class="space-y-4">
              <UAlert
                color="error"
                variant="soft"
                icon="i-lucide-triangle-alert"
                title="The LHD occurrence will be removed"
                :description="
                  lhdDeleteTarget?.lhdBook?.code || 'Selected LHD report'
                "
              />
              <div class="flex justify-end gap-2">
                <UButton
                  label="Cancel"
                  color="neutral"
                  variant="subtle"
                  :disabled="Boolean(lhdActionKey)"
                  @click="() => { lhdDeleteTarget = null; }"
                />
                <UButton
                  label="Delete LHD Report"
                  icon="i-lucide-trash-2"
                  color="error"
                  :loading="Boolean(lhdActionKey)"
                  @click="deleteLhdReport"
                />
              </div>
            </div>
          </template>
        </UModal>

        <UCard>
          <template #header>
            <div class="flex flex-col gap-1">
              <h2 class="font-semibold text-highlighted">Ongoing Issues</h2>
              <p class="text-sm text-muted">
                Carry active issues into this shift, record progress, or close
                resolved issues.
              </p>
            </div>
          </template>

          <div
            v-if="!dutyReportIssueOptions.length"
            class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
          >
            Load or create a duty report before managing ongoing issues.
          </div>

          <div v-else class="space-y-5">
            <UFormField label="Duty Report" required>
              <USelectMenu
                v-model="selectedIssueDutyReportId"
                :items="dutyReportIssueOptions"
                value-key="value"
                label-key="label"
                class="w-full"
                placeholder="Select a duty report"
              />
            </UFormField>

            <div
              v-if="issueLoading"
              class="rounded-xl border border-default p-6 text-center text-sm text-muted"
            >
              Loading ongoing issues...
            </div>

            <div v-else class="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div class="space-y-3">
                <div>
                  <h3 class="font-semibold text-highlighted">
                    Issues in This Report
                  </h3>
                  <p class="text-sm text-muted">
                    Updates remain attached to the same issue across shifts.
                  </p>
                </div>

                <div
                  v-if="!linkedIssues.length"
                  class="rounded-xl border border-dashed border-default p-5 text-center text-sm text-muted"
                >
                  No issues linked to this duty report.
                </div>

                <div
                  v-for="issue in linkedIssues"
                  :key="issue.id"
                  class="space-y-3 rounded-xl border border-default bg-elevated/20 p-4"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div class="font-semibold text-highlighted">
                        {{ getIssueTitle(issue) }}
                      </div>
                      <div class="mt-1 text-sm text-muted">
                        {{ getIssueDescription(issue) }}
                      </div>
                      <div class="mt-1 text-xs text-dimmed">
                        Started {{ formatIssueDate(issue.start) }}
                        <template v-if="issue.reporterUser?.name">
                          · {{ issue.reporterUser.name }}
                        </template>
                      </div>
                    </div>
                    <UBadge
                      :color="issue.isClosed ? 'neutral' : 'warning'"
                      variant="soft"
                    >
                      {{ issue.isClosed ? "Closed" : "Active" }}
                    </UBadge>
                  </div>

                  <div
                    v-if="issue.messages?.length"
                    class="space-y-2 rounded-lg border border-default bg-default p-3"
                  >
                    <div class="text-xs font-medium uppercase text-muted">
                      Latest Updates
                    </div>
                    <div
                      v-for="message in issue.messages.slice(-3)"
                      :key="message.id"
                      class="text-sm"
                    >
                      <span class="text-muted">
                        {{ formatIssueDate(message.createdAt) }} ·
                      </span>
                      {{ message.message }}
                    </div>
                  </div>

                  <div
                    class="space-y-2 rounded-lg border border-default bg-default p-3"
                  >
                    <div
                      class="flex flex-wrap items-center justify-between gap-2"
                    >
                      <div class="text-xs font-medium uppercase text-muted">
                        Escalation Schedule
                      </div>
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-xs text-muted">
                          Email worker runs every 15 minutes
                        </span>
                        <UButton
                          v-if="
                            !issue.isClosed && issue.escalationEnabled !== false
                          "
                          label="Cancel Escalation"
                          icon="i-lucide-bell-off"
                          color="error"
                          variant="soft"
                          size="xs"
                          @click="openCancelEscalation(issue)"
                        />
                      </div>
                    </div>

                    <UAlert
                      v-if="issue.escalationEnabled === false"
                      color="neutral"
                      variant="soft"
                      icon="i-lucide-bell-off"
                      title="Escalation cancelled"
                      description="No further escalation levels or emails will be processed for this issue."
                    />

                    <div
                      v-if="!issue.escalationSchedule?.length"
                      class="text-sm text-muted"
                    >
                      No escalation levels configured for this branch.
                    </div>

                    <div
                      v-for="item in issue.escalationSchedule || []"
                      :key="item.escalationLevelId"
                      class="rounded-lg border border-default bg-elevated/30 p-3"
                    >
                      <div
                        class="flex flex-wrap items-start justify-between gap-3"
                      >
                        <div>
                          <div class="font-medium text-highlighted">
                            Level {{ item.level }} · {{ item.time }} minutes
                          </div>
                          <div class="mt-1 text-xs text-muted">
                            Due {{ formatIssueDate(item.dueAt) }} · Estimated
                            email execution
                            {{ formatIssueDate(item.estimatedExecutionAt) }}
                          </div>
                          <div class="mt-1 text-xs text-muted">
                            Recipients: {{ getEscalationRecipients(item) }}
                          </div>
                          <div
                            v-if="getEscalationDeliverySummary(item)"
                            class="mt-1 text-xs text-muted"
                          >
                            {{ getEscalationDeliverySummary(item) }}
                          </div>
                        </div>
                        <UBadge
                          :color="getEscalationStatusColor(item.status)"
                          variant="soft"
                        >
                          {{ item.status.replaceAll("_", " ") }}
                        </UBadge>
                        <UButton
                          v-if="
                            !issue.isClosed &&
                            issue.escalationEnabled !== false &&
                            ['WAITING', 'DUE', 'QUEUED'].includes(item.status)
                          "
                          label="Cancel Level"
                          icon="i-lucide-x"
                          color="error"
                          variant="ghost"
                          size="xs"
                          @click="openCancelEscalation(issue, item)"
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="!issue.isClosed"
                    class="flex flex-col gap-2 sm:flex-row"
                  >
                    <UInput
                      v-model="issueMessageDrafts[issue.id]"
                      class="flex-1"
                      placeholder="Add progress update..."
                      @keyup.enter="addIssueMessage(issue)"
                    />
                    <UButton
                      label="Add Update"
                      icon="i-lucide-message-square-plus"
                      color="neutral"
                      variant="soft"
                      :loading="issueActionKey === `message-${issue.id}`"
                      :disabled="!issueMessageDrafts[issue.id]?.trim()"
                      @click="addIssueMessage(issue)"
                    />
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <UButton
                      v-if="!issue.isClosed"
                      label="Close Issue"
                      icon="i-lucide-circle-check"
                      color="success"
                      variant="soft"
                      :loading="issueActionKey === `close-${issue.id}`"
                      @click="closeIssue(issue)"
                    />
                    <UButton
                      label="Detach from Report"
                      icon="i-lucide-unlink"
                      color="neutral"
                      variant="ghost"
                      :loading="issueActionKey === `detach-${issue.id}`"
                      @click="detachIssue(issue)"
                    />
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <div class="rounded-xl border border-default p-4">
                  <h3 class="font-semibold text-highlighted">
                    Carry Forward an Active Issue
                  </h3>
                  <p class="mb-3 text-sm text-muted">
                    Link an issue reported during an earlier shift.
                  </p>
                  <div class="flex flex-col gap-2 sm:flex-row">
                    <USelectMenu
                      v-model="selectedOpenIssueId"
                      :items="openIssueOptions"
                      value-key="value"
                      label-key="label"
                      class="flex-1"
                      placeholder="Select an active issue"
                    />
                    <UButton
                      label="Link Issue"
                      icon="i-lucide-link"
                      :loading="issueActionKey === 'attach'"
                      :disabled="!selectedOpenIssueId"
                      @click="attachExistingIssue"
                    />
                  </div>
                  <p
                    v-if="!availableOpenIssues.length"
                    class="mt-2 text-xs text-muted"
                  >
                    No other active issues are available for this branch.
                  </p>
                </div>

                <div class="space-y-3 rounded-xl border border-default p-4">
                  <div>
                    <h3 class="font-semibold text-highlighted">
                      Report a New Issue
                    </h3>
                    <p class="text-sm text-muted">
                      The reporter and branch are filled from your account.
                    </p>
                  </div>

                  <UFormField label="Equipment">
                    <USelectMenu
                      v-model="newIssue.equipmentId"
                      :items="
                        equipmentOptions.map((equipment) => ({
                          label:
                            equipment.equipment || `Equipment ${equipment.id}`,
                          value: equipment.id,
                        }))
                      "
                      value-key="value"
                      label-key="label"
                      class="w-full"
                      placeholder="Select equipment (optional)"
                    />
                  </UFormField>

                  <UFormField label="Issue Description">
                    <UTextarea
                      v-model="newIssue.other"
                      class="w-full"
                      :rows="3"
                      placeholder="Describe the problem, impact, or current condition..."
                    />
                  </UFormField>

                  <UFormField label="Initial Update">
                    <UTextarea
                      v-model="newIssue.message"
                      class="w-full"
                      :rows="2"
                      placeholder="Optional first action or progress note..."
                    />
                  </UFormField>

                  <UButton
                    label="Create & Link Issue"
                    icon="i-lucide-circle-plus"
                    :loading="issueActionKey === 'create'"
                    :disabled="!newIssue.equipmentId && !newIssue.other.trim()"
                    @click="createAndAttachIssue"
                  />
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex flex-col gap-1">
              <h2 class="font-semibold text-highlighted">LHD Report</h2>
              <p class="text-sm text-muted">
                Add a report only when a Large Heading Deviation occurrence is
                observed.
              </p>
            </div>
          </template>

          <div
            v-if="!dutyReportIssueOptions.length"
            class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
          >
            Load or create a duty report before reporting an LHD occurrence.
          </div>

          <div v-else class="space-y-5">
            <UFormField label="Duty Report" required>
              <USelectMenu
                v-model="selectedLhdDutyReportId"
                :items="dutyReportIssueOptions"
                value-key="value"
                label-key="label"
                class="w-full"
                placeholder="Select a duty report"
              />
            </UFormField>

            <div
              class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]"
            >
              <div class="space-y-3">
                <div>
                  <h3 class="font-semibold text-highlighted">
                    Reported Occurrences
                  </h3>
                  <p class="text-sm text-muted">
                    Only actual LHD events appear here.
                  </p>
                </div>

                <div
                  v-if="lhdLoading"
                  class="rounded-xl border border-default p-6 text-center text-sm text-muted"
                >
                  Loading LHD reports...
                </div>
                <div
                  v-else-if="!lhdReports.length"
                  class="rounded-xl border border-dashed border-default p-6 text-center text-sm text-muted"
                >
                  No LHD occurrence has been reported for this duty report.
                </div>
                <div
                  v-else
                  class="overflow-x-auto rounded-lg border border-default"
                >
                  <table class="w-full min-w-[720px] border-collapse text-sm">
                    <thead class="bg-elevated/50">
                      <tr>
                        <th class="border border-default px-3 py-2 text-left">
                          ICAO Code
                        </th>
                        <th class="border border-default px-3 py-2 text-left">
                          Occurrence Time
                        </th>
                        <th class="border border-default px-3 py-2 text-left">
                          Details
                        </th>
                        <th class="border border-default px-3 py-2 text-center">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="report in lhdReports" :key="report.id">
                        <td class="border border-default px-3 py-2">
                          <div class="font-semibold text-highlighted">
                            {{ report.lhdBook?.code || "-" }}
                          </div>
                          <div class="text-xs text-muted">
                            {{ report.lhdBook?.lhd || "Unknown code" }}
                          </div>
                        </td>
                        <td class="border border-default px-3 py-2">
                          {{ formatLhdTime(report.time) }}
                        </td>
                        <td
                          class="max-w-md whitespace-pre-wrap border border-default px-3 py-2"
                        >
                          {{ report.message || "-" }}
                        </td>
                        <td class="border border-default px-3 py-2">
                          <div class="flex justify-center gap-1">
                            <UButton
                              icon="i-lucide-pencil"
                              label="Edit"
                              size="xs"
                              color="neutral"
                              variant="ghost"
                              @click="editLhdReport(report)"
                            />
                            <UButton
                              icon="i-lucide-trash-2"
                              label="Delete"
                              size="xs"
                              color="error"
                              variant="ghost"
                              @click="() => { lhdDeleteTarget = report; }"
                            />
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="space-y-4 rounded-xl border border-default p-4">
                <div>
                  <h3 class="font-semibold text-highlighted">
                    {{
                      editingLhdReportId
                        ? "Edit LHD Report"
                        : "Report LHD Occurrence"
                    }}
                  </h3>
                  <p class="text-sm text-muted">
                    Use the applicable ICAO LHD classification.
                  </p>
                </div>
                <UFormField label="ICAO LHD Code" required>
                  <USelectMenu
                    v-model="lhdForm.lhdId"
                    :items="lhdBookOptions"
                    value-key="value"
                    label-key="label"
                    class="w-full"
                    placeholder="Select ICAO code"
                  />
                </UFormField>
                <UFormField label="Occurrence Date & Time" required>
                  <UInput
                    v-model="lhdForm.time"
                    type="datetime-local"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Occurrence Details" required>
                  <UTextarea
                    v-model="lhdForm.message"
                    class="w-full"
                    :rows="5"
                    placeholder="Describe the observed deviation and relevant operational details..."
                  />
                </UFormField>
                <div class="flex flex-wrap gap-2">
                  <UButton
                    :label="
                      editingLhdReportId
                        ? 'Update LHD Report'
                        : 'Save LHD Report'
                    "
                    icon="i-lucide-save"
                    :loading="lhdSaving"
                    :disabled="
                      !lhdForm.lhdId || !lhdForm.time || !lhdForm.message.trim()
                    "
                    @click="saveLhdReport"
                  />
                  <UButton
                    v-if="editingLhdReportId"
                    label="Cancel Edit"
                    color="neutral"
                    variant="ghost"
                    :disabled="lhdSaving"
                    @click="resetLhdForm"
                  />
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <UModal
          v-model:open="cancelEscalationModalOpen"
          :title="
            escalationLevelToCancel
              ? `Cancel Escalation Level ${escalationLevelToCancel.level}?`
              : 'Cancel All Escalation?'
          "
          :description="
            escalationLevelToCancel
              ? 'Only this escalation level and its unsent email notifications will be cancelled.'
              : 'This ongoing issue will remain open, but all future escalation levels and unsent email notifications will be cancelled.'
          "
          :dismissible="!cancelEscalationLoading"
        >
          <template #body>
            <div class="space-y-4">
              <UAlert
                color="warning"
                variant="soft"
                icon="i-lucide-triangle-alert"
                title="This action only affects escalation"
                description="Emails that have already been sent cannot be recalled. Other escalation levels remain active when cancelling one level."
              />
              <div class="rounded-lg border border-default p-3 text-sm">
                {{
                  escalationIssueToCancel
                    ? getIssueTitle(escalationIssueToCancel)
                    : "-"
                }}
              </div>
              <div class="flex justify-end gap-2">
                <UButton
                  label="Keep Escalation"
                  color="neutral"
                  variant="subtle"
                  :disabled="cancelEscalationLoading"
                  @click="() => { cancelEscalationModalOpen = false; }"
                />
                <UButton
                  label="Cancel Escalation"
                  icon="i-lucide-bell-off"
                  color="error"
                  :loading="cancelEscalationLoading"
                  @click="confirmCancelEscalation"
                />
              </div>
            </div>
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>
