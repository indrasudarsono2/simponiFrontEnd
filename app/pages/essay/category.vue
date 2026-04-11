<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import ip from "../../utils/config.json";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

// Define QuestionGroup interface based on actual API response
interface QuestionGroup {
  id: number;
  kindOfQuestionId: number;
  subBranchUnitRatingId: number;
  group: string;
  quantity: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: null | string;
  subBranchUnitRating: {
    id: number;
    rating: {
      id: number;
      professionId: number;
      rating: string;
      description: string;
      createdAt: string;
      updatedAt: string;
      deletedAt: null | string;
    };
    sector: {
      id: number;
      sector: string;
    };
  };
}

interface SubBranchUnitRating {
  id: number;
  rating: {
    id: number;
    professionId: number;
    rating: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: null | string;
  };
}

interface SectorItem {
  id: number;
  sector: string;
  branchUnit: {
    unit: string;
    branch: {
      branch: string;
    };
  };
  deletedAt: null | string;
  subBranchUnitRatings: SubBranchUnitRating[];
}

const toast = useToast();
const table = useTemplateRef("table");

// State for modals
const selectedQuestionGroup = ref<QuestionGroup | null>(null);
const questionGroupToUpdate = ref<QuestionGroup | null>(null);
const questionGroupToDelete = ref<QuestionGroup | null>(null);

// Table state
const columnFilters = ref([
  {
    id: "sectorName",
    value: "",
  },
]);
const columnVisibility = ref();
const rowSelection = ref({});

// Filter states
const selectedSectorId = ref<number | null>(null);
const selectedRatingId = ref<number | null>(null);
const selectedGroupName = ref<string | null>(null);

// Target questions per sector-rating combination (ESSAY = 5)
const targetQuestions = ref(5);

interface ApiResponse {
  sector: SectorItem[];
  questionGroups: QuestionGroup[];
}
// Fetch question groups data
const { data, status, refresh } = await useFetch<ApiResponse>(
  `http://${ip.ipBackEnd}/api/questionGroupsEssay`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Available sectors derived from API response
const availableSectors = computed(() => {
  if (!data.value?.sector) return [];
  return data.value.sector.map((item) => ({
    id: item.id,
    name: item.sector,
    subBranchUnitRatings: item.subBranchUnitRatings,
  }));
});

// Available ratings derived from all sectors' subBranchUnitRatings (unique by rating id)
const availableRatings = computed(() => {
  if (!data.value?.sector) return [];
  const ratingsMap = new Map<number, { id: number; name: string }>();
  data.value.sector.forEach((sector) => {
    sector.subBranchUnitRatings.forEach((sub) => {
      if (!ratingsMap.has(sub.rating.id)) {
        ratingsMap.set(sub.rating.id, {
          id: sub.rating.id,
          name: sub.rating.rating,
        });
      }
    });
  });
  return Array.from(ratingsMap.values());
});

// Context derived from API response
const currentBranch = computed(
  () => data.value?.sector?.[0]?.branchUnit?.branch?.branch || "-",
);
const currentBranchUnit = computed(
  () => data.value?.sector?.[0]?.branchUnit?.unit || "-",
);

// Calculate total questions per sector-rating combination
const sectorRatingSummary = computed(() => {
  if (!data.value?.questionGroups) return [];

  const summary = new Map<
    string,
    {
      sectorId: number;
      sectorName: string;
      ratingId: number;
      ratingName: string;
      totalQuestions: number;
      groupCount: number;
      remainingNeeded: number;
    }
  >();

  data.value.questionGroups.forEach((item) => {
    const sectorId = item.subBranchUnitRating.sector.id;
    const sectorName = item.subBranchUnitRating.sector.sector;
    const ratingId = item.subBranchUnitRating.rating.id;
    const ratingName = item.subBranchUnitRating.rating.rating;

    const key = `${sectorId}-${ratingId}`;
    const existing = summary.get(key);

    if (existing) {
      existing.totalQuestions += item.quantity;
      existing.groupCount += 1;
      existing.remainingNeeded = Math.max(
        0,
        targetQuestions.value - existing.totalQuestions,
      );
    } else {
      summary.set(key, {
        sectorId,
        sectorName,
        ratingId,
        ratingName,
        totalQuestions: item.quantity,
        groupCount: 1,
        remainingNeeded: Math.max(0, targetQuestions.value - item.quantity),
      });
    }
  });

  return Array.from(summary.values());
});

// Filtered data based on selected sector, rating, and group
const filteredData = computed(() => {
  if (!data.value?.questionGroups) return [];

  return data.value.questionGroups.filter((item) => {
    const sectorId = item.subBranchUnitRating.sector.id;
    const ratingId = item.subBranchUnitRating.rating.id;

    const sectorMatch =
      !selectedSectorId.value || sectorId === selectedSectorId.value;
    const ratingMatch =
      !selectedRatingId.value || ratingId === selectedRatingId.value;
    const groupMatch =
      !selectedGroupName.value ||
      selectedGroupName.value === "" ||
      item.group === selectedGroupName.value;
    return sectorMatch && ratingMatch && groupMatch;
  });
});

// Get summary for currently selected filter
const currentSummary = computed(() => {
  if (!selectedSectorId.value || !selectedRatingId.value) return null;

  const sector = availableSectors.value.find(
    (s) => s.id === selectedSectorId.value,
  );
  const rating = availableRatings.value.find(
    (r) => r.id === selectedRatingId.value,
  );

  if (!sector || !rating) return null;

  const totalQuestions = filteredData.value.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const remainingNeeded = Math.max(0, targetQuestions.value - totalQuestions);

  return {
    sectorName: sector.name,
    ratingName: rating.name,
    totalQuestions,
    remainingNeeded,
    isComplete: totalQuestions >= targetQuestions.value,
  };
});

// Action handlers
function handleEdit(item: QuestionGroup) {
  questionGroupToUpdate.value = item;
}

function handleDelete(item: QuestionGroup) {
  questionGroupToDelete.value = item;
}

// Table columns definition
const columns: TableColumn<QuestionGroup>[] = [
  {
    id: "no",
    header: "NO",
    cell: ({ row }) => {
      const pageIndex =
        table.value?.tableApi?.getState().pagination.pageIndex || 0;
      const pageSize =
        table.value?.tableApi?.getState().pagination.pageSize || 10;
      return row.index + 1;
    },
  },
  {
    accessorKey: "subBranchUnitRating.sector.sector",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Sector",
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
      return h(
        "div",
        { class: "font-medium text-highlighted" },
        row.original.subBranchUnitRating.sector.sector,
      );
    },
  },
  {
    accessorKey: "group",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Group",
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
      return h("div", { class: "font-medium" }, row.original.group);
    },
  },
  {
    accessorKey: "subBranchUnitRating.rating.rating",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Rating",
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
      return h(
        "div",
        { class: "text-muted" },
        row.original.subBranchUnitRating.rating.rating,
      );
    },
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => {
      return h(
        "div",
        { class: "text-center" },
        row.original.quantity.toString(),
      );
    },
  },
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
        h(UButton, {
          icon: "i-lucide-trash-2",
          color: "error",
          variant: "soft",
          size: "sm",
          onClick: () => handleDelete(row.original),
        }),
      ]);
    },
  },
];

// Search filter
const searchQuery = computed({
  get: (): string => {
    return (
      (table.value?.tableApi
        ?.getColumn("sectorName")
        ?.getFilterValue() as string) || ""
    );
  },
  set: (value: string) => {
    table.value?.tableApi
      ?.getColumn("sectorName")
      ?.setFilterValue(value || undefined);
  },
});

// Pagination state
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

// Handle modal events
function handleQuestionGroupAdded() {
  refresh();
  toast.add({
    title: "Success",
    description: "Question group list has been refreshed",
    color: "success",
  });
}

function handleQuestionGroupUpdated() {
  questionGroupToUpdate.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Question group list has been refreshed",
    color: "success",
  });
}

function handleQuestionGroupDeleted() {
  questionGroupToDelete.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Question group list has been refreshed",
    color: "success",
  });
}

function handleModalClose() {
  questionGroupToUpdate.value = null;
  questionGroupToDelete.value = null;
}
</script>

<template>
  <UDashboardPanel id="essay-category">
    <template #header>
      <UDashboardNavbar title="Essay Category">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <EssayCategoryAddModal
            :sectors="availableSectors"
            @question-group-added="handleQuestionGroupAdded"
          />
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

      <!-- Target Setting -->
      <div class="mb-4 p-3 bg-elevated/50 rounded-lg border border-default">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-target" class="text-primary" />
            <span class="text-sm font-medium"
              >Target Questions per Sector-Rating:</span
            >
          </div>
          <UInput
            v-model.number="targetQuestions"
            type="number"
            min="1"
            class="w-24"
          />
          <span class="text-sm text-muted">questions</span>
        </div>
      </div>

      <!-- Sector-Rating Summary Cards -->
      <div class="mb-4">
        <h3 class="text-sm font-medium mb-2 flex items-center gap-2">
          <UIcon name="i-lucide-pie-chart" class="text-muted" />
          Question Distribution Summary
        </h3>
        <div
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
        >
          <div
            v-for="summary in sectorRatingSummary"
            :key="`${summary.sectorId}-${summary.ratingId}`"
            class="p-3 rounded-lg border border-default bg-elevated/30"
            :class="{
              'border-success/50 bg-success/10':
                summary.totalQuestions >= targetQuestions,
              'border-warning/50 bg-warning/10':
                summary.totalQuestions > 0 &&
                summary.totalQuestions < targetQuestions,
              'border-error/50 bg-error/10': summary.totalQuestions === 0,
            }"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ summary.sectorName }}</span>
                <span class="text-xs px-2 py-0.5 rounded bg-elevated">{{
                  summary.ratingName
                }}</span>
              </div>
              <UIcon
                :name="
                  summary.totalQuestions >= targetQuestions
                    ? 'i-lucide-check-circle'
                    : 'i-lucide-alert-circle'
                "
                :class="
                  summary.totalQuestions >= targetQuestions
                    ? 'text-success'
                    : 'text-warning'
                "
              />
            </div>
            <div class="space-y-1">
              <div class="flex justify-between text-sm">
                <span class="text-muted">Total Questions:</span>
                <span
                  class="font-medium"
                  :class="{
                    'text-success': summary.totalQuestions >= targetQuestions,
                    'text-warning':
                      summary.totalQuestions > 0 &&
                      summary.totalQuestions < targetQuestions,
                  }"
                >
                  {{ summary.totalQuestions }}
                </span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">Target:</span>
                <span class="font-medium">{{ targetQuestions }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">Remaining:</span>
                <span
                  class="font-medium"
                  :class="{
                    'text-success': summary.remainingNeeded === 0,
                    'text-error': summary.remainingNeeded > 0,
                  }"
                >
                  {{ summary.remainingNeeded }}
                </span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">Groups:</span>
                <span class="font-medium">{{ summary.groupCount }}</span>
              </div>
            </div>
            <!-- Progress Bar -->
            <div class="mt-2 h-2 bg-elevated rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-300"
                :class="{
                  'bg-success': summary.totalQuestions >= targetQuestions,
                  'bg-warning':
                    summary.totalQuestions > 0 &&
                    summary.totalQuestions < targetQuestions,
                  'bg-error': summary.totalQuestions === 0,
                }"
                :style="{
                  width: `${Math.min(100, (summary.totalQuestions / targetQuestions) * 100)}%`,
                }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Current Filter Summary -->
      <div
        v-if="currentSummary"
        class="mb-4 p-4 rounded-lg border"
        :class="{
          'border-success/50 bg-success/10': currentSummary.isComplete,
          'border-warning/50 bg-warning/10': !currentSummary.isComplete,
        }"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <UIcon
              :name="
                currentSummary.isComplete
                  ? 'i-lucide-check-circle'
                  : 'i-lucide-info'
              "
              :class="
                currentSummary.isComplete ? 'text-success' : 'text-warning'
              "
              class="text-xl"
            />
            <div>
              <h4 class="font-medium">
                {{ currentSummary.sectorName }} -
                {{ currentSummary.ratingName }}
              </h4>
              <p class="text-sm text-muted">
                {{ currentSummary.totalQuestions }} of
                {{ targetQuestions }} questions
                <span
                  v-if="currentSummary.isComplete"
                  class="text-success font-medium"
                  >(Complete ✓)</span
                >
                <span v-else class="text-error font-medium"
                  >(Need {{ currentSummary.remainingNeeded }} more)</span
                >
              </p>
            </div>
          </div>
          <div class="text-right">
            <div
              class="text-2xl font-bold"
              :class="
                currentSummary.isComplete ? 'text-success' : 'text-warning'
              "
            >
              {{
                Math.round(
                  (currentSummary.totalQuestions / targetQuestions) * 100,
                )
              }}%
            </div>
            <div class="text-xs text-muted">of target</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-4 mb-4">
        <USelect
          v-model="selectedSectorId"
          :items="[{ id: null, name: 'All Sectors' }, ...availableSectors]"
          label-key="name"
          value-key="id"
          placeholder="Filter by sector"
          class="max-w-xs"
          icon="i-lucide-map"
        />
        <USelect
          v-model="selectedRatingId"
          :items="[{ id: null, name: 'All Ratings' }, ...availableRatings]"
          label-key="name"
          value-key="id"
          placeholder="Filter by rating"
          class="max-w-xs"
          icon="i-lucide-star"
          :loading="status === 'pending'"
        />
      </div>

      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-4">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search sectors..."
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
        :data="filteredData"
        :columns="columns"
        :loading="status === 'pending'"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
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
              filteredData.length || 0,
            )
          }}
          of
          {{ filteredData.length || 0 }} question groups
        </div>

        <div class="flex items-center gap-1.5">
          <UPagination
            :default-page="
              (table?.tableApi?.getState().pagination.pageIndex || 0) + 1
            "
            :items-per-page="table?.tableApi?.getState().pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length"
            @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
          />
        </div>
      </div>

      <!-- Update Modal -->
      <EssayCategoryUpdateModal
        :question-group="questionGroupToUpdate"
        :sectors="availableSectors"
        @question-group-updated="handleQuestionGroupUpdated"
        @close="handleModalClose"
      />

      <!-- Delete Modal -->
      <EssayCategoryDeleteModal
        :question-group="questionGroupToDelete"
        @question-group-deleted="handleQuestionGroupDeleted"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
