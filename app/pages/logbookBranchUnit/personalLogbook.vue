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

// ── Date Range (imitating TokenCreateModal) ──
const df = new DateFormatter("en-US", {
  dateStyle: "medium",
});

const startTime = ref("");
const endTime = ref("");

const startDateStr = ref("");
const endDateStr = ref("");

const extractDatePart = (value: string) => {
  if (!value) return "";
  return value.split("T")[0]?.trim() || "";
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

const normalizeTime = (value: string, fallback: string) => {
  return /^\d{2}:\d{2}$/.test(value) ? value : fallback;
};

const formatDateTime = (
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
    const start = parseDateString(startDateStr.value);
    const end = parseDateString(endDateStr.value);
    return {
      start: start ?? undefined,
      end: end ?? undefined,
    };
  },
  set: (newValue: { start?: CalendarDate; end?: CalendarDate }) => {
    startDateStr.value = formatDateTime(
      newValue.start,
      startTime.value,
      "00:00",
    );
    endDateStr.value = formatDateTime(newValue.end, endTime.value, "23:59");
  },
});

// ── Loading ──
const loading = ref(false);
const loadingUsers = ref(false);

// ── User Selection ──
interface BranchUser {
  nik: string;
  name: string;
}
const users = ref<BranchUser[]>([]);
const selectedUserNik = ref("");

// ── Logbook Data ──
interface LogBookEntry {
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
  dutyReport: {
    id: number;
    shiftDate: string;
    spv: { name: string } | null;
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
  } | null;
}

const logBooks = ref<LogBookEntry[]>([]);
const selectedUser = ref<BranchUser | null>(null);

// ── Computed Summaries (same pattern as logbookUser.vue) ──
const groupedLogbookRows = computed(() => {
  const groups: { key: string; rows: any[] }[] = [];
  let globalIdx = 1;

  for (const row of logBooks.value) {
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

  for (const row of logBooks.value) {
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

  for (const row of logBooks.value) {
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

// ── Load Users ──
async function loadUsers() {
  loadingUsers.value = true;
  try {
    const response = await $fetch<{ users: BranchUser[] }>(
      `http://${ip.ipBackEnd}/api/personalLogbook/users`,
      {
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );
    users.value = response.users;
  } catch (error: any) {
    toast.add({
      title: "Failed to Load Users",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to load users.",
      color: "error",
    });
  } finally {
    loadingUsers.value = false;
  }
}

// ── Load Personal Logbook ──
async function loadPersonalLogbook() {
  if (!startDateStr.value) {
    toast.add({
      title: "Date Required",
      description: "Please choose a start date first.",
      color: "warning",
    });
    return;
  }

  if (!selectedUserNik.value) {
    toast.add({
      title: "User Required",
      description: "Please select a user first.",
      color: "warning",
    });
    return;
  }

  loading.value = true;

  const start = startDateStr.value;
  const end = endDateStr.value || startDateStr.value;

  try {
    const response = await $fetch<{
      logBooks: LogBookEntry[];
      user: BranchUser;
    }>(
      `http://${ip.ipBackEnd}/api/personalLogbook?startDate=${start}&endDate=${end}&userNik=${selectedUserNik.value}`,
      {
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );
    logBooks.value = response.logBooks;
    selectedUser.value = response.user;

    toast.add({
      title: "Loaded",
      description: "Personal logbook data has been loaded.",
      color: "success",
    });
  } catch (error: any) {
    toast.add({
      title: "Load Failed",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to load personal logbook.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

// ── Formatters ──
function formatDuration(value?: number | null) {
  if (value === null || value === undefined) return "-";
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

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
  const startTime = firstShift?.start || "-";
  const endTime = lastShift?.end || "-";
  return `${shiftName.shift || "Shift"} (${startTime}-${endTime})`;
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

function formatUtcTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

// ── Load users on mount ──
onMounted(() => {
  loadUsers();
});
</script>

<template>
  <UDashboardPanel id="personal-logbook">
    <template #header>
      <UDashboardNavbar title="Personal Logbook">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <!-- Selection Card -->
        <UCard>
          <template #header>
            <div class="flex flex-col gap-1">
              <h2 class="font-semibold text-highlighted">Select Date & User</h2>
              <p class="text-sm text-muted">
                Choose the date and user to view personal logbook data.
              </p>
            </div>
          </template>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <!-- Date Range Picker (imitating TokenCreateModal) -->
            <UFormField label="Date Range:" required>
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
                        {{ startTime }}
                        -
                        {{
                          df.format(dateRange.end.toDate(getLocalTimeZone()))
                        }}
                        {{ endTime }}
                      </template>
                      <template v-else>
                        {{
                          df.format(dateRange.start.toDate(getLocalTimeZone()))
                        }}
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
                </template>
              </UPopover>
            </UFormField>

            <!-- User Selection -->
            <UFormField label="User" required>
              <USelect
                v-model="selectedUserNik"
                :items="
                  users.map((u) => ({
                    label: `${u.name} (${u.nik})`,
                    value: u.nik,
                  }))
                "
                placeholder="Select a user..."
                :loading="loadingUsers"
                searchable
                searchable-placeholder="Search user..."
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-4">
            <UButton
              label="Load Data"
              icon="i-lucide-search"
              color="primary"
              :loading="loading"
              :disabled="!startDateStr || !selectedUserNik"
              @click="loadPersonalLogbook"
            />
          </div>
        </UCard>

        <!-- Loading State -->
        <div v-if="loading" class="py-8 text-center text-muted">
          Loading personal logbook data...
        </div>

        <!-- Empty State -->
        <div
          v-else-if="!logBooks.length && selectedUser"
          class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
        >
          No logbook entries found for
          {{ selectedUser.name }} in the selected date range.
        </div>

        <!-- Initial State -->
        <div
          v-else-if="!logBooks.length"
          class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
        >
          Choose date and user, then click Load Data to show personal logbook.
        </div>

        <!-- Data Loaded -->
        <template v-else>
          <!-- Rating Summary & CWP Summary (same pattern as logbookUser.vue) -->
          <div
            v-if="logBooks.length"
            class="grid grid-cols-1 gap-4 lg:grid-cols-2"
          >
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
                      <th class="border border-default px-4 py-3 text-center">
                        No
                      </th>
                      <th class="border border-default px-4 py-3 text-center">
                        CWP
                      </th>
                      <th class="border border-default px-4 py-3 text-center">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in cwpSummary" :key="item.cwp">
                      <td
                        class="border border-default px-4 py-3 align-top text-center"
                      >
                        {{ idx + 1 }}
                      </td>
                      <td
                        class="border border-default px-4 py-3 align-top text-center font-medium text-highlighted"
                      >
                        {{ item.cwp }} ({{ item.rating }})
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
          </div>

          <!-- Logbook Data -->
          <UCard>
            <template #header>
              <div class="flex flex-col gap-1">
                <h2 class="font-semibold text-highlighted">Logbook Data</h2>
                <p class="text-sm text-muted">
                  Logbook entries for
                  <span class="font-medium text-highlighted">
                    {{ selectedUser?.name }} ({{ selectedUser?.nik }})
                  </span>
                  in the selected date range
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
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
