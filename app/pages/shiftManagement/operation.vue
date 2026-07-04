<script setup lang="ts">
import ip from "../../utils/config.json";

const { token } = useAuth();
const toast = useToast();

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

interface TimelineSegment {
  key: string;
  left: number;
  width: number;
  label: string;
  isControl: boolean;
  isOvernight: boolean;
}

interface TimelineMark {
  key: string;
  label: string;
  left: number;
}

const shiftNameToUpdate = ref<ShiftName | null>(null);
const shiftNameToDelete = ref<ShiftName | null>(null);
const searchQuery = ref("");

const { data, status, refresh } = await useFetch<ShiftName[]>(
  `http://${ip.ipBackEnd}/api/shifts`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const filteredShiftNames = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  const shiftNames = data.value || [];

  if (!keyword) return shiftNames;

  return shiftNames.filter((shiftName) =>
    String(shiftName.shift || "")
      .toLowerCase()
      .includes(keyword),
  );
});

const timelineRows = computed(() =>
  filteredShiftNames.value.map((shiftName) => ({
    id: shiftName.id,
    shift: shiftName.shift || "-",
    segments: getTimelineSegments(shiftName),
  })),
);

const timelineStartMinutes = computed(() => {
  for (const shiftName of filteredShiftNames.value) {
    const firstDetail = getDetailRows(shiftName).find((detail) => detail.start);
    const start = getTimeMinutes(firstDetail?.start || null);

    if (start !== null) return start;
  }

  return 0;
});

const timelineMarks = computed<TimelineMark[]>(() =>
  [0, 360, 720, 1080, 1440].map((offset) => {
    const minutes = (timelineStartMinutes.value + offset) % 1440;

    return {
      key: `${offset}-${minutes}`,
      label: formatTimeFromMinutes(minutes),
      left: (offset / 1440) * 100,
    };
  }),
);

function getDetailRows(shiftName: ShiftName) {
  const details = shiftName.shifts?.length
    ? shiftName.shifts
    : [
        {
          id: 0,
          shiftNameId: shiftName.id,
          start: null,
          end: null,
          duration: null,
          isControl: false,
        },
      ];

  return [...details].sort((first, second) => {
    const firstStart = getTimeMinutes(first.start);
    const firstEnd = getTimeMinutes(first.end);
    const secondStart = getTimeMinutes(second.start);
    const secondEnd = getTimeMinutes(second.end);
    const firstIsOvernight =
      firstStart !== null && firstEnd !== null && firstStart > firstEnd;
    const secondIsOvernight =
      secondStart !== null && secondEnd !== null && secondStart > secondEnd;

    if (firstIsOvernight !== secondIsOvernight) {
      return firstIsOvernight ? -1 : 1;
    }

    return (firstStart ?? 0) - (secondStart ?? 0);
  });
}

function getTimeMinutes(time: string | null) {
  if (!time) return null;

  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTimeFromMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getTimelineLeft(minutes: number) {
  return (((minutes - timelineStartMinutes.value + 1440) % 1440) / 1440) * 100;
}

function getTimelineSegments(shiftName: ShiftName): TimelineSegment[] {
  return getDetailRows(shiftName).flatMap((detail, detailIndex) => {
    const start = getTimeMinutes(detail.start);
    const end = getTimeMinutes(detail.end);

    if (start === null || end === null) return [];

    const label = `${detail.start} - ${detail.end}`;
    const isOvernight = start > end;
    const duration = isOvernight ? 1440 - start + end : end - start;
    const left = getTimelineLeft(start);
    const width = (duration / 1440) * 100;

    if (left + width > 100) {
      return [
        {
          key: `${shiftName.id}-${detail.id || detailIndex}-before-axis-end`,
          left,
          width: 100 - left,
          label,
          isControl: detail.isControl,
          isOvernight,
        },
        {
          key: `${shiftName.id}-${detail.id || detailIndex}-after-axis-start`,
          left: 0,
          width: left + width - 100,
          label,
          isControl: detail.isControl,
          isOvernight,
        },
      ];
    }

    return [
      {
        key: `${shiftName.id}-${detail.id || detailIndex}`,
        left,
        width,
        label,
        isControl: detail.isControl,
        isOvernight,
      },
    ];
  });
}

function getTimelineSegmentStyle(segment: TimelineSegment) {
  return {
    left: `${segment.left}%`,
    width: `${Math.max(segment.width, 1)}%`,
  };
}

function getTimelineMarkStyle(mark: TimelineMark) {
  return {
    left: `${mark.left}%`,
  };
}

function formatDuration(duration: number | null) {
  if (duration === null || duration === undefined) return "-";

  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  if (!hours) return `${minutes} minutes`;
  if (!minutes) return `${hours} hours`;

  return `${hours} hours ${minutes} minutes`;
}

function handleEdit(shiftName: ShiftName) {
  shiftNameToUpdate.value = shiftName;
}

function handleDelete(shiftName: ShiftName) {
  shiftNameToDelete.value = shiftName;
}

function handleShiftChanged() {
  shiftNameToUpdate.value = null;
  shiftNameToDelete.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Operation shift list has been refreshed",
    color: "success",
  });
}

function handleModalClose() {
  shiftNameToUpdate.value = null;
  shiftNameToDelete.value = null;
}
</script>

<template>
  <UDashboardPanel id="operation-shift-management">
    <template #header>
      <UDashboardNavbar title="Operation Shift">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-1.5">
        <div class="flex flex-wrap items-center gap-1.5">
          <UInput
            v-model="searchQuery"
            class="max-w-sm"
            icon="i-lucide-search"
            placeholder="Search operation shift..."
          />

          <ShiftAddModal @shift-added="handleShiftChanged" />
        </div>

        <UButton
          label="Refresh"
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          @click="() => refresh()"
        />
      </div>

      <div class="relative z-10 mb-10 rounded-xl border border-default bg-default p-4">
      <UCard class="overflow-hidden">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="font-semibold text-highlighted">Shift Timeline</h3>
              <p class="text-xs text-muted">
                Green is on duty, gray is rest. Overnight shifts split across
                midnight.
              </p>
            </div>
            <div class="flex items-center gap-3 text-xs text-muted">
              <span class="inline-flex items-center gap-1">
                <span class="h-2.5 w-2.5 rounded-full bg-success" />
                On Duty
              </span>
              <span class="inline-flex items-center gap-1">
                <span class="h-2.5 w-2.5 rounded-full bg-muted" />
                Rest
              </span>
            </div>
          </div>
        </template>

        <div class="overflow-x-auto pb-2">
          <div class="min-w-[960px] space-y-4">
            <div
              class="relative ml-28 h-5 border-b border-default text-[11px] text-muted"
            >
              <span
                v-for="mark in timelineMarks"
                :key="mark.key"
                class="absolute top-0 -translate-x-1/2"
                :style="getTimelineMarkStyle(mark)"
              >
                {{ mark.label }}
              </span>
            </div>

            <div
              v-if="status !== 'pending' && timelineRows.length"
              class="h-[360px] space-y-3 overflow-y-scroll rounded-lg border border-default/70 p-2 pr-3"
              style="scrollbar-gutter: stable"
            >
              <div
                v-for="row in timelineRows"
                :key="row.id"
                class="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-4"
              >
                <div class="truncate text-sm font-medium text-highlighted">
                  {{ row.shift }}
                </div>
                <div class="relative h-8 rounded-md bg-elevated/50">
                  <div
                    v-for="mark in timelineMarks"
                    :key="`${row.id}-${mark.key}`"
                    class="absolute top-0 h-full border-l border-default/70"
                    :style="getTimelineMarkStyle(mark)"
                  />
                  <div
                    v-for="segment in row.segments"
                    :key="segment.key"
                    class="absolute top-1 h-6 overflow-hidden rounded px-2 text-[11px] leading-6 text-white shadow-sm"
                    :class="segment.isControl ? 'bg-success' : 'bg-muted'"
                    :style="getTimelineSegmentStyle(segment)"
                    :title="`${row.shift}: ${segment.label}${segment.isOvernight ? ' (overnight)' : ''}`"
                  >
                    {{ segment.label }}
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="py-4 text-center text-sm text-muted">
              {{
                status === "pending"
                  ? "Loading shift timeline..."
                  : "No timeline data found."
              }}
            </div>
          </div>
        </div>
      </UCard>
      </div>

      <div class="relative z-0 rounded-xl border border-default bg-default p-4">
      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full border-collapse text-sm">
          <thead class="bg-elevated/50">
            <tr>
              <th class="border border-default px-3 py-2 text-left">No</th>
              <th class="border border-default px-3 py-2 text-left">Shift</th>
              <th class="border border-default px-3 py-2 text-left">Start</th>
              <th class="border border-default px-3 py-2 text-left">End</th>
              <th class="border border-default px-3 py-2 text-left">
                Duration
              </th>
              <th class="border border-default px-3 py-2 text-left">
                isControl
              </th>
              <th class="border border-default px-3 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="status !== 'pending' && filteredShiftNames.length">
              <template
                v-for="(shiftName, shiftNameIndex) in filteredShiftNames"
                :key="shiftName.id"
              >
                <tr
                  v-for="(detail, detailIndex) in getDetailRows(shiftName)"
                  :key="`${shiftName.id}-${detail.id || detailIndex}`"
                >
                  <td
                    v-if="detailIndex === 0"
                    :rowspan="getDetailRows(shiftName).length"
                    class="border border-default px-3 py-2 align-top"
                  >
                    {{ shiftNameIndex + 1 }}
                  </td>
                  <td
                    v-if="detailIndex === 0"
                    :rowspan="getDetailRows(shiftName).length"
                    class="border border-default px-3 py-2 align-top font-medium text-highlighted"
                  >
                    {{ shiftName.shift || "-" }}
                  </td>
                  <td class="border border-default px-3 py-2 align-top">
                    {{ detail.start || "-" }}
                  </td>
                  <td class="border border-default px-3 py-2 align-top">
                    {{ detail.end || "-" }}
                  </td>
                  <td
                    class="border border-default px-3 py-2 align-top text-muted"
                  >
                    {{ formatDuration(detail.duration) }}
                  </td>
                  <td class="border border-default px-3 py-2 align-top">
                    <UBadge
                      :color="detail.isControl ? 'success' : 'neutral'"
                      variant="soft"
                    >
                      {{ detail.isControl ? "On Duty" : "Rest" }}
                    </UBadge>
                  </td>
                  <td
                    v-if="detailIndex === 0"
                    :rowspan="getDetailRows(shiftName).length"
                    class="border border-default px-3 py-2 align-top"
                  >
                    <div class="flex items-center gap-2">
                      <UButton
                        icon="i-lucide-pencil"
                        color="primary"
                        variant="soft"
                        size="sm"
                        @click="handleEdit(shiftName)"
                      />
                      <UButton
                        icon="i-lucide-trash-2"
                        color="error"
                        variant="soft"
                        size="sm"
                        @click="handleDelete(shiftName)"
                      />
                    </div>
                  </td>
                </tr>
              </template>
            </template>

            <tr v-else>
              <td
                colspan="7"
                class="border border-default px-3 py-8 text-center text-muted"
              >
                {{
                  status === "pending"
                    ? "Loading operation shifts..."
                    : "No operation shift data found."
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>

      <div class="mt-4 text-sm text-muted">
        Showing {{ filteredShiftNames.length }} operation shifts
      </div>

      <ShiftUpdateModal
        :shift-name="shiftNameToUpdate"
        @shift-updated="handleShiftChanged"
        @close="handleModalClose"
      />

      <ShiftDeleteModal
        :shift-name="shiftNameToDelete"
        @shift-deleted="handleShiftChanged"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
