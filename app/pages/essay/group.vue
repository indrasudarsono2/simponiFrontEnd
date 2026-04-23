<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import ip from "../../utils/config.json";
const { token } = useAuth();

const UButton = resolveComponent("UButton");

interface Essay {
  id: number;
  branchUnitId: number;
  question: string;
  answer: string;
  image: string;
  value: number;
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

interface GroupedMonitorQuestionGroupItem {
  id?: number;
  group: string;
  quantity: number;
  selected: number;
}

interface GroupedMonitorEntry {
  sector: string;
  rating: string;
  questionGroup: GroupedMonitorQuestionGroupItem[];
}

interface EssayQuestionGroupSector {
  id: number;
  sector: string;
}

interface EssayQuestionGroupDetail {
  id?: number;
  group: string;
  kindOfQuestion: { question: string };
  subBranchUnitRating: { rating: { rating: string } };
}

interface EssayQuestionGroup {
  essayId: number;
  sector: EssayQuestionGroupSector | null;
  questionGroup: EssayQuestionGroupDetail | null;
}

interface EssayGroupResponse {
  essay: Essay[];
  essays?: Essay[];
  questionGroup: QuestionGroup[];
  questionGroups?: QuestionGroup[];
  essayQuestionGroup: EssayQuestionGroup[];
  essayQuestionGroups?: EssayQuestionGroup[];
  grouped?:
    | GroupedMonitorEntry[]
    | Record<string, GroupedMonitorQuestionGroupItem[]>;
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

const essayToUpdate = ref<Essay | null>(null);
const showQuestionGroupMonitor = ref(false);

const columnFilters = ref([{ id: "question", value: "" }]);
const columnVisibility = ref();
const rowSelection = ref({});

const { data, status, refresh } = await useFetch<EssayGroupResponse>(
  `http://${ip.ipBackEnd}/api/essayGroups`,
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

function deepFindGroupedData(
  source: unknown,
  maxDepth: number = 4,
): unknown | null {
  const visited = new Set<unknown>();

  function walk(node: unknown, depth: number): unknown | null {
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
    if (grouped != null) return grouped;

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

function normalizeRating(value: unknown): string {
  return String(value || "-")
    .trim()
    .toUpperCase();
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

const resolvedGroupedQuestionMonitor = computed<GroupedMonitorEntry[]>(() => {
  const payload = data.value as any;
  let groupedCandidate: unknown =
    payload?.grouped ??
    payload?.data?.grouped ??
    payload?.result?.grouped ??
    (Array.isArray(payload) ? payload?.[0]?.grouped : undefined) ??
    deepFindGroupedData(payload);

  if (typeof groupedCandidate === "string") {
    try {
      groupedCandidate = JSON.parse(groupedCandidate);
    } catch (_error) {
      groupedCandidate = null;
    }
  }

  if (Array.isArray(groupedCandidate)) {
    return groupedCandidate.map((item) => ({
      sector: String((item as any)?.sector || "-"),
      rating: normalizeRating((item as any)?.rating),
      questionGroup: asArray<GroupedMonitorQuestionGroupItem>(
        (item as any)?.questionGroup,
      ).map((group) => ({
        id: (group as any)?.id ? Number((group as any).id) : undefined,
        group: String((group as any)?.group || "-"),
        quantity: Number((group as any)?.quantity || 0),
        selected: Number((group as any)?.selected || 0),
      })),
    }));
  }

  if (groupedCandidate && typeof groupedCandidate === "object") {
    return Object.entries(groupedCandidate as Record<string, unknown>)
      .filter(([, value]) => Array.isArray(value))
      .map(([rating, value]) => ({
        sector: "-",
        rating: normalizeRating(rating),
        questionGroup: asArray<GroupedMonitorQuestionGroupItem>(value).map(
          (group) => ({
            id: (group as any)?.id ? Number((group as any).id) : undefined,
            group: String((group as any)?.group || "-"),
            quantity: Number((group as any)?.quantity || 0),
            selected: Number((group as any)?.selected || 0),
          }),
        ),
      }));
  }

  const fallbackGroupedMap = new Map<string, GroupedMonitorEntry>();
  for (const item of resolvedQuestionGroups.value) {
    const sector = String(item.subBranchUnitRating?.sector?.sector || "-");
    const rating = normalizeRating(item.subBranchUnitRating?.rating?.rating);
    const key = `${sector}::${rating}`;
    if (!fallbackGroupedMap.has(key)) {
      fallbackGroupedMap.set(key, {
        sector,
        rating,
        questionGroup: [],
      });
    }

    fallbackGroupedMap.get(key)?.questionGroup.push({
      id: Number(item.id || 0),
      group: String(item.group || "-"),
      quantity: Number(item.quantity || 0),
      selected: Number((item as any).selected || 0),
    });
  }

  return Array.from(fallbackGroupedMap.values());
});

const resolvedEssays = computed<Essay[]>(() => {
  const payload = data.value as any;
  return pickFirstNonEmptyArray<Essay>([
    asArray<Essay>(payload?.essay),
    asArray<Essay>(payload?.essays),
    asArray<Essay>(payload?.data?.essay),
    asArray<Essay>(payload?.data?.essays),
    asArray<Essay>(payload?.result?.essay),
    asArray<Essay>(payload?.result?.essays),
    asArray<Essay>(Array.isArray(payload) ? payload[0]?.essay : []),
    asArray<Essay>(Array.isArray(payload) ? payload[0]?.essays : []),
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

const resolvedEssayQuestionGroups = computed<EssayQuestionGroup[]>(() => {
  const payload = data.value as any;
  const directCandidates = [
    asArray<EssayQuestionGroup>(payload?.essayQuestionGroup),
    asArray<EssayQuestionGroup>(payload?.essayQuestionGroups),
    asArray<EssayQuestionGroup>(payload?.data?.essayQuestionGroup),
    asArray<EssayQuestionGroup>(payload?.data?.essayQuestionGroups),
    asArray<EssayQuestionGroup>(payload?.result?.essayQuestionGroup),
    asArray<EssayQuestionGroup>(payload?.result?.essayQuestionGroups),
    asArray<EssayQuestionGroup>(
      Array.isArray(payload) ? payload[0]?.essayQuestionGroup : [],
    ),
    asArray<EssayQuestionGroup>(
      Array.isArray(payload) ? payload[0]?.essayQuestionGroups : [],
    ),
  ];

  const deepCandidates = deepFindArraysByKeys<EssayQuestionGroup>(payload, [
    "essayQuestionGroup",
    "essayQuestionGroups",
  ]);

  return pickFirstNonEmptyArray<EssayQuestionGroup>([
    ...directCandidates,
    ...deepCandidates,
  ]);
});

const currentBranch = computed(
  () => resolvedSectors.value?.[0]?.branchUnit?.branch?.branch || "-",
);
const currentBranchUnit = computed(
  () => resolvedSectors.value?.[0]?.branchUnit?.unit || "-",
);

const groupedMonitorSummary = computed(() => {
  const entries = resolvedGroupedQuestionMonitor.value;
  const cardCount = entries.length;
  const groupCount = entries.reduce(
    (acc, entry) => acc + (entry.questionGroup?.length || 0),
    0,
  );
  return { cardCount, groupCount };
});

const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

const pageSizeOptions = [
  { label: "10 / page", value: 10 },
  { label: "20 / page", value: 20 },
  { label: "50 / page", value: 50 },
  { label: "100 / page", value: 100 },
];
const pageSizeStorageKey = "essay-group-page-size";

function sanitizePageSize(value: unknown): number {
  const next = Number(value);
  const allowed = pageSizeOptions.map((item) => item.value);
  return allowed.includes(next) ? next : 10;
}

const selectedPageSize = computed({
  get: () => pagination.value.pageSize,
  set: (value: number) => {
    const next = sanitizePageSize(value);
    pagination.value.pageSize = next;
    pagination.value.pageIndex = 0;
    table.value?.tableApi?.setPageSize(next);
    table.value?.tableApi?.setPageIndex(0);
  },
});

onMounted(() => {
  const saved = sanitizePageSize(localStorage.getItem(pageSizeStorageKey));
  selectedPageSize.value = saved;
});

watch(
  () => pagination.value.pageSize,
  (size) => {
    if (!import.meta.client) return;
    localStorage.setItem(pageSizeStorageKey, String(sanitizePageSize(size)));
  },
);

const currentPage = computed({
  get: () => pagination.value.pageIndex + 1,
  set: (p: number) => {
    table.value?.tableApi?.setPageIndex(p - 1);
  },
});

function handleEdit(essay: Essay) {
  essayToUpdate.value = essay;
}

const uniqueSectors = computed(() => {
  const sectorsFromQuestionGroup = resolvedQuestionGroups.value
    .map((qg) => (qg as any)?.subBranchUnitRating?.sector?.sector)
    .filter((sector): sector is string => typeof sector === "string");

  const sectorsFromAssignments = resolvedEssayQuestionGroups.value
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

function getGroupsForEssaySector(essayId: number, sectorName: string): string {
  const matches = resolvedEssayQuestionGroups.value.filter(
    (eqg) => eqg.essayId === essayId && eqg.sector?.sector === sectorName,
  );
  if (!matches || matches.length === 0) return "-";

  const listItems = matches
    .map((m) => {
      const groupName = m.questionGroup?.group;
      const ratingName = m.questionGroup?.subBranchUnitRating?.rating?.rating;
      if (!groupName) return null;

      const ratingText = ratingName ? ` (${ratingName})` : "";
      return `<li>${groupName}${ratingText}</li>`;
    })
    .filter((item): item is string => item !== null)
    .join("");

  if (!listItems) return "-";
  return `<ul class="list-disc list-inside space-y-0.5">${listItems}</ul>`;
}

const sectorColumns = computed<TableColumn<Essay>[]>(() => {
  return uniqueSectors.value.map((sector) => ({
    id: `sector-${sector}`,
    header: sector,
    cell: ({ row }) => {
      const groupHtml = getGroupsForEssaySector(row.original.id, sector);
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

const columns = computed<TableColumn<Essay>[]>(() => [
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
        label: "Essay Question",
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

function handleEssayGroupUpdated() {
  essayToUpdate.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Essay group assignments have been updated",
    color: "success",
  });
}

function handleModalClose() {
  essayToUpdate.value = null;
}

function getMonitorStatusColor(selected: number, quantity: number) {
  if (selected > quantity) return "info";
  if (selected < quantity) return "warning";
  return "success";
}

function getMonitorStatusText(selected: number, quantity: number) {
  if (selected > quantity) return "Better";
  if (selected < quantity) return "Need More";
  return "Complete";
}

function getMonitorProgress(selected: number, quantity: number): number {
  if (quantity <= 0) return 0;
  return Math.min(100, Math.round((selected / quantity) * 100));
}
</script>

<template>
  <UDashboardPanel id="essay-group">
    <template #header>
      <UDashboardNavbar title="Essay Group Assignment">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
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

      <div>
        <div>
          <UCard class="mb-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-sm text-muted">Question Group Monitor</p>
                <p class="text-sm font-medium">
                  {{ groupedMonitorSummary.cardCount }} sector-rating card(s),
                  {{ groupedMonitorSummary.groupCount }} group item(s)
                </p>
              </div>
              <UButton
                label="Open Monitor"
                icon="i-lucide-layout-grid"
                color="primary"
                variant="soft"
                @click="showQuestionGroupMonitor = true"
              />
            </div>
          </UCard>
        </div>

        <div>
          <div class="flex flex-wrap items-center justify-between gap-1.5 mb-4">
            <UInput
              v-model="searchQuery"
              class="max-w-sm"
              icon="i-lucide-search"
              placeholder="Search questions..."
            />

            <div class="flex flex-wrap items-center gap-1.5">
              <USelect
                v-model="selectedPageSize"
                :items="pageSizeOptions"
                label-key="label"
                value-key="value"
                class="w-28"
              />
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
            :data="resolvedEssays"
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
            class="flex items-center justify-between gap-3 border-t border-default pt-4"
          >
            <div class="text-sm text-muted">
              Showing {{ pagination.pageIndex * pagination.pageSize + 1 }} to
              {{
                Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  resolvedEssays.length || 0,
                )
              }}
              of
              {{ resolvedEssays.length || 0 }} essays
            </div>

            <div class="flex items-center gap-1.5">
              <UPagination
                v-model:page="currentPage"
                :items-per-page="pagination.pageSize"
                :total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
              />
            </div>
          </div>
        </div>
      </div>

      <EssayGroupUpdateModal
        :essay="essayToUpdate"
        :question-groups="resolvedQuestionGroups"
        :essay-question-groups="resolvedEssayQuestionGroups"
        @essay-group-updated="handleEssayGroupUpdated"
        @close="handleModalClose"
      />

      <UModal
        :open="showQuestionGroupMonitor"
        title="Question Group Monitor"
        description="Monitor grouped question coverage by sector and rating"
        :ui="{ content: 'max-w-6xl' }"
        @update:open="(value) => (showQuestionGroupMonitor = value)"
      >
        <template #body>
          <div
            v-if="resolvedGroupedQuestionMonitor.length === 0"
            class="rounded-lg border border-dashed border-default p-8 text-center text-sm text-muted"
          >
            No grouped monitor data found from API response.
          </div>

          <div v-else class="grid gap-4 md:grid-cols-2">
            <UCard
              v-for="(entry, entryIndex) in resolvedGroupedQuestionMonitor"
              :key="`${entry.sector}-${entry.rating}-${entryIndex}`"
              class="h-full"
            >
              <template #header>
                <div class="flex items-center justify-between gap-2">
                  <div>
                    <p class="text-xs uppercase tracking-wide text-muted">
                      Sector
                    </p>
                    <p class="text-base font-semibold">
                      {{ entry.sector || "-" }}
                    </p>
                  </div>
                  <UBadge color="neutral" variant="soft">
                    Rating {{ entry.rating || "-" }}
                  </UBadge>
                </div>
              </template>

              <div class="space-y-3">
                <div
                  v-for="(groupItem, groupIndex) in entry.questionGroup"
                  :key="groupItem.id || `${groupItem.group}-${groupIndex}`"
                  class="rounded-lg border border-default p-3"
                >
                  <div class="flex items-start justify-between gap-3">
                    <p class="text-sm font-medium leading-5">
                      {{ groupItem.group }}
                    </p>
                    <UBadge
                      :color="
                        getMonitorStatusColor(
                          Number(groupItem.selected || 0),
                          Number(groupItem.quantity || 0),
                        )
                      "
                      variant="subtle"
                    >
                      {{
                        getMonitorStatusText(
                          Number(groupItem.selected || 0),
                          Number(groupItem.quantity || 0),
                        )
                      }}
                    </UBadge>
                  </div>

                  <div
                    class="mt-2 flex items-center justify-between text-xs text-muted"
                  >
                    <span>Selected {{ Number(groupItem.selected || 0) }}</span>
                    <span>Quantity {{ Number(groupItem.quantity || 0) }}</span>
                  </div>

                  <div class="mt-2 h-2 w-full rounded-full bg-elevated">
                    <div
                      class="h-2 rounded-full"
                      :class="
                        getMonitorStatusColor(
                          Number(groupItem.selected || 0),
                          Number(groupItem.quantity || 0),
                        ) === 'success'
                          ? 'bg-green-500'
                          : getMonitorStatusColor(
                                Number(groupItem.selected || 0),
                                Number(groupItem.quantity || 0),
                              ) === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                      "
                      :style="{
                        width: `${getMonitorProgress(
                          Number(groupItem.selected || 0),
                          Number(groupItem.quantity || 0),
                        )}%`,
                      }"
                    />
                  </div>
                </div>
              </div>
            </UCard>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
