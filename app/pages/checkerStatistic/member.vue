<script setup lang="ts">
import ip from "../../utils/config.json";

interface CheckerStatisticEventUserItem {
  id: number;
  event?: {
    id?: number;
    event?: string | null;
  } | null;
}

interface CheckerStatisticMemberItem {
  nik?: string | null;
  name?: string | null;
  eventUsers?: CheckerStatisticEventUserItem[] | null;
}

interface StatisticGroupItem {
  group: string;
  isTrue: number;
  isFalse: number;
  total: number;
  percentageTrue: number;
}

interface StatisticAllRatingItem {
  rating: string;
  statistic: StatisticGroupItem[];
}

interface StatisticDetailItem {
  finalScoreId: number;
  number: string;
  rating: string;
  groupStatistics: StatisticGroupItem[];
}

interface CheckerStatisticAnsweredResponse {
  all?: {
    rating?: StatisticAllRatingItem[];
  } | null;
  detail?: StatisticDetailItem[];
}

const { token } = useAuth();
const toast = useToast();

const selectedMemberNik = ref<string | undefined>(undefined);
const selectedEventUserIds = ref<number[]>([]);
const submitLoading = ref(false);
const answeredData = ref<CheckerStatisticAnsweredResponse | null>(null);

const { data, status, error, refresh } = await useFetch<
  CheckerStatisticMemberItem[]
>(`http://${ip.ipBackEnd}/api/checkerStatistic`, {
  headers: {
    Authorization: token.value ? `Bearer ${token.value}` : "",
  },
});

const memberOptions = computed(() => {
  return (data.value || []).map((item) => ({
    label: item.name || item.nik || "-",
    value: item.nik || "",
  }));
});

const selectedMember = computed(() => {
  if (!selectedMemberNik.value) return null;
  return (
    (data.value || []).find((item) => item.nik === selectedMemberNik.value) ||
    null
  );
});

const eventOptions = computed(() => {
  return (selectedMember.value?.eventUsers || []).map((eventUser) => ({
    label: eventUser.event?.event || `EventUser #${eventUser.id}`,
    value: eventUser.id,
  }));
});

watch(selectedMemberNik, () => {
  selectedEventUserIds.value = [];
  answeredData.value = null;
});

const palette = [
  "#16a34a",
  "#2563eb",
  "#f59e0b",
  "#dc2626",
  "#9333ea",
  "#0891b2",
  "#ea580c",
  "#4f46e5",
  "#0d9488",
  "#be123c",
  "#7c3aed",
  "#65a30d",
];

function shortLabel(value: string, max = 24): string {
  if (!value) return "-";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function radarShortLabel(value: string): string {
  if (!value) return "-";
  const words = value.trim().split(/\s+/);
  const firstWord = words[0] || "";
  if (words.length === 1) return shortLabel(firstWord, 16);
  const rest = words.slice(1).join(" ");
  const restShort = shortLabel(rest, 10);
  return `${shortLabel(firstWord, 14)} ${restShort}`.trim();
}

function radarPoint(
  value: number,
  index: number,
  total: number,
  center: number,
  maxRadius: number,
) {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / total;
  const radius = (Math.max(0, Math.min(100, value)) / 100) * maxRadius;
  const x = center + radius * Math.cos(angle);
  const y = center + radius * Math.sin(angle);
  return { x, y };
}

function radarAxisPoint(
  index: number,
  total: number,
  center: number,
  maxRadius: number,
) {
  return radarPoint(100, index, total, center, maxRadius);
}

function radarLabelPoint(
  index: number,
  total: number,
  center: number,
  maxRadius: number,
) {
  const stagger = index % 2 === 0 ? 114 : 126;
  return radarPoint(stagger, index, total, center, maxRadius);
}

function radarLabelAnchor(
  x: number,
  center: number,
): "start" | "middle" | "end" {
  if (x > center + 8) return "start";
  if (x < center - 8) return "end";
  return "middle";
}

function radarLabelBaseline(
  y: number,
  center: number,
): "hanging" | "middle" | "ideographic" {
  if (y < center - 8) return "ideographic";
  if (y > center + 8) return "hanging";
  return "middle";
}

function radarPolygonPoints(statistics: StatisticGroupItem[]): string {
  if (statistics.length === 0) return "";
  const center = 140;
  const maxRadius = 96;
  return statistics
    .map((item, index) => {
      const p = radarPoint(
        Number(item.percentageTrue) || 0,
        index,
        statistics.length,
        center,
        maxRadius,
      );
      return `${p.x},${p.y}`;
    })
    .join(" ");
}

const allRadarData = computed(() => answeredData.value?.all?.rating || []);

const detailLineData = computed(() => {
  const detail = answeredData.value?.detail || [];
  const map = new Map<string, StatisticDetailItem[]>();

  detail.forEach((item) => {
    const key = item.rating || "-";
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  });

  return Array.from(map.entries()).map(([rating, items]) => {
    const sortedItems = [...items].sort((a, b) => a.finalScoreId - b.finalScoreId);
    const xTicks = sortedItems.map((i, idx) => {
      return {
        value: idx + 1,
        label: String(idx + 1),
      };
    });
    const groupSet = new Set<string>();
    sortedItems.forEach((item) => {
      (item.groupStatistics || []).forEach((g) => groupSet.add(g.group));
    });

    const groups = Array.from(groupSet).map((group, groupIndex) => {
      const points = sortedItems.map((item) => {
        const pointIndex = sortedItems.findIndex(
          (candidate) => candidate.finalScoreId === item.finalScoreId,
        );
        const match = (item.groupStatistics || []).find(
          (g) => g.group === group,
        );
        return {
          x: pointIndex + 1,
          y: match ? Number(match.percentageTrue) || 0 : 0,
        };
      });
      return {
        group,
        color: palette[groupIndex % palette.length],
        points,
      };
    });

    return {
      rating,
      xTicks,
      groups,
    };
  });
});

function buildLinePath(
  points: Array<{ x: number; y: number }>,
  minX: number,
  maxX: number,
  width: number,
  height: number,
  padding: number,
): string {
  if (points.length === 0) return "";
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;
  const safeMaxX = maxX === minX ? minX + 1 : maxX;

  const mapped = points.map((p) => {
    const x = padding + ((p.x - minX) / (safeMaxX - minX)) * chartW;
    const y = padding + (1 - Math.max(0, Math.min(100, p.y)) / 100) * chartH;
    return `${x},${y}`;
  });

  return mapped.join(" ");
}

function linePointX(
  x: number,
  minX: number,
  maxX: number,
  width: number,
  padding: number,
): number {
  const chartW = width - padding * 2;
  const safeMaxX = maxX === minX ? minX + 1 : maxX;
  return padding + ((x - minX) / (safeMaxX - minX)) * chartW;
}

function linePointY(
  y: number,
  height: number,
  padding: number,
): number {
  const chartH = height - padding * 2;
  return padding + (1 - Math.max(0, Math.min(100, y)) / 100) * chartH;
}

const yTicks = [100, 75, 50, 25, 0];

async function handleSubmit() {
  if (selectedEventUserIds.value.length === 0) {
    toast.add({
      title: "Validation",
      description: "Please select at least one event.",
      color: "warning",
    });
    return;
  }

  try {
    submitLoading.value = true;

    const response = await $fetch<CheckerStatisticAnsweredResponse>(
      `http://${ip.ipBackEnd}/api/checkerStatistic`,
      {
        method: "POST",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
        body: {
          eventUserId: selectedEventUserIds.value,
        },
      },
    );

    answeredData.value = response;

    toast.add({
      title: "Success",
      description: "Checker statistic loaded successfully.",
      color: "success",
    });
  } catch (fetchError: any) {
    const message =
      fetchError?.data?.message ||
      fetchError?.message ||
      "Failed to submit checker statistic request.";
    toast.add({
      title: "Error",
      description: message,
      color: "error",
    });
  } finally {
    submitLoading.value = false;
  }
}

const initialErrorMessage = computed(() => {
  if (!error.value) return "";
  const err = error.value as {
    data?: { message?: string };
    message?: string;
  };
  return (
    err.data?.message ||
    err.message ||
    "Failed to load member and event options."
  );
});
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Checker Statistic - Member">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Filter Member Statistic</h2>
          </template>

          <div
            v-if="status === 'pending'"
            class="flex items-center gap-2 text-muted py-2"
          >
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
            Loading options...
          </div>

          <div
            v-else-if="error"
            class="rounded-lg border border-error/30 bg-error/5 p-4 space-y-2"
          >
            <p class="font-medium text-error">{{ initialErrorMessage }}</p>
            <UButton
              label="Retry"
              color="error"
              variant="outline"
              icon="i-lucide-refresh-cw"
              @click="refresh()"
            />
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <UFormField label="Name">
              <USelect
                v-model="selectedMemberNik"
                :items="memberOptions"
                placeholder="Select member"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Event">
              <USelect
                v-model="selectedEventUserIds"
                :items="eventOptions"
                multiple
                :disabled="!selectedMemberNik"
                placeholder="Select event(s)"
                class="w-full"
              />
            </UFormField>

            <div class="flex items-end">
              <UButton
                label="Search"
                color="primary"
                icon="i-lucide-search"
                :loading="submitLoading"
                :disabled="selectedEventUserIds.length === 0 || submitLoading"
                class="w-full md:w-auto"
                @click="handleSubmit"
              />
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">All (Radar)</h2>
          </template>

          <div
            v-if="submitLoading"
            class="flex items-center gap-2 text-muted py-2"
          >
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
            Loading chart data...
          </div>

          <div v-else-if="!answeredData" class="text-sm text-muted">
            No data yet. Please submit filter first.
          </div>

          <div v-else-if="allRadarData.length === 0" class="text-sm text-muted">
            No radar data available.
          </div>

          <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <UCard
              v-for="(item, itemIndex) in allRadarData"
              :key="`${item.rating}-${itemIndex}`"
            >
              <template #header>
                <h3 class="font-semibold">Rating: {{ item.rating || "-" }}</h3>
              </template>

              <div class="flex flex-col items-center gap-3">
                <svg viewBox="0 0 280 280" class="w-full max-w-[360px] h-auto">
                  <circle
                    cx="140"
                    cy="140"
                    r="24"
                    fill="none"
                    stroke="rgba(148,163,184,0.35)"
                  />
                  <circle
                    cx="140"
                    cy="140"
                    r="48"
                    fill="none"
                    stroke="rgba(148,163,184,0.35)"
                  />
                  <circle
                    cx="140"
                    cy="140"
                    r="72"
                    fill="none"
                    stroke="rgba(148,163,184,0.35)"
                  />
                  <circle
                    cx="140"
                    cy="140"
                    r="96"
                    fill="none"
                    stroke="rgba(148,163,184,0.35)"
                  />

                  <line
                    v-for="(stat, axisIndex) in item.statistic"
                    :key="`axis-${axisIndex}`"
                    x1="140"
                    y1="140"
                    :x2="
                      radarAxisPoint(axisIndex, item.statistic.length, 140, 96)
                        .x
                    "
                    :y2="
                      radarAxisPoint(axisIndex, item.statistic.length, 140, 96)
                        .y
                    "
                    stroke="rgba(148,163,184,0.5)"
                  />

                  <text
                    v-for="(stat, labelIndex) in item.statistic"
                    :key="`label-${labelIndex}`"
                    :x="
                      radarLabelPoint(
                        labelIndex,
                        item.statistic.length,
                        140,
                        96,
                      ).x
                    "
                    :y="
                      radarLabelPoint(
                        labelIndex,
                        item.statistic.length,
                        140,
                        96,
                      ).y
                    "
                    font-size="9"
                    fill="currentColor"
                    :text-anchor="
                      radarLabelAnchor(
                        radarLabelPoint(
                          labelIndex,
                          item.statistic.length,
                          140,
                          96,
                        ).x,
                        140,
                      )
                    "
                    :dominant-baseline="
                      radarLabelBaseline(
                        radarLabelPoint(
                          labelIndex,
                          item.statistic.length,
                          140,
                          96,
                        ).y,
                        140,
                      )
                    "
                  >
                    <title>{{ stat.group }}</title>
                    {{ radarShortLabel(stat.group) }}
                  </text>

                  <polygon
                    :points="radarPolygonPoints(item.statistic || [])"
                    fill="rgba(37,99,235,0.2)"
                    stroke="#2563eb"
                    stroke-width="2"
                  />

                  <circle
                    v-for="(stat, pointIndex) in item.statistic"
                    :key="`point-${pointIndex}`"
                    :cx="
                      radarPoint(
                        stat.percentageTrue,
                        pointIndex,
                        item.statistic.length,
                        140,
                        96,
                      ).x
                    "
                    :cy="
                      radarPoint(
                        stat.percentageTrue,
                        pointIndex,
                        item.statistic.length,
                        140,
                        96,
                      ).y
                    "
                    r="3"
                    fill="#2563eb"
                  />
                </svg>

                <div
                  class="w-full grid grid-cols-1 md:grid-cols-2 gap-2 text-xs"
                >
                  <div
                    v-for="(stat, statIndex) in item.statistic"
                    :key="`legend-${statIndex}`"
                    class="rounded border border-default px-2 py-1 flex items-center justify-between gap-2"
                  >
                    <span class="truncate">{{
                      shortLabel(stat.group, 36)
                    }}</span>
                    <span class="font-medium"
                      >{{ Number(stat.percentageTrue).toFixed(2) }}%</span
                    >
                  </div>
                </div>
              </div>
            </UCard>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Detail (Line)</h2>
          </template>

          <div v-if="!answeredData" class="text-sm text-muted">
            No data yet. Please submit filter first.
          </div>

          <div
            v-else-if="detailLineData.length === 0"
            class="text-sm text-muted"
          >
            No detail data available.
          </div>

          <div v-else class="grid grid-cols-1 gap-4">
            <UCard
              v-for="(ratingBlock, blockIndex) in detailLineData"
              :key="`${ratingBlock.rating}-${blockIndex}`"
            >
              <template #header>
                <h3 class="font-semibold">
                  Rating: {{ ratingBlock.rating || "-" }}
                </h3>
              </template>

              <div class="space-y-3">
                <svg
                  viewBox="0 0 900 360"
                  class="w-full h-auto rounded border border-default bg-white dark:bg-transparent"
                >
                  <line
                    x1="60"
                    y1="20"
                    x2="60"
                    y2="300"
                    stroke="rgba(148,163,184,0.7)"
                  />
                  <line
                    x1="60"
                    y1="300"
                    x2="860"
                    y2="300"
                    stroke="rgba(148,163,184,0.7)"
                  />

                  <template v-for="tick in yTicks" :key="`y-tick-${tick}`">
                    <line
                      x1="60"
                      :y1="linePointY(tick, 360, 60)"
                      x2="860"
                      :y2="linePointY(tick, 360, 60)"
                      stroke="rgba(148,163,184,0.2)"
                    />
                    <text
                      x="34"
                      :y="linePointY(tick, 360, 60) + 4"
                      font-size="12"
                      text-anchor="end"
                      fill="currentColor"
                    >
                      {{ tick }}
                    </text>
                  </template>

                  <template
                    v-for="(xTick, xIndex) in ratingBlock.xTicks"
                    :key="`x-${xTick.value}-${xIndex}`"
                  >
                    <line
                      :x1="
                        linePointX(
                          xTick.value,
                          ratingBlock.xTicks[0]?.value || 0,
                          ratingBlock.xTicks[ratingBlock.xTicks.length - 1]
                            ?.value || 1,
                          900,
                          60,
                        )
                      "
                      y1="300"
                      :x2="
                        linePointX(
                          xTick.value,
                          ratingBlock.xTicks[0]?.value || 0,
                          ratingBlock.xTicks[ratingBlock.xTicks.length - 1]
                            ?.value || 1,
                          900,
                          60,
                        )
                      "
                      y2="305"
                      stroke="rgba(148,163,184,0.8)"
                    />
                    <text
                      :x="
                        linePointX(
                          xTick.value,
                          ratingBlock.xTicks[0]?.value || 0,
                          ratingBlock.xTicks[ratingBlock.xTicks.length - 1]
                            ?.value || 1,
                          900,
                          60,
                        )
                      "
                      y="322"
                      font-size="11"
                      text-anchor="middle"
                      fill="currentColor"
                    >
                      {{ xTick.label }}
                    </text>
                  </template>

                  <polyline
                    v-for="(group, groupIndex) in ratingBlock.groups"
                    :key="`line-${group.group}-${groupIndex}`"
                    fill="none"
                    :stroke="group.color"
                    stroke-width="2"
                    :points="
                      buildLinePath(
                        group.points,
                        ratingBlock.xTicks[0]?.value || 0,
                        ratingBlock.xTicks[ratingBlock.xTicks.length - 1]
                          ?.value || 1,
                        900,
                        360,
                        60,
                      )
                    "
                  />

                  <template
                    v-for="(group, groupIndex) in ratingBlock.groups"
                    :key="`dot-group-${group.group}-${groupIndex}`"
                  >
                    <circle
                      v-for="(point, pointIndex) in group.points"
                      :key="`dot-${group.group}-${groupIndex}-${pointIndex}`"
                      :cx="
                        linePointX(
                          point.x,
                          ratingBlock.xTicks[0]?.value || 0,
                          ratingBlock.xTicks[ratingBlock.xTicks.length - 1]
                            ?.value || 1,
                          900,
                          60,
                        )
                      "
                      :cy="linePointY(point.y, 360, 60)"
                      r="3.5"
                      :fill="group.color"
                    />
                  </template>
                </svg>

                <div
                  class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 text-xs"
                >
                  <div
                    v-for="(group, groupIndex) in ratingBlock.groups"
                    :key="`legend-line-${group.group}-${groupIndex}`"
                    class="flex items-center gap-2 rounded border border-default px-2 py-1"
                  >
                    <span
                      class="inline-block h-2.5 w-2.5 rounded-full"
                      :style="{ backgroundColor: group.color }"
                    />
                    <span class="truncate">{{
                      shortLabel(group.group, 44)
                    }}</span>
                  </div>
                </div>
              </div>
            </UCard>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
