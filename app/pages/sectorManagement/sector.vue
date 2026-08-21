<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import type { Row } from "@tanstack/table-core";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

// Define Sector interface
interface Sector {
  id: number;
  sector: string;
  branchUnitId: number;
  branchUnit: {
    id: number;
    unit: string;
    branchId: string;
    branch: {
      id: number;
      branch: string;
    };
  };
  createdAt?: string;
}

const toast = useToast();
const table = useTemplateRef("table");

// State for modals
const selectedSector = ref<Sector | null>(null);
const sectorToUpdate = ref<Sector | null>(null);
const sectorToDelete = ref<Sector | null>(null);

// Table state
const columnFilters = ref([
  {
    id: "name",
    value: "",
  },
]);
const columnVisibility = ref();
const rowSelection = ref({});

// Fetch sectors data - filtered for ACC branch unit only (Branch Unit Admin context)
// TODO: Replace with actual API endpoint that filters by current user's branch unit
const { data, status, refresh } = await useFetch<Sector[]>(
  `${apiBaseUrl}/api/sectors`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Compute page title from first sector's branch unit and branch
const pageTitle = computed(() => {
  const firstSector = data.value?.[0];
  if (!firstSector) return "Sector Management";

  const branchUnitName = firstSector.branchUnit?.unit || "Unknown";
  const branchName = firstSector.branchUnit?.branch?.branch || "Unknown";

  return `Sector Management - ${branchUnitName} (${branchName})`;
});

// Pagination state
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
function handleEdit(sector: Sector) {
  sectorToUpdate.value = sector;
}

function handleDelete(sector: Sector) {
  sectorToDelete.value = sector;
}

// Table columns definition
const columns: TableColumn<Sector>[] = [
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
    cell: ({ row }) => {
      return h(
        "div",
        { class: "font-medium text-highlighted" },
        row.original.sector,
      );
    },
  },
  {
    accessorKey: "branchName",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Branch",
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
        row.original.branchUnit.branch.branch,
      );
    },
  },
  {
    accessorKey: "branchUnitName",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Branch Unit",
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
      return h("div", { class: "text-muted" }, row.original.branchUnit.unit);
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
      (table.value?.tableApi?.getColumn("name")?.getFilterValue() as string) ||
      ""
    );
  },
  set: (value: string) => {
    table.value?.tableApi
      ?.getColumn("name")
      ?.setFilterValue(value || undefined);
  },
});

// Handle modal events
function handleSectorAdded() {
  refresh();
  toast.add({
    title: "Success",
    description: "Sector list has been refreshed",
    color: "success",
  });
}

function handleSectorUpdated() {
  sectorToUpdate.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Sector list has been refreshed",
    color: "success",
  });
}

function handleSectorDeleted() {
  sectorToDelete.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Sector list has been refreshed",
    color: "success",
  });
}

function handleModalClose() {
  sectorToUpdate.value = null;
  sectorToDelete.value = null;
}
</script>

<template>
  <UDashboardPanel id="sector-management">
    <template #header>
      <UDashboardNavbar :title="pageTitle">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <SectorAddModal @sector-added="handleSectorAdded" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
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
        :data="data"
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
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} sectors
        </div>

        <div class="flex items-center gap-1.5">
          <UPagination
            v-model:page="currentPage"
            :items-per-page="pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
          />
        </div>
      </div>

      <SectorUpdateModal
        :sector="sectorToUpdate"
        @sector-updated="handleSectorUpdated"
        @close="handleModalClose"
      />

      <SectorDeleteModal
        :sector="sectorToDelete"
        @sector-deleted="handleSectorDeleted"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
