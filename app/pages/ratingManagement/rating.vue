<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import type { Row } from "@tanstack/table-core";
import ip from "../../utils/config.json";
const { token } = useAuth();

const UButton = resolveComponent("UButton");
// Define Rating interface
interface Rating {
  id: number;
  rating: string;
  description: string;
  professionId: number;
  createdAt?: string;
  profession: {
    id: number;
    profession: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  };
}

const toast = useToast();
const table = useTemplateRef("table");

// State for modals
const selectedRating = ref<Rating | null>(null);
const ratingToUpdate = ref<Rating | null>(null);
const ratingToDelete = ref<Rating | null>(null);

// Table state
const columnFilters = ref([
  {
    id: "rating",
    value: "",
  },
]);
const columnVisibility = ref();
const rowSelection = ref({});

// Fetch ratings data
// TODO: Replace with actual API endpoint
const { data, status, refresh } = await useFetch<Rating[]>(
  `http://${ip.ipBackEnd}/api/ratings`,
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
function handleEdit(rating: Rating) {
  ratingToUpdate.value = rating;
}

function handleDelete(rating: Rating) {
  ratingToDelete.value = rating;
}

// Table columns definition
const columns: TableColumn<Rating>[] = [
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
    cell: ({ row }) => {
      return h(
        "div",
        { class: "font-medium text-highlighted" },
        row.original.rating,
      );
    },
  },
  {
    accessorKey: "description",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Description",
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
        row.original.description,
      );
    },
  },
  {
    accessorKey: "profession",
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
      (table.value?.tableApi
        ?.getColumn("rating")
        ?.getFilterValue() as string) || ""
    );
  },
  set: (value: string) => {
    table.value?.tableApi
      ?.getColumn("rating")
      ?.setFilterValue(value || undefined);
  },
});

// Handle modal events
function handleRatingAdded() {
  refresh();
  toast.add({
    title: "Success",
    description: "Rating list has been refreshed",
    color: "success",
  });
}

function handleRatingUpdated() {
  ratingToUpdate.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Rating list has been refreshed",
    color: "success",
  });
}

function handleRatingDeleted() {
  ratingToDelete.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Rating list has been refreshed",
    color: "success",
  });
}

function handleModalClose() {
  ratingToUpdate.value = null;
  ratingToDelete.value = null;
}
</script>

<template>
  <UDashboardPanel id="rating-management">
    <template #header>
      <UDashboardNavbar title="Rating Management">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <RatingAddModal @rating-added="handleRatingAdded" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-4">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search ratings..."
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
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} ratings
        </div>

        <div class="flex items-center gap-1.5">
          <UPagination
            v-model:page="currentPage"
            :items-per-page="pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
          />
        </div>
      </div>

      <RatingUpdateModal
        :rating="ratingToUpdate"
        @rating-updated="handleRatingUpdated"
        @close="handleModalClose"
      />

      <RatingDeleteModal
        :rating="ratingToDelete"
        @rating-deleted="handleRatingDeleted"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
