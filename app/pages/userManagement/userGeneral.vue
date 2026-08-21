<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

// Define interfaces based on API response
interface Branch {
  id: number;
  branch: string;
}

interface User {
  nik: string;
  licenseUserId: string;
  name: string;
  branch: Branch;
}

interface UserGeneralResponse {
  user: User[];
  branch: Branch[];
}

const toast = useToast();
const table = useTemplateRef<any>("table");

// State for modals
const userToUpdate = ref<User | null>(null);
const userToDelete = ref<User | null>(null);

// Search filter
const searchQuery = ref("");

// Branch filter - using "all" for all branches instead of empty string
const selectedBranch = ref<string>("all");

// Table state
const columnFilters = ref([
  {
    id: "name",
    value: "",
  },
]);

// Watch search query and update columnFilters
watch(searchQuery, (newValue) => {
  columnFilters.value = [
    {
      id: "name",
      value: newValue,
    },
  ];
});

// Filtered users based on branch selection
const filteredUsers = computed(() => {
  let result = users.value;

  // Filter by branch if selected (not "all")
  if (selectedBranch.value && selectedBranch.value !== "all") {
    result = result.filter(
      (user) => String(user.branch?.id) === selectedBranch.value,
    );
  }

  return result;
});

const columnVisibility = ref();
const rowSelection = ref({});

// Pagination state
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

// Fetch user general data
const { data, status, refresh } = await useFetch<UserGeneralResponse>(
  `${apiBaseUrl}/api/userGeneral`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Computed property for users array
const users = computed(() => data.value?.user || []);

// Computed property for branches array (to pass to modals)
const branches = computed(() => data.value?.branch || []);

// Branch options for filter dropdown - must be after branches computed
const branchOptions = computed(() => {
  const options = [{ value: "all", label: "All Branches" }];

  if (data.value?.branch && data.value.branch.length > 0) {
    data.value.branch.forEach((b) => {
      options.push({
        value: String(b.id),
        label: b.branch,
      });
    });
  }

  return options;
});

// Refresh data when component becomes active
onActivated(async () => {
  await refresh();
});

// Action handlers
function handleEdit(user: User) {
  userToUpdate.value = user;
}

function handleDelete(user: User) {
  userToDelete.value = user;
}

function handleModalClose() {
  userToUpdate.value = null;
  userToDelete.value = null;
}

function handleUserAdded() {
  refresh();
}

function handleUserUpdated() {
  refresh();
  handleModalClose();
}

function handleUserDeleted() {
  refresh();
  handleModalClose();
}

// Table columns definition: |No|Name|NIK|License Number|Branch|Action|
const columns = computed((): TableColumn<User>[] => [
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
    accessorKey: "nik",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "NIK",
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
      return h("div", { class: "text-muted" }, row.original.nik);
    },
  },
  {
    accessorKey: "licenseUserId",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "License Number",
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
      return h("div", { class: "text-muted" }, row.original.licenseUserId);
    },
  },
  {
    accessorKey: "branch",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Branch",
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
        row.original.branch?.branch || "-",
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
      <UDashboardNavbar title="User General Management">
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
          placeholder="Filter users..."
          class="max-w-sm"
          icon="i-lucide-search"
        />

        <!-- Branch Filter -->
        <USelect
          v-model="selectedBranch"
          :items="branchOptions"
          placeholder="Filter by branch"
          class="w-48"
          :disabled="!branches.length"
        />

        <UButton
          label="Refresh"
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          @click="refresh"
        />

        <UserGeneralAddModal
          :branches="branches"
          @user-added="handleUserAdded"
        />
      </div>

      <UTable
        v-if="filteredUsers && filteredUsers.length > 0"
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        v-model:pagination="pagination"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel(),
        }"
        class="shrink-0"
        :data="filteredUsers"
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
        <p class="text-muted">
          {{
            selectedBranch
              ? "No users found for selected branch"
              : "No users available"
          }}
        </p>
      </div>

      <div
        v-if="filteredUsers && filteredUsers.length > 0"
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
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} users
          {{ selectedBranch ? `(filtered by branch)` : "" }}
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

      <UserGeneralUpdateModal
        :user="userToUpdate"
        :branches="branches"
        @user-updated="handleUserUpdated"
        @close="handleModalClose"
      />

      <UserGeneralDeleteModal
        :user="userToDelete"
        @user-deleted="handleUserDeleted"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
