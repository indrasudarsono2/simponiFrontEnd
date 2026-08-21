<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

// Define API response interface
interface Branch {
  branch: string;
}

interface BranchUnit {
  id: number;
  unit: string;
  branch: Branch;
}

interface Session {
  id: number;
  session: string;
  createdAt?: string;
}

interface SessionsResponse {
  branchUnit: BranchUnit;
  sessions: Session[];
}

const toast = useToast();
const table = useTemplateRef("table");

// State for modals
const selectedSession = ref<Session | null>(null);
const sessionToUpdate = ref<Session | null>(null);
const sessionToDelete = ref<Session | null>(null);

// Table state
const columnFilters = ref([
  {
    id: "session",
    value: "",
  },
]);

const columnVisibility = ref();
const rowSelection = ref({});

// Fetch sessions data with branch unit info
const { data, status, refresh } = await useFetch<SessionsResponse>(
  `${apiBaseUrl}/api/sessions`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Destructure branch unit info from response
const branchUnitId = computed(() => data.value?.branchUnit?.id || 0);
const branchUnitName = computed(() => data.value?.branchUnit?.unit || "");
const branchName = computed(() => data.value?.branchUnit?.branch?.branch || "");

// Action handlers
function handleEdit(session: Session) {
  sessionToUpdate.value = session;
}

function handleDelete(session: Session) {
  sessionToDelete.value = session;
}

// Table columns definition
const columns: TableColumn<Session>[] = [
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
    accessorKey: "session",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Session",
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
        row.original.session,
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
        ?.getColumn("session")
        ?.getFilterValue() as string) || ""
    );
  },
  set: (value: string) => {
    table.value?.tableApi
      ?.getColumn("session")
      ?.setFilterValue(value || undefined);
  },
});

// Pagination state
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

// Handle modal events
function handleSessionAdded() {
  refresh();
  toast.add({
    title: "Success",
    description: "Session list has been refreshed",
    color: "success",
  });
}

function handleSessionUpdated() {
  sessionToUpdate.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Session list has been refreshed",
    color: "success",
  });
}

function handleSessionDeleted() {
  sessionToDelete.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Session list has been refreshed",
    color: "success",
  });
}

function handleModalClose() {
  sessionToUpdate.value = null;
  sessionToDelete.value = null;
}
</script>

<template>
  <UDashboardPanel id="session-management">
    <template #header>
      <UDashboardNavbar title="Session Management">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <SessionAddModal
            :branch-name="branchName"
            :branch-unit-name="branchUnitName"
            :branch-unit-id="branchUnitId"
            @session-added="handleSessionAdded"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Context Info -->
      <div class="mb-4 p-3 bg-elevated/50 rounded-lg border border-default">
        <div class="flex items-center gap-4 text-sm">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-building-2" class="text-muted" />
            <span class="text-muted">Branch:</span>
            <span class="font-medium">{{ branchName }}</span>
          </div>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-square-chart-gantt" class="text-muted" />
            <span class="text-muted">Branch Unit:</span>
            <span class="font-medium">{{ branchUnitName }}</span>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-4">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search sessions..."
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
        :data="data?.sessions"
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
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} sessions
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

      <SessionUpdateModal
        :session="sessionToUpdate"
        :branch-name="branchName"
        :branch-unit-name="branchUnitName"
        @session-updated="handleSessionUpdated"
        @close="handleModalClose"
      />

      <SessionDeleteModal
        :session="sessionToDelete"
        :branch-name="branchName"
        :branch-unit-name="branchUnitName"
        @session-deleted="handleSessionDeleted"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
