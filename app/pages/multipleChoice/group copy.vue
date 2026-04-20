<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import ip from "../../utils/config.json";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

// Define interfaces matching API response
interface MultipleChoice {
  id: number;
  branchUnitId: number;
  question: string;
  image: string | null;
  a: string;
  b: string;
  c: string;
  d: string;
  key: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

interface Rating {
  id: number;
  professionId: number;
  rating: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface Sector {
  id: number;
  branchUnitId: number;
  sector: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface SubBranchUnitRating {
  rating: Rating;
  sector: Sector;
}

interface QuestionGroup {
  id: number;
  group: string;
  quantity: number;
  selected?: number;
  subBranchUnitRating: SubBranchUnitRating;
}

interface GroupedMonitorItem {
  id: number;
  group: string;
  quantity: number;
  selected: number;
  subBranchUnitRating?: SubBranchUnitRating;
}

interface MultipleChoiceQuestionGroupSector {
  id: number;
  sector: string;
}

interface MultipleChoiceQuestionGroupDetail {
  id?: number;
  group: string;
  kindOfQuestion: { question: string };
  subBranchUnitRating: { rating: { rating: string } };
}

interface MultipleChoiceQuestionGroup {
  multipleChoiceId: number;
  sector: MultipleChoiceQuestionGroupSector;
  questionGroup: MultipleChoiceQuestionGroupDetail;
}

interface MultipleChoiceGroupResponse {
  multipleChoice: MultipleChoice[];
  questionGroup: QuestionGroup[];
  questionGroups?: QuestionGroup[];
  multipleChoiceQuestionGroup: MultipleChoiceQuestionGroup[];
  multipleChoiceQuestionGroups?: MultipleChoiceQuestionGroup[];
  grouped?: Record<string, GroupedMonitorItem[]>;
  sector: {
    id: number;
    sector: string;
    subBranchUnitRatings: { id: number }[];
    branchUnit: {
      unit: string;
      branch: {
        branch: string;
      };
    };
  }[];
}

const toast = useToast();
const table = useTemplateRef("table");

// State for modals
const multipleChoiceToUpdate = ref<MultipleChoice | null>(null);

// Table state
const columnFilters = ref([{ id: "question", value: "" }]);
const columnVisibility = ref();
const rowSelection = ref({});

// Fetch multiple choice groups data
const { data, status, refresh } = await useFetch<MultipleChoiceGroupResponse>(
  `http://${ip.ipBackEnd}/api/multipleChoiceGroups`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function deepFindArraysByKeys<T = any>(
  source: unknown,
  targetKeys: string[],
  maxDepth: number = 4,
): T[][] {
  const keySet = new Set(targetKeys);
  const results: T[][] = [];
  const visited = new Set<unknown>();

  function walk(node: unknown, depth: number) {
    if (node == null || depth > maxDepth || visited.has(node)) return;
    if (typeof node !== "object") return;
    visited.add(node);

    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }

    const obj = node as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      if (keySet.has(key) && Array.isArray(value)) {
        results.push(value as T[]);
      }
      walk(value, depth + 1);
    }
  }

  walk(source, 0);
  return results;
}

function deepFindGroupedObject(
  source: unknown,
  maxDepth: number = 4,
): Record<string, unknown> | null {
  const visited = new Set<unknown>();

  function walk(node: unknown, depth: number): Record<string, unknown> | null {
    if (node == null || depth > maxDepth || visited.has(node)) return null;
    if (typeof node !== "object") return null;
    visited.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item, depth + 1);
        if (found) return found;
      }
      return null;
    }

    const obj = node as Record<string, unknown>;
    const grouped = obj.grouped;
    if (grouped && typeof grouped === "object" && !Array.isArray(grouped)) {
      return grouped as Record<string, unknown>;
    }

    for (const value of Object.values(obj)) {
      const found = walk(value, depth + 1);
      if (found) return found;
    }

    return null;
  }

  return walk(source, 0);
}

function pickFirstNonEmptyArray<T = any>(candidates: T[][]): T[] {
  for (const candidate of candidates) {
    if (candidate.length > 0) return candidate;
  }
  return [];
}

const resolvedQuestionGroups = computed<QuestionGroup[]>(() => {
  const payload = data.value as any;
  const directCandidates = [
    asArray<QuestionGroup>(payload?.questionGroup),
    asArray<QuestionGroup>(payload?.questionGroups),
    asArray<QuestionGroup>(payload?.data?.questionGroup),
    asArray<QuestionGroup>(payload?.data?.questionGroups),
    asArray<QuestionGroup>(payload?.result?.questionGroup),
    asArray<QuestionGroup>(payload?.result?.questionGroups),
    asArray<QuestionGroup>(
      Array.isArray(payload) ? payload[0]?.questionGroup : [],
    ),
    asArray<QuestionGroup>(
      Array.isArray(payload) ? payload[0]?.questionGroups : [],
    ),
  ];

  const deepCandidates = deepFindArraysByKeys<QuestionGroup>(payload, [
    "questionGroup",
    "questionGroups",
  ]);

  return pickFirstNonEmptyArray<QuestionGroup>([
    ...directCandidates,
    ...deepCandidates,
  ]);
});

const resolvedGroupedQuestionMonitor = computed<
  Record<string, GroupedMonitorItem[]>
>(() => {
  const payload = data.value as any;
  let groupedCandidate: unknown =
    payload?.grouped ??
    payload?.data?.grouped ??
    payload?.result?.grouped ??
    (Array.isArray(payload) ? payload?.[0]?.grouped : undefined) ??
    deepFindGroupedObject(payload);

  if (typeof groupedCandidate === "string") {
    try {
      groupedCandidate = JSON.parse(groupedCandidate);
    } catch (_error) {
      groupedCandidate = null;
    }
  }

  if (
    !groupedCandidate ||
    typeof groupedCandidate !== "object" ||
    Array.isArray(groupedCandidate)
  ) {
    const fallbackGrouped: Record<string, GroupedMonitorItem[]> = {};
    for (const item of resolvedQuestionGroups.value) {
      const rating = normalizeRating(item.subBranchUnitRating?.rating?.rating);
      if (!rating || rating === "-") continue;
      if (!fallbackGrouped[rating]) fallbackGrouped[rating] = [];
      fallbackGrouped[rating].push({
        id: Number(item.id || 0),
        group: String(item.group || "-"),
        quantity: Number(item.quantity || 0),
        selected: Number((item as any).selected || 0),
        subBranchUnitRating: item.subBranchUnitRating,
      });
    }
    return fallbackGrouped;
  }

  const normalizedEntries = Object.entries(
    groupedCandidate as Record<string, unknown>,
  )
    .filter(([, value]) => Array.isArray(value))
    .map(([rating, value]) => [
      rating,
      asArray<GroupedMonitorItem>(value).map((item) => ({
        id: Number((item as any)?.id || 0),
        group: String((item as any)?.group || "-"),
        quantity: Number((item as any)?.quantity || 0),
        selected: Number((item as any)?.selected || 0),
        subBranchUnitRating: (item as any)?.subBranchUnitRating,
      })),
    ]);

  return Object.fromEntries(normalizedEntries) as Record<
    string,
    GroupedMonitorItem[]
  >;
});

const resolvedMultipleChoices = computed<MultipleChoice[]>(() => {
  const payload = data.value as any;
  return pickFirstNonEmptyArray<MultipleChoice>([
    asArray<MultipleChoice>(payload?.multipleChoice),
    asArray<MultipleChoice>(payload?.data?.multipleChoice),
    asArray<MultipleChoice>(payload?.result?.multipleChoice),
    asArray<MultipleChoice>(
      Array.isArray(payload) ? payload[0]?.multipleChoice : [],
    ),
  ]);
});

const resolvedSectors = computed<
  {
    id: number;
    sector: string;
    subBranchUnitRatings: { id: number }[];
    branchUnit: {
      unit: string;
      branch: {
        branch: string;
      };
    };
  }[]
>(() => {
  const payload = data.value as any;
  return pickFirstNonEmptyArray([
    asArray(payload?.sector),
    asArray(payload?.data?.sector),
    asArray(payload?.result?.sector),
    asArray(Array.isArray(payload) ? payload[0]?.sector : []),
  ]);
});

const resolvedMultipleChoiceQuestionGroups = computed<
  MultipleChoiceQuestionGroup[]
>(() => {
  const payload = data.value as any;
  const directCandidates = [
    asArray<MultipleChoiceQuestionGroup>(payload?.multipleChoiceQuestionGroup),
    asArray<MultipleChoiceQuestionGroup>(payload?.multipleChoiceQuestionGroups),
    asArray<MultipleChoiceQuestionGroup>(
      payload?.data?.multipleChoiceQuestionGroup,
    ),
    asArray<MultipleChoiceQuestionGroup>(
      payload?.data?.multipleChoiceQuestionGroups,
    ),
    asArray<MultipleChoiceQuestionGroup>(
      payload?.result?.multipleChoiceQuestionGroup,
    ),
    asArray<MultipleChoiceQuestionGroup>(
      payload?.result?.multipleChoiceQuestionGroups,
    ),
    asArray<MultipleChoiceQuestionGroup>(
      Array.isArray(payload) ? payload[0]?.multipleChoiceQuestionGroup : [],
    ),
    asArray<MultipleChoiceQuestionGroup>(
      Array.isArray(payload) ? payload[0]?.multipleChoiceQuestionGroups : [],
    ),
  ];

  const deepCandidates = deepFindArraysByKeys<MultipleChoiceQuestionGroup>(
    payload,
    ["multipleChoiceQuestionGroup", "multipleChoiceQuestionGroups"],
  );

  return pickFirstNonEmptyArray<MultipleChoiceQuestionGroup>([
    ...directCandidates,
    ...deepCandidates,
  ]);
});

// Context derived from API response
const currentBranch = computed(
  () => resolvedSectors.value?.[0]?.branchUnit?.branch?.branch || "-",
);
const currentBranchUnit = computed(
  () => resolvedSectors.value?.[0]?.branchUnit?.unit || "-",
);

// Pagination state - declared before columns
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

// Current page computed (1-based for UPagination, 0-based for table)
const currentPage = computed({
  get: () => pagination.value.pageIndex + 1,
  set: (p: number) => {
    table.value?.tableApi?.setPageIndex(p - 1);
  },
});

// Action handlers
function handleEdit(mc: MultipleChoice) {
  multipleChoiceToUpdate.value = mc;
}

// Extract unique sectors from questionGroup data for dynamic columns
const uniqueSectors = computed(() => {
  const sectorsFromQuestionGroup = resolvedQuestionGroups.value
    .map((qg) => (qg as any)?.subBranchUnitRating?.sector?.sector)
    .filter((sector): sector is string => typeof sector === "string");

  const sectorsFromAssignments = resolvedMultipleChoiceQuestionGroups.value
    .map((item) => item.sector?.sector)
    .filter((sector): sector is string => typeof sector === "string");

  const sectorsFromResolved = (resolvedSectors.value || [])
    .map((item) => item.sector)
    .filter((sector): sector is string => typeof sector === "string");

  return [
    ...new Set([
      ...sectorsFromQuestionGroup,
      ...sectorsFromAssignments,
      ...sectorsFromResolved,
    ]),
  ].sort();
});

interface GroupMonitorItem {
  questionGroupId: number;
  group: string;
  quantity: number;
  selected: number;
}

interface RatingMonitorItem {
  rating: string;
  groups: GroupMonitorItem[];
}

function normalizeRating(value: unknown): string {
  return String(value || "-")
    .trim()
    .toUpperCase();
}

const questionGroupMonitorByRating = computed<RatingMonitorItem[]>(() => {
  const groupedMonitor = resolvedGroupedQuestionMonitor.value;
  return Object.entries(groupedMonitor)
    .map(([rating, groups]) => ({
      rating: normalizeRating(rating),
      groups: (groups || [])
        .map((group) => ({
          questionGroupId: Number(group.id || 0),
          group: group.group || "-",
          quantity: Number(group.quantity || 0),
          selected: Number(group.selected || 0),
        }))
        .sort((a, b) => a.group.localeCompare(b.group)),
    }))
    .sort((a, b) => a.rating.localeCompare(b.rating));
});

// Helper: get group names with ratings for a given multipleChoiceId and sector (as HTML list)
function getGroupsForMCSector(mcId: number, sectorName: string): string {
  const matches = resolvedMultipleChoiceQuestionGroups.value.filter(
    (mcqg) =>
      mcqg.multipleChoiceId === mcId && mcqg.sector.sector === sectorName,
  );
  if (!matches || matches.length === 0) return "-";

  const listItems = matches
    .map(
      (m) =>
        `<li>${m.questionGroup.group} (${m.questionGroup.subBranchUnitRating.rating.rating})</li>`,
    )
    .join("");

  return `<ul class="list-disc list-inside space-y-0.5">${listItems}</ul>`;
}

// Create dynamic sector columns
const sectorColumns = computed<TableColumn<MultipleChoice>[]>(() => {
  return uniqueSectors.value.map((sector) => ({
    id: `sector-${sector}`,
    header: sector,
    cell: ({ row }) => {
      const groupHtml = getGroupsForMCSector(row.original.id, sector);
      const hasGroup = groupHtml !== "-";
      return h("div", {
        class: hasGroup
          ? "text-sm text-primary font-medium"
          : "text-sm text-muted",
        innerHTML: groupHtml,
      });
    },
  }));
});

// Table columns definition
const columns = computed<TableColumn<MultipleChoice>[]>(() => [
  {
    id: "no",
    header: "NO",
    cell: ({ row }) => {
      return row.index + 1;
    },
  },
  {
    accessorKey: "question",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Multiple Choice Question",
        icon: isSorted
          ? isSorted === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : "i-lucide-arrow-down-wide-narrow"
          : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      });
    },
    cell: ({ row }) => {
      return h("div", {
        class:
          "font-medium text-highlighted max-w-2xl whitespace-normal break-words py-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1",
        innerHTML: row.original.question,
      });
    },
  },
  ...sectorColumns.value,
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) => {
      return h("div", { class: "flex items-center justify-start gap-2" }, [
        h(UButton, {
          icon: "i-lucide-pencil",
          color: "primary",
          variant: "soft",
          size: "sm",
          onClick: () => handleEdit(row.original),
        }),
      ]);
    },
  },
]);

// Search filter
const searchQuery = computed({
  get: (): string => {
    return (
      (table.value?.tableApi
        ?.getColumn("question")
        ?.getFilterValue() as string) || ""
    );
  },
  set: (value: string) => {
    table.value?.tableApi
      ?.getColumn("question")
      ?.setFilterValue(value || undefined);
  },
});

// Handle modal events
function handleMultipleChoiceGroupUpdated() {
  multipleChoiceToUpdate.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Multiple choice group assignments have been updated",
    color: "success",
  });
}

function handleModalClose() {
  multipleChoiceToUpdate.value = null;
}
</script>

<template>
  <UDashboardPanel id="multiple-choice-group">
    <template #header>
      <UDashboardNavbar title="Multiple Choice Group Assignment">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Context Info -->
      <div class="mb-4 p-3 bg-elevated/50 rounded-lg border border-default">
        <div class="flex items-center gap-4 text-sm">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-building-2" class="text-muted" />
            <span class="text-muted">Branch:</span>
            <span class="font-medium">{{ currentBranch }}</span>
          </div>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-square-chart-gantt" class="text-muted" />
            <span class="text-muted">Branch Unit:</span>
            <span class="font-medium">{{ currentBranchUnit }}</span>
          </div>
        </div>
      </div>

      <UCard class="mb-4">
        <template #header>
          <h2 class="text-base font-semibold">Question Group Monitor</h2>
        </template>

        <div
          v-if="questionGroupMonitorByRating.length === 0"
          class="text-sm text-muted"
        >
          No grouped monitor data found from API response.
        </div>

        <div v-else class="grid gap-3 md:grid-cols-2">
          <div
            v-for="ratingItem in questionGroupMonitorByRating"
            :key="ratingItem.rating"
            class="rounded-lg border border-default p-3"
          >
            <p class="text-sm text-muted">Rating</p>
            <p class="text-base font-semibold text-highlighted mb-3">
              {{ ratingItem.rating }}
            </p>
            <ul class="space-y-3 text-sm">
              <li
                v-for="groupItem in ratingItem.groups"
                :key="groupItem.questionGroupId"
                class="text-muted"
              >
                <p>{{ groupItem.group }}: {{ groupItem.quantity }}</p>
                <p class="text-highlighted">Selected: {{ groupItem.selected }}</p>
              </li>
            </ul>
          </div>
        </div>
      </UCard>

      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-4">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search questions..."
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <UButton
            label="Refresh"
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            @click="refresh"
          />
        </div>
      </div>
      <UTable
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        v-model:pagination="pagination"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel(),
        }"
        class="shrink-0"
        :data="resolvedMultipleChoices"
        :columns="columns"
        :loading="status === 'pending'"
        :ui="{
          base: 'table-auto border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default align-top',
          separator: 'h-0',
        }"
      />

      <div
        class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto"
      >
        <div class="text-sm text-muted">
          Showing {{ pagination.pageIndex * pagination.pageSize + 1 }} to
          {{
            Math.min(
              (pagination.pageIndex + 1) * pagination.pageSize,
              resolvedMultipleChoices.length || 0,
            )
          }}
          of
          {{ resolvedMultipleChoices.length || 0 }} questions
        </div>

        <div class="flex items-center gap-1.5">
          <UPagination
            v-model:page="currentPage"
            :items-per-page="pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
          />
        </div>
      </div>
      <!-- Update Modal -->
      <MultipleChoiceGroupUpdateModal
        :multiple-choice="multipleChoiceToUpdate"
        :question-groups="resolvedQuestionGroups"
        :multiple-choice-question-groups="resolvedMultipleChoiceQuestionGroups"
        @multiple-choice-group-updated="handleMultipleChoiceGroupUpdated"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
