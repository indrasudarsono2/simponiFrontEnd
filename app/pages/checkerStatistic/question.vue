<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

definePageMeta({ alias: ["/mandatoryQuestion/matsAnalysis"] });

interface CheckerStatisticQuestionItem {
  id: number;
  question?: string | null;
  a?: string | null;
  b?: string | null;
  c?: string | null;
  d?: string | null;
  isTrue?: number | null;
  isFalse?: number | null;
  total?: number | null;
  percentageTrue?: number | null;
  answerSummary?: {
    A?: number;
    B?: number;
    C?: number;
    D?: number;
  } | null;
}

type SortKey = "no" | "question" | "isTrue" | "isFalse" | "percentageTrue";

const { token } = useAuth();
const route = useRoute();
const isMatsAnalysis = computed(
  () =>
    route.path === "/mandatoryQuestion/matsAnalysis" ||
    String(route.query.type || "").toUpperCase() === "MATS",
);
const pageTitle = computed(() =>
  isMatsAnalysis.value
    ? "MATS Question Analysis"
    : "Checker Statistic - Question",
);

const isDetailModalOpen = ref(false);
const selectedQuestion = ref<CheckerStatisticQuestionItem | null>(null);
const sortKey = ref<SortKey>("no");
const sortDirection = ref<"asc" | "desc">("asc");

const { data, status, error, refresh } = await useFetch<
  CheckerStatisticQuestionItem[]
>(`${apiBaseUrl}/api/checkerStatisticQuestion${isMatsAnalysis.value ? "?type=MATS" : ""}`, {
  headers: {
    Authorization: token.value ? `Bearer ${token.value}` : "",
  },
});

const rows = computed(() => {
  const list = [...(data.value || [])];

  list.sort((a, b) => {
    const dir = sortDirection.value === "asc" ? 1 : -1;
    const aIndex = (data.value || []).findIndex((row) => row.id === a.id);
    const bIndex = (data.value || []).findIndex((row) => row.id === b.id);

    switch (sortKey.value) {
      case "no":
        return (aIndex - bIndex) * dir;
      case "question": {
        const aText = String(a.question || "").replace(/<[^>]*>/g, "").toLowerCase();
        const bText = String(b.question || "").replace(/<[^>]*>/g, "").toLowerCase();
        if (aText < bText) return -1 * dir;
        if (aText > bText) return 1 * dir;
        return 0;
      }
      case "isTrue":
        return ((a.isTrue ?? 0) - (b.isTrue ?? 0)) * dir;
      case "isFalse":
        return ((a.isFalse ?? 0) - (b.isFalse ?? 0)) * dir;
      case "percentageTrue":
        return ((a.percentageTrue ?? 0) - (b.percentageTrue ?? 0)) * dir;
      default:
        return 0;
    }
  });

  return list;
});

function formatPercentage(value?: number | null): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return `${num.toFixed(2)}%`;
}

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
    return;
  }
  sortKey.value = key;
  sortDirection.value = "asc";
}

function sortIcon(key: SortKey): string {
  if (sortKey.value !== key) return "i-lucide-arrow-up-down";
  return sortDirection.value === "asc"
    ? "i-lucide-arrow-up"
    : "i-lucide-arrow-down";
}

function openDetail(item: CheckerStatisticQuestionItem) {
  selectedQuestion.value = item;
  isDetailModalOpen.value = true;
}

function closeDetail() {
  isDetailModalOpen.value = false;
  selectedQuestion.value = null;
}

const answerSlices = computed(() => {
  const summary = selectedQuestion.value?.answerSummary;
  const values = [
    { key: "A", value: Number(summary?.A ?? 0), color: "#2563eb" },
    { key: "B", value: Number(summary?.B ?? 0), color: "#16a34a" },
    { key: "C", value: Number(summary?.C ?? 0), color: "#f59e0b" },
    { key: "D", value: Number(summary?.D ?? 0), color: "#dc2626" },
  ];
  const total = values.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) {
    return values.map((item) => ({ ...item, percent: 0, start: 0, end: 0 }));
  }

  let current = 0;
  return values.map((item) => {
    const percent = (item.value / total) * 100;
    const start = current;
    const end = current + (item.value / total) * Math.PI * 2;
    current = end;
    return { ...item, percent, start, end };
  });
});

const fullAnswerSlice = computed(
  () =>
    answerSlices.value.find(
      (slice) => slice.value > 0 && slice.percent >= 99.999,
    ) || null,
);

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function piePath(startAngle: number, endAngle: number): string {
  const cx = 80;
  const cy = 80;
  const r = 64;
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
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
    "Failed to load checker statistic question data."
  );
});
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="pageTitle">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UCard>
        <template #header>
          <div>
            <h2 class="text-lg font-semibold">
              {{ isMatsAnalysis ? "MATS Question Statistics" : "Question Statistic" }}
            </h2>
            <p v-if="isMatsAnalysis" class="mt-1 text-sm text-muted">
              Global MATS performance across all branches, sectors, ratings, and examinations.
            </p>
          </div>
        </template>

        <div
          v-if="status === 'pending'"
          class="flex flex-col items-center justify-center gap-2 text-muted py-10"
        >
          <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary" />
          <p class="text-sm">Loading question data from database...</p>
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

        <div v-else class="overflow-x-auto overflow-y-auto max-h-[70vh] rounded-lg border">
          <table class="min-w-full text-sm border-collapse border border-default">
            <thead class="bg-muted/40 sticky top-0 z-10">
              <tr>
                <th class="px-3 py-2 text-center font-medium border border-default">
                  <button type="button" class="inline-flex items-center gap-1" @click="toggleSort('no')">
                    No
                    <UIcon :name="sortIcon('no')" class="size-4" />
                  </button>
                </th>
                <th class="px-3 py-2 text-center font-medium border border-default">
                  <button type="button" class="inline-flex items-center gap-1" @click="toggleSort('question')">
                    Question
                    <UIcon :name="sortIcon('question')" class="size-4" />
                  </button>
                </th>
                <th class="px-3 py-2 text-center font-medium border border-default">
                  <button type="button" class="inline-flex items-center gap-1" @click="toggleSort('isTrue')">
                    True
                    <UIcon :name="sortIcon('isTrue')" class="size-4" />
                  </button>
                </th>
                <th class="px-3 py-2 text-center font-medium border border-default">
                  <button type="button" class="inline-flex items-center gap-1" @click="toggleSort('isFalse')">
                    False
                    <UIcon :name="sortIcon('isFalse')" class="size-4" />
                  </button>
                </th>
                <th class="px-3 py-2 text-center font-medium border border-default">
                  <button type="button" class="inline-flex items-center gap-1" @click="toggleSort('percentageTrue')">
                    persentage
                    <UIcon :name="sortIcon('percentageTrue')" class="size-4" />
                  </button>
                </th>
                <th class="px-3 py-2 text-center font-medium border border-default">action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in rows" :key="item.id">
                <td class="px-3 py-2 border border-default text-center">{{ index + 1 }}</td>
                <td class="px-3 py-2 border border-default">
                  <div class="line-clamp-2" v-html="item.question || '-'" />
                </td>
                <td class="px-3 py-2 border border-default text-center">{{ item.isTrue ?? '-' }}</td>
                <td class="px-3 py-2 border border-default text-center">{{ item.isFalse ?? '-' }}</td>
                <td class="px-3 py-2 border border-default text-center">
                  {{ formatPercentage(item.percentageTrue) }}
                </td>
                <td class="px-3 py-2 border border-default text-center">
                  <UButton
                    icon="i-lucide-eye"
                    color="primary"
                    variant="soft"
                    size="xs"
                    @click="openDetail(item)"
                  />
                </td>
              </tr>
              <tr v-if="rows.length === 0">
                <td class="px-3 py-3 text-muted border border-default text-center" colspan="6">
                  {{ isMatsAnalysis ? "No MATS question statistics available." : "No question statistic data available." }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <UModal
        :open="isDetailModalOpen"
        :title="isMatsAnalysis ? 'MATS Question Detail' : 'Question Detail'"
        :ui="{ content: 'max-w-3xl w-full' }"
        @update:open="(value) => (!value ? closeDetail() : null)"
      >
        <template #body>
          <div class="space-y-4" v-if="selectedQuestion">
            <div class="rounded border border-default p-3" v-html="selectedQuestion.question || '-'" />
            <div class="rounded border border-default p-3 space-y-2 text-sm">
              <p><span class="font-semibold">A.</span> {{ selectedQuestion.a || "-" }}</p>
              <p><span class="font-semibold">B.</span> {{ selectedQuestion.b || "-" }}</p>
              <p><span class="font-semibold">C.</span> {{ selectedQuestion.c || "-" }}</p>
              <p><span class="font-semibold">D.</span> {{ selectedQuestion.d || "-" }}</p>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div class="rounded border border-default p-2 text-center">
                <p class="text-muted">True</p>
                <p class="font-semibold">{{ selectedQuestion.isTrue ?? '-' }}</p>
              </div>
              <div class="rounded border border-default p-2 text-center">
                <p class="text-muted">False</p>
                <p class="font-semibold">{{ selectedQuestion.isFalse ?? '-' }}</p>
              </div>
              <div class="rounded border border-default p-2 text-center">
                <p class="text-muted">Total</p>
                <p class="font-semibold">{{ selectedQuestion.total ?? '-' }}</p>
              </div>
              <div class="rounded border border-default p-2 text-center">
                <p class="text-muted">Persentage</p>
                <p class="font-semibold">{{ formatPercentage(selectedQuestion.percentageTrue) }}</p>
              </div>
            </div>
            <div class="rounded border border-default p-3">
              <h3 class="font-semibold mb-3">Answer Summary</h3>
              <div class="flex flex-col md:flex-row items-start gap-4">
                <svg viewBox="0 0 160 160" class="w-40 h-40">
                  <circle
                    v-if="fullAnswerSlice"
                    cx="80"
                    cy="80"
                    r="64"
                    :fill="fullAnswerSlice.color"
                  />
                  <template v-else-if="answerSlices.some((item) => item.value > 0)">
                    <path
                      v-for="slice in answerSlices"
                      :key="slice.key"
                      :d="piePath(slice.start, slice.end)"
                      :fill="slice.color"
                    />
                  </template>
                  <circle
                    v-else
                    cx="80"
                    cy="80"
                    r="64"
                    fill="none"
                    stroke="rgba(148,163,184,0.6)"
                    stroke-width="12"
                  />
                  <text
                    v-if="!answerSlices.some((item) => item.value > 0)"
                    x="80"
                    y="84"
                    text-anchor="middle"
                    class="fill-muted text-xs"
                  >
                    No answers
                  </text>
                </svg>

                <div class="grid grid-cols-2 gap-2 text-sm w-full">
                  <div
                    v-for="slice in answerSlices"
                    :key="`legend-${slice.key}`"
                    class="rounded border border-default px-2 py-1 flex items-center justify-between gap-2"
                  >
                    <div class="flex items-center gap-2">
                      <span
                        class="inline-block h-2.5 w-2.5 rounded-full"
                        :style="{ backgroundColor: slice.color }"
                      />
                      <span>{{ slice.key }}</span>
                    </div>
                    <span class="font-medium">{{ slice.value }} ({{ slice.percent.toFixed(1) }}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
