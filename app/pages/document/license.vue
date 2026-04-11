<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import ip from "../../utils/config.json";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

// Define License interface based on new API response
interface License {
  id: number;
  userNik: string;
  note: string;
  file: string;
  expiredDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

const toast = useToast();
const table = useTemplateRef<any>("table");

// State for modals
const licenseToUpdate = ref<License | null>(null);
const licenseToDelete = ref<License | null>(null);

// Search filter
const searchQuery = ref("");

// Table state
const columnFilters = ref([
  {
    id: "note",
    value: "",
  },
]);

// Watch search query and update columnFilters
watch(searchQuery, (newValue) => {
  columnFilters.value = [
    {
      id: "note",
      value: newValue,
    },
  ];
});

const columnVisibility = ref();
const rowSelection = ref({});

// Pagination state
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

// Fetch licenses data
const { data, status, refresh } = await useFetch<License[]>(
  `http://${ip.ipBackEnd}/api/licenseUser`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Refresh data when component becomes active (e.g., returning from file view)
onActivated(async () => {
  await refresh();
});

// Action handlers
function handleEdit(license: License) {
  licenseToUpdate.value = license;
}

function handleDelete(license: License) {
  licenseToDelete.value = license;
}

function handleModalClose() {
  licenseToUpdate.value = null;
  licenseToDelete.value = null;
}

function handleLicenseAdded() {
  refresh();
}

function handleLicenseUpdated() {
  refresh();
  handleModalClose();
}

function handleLicenseDeleted() {
  refresh();
  handleModalClose();
}

// Format date for display
function formatDate(dateString: string | undefined): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Get filename from path
function getFilename(path?: string | null): string {
  if (!path) return "No file";
  return path.split("/").pop() || path;
}

// Table columns definition
const columns = computed((): TableColumn<License>[] => [
  {
    id: "no",
    header: "NO",
    cell: ({ row }): number => {
      const pageIndex: number =
        table.value?.tableApi?.getState().pagination.pageIndex || 0;
      const pageSize: number =
        table.value?.tableApi?.getState().pagination.pageSize || 10;
      return row.index + 1;
    },
  },
  // {
  //   accessorKey: "userNik",
  //   header: ({ column }) => {
  //     const isSorted = column.getIsSorted();

  //     return h(UButton, {
  //       color: "neutral",
  //       variant: "ghost",
  //       label: "NIK",
  //       icon: isSorted
  //         ? isSorted === "asc"
  //           ? "i-lucide-arrow-up-narrow-wide"
  //           : "i-lucide-arrow-down-wide-narrow"
  //         : "i-lucide-arrow-up-down",
  //       class: "-mx-2.5",
  //       onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
  //     });
  //   },
  //   cell: ({ row }) => {
  //     return h("div", { class: "font-medium" }, row.original.userNik);
  //   },
  // },
  {
    accessorKey: "note",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Note",
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
        row.original.note,
      );
    },
  },
  {
    accessorKey: "expiredDate",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Expired Date",
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
        formatDate(row.original.expiredDate),
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Latest Update",
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
        formatDate(row.original.updatedAt),
      );
    },
  },
  {
    accessorKey: "licenseFile",
    header: "License File",
    cell: ({ row }) => {
      if (!row.original.file || row.original.file === "null") {
        return h("span", { class: "text-muted text-sm" }, "No file");
      }
      // Build full backend URL for the file
      const fileUrl = row.original.file.startsWith("/")
        ? `http://${ip.ipBackEnd}${row.original.file}`
        : row.original.file;
      // Link to file viewer page
      const viewerUrl = `/file/view?url=${encodeURIComponent(fileUrl)}`;
      return h(
        "a",
        {
          href: viewerUrl,
          class: "text-primary hover:underline flex items-center gap-1",
        },
        [h("i", { class: "i-lucide-file-text text-sm" }), "View File"],
      );
    },
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) => {
      return h("div", { class: "flex items-center gap-2" }, [
        h(resolveComponent("UButton"), {
          color: "primary",
          variant: "soft",
          icon: "i-lucide-pencil",
          size: "xs",
          onClick: () => handleEdit(row.original),
        }),
        h(resolveComponent("UButton"), {
          color: "error",
          variant: "soft",
          icon: "i-lucide-trash",
          size: "xs",
          onClick: () => handleDelete(row.original),
        }),
      ]);
    },
  },
]);
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="License Management">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <UInput
          v-model="searchQuery"
          placeholder="Filter licenses..."
          class="max-w-sm"
          icon="i-lucide-search"
        />
        <LicenseAddModal @license-added="handleLicenseAdded" />
        <UButton
          label="Refresh"
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          @click="refresh"
        />
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
        <p class="text-muted">No licenses available</p>
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
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} licenses
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

      <LicenseUpdateModal
        :license="licenseToUpdate"
        @license-updated="handleLicenseUpdated"
        @close="handleModalClose"
      />

      <LicenseDeleteModal
        :license="licenseToDelete"
        @license-deleted="handleLicenseDeleted"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
