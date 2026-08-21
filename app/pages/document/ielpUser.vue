<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

// Define IELPUser interface (based on user.json structure)
interface IELPUser {
  id: string;
  isConfirm: boolean;
  released: string;
  expired: string;
  rater: string;
  institution: string;
  level: string;
  file?: string;
}

const toast = useToast();
const table = useTemplateRef<any>("table");

// State for modals
const ielpUserToUpdate = ref<IELPUser | null>(null);
const ielpUserToDelete = ref<IELPUser | null>(null);

// Search filter
const searchQuery = ref("");

// Table state
const columnFilters = ref([
  {
    id: "institution",
    value: "",
  },
]);

// Watch search query and update columnFilters
watch(searchQuery, (newValue) => {
  columnFilters.value = [
    {
      id: "institution",
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

// Fetch IELPUser data
const { data, status, refresh } = await useFetch<IELPUser[]>(
  `${apiBaseUrl}/api/ielpUser`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Action handlers
function handleEdit(ielpUser: IELPUser) {
  ielpUserToUpdate.value = ielpUser;
}

function handleDelete(ielpUser: IELPUser) {
  ielpUserToDelete.value = ielpUser;
}

function handleModalClose() {
  ielpUserToUpdate.value = null;
  ielpUserToDelete.value = null;
}

function handleIELPUserAdded() {
  refresh();
}

function handleIELPUserUpdated() {
  refresh();
  handleModalClose();
}

function handleIELPUserDeleted() {
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

// Table columns definition
const columns = computed((): TableColumn<IELPUser>[] => [
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
    accessorKey: "institution",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Institution",
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
        row.original.institution,
      );
    },
  },
  {
    accessorKey: "level",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Level",
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
      return h("div", { class: "text-center" }, row.original.level);
    },
  },
  {
    accessorKey: "released",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Released",
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
        formatDate(row.original.released),
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
        label: "Expired",
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
      const expiredDate = row.original.expired
        ? new Date(row.original.expired)
        : null;
      const isExpired = expiredDate ? expiredDate < new Date() : false;

      return h(
        "div",
        { class: isExpired ? "text-error font-medium" : "text-muted" },
        formatDate(row.original.expired),
      );
    },
  },
  {
    accessorKey: "rater",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Rater",
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
      return h("div", { class: "text-muted" }, row.original.rater);
    },
  },
  {
    accessorKey: "file",
    header: "File",
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
]);
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="IELP Management">
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
          placeholder="Filter IELP records..."
          class="max-w-sm"
          icon="i-lucide-search"
        />
        <IelpUserAddModal @ielp-user-added="handleIELPUserAdded" />

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
      >
        <!-- <template #actions-cell="{ row }">
          <div class="flex items-center gap-2">
            <UButton
              color="primary"
              variant="ghost"
              icon="i-lucide-pencil"
              size="xs"
              @click="handleEdit(row.original)"
            />
            <UButton
              color="error"
              variant="ghost"
              icon="i-lucide-trash"
              size="xs"
              @click="handleDelete(row.original)"
            />
          </div>
        </template> -->
      </UTable>

      <!-- Empty State -->
      <div
        v-else-if="!status || status === 'success'"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <UIcon name="i-lucide-inbox" class="text-4xl text-muted mb-4" />
        <p class="text-muted">No IELP records available</p>
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
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} IELP
          records
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

      <IelpUserUpdateModal
        :ielpUser="ielpUserToUpdate"
        @ielp-user-updated="handleIELPUserUpdated"
        @close="handleModalClose"
      />

      <IelpUserDeleteModal
        :ielpUser="ielpUserToDelete"
        @ielp-user-deleted="handleIELPUserDeleted"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
