<script setup lang="ts">
import {
  DateFormatter,
  getLocalTimeZone,
  CalendarDate,
  parseDate,
} from "@internationalized/date";
import ip from "../../utils/config.json";

const { token } = useAuth();
const toast = useToast();

interface LhdReport {
  id: number;
  time: string | null;
  message: string | null;
  lhdBook: {
    id: number;
    code: string | null;
    lhd: string | null;
  } | null;
}

const startDate = ref("");
const endDate = ref("");
const startTime = ref("00:00");
const endTime = ref("23:59");
const loading = ref(false);
const lhdReports = ref<LhdReport[]>([]);

const canLoad = computed(() => Boolean(startDate.value && endDate.value));

const df = new DateFormatter("en-US", {
  dateStyle: "medium",
});

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

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function safeFilePart(value: string) {
  return value.replace(/[^0-9A-Za-z-]/g, "-");
}

async function loadLhdReports() {
  if (!canLoad.value) {
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
    const response = await $fetch<{ lhdReports: LhdReport[] }>(
      `http://${ip.ipBackEnd}/api/lhdReports/recap`,
      {
        query: {
          startDate: startDate.value,
          endDate: endDate.value,
        },
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    lhdReports.value = response.lhdReports || [];
    toast.add({
      title: "Loaded",
      description: "LHD report recap data has been loaded.",
      color: "success",
    });
  } catch (error: any) {
    toast.add({
      title: "Load Failed",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to load LHD report recap.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function downloadCsv() {
  if (!lhdReports.value.length) {
    toast.add({
      title: "No Data",
      description: "Load LHD report recap data before downloading CSV.",
      color: "warning",
    });
    return;
  }

  const headers = ["No", "LHD Code", "Message", "Date Time"];
  const rows = lhdReports.value.map((report, index) => [
    index + 1,
    report.lhdBook?.code || "-",
    report.message || "-",
    formatDateTime(report.time),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lhd-report-recap-${safeFilePart(startDate.value)}-to-${safeFilePart(endDate.value)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
</script>

<template>
  <UDashboardPanel id="lhd-report-recap">
    <template #header>
      <UDashboardNavbar title="LHD Reports">
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
              <h2 class="font-semibold text-highlighted">Date Range</h2>
              <p class="text-sm text-muted">
                Load LHD report data by occurrence date and time.
              </p>
            </div>
          </template>

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

          <div class="mt-4 flex flex-wrap gap-2">
            <UButton
              label="Load Data"
              icon="i-lucide-search"
              color="primary"
              :loading="loading"
              :disabled="!canLoad"
              @click="loadLhdReports"
            />
            <UButton
              label="Download CSV"
              icon="i-lucide-download"
              color="neutral"
              variant="soft"
              :disabled="!lhdReports.length"
              @click="downloadCsv"
            />
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex flex-col gap-1">
              <h2 class="font-semibold text-highlighted">LHD Report Recap</h2>
              <p class="text-sm text-muted">
                {{ lhdReports.length }} report{{ lhdReports.length === 1 ? "" : "s" }} found.
              </p>
            </div>
          </template>

          <div v-if="loading" class="py-8 text-center text-muted">
            Loading LHD report recap...
          </div>

          <div
            v-else-if="!lhdReports.length"
            class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
          >
            Select date range and click Load Data to show LHD report recap.
          </div>

          <div v-else class="overflow-x-auto rounded-lg border border-default">
            <table class="min-w-full border-collapse text-sm">
              <thead class="bg-elevated/50">
                <tr>
                  <th class="border border-default px-4 py-3 text-center">No</th>
                  <th class="border border-default px-4 py-3 text-center">LHD Code</th>
                  <th class="border border-default px-4 py-3 text-center">Message</th>
                  <th class="border border-default px-4 py-3 text-center">Date Time</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(report, index) in lhdReports" :key="report.id">
                  <td class="border border-default px-4 py-3 align-top">
                    {{ index + 1 }}
                  </td>
                  <td class="border border-default px-4 py-3 align-top">
                    <UBadge color="neutral" variant="soft">
                      {{ report.lhdBook?.code || "-" }}
                    </UBadge>
                  </td>
                  <td
                    class="border border-default px-4 py-3 align-top whitespace-pre-wrap text-muted"
                  >
                    {{ report.message || "-" }}
                  </td>
                  <td class="border border-default px-4 py-3 align-top">
                    {{ formatDateTime(report.time) }}
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
