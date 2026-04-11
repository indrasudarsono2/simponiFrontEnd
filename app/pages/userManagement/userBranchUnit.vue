<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import ip from "../../utils/config.json";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

// Define interfaces based on API response
interface Profession {
  id: number;
  profession: string;
}

interface ProfessionInBranch {
  id: number;
  profession: Profession;
}

interface BranchUnit {
  id: number;
  branchId: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface Sector {
  id: number;
  branchUnitId: number;
  sector: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface User {
  nik: string;
  licenseUserId: string;
  name: string;
  professionInBranch: ProfessionInBranch | null;
  branchUnit: BranchUnit | null;
  sector: Sector | null;
}

interface UserBranchResponse {
  user: User[];
  professionInBranch: ProfessionInBranch[];
  branchUnit: BranchUnit[];
  sector: Sector[];
}

const toast = useToast();
const table = useTemplateRef<any>("table");

// State for modals
const userToUpdate = ref<User | null>(null);
const userToUpdateSector = ref<User | null>(null);
const userToDelete = ref<User | null>(null);

// Search filter
const searchQuery = ref("");

// Sector filter - using "all" for all sectors
const selectedSector = ref<string>("all");

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

// Sector options for filter dropdown
const sectorFilterOptions = computed(() => {
  const options = [{ value: "all", label: "All Sectors" }];

  if (sectorList.value && sectorList.value.length > 0) {
    sectorList.value.forEach((s) => {
      options.push({
        value: String(s.id),
        label: s.sector,
      });
    });
  }

  return options;
});

// Filtered users based on search query and sector selection
const filteredUsers = computed(() => {
  let result = users.value;

  // Filter by name if search query exists
  if (searchQuery.value) {
    result = result.filter((user) =>
      user.name.toLowerCase().includes(searchQuery.value.toLowerCase()),
    );
  }

  // Filter by sector if selected (not "all")
  if (selectedSector.value && selectedSector.value !== "all") {
    result = result.filter(
      (user) => String(user.sector?.id) === selectedSector.value,
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

// Fetch user branch data
const { data, status, refresh } = await useFetch<UserBranchResponse>(
  `http://${ip.ipBackEnd}/api/userBranchUnit`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Computed property for users array
const users = computed(() => data.value?.user || []);

// Computed property for professionInBranch array (to pass to modals)
const professionInBranchList = computed(
  () => data.value?.professionInBranch || [],
);

// Computed property for branchUnit array (to pass to modals)
const branchUnitList = computed(() => data.value?.branchUnit || []);

// Computed property for sector array (to pass to modals)
const sectorList = computed(() => data.value?.sector || []);

// Loading state
const isLoading = computed(() => status.value === "pending");

// Refresh data when component becomes active
onActivated(async () => {
  await refresh();
});

// Action handlers
function handleEdit(user: User) {
  userToUpdate.value = user;
}

function handleEditSector(user: User) {
  userToUpdateSector.value = user;
}

function handleDelete(user: User) {
  userToDelete.value = user;
}

function handleModalClose() {
  userToUpdate.value = null;
  userToUpdateSector.value = null;
  userToDelete.value = null;
}

function handleSectorUpdated() {
  refresh();
  userToUpdateSector.value = null;
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

// Table columns definition: |No|Name|Profession|Action|
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
    id: "profession",
    accessorFn: (row) => row.professionInBranch?.profession?.profession || "",
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
        { class: "text-muted" },
        row.original.professionInBranch?.profession?.profession || "-",
      );
    },
  },
  {
    id: "branchUnit",
    accessorFn: (row) => row.branchUnit?.unit || "",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Branch Unit",
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
        row.original.branchUnit?.unit || "-",
      );
    },
  },
  {
    id: "sector",
    accessorFn: (row) => row.sector?.sector || "",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Sector",
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
        row.original.sector?.sector || "-",
      );
    },
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) => {
      return h("div", { class: "flex items-center gap-2" }, [
        // h(resolveComponent("UButton"), {
        //   color: "primary",
        //   variant: "soft",
        //   icon: "i-lucide-pencil",
        //   size: "xs",
        //   onClick: () => handleEdit(row.original),
        // }),
        h(resolveComponent("UButton"), {
          color: "primary",
          variant: "soft",
          icon: "i-lucide-pencil",
          size: "xs",
          onClick: () => handleEditSector(row.original),
        }),
      ]);
    },
  },
]);
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="User Branch Management">
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

        <!-- Sector Filter -->
        <USelect
          v-model="selectedSector"
          :items="sectorFilterOptions"
          placeholder="Filter by sector"
          class="w-48"
        />

        <UButton
          label="Refresh"
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          @click="refresh"
        />

        <UserBranchSectorAddModal
          :users="users"
          :sectors="sectorList"
          @user-added="handleUserAdded"
        />
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-4 text-muted">Loading...</div>

      <!-- Empty State -->
      <div
        v-else-if="filteredUsers.length === 0"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <UIcon name="i-lucide-inbox" class="text-4xl text-muted mb-4" />
        <p class="text-muted">
          {{
            selectedSector && selectedSector !== "all"
              ? "No users found for selected sector"
              : "No users available"
          }}
        </p>
        <p class="text-sm mt-2">
          Data status: {{ status }}, Count: {{ filteredUsers.length }}
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
        :data="filteredUsers"
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
        v-if="filteredUsers.length > 0"
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

      <!-- Update Modal -->
      <UserBranchUpdateModal
        :user="userToUpdate"
        :profession-in-branch="professionInBranchList"
        :branch-units="branchUnitList"
        @user-updated="handleUserUpdated"
        @close="handleModalClose"
      />

      <!-- Sector Update Modal -->
      <UserBranchSectorUpdateModal
        :user="userToUpdateSector"
        :sectors="sectorList"
        @user-updated="handleSectorUpdated"
        @close="userToUpdateSector = null"
      />
    </template>
  </UDashboardPanel>
</template>
