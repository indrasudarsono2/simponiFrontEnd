<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import type { Row } from "@tanstack/table-core";

const UButton = resolveComponent("UButton");

// Define CWP interface
interface Cwp {
  id: number;
  name: string;
  ratingId: number;
  ratingName: string;
  sectorId: number;
  sectorName: string;
  branchId: number;
  branchName: string;
  branchUnitId: number;
  branchUnitName: string;
  createdAt?: string;
}

const toast = useToast();
const table = useTemplateRef("table");

// State for modals
const selectedCwp = ref<Cwp | null>(null);
const cwpToUpdate = ref<Cwp | null>(null);
const cwpToDelete = ref<Cwp | null>(null);

// Table state
const columnFilters = ref([
  {
    id: "name",
    value: "",
  },
]);
const columnVisibility = ref();
const rowSelection = ref({});

// Fetch CWP data - filtered for ACC branch unit only (Branch Unit Admin context)
// TODO: Replace with actual API endpoint that filters by current user's branch unit
const { data, status, refresh } = await useFetch<Cwp[]>("/api/cwps", {
  lazy: true,
  // Temporary mock data - ACC branch unit CWP configurations based on adminMindMap.json
  default: () => [
    // WEST sector CWP
    {
      id: 1,
      name: "UMDN",
      ratingId: 5,
      ratingName: "ACS",
      sectorId: 1,
      sectorName: "WEST",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-15",
    },
    {
      id: 2,
      name: "UPLB",
      ratingId: 5,
      ratingName: "ACS",
      sectorId: 1,
      sectorName: "WEST",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-16",
    },
    {
      id: 3,
      name: "UMDNA",
      ratingId: 4,
      ratingName: "ACP",
      sectorId: 1,
      sectorName: "WEST",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-17",
    },
    // EAST sector CWP
    {
      id: 4,
      name: "UTPN",
      ratingId: 5,
      ratingName: "ACS",
      sectorId: 2,
      sectorName: "EAST",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-18",
    },
    {
      id: 5,
      name: "USMG",
      ratingId: 5,
      ratingName: "ACS",
      sectorId: 2,
      sectorName: "EAST",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-19",
    },
    {
      id: 6,
      name: "UJOGA",
      ratingId: 4,
      ratingName: "ACP",
      sectorId: 2,
      sectorName: "EAST",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-20",
    },
    // NORTH sector CWP
    {
      id: 7,
      name: "UNTA",
      ratingId: 5,
      ratingName: "ACS",
      sectorId: 3,
      sectorName: "NORTH",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-21",
    },
    {
      id: 8,
      name: "TPG",
      ratingId: 5,
      ratingName: "ACS",
      sectorId: 3,
      sectorName: "NORTH",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-22",
    },
    {
      id: 9,
      name: "UNTAA",
      ratingId: 4,
      ratingName: "ACP",
      sectorId: 3,
      sectorName: "NORTH",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-23",
    },
  ],
});

// Action handlers
function handleEdit(cwp: Cwp) {
  cwpToUpdate.value = cwp;
}

function handleDelete(cwp: Cwp) {
  cwpToDelete.value = cwp;
}

// Table columns definition
const columns: TableColumn<Cwp>[] = [
  {
    id: "no",
    header: "NO",
    cell: ({ row }) => {
      const pageIndex =
        table.value?.tableApi?.getState().pagination.pageIndex || 0;
      const pageSize =
        table.value?.tableApi?.getState().pagination.pageSize || 10;
      return pageIndex * pageSize + row.index + 1;
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "CWP",
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
        row.original.name,
      );
    },
  },
  {
    accessorKey: "ratingName",
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
      return h("div", { class: "text-muted" }, row.original.ratingName);
    },
  },
  {
    accessorKey: "sectorName",
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
      return h("div", { class: "text-muted" }, row.original.sectorName);
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
      return h("div", { class: "text-muted" }, row.original.branchName);
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
      return h("div", { class: "text-muted" }, row.original.branchUnitName);
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

// Pagination state
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

// Handle modal events
function handleCwpAdded() {
  refresh();
  toast.add({
    title: "Success",
    description: "CWP list has been refreshed",
    color: "success",
  });
}

function handleCwpUpdated() {
  cwpToUpdate.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "CWP list has been refreshed",
    color: "success",
  });
}

function handleCwpDeleted() {
  cwpToDelete.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "CWP list has been refreshed",
    color: "success",
  });
}

function handleModalClose() {
  cwpToUpdate.value = null;
  cwpToDelete.value = null;
}
</script>

<template>
  <UDashboardPanel id="cwp-management">
    <template #header>
      <UDashboardNavbar title="CWP Management - ACC (JAKARTA)">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <CwpAddModal @cwp-added="handleCwpAdded" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-4">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search CWP..."
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
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} CWP
          configurations
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
      <CwpUpdateModal
        :cwp="cwpToUpdate"
        @cwp-updated="handleCwpUpdated"
        @close="handleModalClose"
      />

      <!-- Delete Modal -->
      <CwpDeleteModal
        :cwp="cwpToDelete"
        @cwp-deleted="handleCwpDeleted"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
