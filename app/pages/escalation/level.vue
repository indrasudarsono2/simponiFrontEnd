<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import ip from "../../utils/config.json";

const { token } = useAuth();
const toast = useToast();
const table = useTemplateRef("table");
const UButton = resolveComponent("UButton");

interface EscalationLevel {
  id: number;
  branchId: number | null;
  level: string;
  time: number | null;
  createdAt?: string;
  _count?: {
    escalationActors: number;
  };
}

const escalationLevelToUpdate = ref<EscalationLevel | null>(null);
const escalationLevelToDelete = ref<EscalationLevel | null>(null);

const columnFilters = ref([
  {
    id: "level",
    value: "",
  },
]);
const columnVisibility = ref();
const rowSelection = ref({});
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

const { data, status, refresh } = await useFetch<EscalationLevel[]>(
  `http://${ip.ipBackEnd}/api/escalationLevels`,
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
      (table.value?.tableApi?.getColumn("level")?.getFilterValue() as string) ||
      ""
    );
  },
  set: (value: string) => {
    table.value?.tableApi
      ?.getColumn("level")
      ?.setFilterValue(value || undefined);
  },
});

function handleEdit(escalationLevel: EscalationLevel) {
  escalationLevelToUpdate.value = escalationLevel;
}

function handleDelete(escalationLevel: EscalationLevel) {
  escalationLevelToDelete.value = escalationLevel;
}

function handleEscalationLevelChanged() {
  escalationLevelToUpdate.value = null;
  escalationLevelToDelete.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Escalation level list has been refreshed",
    color: "success",
  });
}

function handleModalClose() {
  escalationLevelToUpdate.value = null;
  escalationLevelToDelete.value = null;
}

const columns: TableColumn<EscalationLevel>[] = [
  {
    id: "no",
    header: "No",
    cell: ({ row }) =>
      pagination.value.pageIndex * pagination.value.pageSize + row.index + 1,
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
    cell: ({ row }) =>
      h("div", { class: "font-medium text-highlighted" }, row.original.level),
  },
  {
    accessorKey: "time",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Time",
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
      h(
        "div",
        { class: "text-muted" },
        row.original.time === null ? "-" : `${row.original.time} minutes`,
      ),
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
  <UDashboardPanel id="escalation-level">
    <template #header>
      <UDashboardNavbar title="Escalation Level">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert
        class="mb-4"
        color="info"
        variant="soft"
        icon="i-lucide-clock-3"
        title="How escalation timing works"
        description="Each time value is cumulative from the ongoing issue start. Use 0 to send email as soon as possible after an ongoing issue is created; other values run on 15-minute intervals."
      />

      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-4">
        <div class="flex flex-wrap items-center gap-1.5">
          <UInput
            v-model="searchQuery"
            class="max-w-sm"
            icon="i-lucide-search"
            placeholder="Search levels..."
          />

          <EscalationLevelAddModal
            @escalation-level-added="handleEscalationLevelChanged"
          />
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
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} levels
        </div>

        <UPagination
          v-model:page="currentPage"
          :items-per-page="pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length || 0"
        />
      </div>

      <EscalationLevelUpdateModal
        :escalation-level="escalationLevelToUpdate"
        @escalation-level-updated="handleEscalationLevelChanged"
        @close="handleModalClose"
      />

      <EscalationLevelDeleteModal
        :escalation-level="escalationLevelToDelete"
        @escalation-level-deleted="handleEscalationLevelChanged"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
