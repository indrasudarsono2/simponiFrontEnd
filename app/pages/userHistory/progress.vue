<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl();
const { token } = useAuth();

interface GroupStatistic {
  group: string;
  isTrue: number;
  isFalse: number;
  total: number;
  percentageTrue: number;
}

interface Attempt {
  finalScoreId: number;
  createdAt: string;
  number: string | null;
  event: string | null;
  rating: string | null;
  essayScore: number | null;
  multipleChoiceScore: number | null;
  finalScore: number | null;
  status: string | null;
  mcCorrect: number;
  mcTotal: number;
  groupStatistics: GroupStatistic[];
}

interface ProgressResponse {
  all?: { rating?: Array<{ rating: string; statistic: GroupStatistic[] }> };
  mats?: { statistic?: GroupStatistic[] };
  detail?: Attempt[];
}

const { data, status } = await useFetch<ProgressResponse>(
  `${apiBaseUrl}/api/checkerStatistic/me`,
  {
    credentials: "include",
    headers: { Authorization: token.value ? `Bearer ${token.value}` : "" },
  },
);

const attemptsByRating = computed(() => {
  const groups = new Map<string, Attempt[]>();
  for (const attempt of data.value?.detail || []) {
    const rating = attempt.rating || "Unknown rating";
    const items = groups.get(rating) || [];
    items.push(attempt);
    groups.set(rating, items);
  }
  return [...groups.entries()].map(([rating, items]) => ({
    rating,
    attempts: items.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
      a.finalScoreId - b.finalScoreId,
    ),
  }));
});

const ratingRadarData = computed(() => (data.value?.all?.rating || []).filter((item) => item.statistic?.length));
const matsRadarData = computed(() => {
  const statistic = data.value?.mats?.statistic || [];
  return statistic.length ? [{ rating: "MATS", statistic }] : [];
});

const colors = ["#16a34a", "#2563eb", "#f59e0b", "#dc2626", "#9333ea", "#0891b2", "#ea580c", "#4f46e5"];
function chartWidth(attemptCount: number): number {
  return Math.max(600, 120 + attemptCount * 100);
}

function attemptX(index: number, attemptCount: number): number {
  const width = chartWidth(attemptCount);
  return attemptCount <= 1
    ? width / 2
    : 60 + (index * (width - 100)) / (attemptCount - 1);
}

const trends = computed(() => attemptsByRating.value.map((block) => {
  const names = [...new Set(block.attempts.flatMap((attempt) =>
    (attempt.groupStatistics || []).map((group) => group.group),
  ))];
  return {
    rating: block.rating,
    attempts: block.attempts,
    series: names.map((name, index) => ({
      name,
      color: colors[index % colors.length] || "#16a34a",
      points: block.attempts.map((attempt, attemptIndex) => {
        const item = (attempt.groupStatistics || []).find((group) => group.group === name);
        return item ? { x: attemptX(attemptIndex, block.attempts.length), y: 220 - Number(item.percentageTrue) * 1.8 } : null;
      }),
    })),
  };
}));

function lineSegments(points: Array<{ x: number; y: number } | null>): string[] {
  const segments: string[] = [];
  let current: string[] = [];
  for (const point of points) {
    if (point) current.push(`${point.x},${point.y}`);
    else if (current.length) {
      segments.push(current.join(" "));
      current = [];
    }
  }
  if (current.length) segments.push(current.join(" "));
  return segments;
}

</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Examination Progress">
        <template #leading><UDashboardSidebarCollapse /></template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UCard>
          <template #header><h2 class="text-lg font-semibold">MATS by Mandatory Item</h2></template>
          <p v-if="status === 'pending'" class="text-sm text-muted">Loading chart...</p>
          <p v-else-if="!matsRadarData.length" class="text-sm text-muted">No categorized MATS answers available.</p>
          <StatisticsMandatoryRadar v-else :ratings="matsRadarData" :show-rating="false" />
        </UCard>

        <UCard>
          <template #header><h2 class="text-lg font-semibold">All Question Groups by Rating</h2></template>
          <p v-if="status === 'pending'" class="text-sm text-muted">Loading chart...</p>
          <p v-else-if="!ratingRadarData.length" class="text-sm text-muted">No question-group statistics available.</p>
          <StatisticsMandatoryRadar v-else :ratings="ratingRadarData" />
        </UCard>

        <UCard>
          <template #header><h2 class="text-lg font-semibold">Progress Across Examinations</h2></template>
          <p v-if="status === 'pending'" class="text-sm text-muted">Loading chart...</p>
          <p v-else-if="!trends.some((trend) => trend.series.length)" class="text-sm text-muted">No question-group progress is recorded yet.</p>
          <div v-else class="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <UCard v-for="trend in trends.filter((item) => item.series.length)" :key="trend.rating" class="min-w-0">
              <template #header><h3 class="font-semibold">Rating: {{ trend.rating }}</h3></template>
              <div class="overflow-x-auto">
                <svg :viewBox="`0 0 ${chartWidth(trend.attempts.length)} 250`" :style="trend.attempts.length > 5 ? { minWidth: `${chartWidth(trend.attempts.length)}px` } : undefined" class="h-auto w-full" role="img" :aria-label="`Question group progress for ${trend.rating}`">
                  <line x1="60" y1="40" x2="60" y2="220" stroke="currentColor" opacity=".5" />
                  <line x1="60" y1="220" :x2="chartWidth(trend.attempts.length) - 40" y2="220" stroke="currentColor" opacity=".5" />
                  <template v-for="tick in [0, 25, 50, 75, 100]" :key="tick">
                    <line x1="60" :y1="220 - tick * 1.8" :x2="chartWidth(trend.attempts.length) - 40" :y2="220 - tick * 1.8" stroke="currentColor" opacity=".12" />
                    <text x="50" :y="224 - tick * 1.8" text-anchor="end" font-size="11" fill="currentColor">{{ tick }}</text>
                  </template>
                  <text v-for="(_, index) in trend.attempts" :key="index" :x="attemptX(index, trend.attempts.length)" y="242" text-anchor="middle" font-size="11" fill="currentColor">{{ index + 1 }}</text>
                  <template v-for="series in trend.series" :key="series.name">
                    <polyline v-for="(segment, index) in lineSegments(series.points)" :key="index" :points="segment" fill="none" :stroke="series.color" stroke-width="2" />
                    <circle v-for="(point, index) in series.points" v-show="point" :key="index" :cx="point?.x || 0" :cy="point?.y || 0" r="3.5" :fill="series.color"><title>{{ series.name }} — attempt {{ index + 1 }}: {{ point ? ((220 - point.y) / 1.8).toFixed(1) : '—' }}%</title></circle>
                  </template>
                </svg>
              </div>
              <div class="mt-2 grid gap-2 text-xs md:grid-cols-2">
                <div v-for="series in trend.series" :key="series.name" class="flex items-center gap-2 rounded border border-default px-2 py-1">
                  <span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: series.color }" />
                  <span :title="series.name" class="truncate">{{ series.name }}</span>
                </div>
              </div>
            </UCard>
          </div>
        </UCard>

      </div>
    </template>
  </UDashboardPanel>
</template>
