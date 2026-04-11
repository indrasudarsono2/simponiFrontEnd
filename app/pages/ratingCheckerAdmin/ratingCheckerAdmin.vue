<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import ip from "../../utils/config.json";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

// Define interfaces matching API response structure
interface BranchInfo {
  id: number;
  branch: string;
}

interface BranchUnitInfo {
  id: number;
  unit: string;
  branchId: number;
  branch: BranchInfo;
}

interface Sector {
  id: number;
  sector: string;
  branchUnitId: number;
  branchUnit: BranchUnitInfo;
}

interface RatingInfo {
  id: number;
  professionId: number;
  rating: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

interface SectorInfo {
  id: number;
  branchUnitId: number;
  sector: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

interface SubBranchUnitRating {
  id: number;
  sectorId: number;
  ratingId: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  rating: RatingInfo;
  sector: SectorInfo;
}

interface RatingCheckerResponse {
  subBrancUnitRating: SubBranchUnitRating[];
  sectors: Sector[];
}

const toast = useToast();
const table = useTemplateRef<any>("table");

// State for modals
const ratingCheckerToUpdate = ref<SubBranchUnitRating | null>(null);
const ratingCheckerToDelete = ref<SubBranchUnitRating | null>(null);

// Table state
const columnFilters = ref([{ id: "sectorName", value: "" }]);
const columnVisibility = ref();
const rowSelection = ref({});

// Pagination state - used for both table and row numbering
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

// Filter state
const selectedSectorId = ref<number | null>(null);

// Fetch rating checkers data
const { data, status, error, refresh } = await useFetch<RatingCheckerResponse>(
  `http://${ip.ipBackEnd}/api/ratingCheckerAdmins`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Derive branch and unit info from first sector
const extract = computed(() => {
  const sectorList = data.value?.sectors;
  if (!sectorList || sectorList.length === 0) {
    return { branch: "N/A", unit: "N/A" };
  }
  const firstSector = sectorList[0]!;
  return {
    branch: firstSector.branchUnit?.branch?.branch || "N/A",
    unit: firstSector.branchUnit?.unit || "N/A",
  };
});

// Derive available sectors from API data
const availableSectors = computed(() => {
  return data.value?.sectors?.map((s) => ({ id: s.id, name: s.sector })) || [];
});

// Table data - directly use subBrancUnitRating from API
const tableData = computed(() => {
  const items = data.value?.subBrancUnitRating ?? [];
  console.log("API data count:", items.length);
  return items;
});

// Action handlers
function handleEdit(item: SubBranchUnitRating) {
  ratingCheckerToUpdate.value = item;
}

function handleDelete(item: SubBranchUnitRating) {
  ratingCheckerToDelete.value = item;
}

// Table columns definition - NO | Sector | Rating | Action
const columns: TableColumn<SubBranchUnitRating>[] = [
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
    accessorKey: "sector",
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
    cell: ({ row }) =>
      h(
        "div",
        { class: "font-medium text-highlighted" },
        row.original.sector?.sector ?? "-",
      ),
  },

  {
    accessorKey: "rating",
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
    cell: ({ row }) =>
      h("div", { class: "text-muted" }, row.original.rating?.rating ?? "-"),
  },

  {
    id: "actions",
    header: "Action",
    cell: ({ row }) =>
      h("div", { class: "flex items-center justify-start gap-2" }, [
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
      ]),
  },
];

// Current page computed (1-based for UPagination, 0-based for table)
const currentPage = computed({
  get: () => pagination.value.pageIndex + 1, // 0-based → 1-based for UPagination
  set: (p: number) => {
    // Must call tableApi.setPageIndex to actually navigate pages in the table
    table.value?.tableApi?.setPageIndex(p - 1);
  },
});

// Search filter (filters on sector name)
const searchQuery = ref("");
watch(searchQuery, (val) => {
  table.value?.tableApi?.getColumn("sector")?.setFilterValue(val || undefined);
});

// Handle modal events
function handleRatingCheckerAdded() {
  refresh();
  toast.add({
    title: "Success",
    description: "Rating list has been refreshed",
    color: "success",
  });
}

function handleRatingCheckerUpdated() {
  ratingCheckerToUpdate.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Rating list has been refreshed",
    color: "success",
  });
}

function handleRatingCheckerDeleted() {
  ratingCheckerToDelete.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Rating list has been refreshed",
    color: "success",
  });
}

function handleModalClose() {
  ratingCheckerToUpdate.value = null;
  ratingCheckerToDelete.value = null;
}
</script>

<template>
  <UDashboardPanel id="rating-checker-admin">
    <template #header>
      <UDashboardNavbar title="Rating Checker Admin">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <RatingCheckerAdminAddModal
            :sectors="availableSectors"
            @rating-checker-added="handleRatingCheckerAdded"
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
            <span class="font-medium">{{ extract.branch }}</span>
          </div>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-square-chart-gantt" class="text-muted" />
            <span class="text-muted">Branch Unit:</span>
            <span class="font-medium">{{ extract.unit }}</span>
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

      <!-- Error state -->
      <div
        v-if="error"
        class="mb-4 p-3 bg-red-50 rounded-lg border border-red-200 text-red-700 text-sm"
      >
        <strong>Error loading data:</strong> {{ error.message || error }}
      </div>

      <!-- Empty state -->
      <div
        v-else-if="status !== 'pending' && tableData.length === 0"
        class="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-yellow-700 text-sm"
      >
        No rating data found. Total records from API:
        {{ data?.subBrancUnitRating?.length ?? 0 }}
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
        :data="tableData"
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
              table?.tableApi?.getFilteredRowModel().rows.length || 0,
            )
          }}
          of
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} ratings
        </div>

        <div class="flex items-center gap-1.5">
          <UPagination
            v-model:page="currentPage"
            :items-per-page="pagination.pageSize"
            :total="
              table?.tableApi?.getFilteredRowModel().rows.length ||
              tableData.length
            "
          />
        </div>
      </div>

      <RatingCheckerAdminUpdateModal
        :rating-checker="ratingCheckerToUpdate"
        :sectors="availableSectors"
        @rating-checker-updated="handleRatingCheckerUpdated"
        @close="handleModalClose"
      />

      <RatingCheckerAdminDeleteModal
        :rating-checker="ratingCheckerToDelete"
        @rating-checker-deleted="handleRatingCheckerDeleted"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
