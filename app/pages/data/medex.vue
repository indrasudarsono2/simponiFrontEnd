<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";

const UButton = resolveComponent("UButton");

// Define MEDEX interface
interface MEDEX {
  id: number;
  name: string;
  released: string;
  expired: string;
  examiner: string;
  institution: string;
  isConfirm: boolean;
}

const toast = useToast();
const table = useTemplateRef("table");

// Search filter
const searchQuery = ref("");

// Table state
const columnFilters = computed(() => [
  {
    id: "name",
    value: searchQuery.value,
  },
]);
const columnVisibility = ref();
const rowSelection = ref({});

// Pagination state
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

// Fetch MEDEX data
const { data, status, refresh } = await useFetch<MEDEX[]>("/api/medex", {
  lazy: true,
  default: () => [],
});

// Helper function to check if date is within months from now
function getExpirationStatus(expiredDate: string): "red" | "yellow" | "normal" {
  const now = new Date();
  const expired = new Date(expiredDate);
  const diffTime = expired.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffMonths = diffDays / 30;

  if (diffMonths < 2) {
    return "red";
  } else if (diffMonths < 4) {
    return "yellow";
  }
  return "normal";
}

// Helper function to format date
function formatDate(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Table columns definition
const columns: TableColumn<MEDEX>[] = [
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
        label: "Name",
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
    accessorKey: "expired",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Expiration Date",
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
      const status = getExpirationStatus(row.original.expired);
      const baseClasses =
        "px-3 py-1 rounded-full text-sm font-medium inline-block";
      const statusClasses = {
        red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        yellow:
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        normal:
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      };

      return h(
        "span",
        {
          class: `${baseClasses} ${statusClasses[status]}`,
        },
        formatDate(row.original.expired),
      );
    },
  },
];
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="MEDEX Data">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Filters -->
      <div class="flex flex-col gap-4 mb-4">
        <div class="flex items-center gap-2">
          <UInput
            v-model="searchQuery"
            placeholder="Filter names..."
            class="max-w-sm"
            icon="i-lucide-search"
          />
          <UButton
            label="Refresh"
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            @click="refresh"
          />
        </div>

        <!-- Legend -->
        <div class="flex items-center gap-4 text-sm">
          <div class="flex items-center gap-2">
            <span
              class="w-3 h-3 rounded-full bg-red-100 border border-red-300"
            ></span>
            <span class="text-muted">Expires in < 2 months</span>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300"
            ></span>
            <span class="text-muted">Expires in < 4 months</span>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="w-3 h-3 rounded-full bg-green-100 border border-green-300"
            ></span>
            <span class="text-muted">Valid</span>
          </div>
        </div>
      </div>

      <UTable
        v-if="data && data.length > 0"
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        v-model:pagination="pagination"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel(),
        }"
        class="shrink-0"
        :data="data || []"
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

      <!-- Empty State -->
      <div
        v-else-if="!status || status === 'success'"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <UIcon name="i-lucide-inbox" class="text-4xl text-muted mb-4" />
        <p class="text-muted">No MEDEX data available</p>
      </div>

      <div
        v-if="data && data.length > 0"
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
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} records
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
    </template>
  </UDashboardPanel>
</template>
