<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import {
  DateFormatter,
  getLocalTimeZone,
  CalendarDate,
  parseDate,
} from "@internationalized/date";

const df = new DateFormatter("en-US", {
  dateStyle: "medium",
});

const startDate = ref("");
const endDate = ref("");
const logbookLoading = ref(false);
const logbookRows = ref<any[]>([]);
const toast = useToast();
const { token } = useAuth();

const formatCalendarDate = (value?: CalendarDate) => {
  if (!value) return "";
  return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
};

const parseDateString = (value: string): CalendarDate | null => {
  if (!value) return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
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
    startDate.value = formatCalendarDate(newValue.start);
    endDate.value = formatCalendarDate(newValue.end);
  },
});

function formatUtcTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

const groupedLogbookRows = computed(() => {
  const groups: { key: string; rows: any[] }[] = [];
  let globalIdx = 1;

  for (const row of logbookRows.value) {
    const key = row.dutyReport?.shiftDate || "unknown";
    let group = groups.find((g) => g.key === key);

    if (!group) {
      group = { key, rows: [] };
      groups.push(group);
    }

    group.rows.push({ ...row, globalIndex: globalIdx++ });
  }

  return groups;
});

const ratingSummary = computed(() => {
  const map = new Map<string, number>();

  for (const row of logbookRows.value) {
    const rating = row.cwp?.rating?.rating || "Unknown";
    const duration = row.duration || 0;
    map.set(rating, (map.get(rating) || 0) + duration);
  }

  return Array.from(map.entries()).map(([rating, totalMinutes]) => ({
    rating,
    totalMinutes,
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  }));
});

const cwpSummary = computed(() => {
  const map = new Map<string, { totalMinutes: number; rating: string }>();

  for (const row of logbookRows.value) {
    const cwp = row.cwp?.cwp || "Unknown";
    const rating = row.cwp?.rating?.rating || "";
    const duration = row.duration || 0;
    const existing = map.get(cwp);
    map.set(cwp, {
      totalMinutes: (existing?.totalMinutes || 0) + duration,
      rating: existing?.rating || rating,
    });
  }

  return Array.from(map.entries()).map(([cwp, data]) => ({
    cwp,
    rating: data.rating,
    totalMinutes: data.totalMinutes,
    hours: Math.floor(data.totalMinutes / 60),
    minutes: data.totalMinutes % 60,
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

async function loadLogbookUser() {
  if (!startDate.value || !endDate.value) {
    toast.add({
      title: "Date Range Required",
      description: "Please choose both start and end date.",
      color: "warning",
    });
    return;
  }

  if (startDate.value > endDate.value) {
    toast.add({
      title: "Invalid Date Range",
      description: "Start date cannot be after end date.",
      color: "warning",
    });
    return;
  }

  logbookLoading.value = true;

  try {
    logbookRows.value = await $fetch<any[]>(
      `${apiBaseUrl}/api/eLogbookUser?startDate=${startDate.value}&endDate=${endDate.value}`,
      {
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Loaded",
      description: "Logbook data has been loaded.",
      color: "success",
    });
  } catch (error: any) {
    toast.add({
      title: "Load Failed",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to load logbook data.",
      color: "error",
    });
  } finally {
    logbookLoading.value = false;
  }
}
</script>

<template>
  <UDashboardPanel id="logbook-user">
    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <UCard>
          <template #header>
            <div class="flex flex-col gap-1">
              <h2 class="font-semibold text-highlighted">Select Date Range</h2>
              <p class="text-sm text-muted">
                Choose the start and end date to filter logbook data.
              </p>
            </div>
          </template>

          <UFormField label="Date Range:">
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
                      {{
                        df.format(dateRange.start.toDate(getLocalTimeZone()))
                      }}
                      -
                      {{ df.format(dateRange.end.toDate(getLocalTimeZone())) }}
                    </template>
                    <template v-else>
                      {{
                        df.format(dateRange.start.toDate(getLocalTimeZone()))
                      }}
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
              </template>
            </UPopover>
          </UFormField>

          <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div class="rounded-lg border border-default bg-elevated/30 p-3">
              <div class="text-xs uppercase text-muted">Start Date</div>
              <div class="font-medium text-highlighted">
                {{ formatDisplayDate(startDate) || "-" }}
              </div>
            </div>

            <div class="rounded-lg border border-default bg-elevated/30 p-3">
              <div class="text-xs uppercase text-muted">End Date</div>
              <div class="font-medium text-highlighted">
                {{ formatDisplayDate(endDate) || "-" }}
              </div>
            </div>
          </div>

          <div class="mt-4">
            <UButton
              label="Load Logbook"
              icon="i-lucide-search"
              color="primary"
              :loading="logbookLoading"
              :disabled="!startDate || !endDate"
              @click="loadLogbookUser"
            />
          </div>
        </UCard>

        <div v-if="logbookRows.length" class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UCard>
          <template #header>
            <div class="flex flex-col gap-1">
              <h2 class="font-semibold text-highlighted">Rating Summary</h2>
              <p class="text-sm text-muted">
                Total hours accumulated per rating.
              </p>
            </div>
          </template>

          <div class="overflow-x-auto rounded-lg border border-default">
            <table class="min-w-full border-collapse text-sm">
              <thead class="bg-elevated/50">
                <tr>
                  <th class="border border-default px-4 py-3 text-center">
                    No
                  </th>
                  <th class="border border-default px-4 py-3 text-center">
                    Rating
                  </th>
                  <th class="border border-default px-4 py-3 text-center">
                    Total Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in ratingSummary" :key="item.rating">
                  <td
                    class="border border-default px-4 py-3 align-top text-center"
                  >
                    {{ idx + 1 }}
                  </td>
                  <td
                    class="border border-default px-4 py-3 align-top font-medium text-center"
                  >
                    {{ item.rating }}
                  </td>
                  <td
                    class="border border-default px-4 py-3 align-top text-center"
                  >
                    {{ item.hours }} h {{ item.minutes }} min
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex flex-col gap-1">
              <h2 class="font-semibold text-highlighted">CWP Summary</h2>
              <p class="text-sm text-muted">
                Total hours accumulated per CWP.
              </p>
            </div>
          </template>

          <div class="overflow-x-auto rounded-lg border border-default">
            <table class="min-w-full border-collapse text-sm">
              <thead class="bg-elevated/50">
                <tr>
                  <th class="border border-default px-4 py-3 text-center">No</th>
                  <th class="border border-default px-4 py-3 text-center">CWP</th>
                  <th class="border border-default px-4 py-3 text-center">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in cwpSummary" :key="item.cwp">
                  <td class="border border-default px-4 py-3 align-top text-center">{{ idx + 1 }}</td>
                  <td class="border border-default px-4 py-3 align-top text-center font-medium text-highlighted">{{ item.cwp }} ({{ item.rating }})</td>
                  <td class="border border-default px-4 py-3 align-top text-center">{{ item.hours }} h {{ item.minutes }} min</td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
        </div>


        <UCard>
          <template #header>
            <div class="flex flex-col gap-1">
              <h2 class="font-semibold text-highlighted">Logbook Data</h2>
              <p class="text-sm text-muted">
                Logbook entries will be loaded for the selected date range.
              </p>
            </div>
          </template>

          <div v-if="logbookLoading" class="py-8 text-center text-muted">
            Loading logbook data...
          </div>

          <div
            v-else-if="!logbookRows.length"
            class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
          >
            Choose date range and click Load Logbook to show data.
          </div>

          <div v-else class="space-y-4">
            <div class="overflow-x-auto rounded-lg border border-default">
              <table class="min-w-full border-collapse text-sm">
                <thead class="bg-elevated/50">
                  <tr>
                    <th class="border border-default px-4 py-3 text-center">
                      No
                    </th>
                    <th class="border border-default px-4 py-3 text-center">
                      Date
                    </th>
                    <th class="border border-default px-4 py-3 text-center">
                      Shift
                    </th>
                    <th class="border border-default px-4 py-3 text-center">
                      Time In
                    </th>
                    <th class="border border-default px-4 py-3 text-center">
                      Time Out
                    </th>
                    <th class="border border-default px-4 py-3 text-center">
                      Rating
                    </th>
                    <th class="border border-default px-4 py-3 text-center">
                      Supervisor
                    </th>
                    <th class="border border-default px-4 py-3 text-center">
                      Duration
                    </th>
                    <th class="border border-default px-4 py-3 text-center">
                      Remark
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <template
                    v-for="(group, gIdx) in groupedLogbookRows"
                    :key="gIdx"
                  >
                    <tr v-for="(row, rIdx) in group.rows" :key="row.id">
                      <td
                        class="border border-default px-4 py-3 align-top text-center"
                      >
                        {{ row.globalIndex }}
                      </td>
                      <td
                        v-if="rIdx === 0"
                        class="border border-default px-4 py-3 align-top text-center"
                        :rowspan="group.rows.length"
                      >
                        {{
                          formatDisplayDate(
                            row.dutyReport?.shiftDate?.split("T")[0],
                          )
                        }}
                      </td>
                      <td
                        v-if="rIdx === 0"
                        class="border border-default px-4 py-3 align-top text-center"
                        :rowspan="group.rows.length"
                      >
                        {{ row.shift?.shiftName?.shift || "-" }}
                      </td>
                      <td
                        class="border border-default px-4 py-3 align-top text-center"
                      >
                        {{ formatUtcTime(row.timeIn) }}
                      </td>
                      <td
                        class="border border-default px-4 py-3 align-top text-center"
                      >
                        {{ formatUtcTime(row.timeOut) }}
                      </td>
                      <td
                        class="border border-default px-4 py-3 align-top text-center"
                      >
                        {{ row.cwp?.rating?.rating || "-" }}
                      </td>
                      <td
                        class="border border-default px-4 py-3 align-top text-center"
                      >
                        {{ row.supervisorLogBook?.name || "-" }}
                      </td>
                      <td
                        class="border border-default px-4 py-3 align-top text-center"
                      >
                        {{ row.duration != null ? row.duration + " min" : "-" }}
                      </td>
                      <td
                        class="border border-default px-4 py-3 align-top text-center"
                      >
                        {{ row.cwp?.cwp || "-" }}
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
