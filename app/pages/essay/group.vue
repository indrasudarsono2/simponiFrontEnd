<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import ip from "../../utils/config.json";
const { token } = useAuth();

const UButton = resolveComponent("UButton");

// Define interfaces matching API response
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
  subBranchUnitRating: SubBranchUnitRating;
}

interface EssayQuestionGroupSector {
  id: number;
  sector: string;
}

interface EssayQuestionGroupDetail {
  group: string;
  kindOfQuestion: { question: string };
  subBranchUnitRating: { rating: { rating: string } };
}

interface EssayQuestionGroup {
  essayId: number;
  sector: EssayQuestionGroupSector;
  questionGroup: EssayQuestionGroupDetail;
}

interface EssayGroupResponse {
  essay: Essay[];
  questionGroup: QuestionGroup[];
  essayQuestionGroup: EssayQuestionGroup[];
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
const essayToUpdate = ref<Essay | null>(null);

// Table state
const columnFilters = ref([{ id: "question", value: "" }]);
const columnVisibility = ref();
const rowSelection = ref({});

// Fetch essay groups data
const { data, status, refresh } = await useFetch<EssayGroupResponse>(
  `http://${ip.ipBackEnd}/api/essayGroups`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Context derived from API response sector array
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
function handleEdit(essay: Essay) {
  essayToUpdate.value = essay;
}

// Extract unique sectors from questionGroup data for dynamic columns
const uniqueSectors = computed(() => {
  const sectors = data.value?.questionGroup?.map(
    (qg) => qg.subBranchUnitRating.sector.sector,
  );
  return [...new Set(sectors)].sort();
});

// Helper: get group names with ratings for a given essayId and sector (as HTML list)
function getGroupsForEssaySector(essayId: number, sectorName: string): string {
  const matches = data.value?.essayQuestionGroup?.filter(
    (eqg) => eqg.essayId === essayId && eqg.sector.sector === sectorName,
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

// Table columns definition
const columns = computed<TableColumn<Essay>[]>(() => [
  {
    id: "no",
    header: "NO",
    cell: ({ row }) => {
      const pageIndex = pagination.value.pageIndex;
      const pageSize = pagination.value.pageSize;
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
        :data="data?.essay"
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
              data?.essay?.length || 0,
            )
          }}
          of
          {{ data?.essay?.length || 0 }} essays
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
      <EssayGroupUpdateModal
        :essay="essayToUpdate"
        :question-groups="data?.questionGroup"
        :essay-question-groups="data?.essayQuestionGroup"
        @essay-group-updated="handleEssayGroupUpdated"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
