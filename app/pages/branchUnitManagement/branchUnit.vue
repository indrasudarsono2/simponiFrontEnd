<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

// Define BranchUnit interface
interface BranchUnit {
  id: number;
  branchId: string;
  unit: string;
  branch: {
    id: number;
    branch: string;
  };
  createdAt?: string;
}

const toast = useToast();
const table = useTemplateRef("table");

// State for modals
const branchUnitToUpdate = ref<BranchUnit | null>(null);
const branchUnitToDelete = ref<BranchUnit | null>(null);

// Table state
const columnFilters = ref([
  {
    id: "unit",
    value: "",
  },
]);
const columnVisibility = ref();
const rowSelection = ref({});

// Fetch branch units data
// For Jakarta admin, we show branch units from Jakarta branch
const { data, status, refresh } = await useFetch<BranchUnit[]>(
  `${apiBaseUrl}/api/branchUnits`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

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
function handleEdit(branchUnit: BranchUnit) {
  branchUnitToUpdate.value = branchUnit;
}

function handleDelete(branchUnit: BranchUnit) {
  branchUnitToDelete.value = branchUnit;
}

// Table columns definition
const columns: TableColumn<BranchUnit>[] = [
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
    accessorKey: "unit",
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
      return h(
        "div",
        { class: "font-medium text-highlighted" },
        row.original.unit,
      );
    },
  },
  {
    accessorKey: "branch",
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
        { class: "font-medium text-highlighted" },
        row.original.branch.branch,
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
      (table.value?.tableApi?.getColumn("unit")?.getFilterValue() as string) ||
      ""
    );
  },
  set: (value: string) => {
    table.value?.tableApi
      ?.getColumn("unit")
      ?.setFilterValue(value || undefined);
  },
});

// Handle modal events
function handleBranchUnitAdded() {
  refresh();
  toast.add({
    title: "Success",
    description: "Branch unit has been added",
    color: "success",
  });
}

function handleBranchUnitUpdated() {
  branchUnitToUpdate.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Branch unit has been updated",
    color: "success",
  });
}

function handleBranchUnitDeleted() {
  branchUnitToDelete.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Branch unit has been deleted",
    color: "success",
  });
}

function handleModalClose() {
  branchUnitToUpdate.value = null;
  branchUnitToDelete.value = null;
}
</script>

<template>
  <UDashboardPanel id="branch-unit-management">
    <template #header>
      <UDashboardNavbar title="Branch Unit Management">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <BranchUnitAddModal @branch-unit-added="handleBranchUnitAdded" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-4">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search branch units..."
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
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} branch
          units
        </div>

        <div class="flex items-center gap-1.5">
          <UPagination
            v-model:page="currentPage"
            :items-per-page="pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
          />
        </div>
      </div>

      <BranchUnitUpdateModal
        :branch-unit="branchUnitToUpdate"
        @branch-unit-updated="handleBranchUnitUpdated"
        @close="handleModalClose"
      />

      <BranchUnitDeleteModal
        :branch-unit="branchUnitToDelete"
        @branch-unit-deleted="handleBranchUnitDeleted"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
