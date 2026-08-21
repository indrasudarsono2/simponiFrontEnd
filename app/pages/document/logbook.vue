<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

// Define Logbook interface based on API response
interface Logbook {
  id: number;
  userNik: string;
  note: string;
  file: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

const toast = useToast();
const table = useTemplateRef<any>("table");

// State for modals
const logbookToUpdate = ref<Logbook | null>(null);
const logbookToDelete = ref<Logbook | null>(null);

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

// Fetch logbooks data
const { data, status, refresh } = await useFetch<Logbook[]>(
  `${apiBaseUrl}/api/logbookUser`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Action handlers
function handleEdit(logbook: Logbook) {
  logbookToUpdate.value = logbook;
}

function handleDelete(logbook: Logbook) {
  logbookToDelete.value = logbook;
}

function handleModalClose() {
  logbookToUpdate.value = null;
  logbookToDelete.value = null;
}

function handleLogbookAdded() {
  refresh();
}

function handleLogbookUpdated() {
  refresh();
  handleModalClose();
}

function handleLogbookDeleted() {
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
  });
}

// Get filename from path
function getFilename(path: string): string {
  return path.split("/").pop() || path;
}

// Table columns definition
const columns = computed((): TableColumn<Logbook>[] => [
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
  // {
  //   accessorKey: "userNik",
  //   header: ({ column }) => {
  //     const isSorted = column.getIsSorted();

  //     return h(UButton, {
  //       color: "neutral",
  //       variant: "ghost",
  //       label: "User NIK",
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
  //     return h(
  //       "div",
  //       { class: "font-medium text-highlighted" },
  //       row.original.userNik,
  //     );
  //   },
  // },
  {
    accessorKey: "logbookFile",
    header: "Logbook File",
    cell: ({ row }) => {
      if (!row.original.file || row.original.file === "null") {
        return h("span", { class: "text-muted text-sm" }, "No file");
      }
      // Build full backend URL for the file
      const fileUrl = row.original.file.startsWith("/")
        ? `${apiBaseUrl}${row.original.file}`
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
    id: "actions",
    header: "Action",
    cell: ({ row }) => {
      return h("div", { class: "flex items-center gap-2" }, [
        h(resolveComponent("UButton"), {
          color: "primary",
          variant: "ghost",
          icon: "i-lucide-pencil",
          size: "xs",
          onClick: () => handleEdit(row.original),
        }),
        h(resolveComponent("UButton"), {
          color: "error",
          variant: "ghost",
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
      <UDashboardNavbar title="Logbook Management">
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
          placeholder="Filter logbooks..."
          class="max-w-sm"
          icon="i-lucide-search"
        />
        <LogbookAddModal @logbook-added="handleLogbookAdded" />
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
        <p class="text-muted">No logbooks available</p>
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
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} logbooks
        </div>

        <div class="flex items-center gap-1.5">
          <UPagination
            :default-page="
              (table?.tableApi?.getState().pagination.pageIndex || 0) + 1
            "
            :items-per-page="table?.tableApi?.getState().pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length"
            @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
          />
        </div>
      </div>

      <!-- Update Modal -->
      <LogbookUpdateModal
        :logbook="logbookToUpdate"
        @logbook-updated="handleLogbookUpdated"
        @close="handleModalClose"
      />

      <!-- Delete Modal -->
      <LogbookDeleteModal
        :logbook="logbookToDelete"
        @logbook-deleted="handleLogbookDeleted"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
