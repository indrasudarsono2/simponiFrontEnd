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
  subBranchUnitRating: SubBranchUnitRating;
}

interface MultipleChoiceQuestionGroupSector {
  id: number;
  sector: string;
}

interface MultipleChoiceQuestionGroupDetail {
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
  multipleChoiceQuestionGroup: MultipleChoiceQuestionGroup[];
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

// Context derived from API response
const currentBranch = computed(
  () => data.value?.sector?.[0]?.branchUnit?.branch?.branch || "-",
);
const currentBranchUnit = computed(
  () => data.value?.sector?.[0]?.branchUnit?.unit || "-",
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
  const sectors = data.value?.questionGroup?.map(
    (qg) => qg.subBranchUnitRating.sector.sector,
  );
  return [...new Set(sectors)].sort();
});

// Helper: get group names with ratings for a given multipleChoiceId and sector (as HTML list)
function getGroupsForMCSector(mcId: number, sectorName: string): string {
  const matches = data.value?.multipleChoiceQuestionGroup?.filter(
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
        :data="data?.multipleChoice"
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
              data?.multipleChoice?.length || 0,
            )
          }}
          of
          {{ data?.multipleChoice?.length || 0 }} questions
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
        :question-groups="data?.questionGroup"
        :multiple-choice-question-groups="data?.multipleChoiceQuestionGroup"
        @multiple-choice-group-updated="handleMultipleChoiceGroupUpdated"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
