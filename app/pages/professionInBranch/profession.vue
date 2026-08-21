<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
const { token } = useAuth();

const UButton = resolveComponent("UButton");

// Define Profession interface (from profession array)
interface Profession {
  id: number;
  profession: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// Define nested profession in professionInBranch
interface NestedProfession {
  id: number;
  profession: string;
}

// Define ProfessionInBranch interface (for table) - matches actual API
interface ProfessionInBranch {
  id: number;
  profession: NestedProfession;
}

// API Response interface
interface ProfessionInBranchResponse {
  professionInBranch: ProfessionInBranch[];
  profession: Profession[];
}

const toast = useToast();
const table = useTemplateRef("table");

// State for modals
const professionToUpdate = ref<ProfessionInBranch | null>(null);
const professionToDelete = ref<ProfessionInBranch | null>(null);

// Table state
const columnFilters = ref([
  {
    id: "profession",
    value: "",
  },
]);
const columnVisibility = ref();
const rowSelection = ref({});

// Fetch professions data
const { data, status, refresh } = await useFetch<ProfessionInBranchResponse>(
  `${apiBaseUrl}/api/professionInBranch`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Computed properties
const professionInBranchList = computed(
  () => data.value?.professionInBranch || [],
);
const professionOptions = computed(() => data.value?.profession || []);

// Loading state for table
const isLoading = computed(() => status.value === "pending");

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
function handleEdit(professionInBranch: ProfessionInBranch) {
  professionToUpdate.value = professionInBranch;
}

function handleDelete(professionInBranch: ProfessionInBranch) {
  professionToDelete.value = professionInBranch;
}

// Table columns definition: |No|Profession|Action|
const columns: TableColumn<ProfessionInBranch>[] = [
  {
    id: "no",
    header: "NO",
    cell: ({ row }) => {
      return row.index + 1;
    },
  },
  {
    id: "profession",
    accessorFn: (row) => row.profession?.profession || "",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Profession",
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
        row.original.profession?.profession || "-",
      );
    },
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) => {
      return h("div", { class: "flex items-center justify-start gap-2" }, [
        // h(UButton, {
        //   icon: "i-lucide-pencil",
        //   color: "primary",
        //   variant: "soft",
        //   size: "sm",
        //   onClick: () => handleEdit(row.original),
        // }),
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
      (table.value?.tableApi
        ?.getColumn("profession")
        ?.getFilterValue() as string) || ""
    );
  },
  set: (value: string) => {
    table.value?.tableApi
      ?.getColumn("profession")
      ?.setFilterValue(value || undefined);
  },
});

// Handle modal events
function handleProfessionAdded() {
  refresh();
  toast.add({
    title: "Success",
    description: "Profession added successfully",
    color: "success",
  });
}

function handleProfessionUpdated() {
  professionToUpdate.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Profession updated successfully",
    color: "success",
  });
}

function handleProfessionDeleted() {
  professionToDelete.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Profession deleted successfully",
    color: "success",
  });
}

function handleModalClose() {
  professionToUpdate.value = null;
  professionToDelete.value = null;
}
</script>

<template>
  <UDashboardPanel id="profession-in-branch-management">
    <template #header>
      <UDashboardNavbar title="Profession in Branch Management">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center flex-start gap-1.5 mb-4">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search professions..."
        />

        <UButton
          label="Refresh"
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          @click="refresh"
        />

        <ProfessionInBranchAddModal
          :professions="professionOptions"
          @profession-added="handleProfessionAdded"
        />
      </div>

      <!-- Debug info -->
      <div v-if="isLoading" class="text-center py-4 text-muted">Loading...</div>
      <div
        v-else-if="professionInBranchList.length === 0"
        class="text-center py-8 text-muted"
      >
        <UIcon name="i-lucide-inbox" class="text-4xl mb-2" />
        <p>No professions found in this branch</p>
        <p class="text-sm mt-2">
          Data status: {{ status }}, Count: {{ professionInBranchList.length }}
        </p>
      </div>

      <UTable
        v-else
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        v-model:pagination="pagination"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel(),
        }"
        class="shrink-0"
        :data="professionInBranchList"
        :columns="columns"
        :loading="isLoading"
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
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }}
          professions
        </div>

        <div class="flex items-center gap-1.5">
          <UPagination
            v-model:page="currentPage"
            :items-per-page="pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
          />
        </div>
      </div>
      <!-- 
      <ProfessionInBranchUpdateModal
        :profession-in-branch="professionToUpdate"
        :professions="professionOptions"
        @profession-updated="handleProfessionUpdated"
        @close="handleModalClose"
      /> -->

      <ProfessionInBranchDeleteModal
        :profession-in-branch="professionToDelete"
        @profession-deleted="handleProfessionDeleted"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
