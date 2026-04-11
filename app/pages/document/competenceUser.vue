<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import ip from "../../utils/config.json";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

// Define CompetenceUser interface (based on API response structure)
interface CompetenceUser {
  id: number;
  userId: string;
  ratingId: number;
  institution: string;
  released: string;
  file: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  rating: {
    id: number;
    professionId: number;
    rating: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
}

// Define Rating interface
interface Rating {
  id: number;
  professionId: number;
  rating: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// Define API response interface
interface CompetenceUserResponse {
  competence: CompetenceUser[];
  rating: Rating[];
}

const toast = useToast();
const table = useTemplateRef<any>("table");

// State for modals
const competenceUserToUpdate = ref<CompetenceUser | null>(null);
const competenceUserToDelete = ref<CompetenceUser | null>(null);

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

// Fetch CompetenceUser data
const { data, status, refresh } = await useFetch<CompetenceUserResponse>(
  `http://${ip.ipBackEnd}/api/competenceUser`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Action handlers
function handleEdit(competenceUser: CompetenceUser) {
  competenceUserToUpdate.value = competenceUser;
}

function handleDelete(competenceUser: CompetenceUser) {
  competenceUserToDelete.value = competenceUser;
}

function handleModalClose() {
  competenceUserToUpdate.value = null;
  competenceUserToDelete.value = null;
}

function handleCompetenceUserAdded() {
  refresh();
}

function handleCompetenceUserUpdated() {
  refresh();
  handleModalClose();
}

function handleCompetenceUserDeleted() {
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

// Get competence certificate name from rating
function getCompetenceName(rating: { rating: string } | undefined): string {
  if (!rating || !rating.rating) return "-";
  return rating.rating;
}

// Table columns definition
const columns = computed((): TableColumn<CompetenceUser>[] => [
  {
    id: "no",
    header: "NO",
    cell: ({ row }): number => {
      const pageIndex: number =
        table.value?.tableApi?.getState().pagination.pageIndex || 0;
      const pageSize: number =
        table.value?.tableApi?.getState().pagination.pageSize || 10;
      return pageIndex * pageSize + row.index + 1;
    },
  },
  {
    id: "competence",
    header: "Competence Certificate",
    cell: ({ row }) => {
      return h(
        "div",
        { class: "font-medium text-highlighted" },
        getCompetenceName(row.original.rating),
      );
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
      return h("div", { class: "text-muted" }, row.original.institution);
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
    accessorKey: "file",
    header: "File",
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

const rating = computed(() => {
  return data.value?.rating || [];
});
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Competence Management">
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
          placeholder="Filter by institution..."
          class="max-w-sm"
          icon="i-lucide-search"
        />
        <CompetenceUserAddModal
          :rating="data?.rating || []"
          @competenceUser-added="handleCompetenceUserAdded"
        />

        <UButton
          label="Refresh"
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          @click="refresh"
        />
      </div>

      <UTable
        v-if="data?.competence && data.competence.length > 0"
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        v-model:pagination="pagination"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel(),
        }"
        class="shrink-0"
        :data="data?.competence || []"
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
      </UTable>

      <!-- Empty State -->
      <div
        v-else-if="!status || status === 'success'"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <UIcon name="i-lucide-inbox" class="text-4xl text-muted mb-4" />
        <p class="text-muted">No Competence records available</p>
      </div>

      <div
        v-if="data?.competence && data.competence.length > 0"
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
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }}
          Competence records
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
      <CompetenceUserUpdateModal
        :competenceUser="competenceUserToUpdate"
        :rating="data?.rating || []"
        @competenceUser-updated="handleCompetenceUserUpdated"
        @close="handleModalClose"
      />

      <!-- Delete Modal -->
      <CompetenceUserDeleteModal
        :competenceUser="competenceUserToDelete"
        @competenceUser-deleted="handleCompetenceUserDeleted"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
