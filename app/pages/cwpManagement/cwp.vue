<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";

const { token } = useAuth();
const toast = useToast();
const table = useTemplateRef("table");
const UButton = resolveComponent("UButton");

interface Rating {
  id: number;
  rating: string | null;
}

interface Cwp {
  id: number;
  ratingId: number | null;
  cwp: string | null;
  rating: Rating | null;
  createdAt?: string;
}

const cwpToUpdate = ref<Cwp | null>(null);
const cwpToDelete = ref<Cwp | null>(null);

const columnFilters = ref([
  {
    id: "cwp",
    value: "",
  },
]);
const columnVisibility = ref();
const rowSelection = ref({});
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

const { data, status, refresh } = await useFetch<Cwp[]>(
  `${apiBaseUrl}/api/cwps`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const currentPage = computed({
  get: () => pagination.value.pageIndex + 1,
  set: (page: number) => {
    table.value?.tableApi?.setPageIndex(page - 1);
  },
});

const searchQuery = computed({
  get: (): string => {
    return (
      (table.value?.tableApi?.getColumn("cwp")?.getFilterValue() as string) ||
      ""
    );
  },
  set: (value: string) => {
    table.value?.tableApi?.getColumn("cwp")?.setFilterValue(value || undefined);
  },
});

function handleEdit(cwp: Cwp) {
  cwpToUpdate.value = cwp;
}

function handleDelete(cwp: Cwp) {
  cwpToDelete.value = cwp;
}

function handleCwpChanged() {
  cwpToUpdate.value = null;
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

function formatCwpText(cwp: string | null) {
  if (!cwp) return "-";
  return cwp.length > 30 ? `${cwp.slice(0, 30)}...` : cwp;
}

const columns: TableColumn<Cwp>[] = [
  {
    id: "no",
    header: "No",
    cell: ({ row }) =>
      pagination.value.pageIndex * pagination.value.pageSize + row.index + 1,
  },
  {
    accessorKey: "cwp",
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
    cell: ({ row }) =>
      h("div", { class: "font-medium text-highlighted" }, formatCwpText(row.original.cwp)),
  },
  {
    accessorKey: "rating.rating",
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
    cell: ({ row }) =>
      h("div", { class: "text-muted" }, row.original.rating?.rating || "-"),
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) =>
      h("div", { class: "flex items-center justify-start gap-2" }, [
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
      ]),
  },
];
</script>

<template>
  <UDashboardPanel id="cwp-management">
    <template #header>
      <UDashboardNavbar title="CWP Management">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-4">
        <div class="flex flex-wrap items-center gap-1.5">
          <UInput
            v-model="searchQuery"
            class="max-w-sm"
            icon="i-lucide-search"
            placeholder="Search CWP..."
          />

          <CwpAddModal @cwp-added="handleCwpChanged" />
        </div>

        <UButton
          label="Refresh"
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          @click="() => refresh()"
        />
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
        </div>

        <UPagination
          v-model:page="currentPage"
          :items-per-page="pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
        />
      </div>

      <CwpUpdateModal
        :cwp="cwpToUpdate"
        @cwp-updated="handleCwpChanged"
        @close="handleModalClose"
      />

      <CwpDeleteModal
        :cwp="cwpToDelete"
        @cwp-deleted="handleCwpChanged"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
