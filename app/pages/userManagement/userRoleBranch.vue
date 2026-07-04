<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import ip from "../../utils/config.json";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

interface Branch {
  id: number;
  branch: string;
}

interface Role {
  id: number;
  role: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface UserRole {
  id: number;
  roles: Role;
}

interface User {
  nik: string;
  licenseUserId: string;
  name: string;
  branch: Branch;
  userRoles: UserRole[];
}

interface UserRoleBranchResponse {
  user: User[];
  role: Role[];
}

const table = useTemplateRef<any>("table");
const userToUpdate = ref<User | null>(null);
const searchQuery = ref("");

const columnFilters = ref([
  {
    id: "name",
    value: "",
  },
]);

watch(searchQuery, (newValue) => {
  columnFilters.value = [
    {
      id: "name",
      value: newValue,
    },
  ];
});

const filteredUsers = computed(() => users.value);
const columnVisibility = ref();
const rowSelection = ref({});

const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

const { data, status, refresh } = await useFetch<UserRoleBranchResponse>(
  `http://${ip.ipBackEnd}/api/userRoleBranch`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const users = computed(() => data.value?.user || []);
const roles = computed(() => data.value?.role || []);

onActivated(async () => {
  await refresh();
});

function handleEdit(user: User) {
  userToUpdate.value = user;
}

function handleModalClose() {
  userToUpdate.value = null;
}

function handleUserUpdated() {
  refresh();
  handleModalClose();
}

const columns = computed((): TableColumn<User>[] => [
  {
    id: "no",
    header: "NO",
    cell: ({ row }): number => {
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
    id: "roles",
    header: "Role",
    cell: ({ row }) => {
      const userRoles = row.original.userRoles || [];
      if (userRoles.length === 0) {
        return h("div", { class: "text-muted" }, "-");
      }

      return h(
        "ul",
        { class: "list-disc list-inside text-muted m-0 p-0" },
        userRoles.map((ur) => h("li", { class: "text-sm" }, ur.roles.role)),
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
      ]);
    },
  },
]);
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="User Role Branch Management">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <UInput
          v-model="searchQuery"
          placeholder="Filter users..."
          class="max-w-sm"
          icon="i-lucide-search"
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

      <div
        v-else-if="!status || status === 'success'"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <UIcon name="i-lucide-inbox" class="text-4xl text-muted mb-4" />
        <p class="text-muted">No users available</p>
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

      <UserRoleBranchUpdateModal
        :user="userToUpdate"
        :roles="roles"
        @user-updated="handleUserUpdated"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
