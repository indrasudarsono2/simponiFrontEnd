<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import {
  DateFormatter,
  getLocalTimeZone,
  CalendarDate,
  parseDate,
} from "@internationalized/date";

const { token } = useAuth();
const toast = useToast();

interface Branch {
  id: number;
  branch: string;
}

interface Message {
  id: number;
  message: string | null;
  createdAt: string;
}

interface OnGoingIssueRecap {
  id: number;
  other: string | null;
  start: string | null;
  finish: string | null;
  isClosed: boolean;
  equipment: { id: number; equipment: string | null } | null;
  reporterUser: { nik: string; name: string | null } | null;
  messages: Message[];
}

const branches = ref<Branch[]>([]);
const selectedBranchId = ref<number | undefined>(undefined);
const loadingBranches = ref(false);
const startDate = ref("");
const endDate = ref("");
const startTime = ref("00:00");
const endTime = ref("23:59");
const loading = ref(false);
const issues = ref<OnGoingIssueRecap[]>([]);

const canLoad = computed(() =>
  Boolean(selectedBranchId.value && startDate.value && endDate.value),
);

const df = new DateFormatter("en-US", {
  dateStyle: "medium",
});

const branchOptions = computed(() =>
  branches.value.map((branch) => ({
    label: branch.branch,
    value: branch.id,
  })),
);

const extractDatePart = (value: string) => {
  if (!value) return "";
  return value.split("T")[0]?.trim() || "";
};

const extractTimePart = (value: string, fallback: string) => {
  if (!value) return fallback;
  const timeSection = value.includes("T")
    ? value.split("T")[1]
    : value.split(" ")[1];
  if (!timeSection) return fallback;
  const hhmm = timeSection.slice(0, 5);
  return /^\d{2}:\d{2}$/.test(hhmm) ? hhmm : fallback;
};

const normalizeTime = (value: string, fallback: string) => {
  return /^\d{2}:\d{2}$/.test(value) ? value : fallback;
};

const parseDateString = (value: string): CalendarDate | null => {
  const datePart = extractDatePart(value);
  if (!datePart) return null;

  try {
    return parseDate(datePart);
  } catch {
    return null;
  }
};

const formatCalendarDate = (value?: CalendarDate) => {
  if (!value) return "";
  return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
};

const composeDateTime = (
  date: CalendarDate | undefined,
  time: string,
  fallback: string,
) => {
  const datePart = formatCalendarDate(date);
  if (!datePart) return "";
  return `${datePart}T${normalizeTime(time, fallback)}:00`;
};

const dateRange = computed({
  get: () => {
    const start = parseDateString(startDate.value);
    const end = parseDateString(endDate.value);

    return {
      start: start ?? undefined,
      end: end ?? undefined,
    };
  },
  set: (newValue: { start?: CalendarDate; end?: CalendarDate }) => {
    startDate.value = composeDateTime(newValue.start, startTime.value, "00:00");
    endDate.value = composeDateTime(newValue.end, endTime.value, "23:59");
  },
});

watch(
  startDate,
  (value) => {
    startTime.value = extractTimePart(value, "00:00");
  },
  { immediate: true },
);

watch(
  endDate,
  (value) => {
    endTime.value = extractTimePart(value, "23:59");
  },
  { immediate: true },
);

watch(startTime, (value) => {
  const start = parseDateString(startDate.value);
  startDate.value = composeDateTime(start ?? undefined, value, "00:00");
});

watch(endTime, (value) => {
  const end = parseDateString(endDate.value);
  endDate.value = composeDateTime(end ?? undefined, value, "23:59");
});

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

function formatReporter(issue: OnGoingIssueRecap) {
  const reporter = issue.reporterUser;
  if (!reporter) return "-";
  return reporter.name || reporter.nik || "-";
}

function formatMessages(messages: Message[] = []) {
  if (!messages.length) return "-";
  return messages
    .map((item, index) => {
      const time = formatDateTime(item.createdAt);
      return `${index + 1}. ${time}: ${item.message || "-"}`;
    })
    .join("\n");
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function safeFilePart(value: string) {
  return value.replace(/[^0-9A-Za-z-]/g, "-");
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

async function loadBranches() {
  loadingBranches.value = true;
  try {
    const response = await $fetch<Branch[]>(`${apiBaseUrl}/api/branches`, {
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    branches.value = response || [];
  } catch (error: unknown) {
    toast.add({
      title: "Failed to Load Branches",
      description: getRequestError(error, "Failed to load branch list."),
      color: "error",
    });
  } finally {
    loadingBranches.value = false;
  }
}

async function loadIssues() {
  if (!selectedBranchId.value) {
    toast.add({
      title: "Branch Required",
      description: "Please select a branch first.",
      color: "warning",
    });
    return;
  }

  if (!startDate.value || !endDate.value) {
    toast.add({
      title: "Date Range Required",
      description: "Please select start date and end date first.",
      color: "warning",
    });
    return;
  }

  if (startDate.value > endDate.value) {
    toast.add({
      title: "Invalid Date Range",
      description: "Start date cannot be later than end date.",
      color: "warning",
    });
    return;
  }

  loading.value = true;
  try {
    const response = await $fetch<{ issues: OnGoingIssueRecap[] }>(
      `${apiBaseUrl}/api/onGoingIssues/recap`,
      {
        query: {
          branchId: selectedBranchId.value,
          startDate: startDate.value,
          endDate: endDate.value,
        },
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    issues.value = response.issues || [];
    toast.add({
      title: "Loaded",
      description: "On Going Issue recap data has been loaded.",
      color: "success",
    });
  } catch (error: unknown) {
    toast.add({
      title: "Load Failed",
      description: getRequestError(error, "Failed to load On Going Issue recap."),
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function downloadCsv() {
  if (!issues.value.length) {
    toast.add({
      title: "No Data",
      description: "Load On Going Issue recap data before downloading CSV.",
      color: "warning",
    });
    return;
  }

  const selectedBranch = branches.value.find(
    (branch) => branch.id === selectedBranchId.value,
  );
  const headers = [
    "No",
    "Equipment",
    "Issue",
    "Reporter",
    "Start",
    "Finish",
    "Message",
    "Status",
  ];

  const rows = issues.value.flatMap((issue, index) => {
    const messages = issue.messages.length ? issue.messages : [null];

    return messages.map((message, messageIndex) => [
      messageIndex === 0 ? index + 1 : "",
      messageIndex === 0 ? issue.equipment?.equipment || "-" : "",
      messageIndex === 0 ? issue.other || "-" : "",
      messageIndex === 0 ? formatReporter(issue) : "",
      messageIndex === 0 ? formatDateTime(issue.start) : "",
      messageIndex === 0 ? formatDateTime(issue.finish) : "",
      message
        ? `${messageIndex + 1}. ${formatDateTime(message.createdAt)}: ${message.message || "-"}`
        : "-",
      messageIndex === 0 ? (issue.isClosed ? "Closed" : "Open") : "",
    ]);
  });

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `on-going-issue-recap-${safeFilePart(selectedBranch?.branch || "branch")}-${safeFilePart(startDate.value)}-to-${safeFilePart(endDate.value)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

onMounted(() => {
  loadBranches();
});
</script>

<template>
  <UDashboardPanel id="on-going-issue-recap-general-admin">
    <template #header>
      <UDashboardNavbar title="On Going Issue Recap">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <UCard>
          <template #header>
            <div class="flex flex-col gap-1">
              <h2 class="font-semibold text-highlighted">Branch and Date Range</h2>
              <p class="text-sm text-muted">
                Load On Going Issue data by branch and start date.
              </p>
            </div>
          </template>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <UFormField label="Branch" required>
              <USelectMenu
                v-model="selectedBranchId"
                :items="branchOptions"
                value-key="value"
                label-key="label"
                placeholder="Select branch"
                class="w-full"
                :loading="loadingBranches"
              />
            </UFormField>

            <UFormField label="Date:" required>
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
                        {{ startTime }}
                        -
                        {{ df.format(dateRange.end.toDate(getLocalTimeZone())) }}
                        {{ endTime }}
                      </template>
                      <template v-else>
                        {{ df.format(dateRange.start.toDate(getLocalTimeZone())) }}
                        {{ startTime }}
                      </template>
                    </template>
                    <template v-else> Pick a date range </template>
                  </span>

                  <template #trailing>
                    <UIcon
                      name="i-lucide-chevron-down"
                      class="shrink-0 text-dimmed size-5"
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
                  <div class="grid grid-cols-2 gap-2 p-2 pt-0">
                    <UFormField label="Start Hour">
                      <UInput
                        v-model="startTime"
                        type="time"
                        :disabled="!dateRange.start"
                      />
                    </UFormField>
                    <UFormField label="End Hour">
                      <UInput
                        v-model="endTime"
                        type="time"
                        :disabled="!dateRange.end"
                      />
                    </UFormField>
                  </div>
                </template>
              </UPopover>
            </UFormField>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <UButton
              label="Load Data"
              icon="i-lucide-search"
              color="primary"
              :loading="loading"
              :disabled="!canLoad"
              @click="loadIssues"
            />
            <UButton
              label="Download CSV"
              icon="i-lucide-download"
              color="neutral"
              variant="soft"
              :disabled="!issues.length"
              @click="downloadCsv"
            />
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex flex-col gap-1">
              <h2 class="font-semibold text-highlighted">On Going Issue Recap</h2>
              <p class="text-sm text-muted">
                {{ issues.length }} issue{{ issues.length === 1 ? "" : "s" }} found.
              </p>
            </div>
          </template>

          <div v-if="loading" class="py-8 text-center text-muted">
            Loading On Going Issue recap...
          </div>

          <div
            v-else-if="!issues.length"
            class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
          >
            Select branch and date range, then click Load Data to show On Going Issue recap.
          </div>

          <div v-else class="overflow-x-auto rounded-lg border border-default">
            <table class="min-w-full border-collapse text-sm">
              <thead class="bg-elevated/50">
                <tr>
                  <th class="border border-default px-4 py-3 text-center">No</th>
                  <th class="border border-default px-4 py-3 text-center">Equipment</th>
                  <th class="border border-default px-4 py-3 text-center">Issue</th>
                  <th class="border border-default px-4 py-3 text-center">Reporter</th>
                  <th class="border border-default px-4 py-3 text-center">Start</th>
                  <th class="border border-default px-4 py-3 text-center">Finish</th>
                  <th class="border border-default px-4 py-3 text-center">Message</th>
                  <th class="border border-default px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(issue, index) in issues" :key="issue.id">
                  <td class="border border-default px-4 py-3 align-top">
                    {{ index + 1 }}
                  </td>
                  <td class="border border-default px-4 py-3 align-top">
                    {{ issue.equipment?.equipment || "-" }}
                  </td>
                  <td class="border border-default px-4 py-3 align-top whitespace-pre-wrap">
                    {{ issue.other || "-" }}
                  </td>
                  <td class="border border-default px-4 py-3 align-top">
                    {{ formatReporter(issue) }}
                  </td>
                  <td class="border border-default px-4 py-3 align-top">
                    {{ formatDateTime(issue.start) }}
                  </td>
                  <td class="border border-default px-4 py-3 align-top">
                    {{ formatDateTime(issue.finish) }}
                  </td>
                  <td class="border border-default px-4 py-3 align-top whitespace-pre-wrap text-muted">
                    {{ formatMessages(issue.messages) }}
                  </td>
                  <td class="border border-default px-4 py-3 align-top">
                    <UBadge
                      :color="issue.isClosed ? 'success' : 'warning'"
                      variant="soft"
                    >
                      {{ issue.isClosed ? "Closed" : "Open" }}
                    </UBadge>
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
