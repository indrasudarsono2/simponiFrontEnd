<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import ip from "../../utils/config.json";

const { token } = useAuth();
const table = useTemplateRef<any>("table");
const UButton = resolveComponent("UButton");

interface CheckerRatingItem {
  id?: number;
  rating?: {
    id: number;
    rating: string;
  } | null;
  ratingId?: number;
}

interface UserRole {
  id: number;
  checkerRatings?: CheckerRatingItem[];
}

interface SubBranchUnitRating {
  id: number;
  rating: {
    id: number;
    rating: string;
  };
}

interface UserChecker {
  nik: string;
  name: string;
  userRoles: UserRole[];
  sector?: {
    id: number;
    subBranchUnitRatings?: SubBranchUnitRating[];
  } | null;
}

interface CheckerRatingResponse {
  user?: UserChecker[];
}

const userToUpdate = ref<UserChecker | null>(null);
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

const columnVisibility = ref();
const rowSelection = ref({});

const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

const { data, status, refresh } = await useFetch<CheckerRatingResponse>(
  `http://${ip.ipBackEnd}/api/checkerRating`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const users = computed(() => data.value?.user || []);

const filteredUsers = computed(() => users.value);

function getAvailableRatings(user: UserChecker): string[] {
  const ratings: string[] = [];

  (user.userRoles || []).forEach((role) => {
    (role.checkerRatings || []).forEach((checkerRating) => {
      const label = checkerRating.rating?.rating;
      if (label) ratings.push(label);
    });
  });

  return Array.from(new Set(ratings));
}

function handleEdit(user: UserChecker) {
  userToUpdate.value = user;
}

function handleModalClose() {
  userToUpdate.value = null;
}

function handleCheckerUpdated() {
  refresh();
  handleModalClose();
}

const columns = computed((): TableColumn<UserChecker>[] => [
  {
    id: "no",
    header: "No",
    cell: ({ row }) => {
      const pageIndex =
        table.value?.tableApi?.getState().pagination.pageIndex || 0;
      const pageSize =
        table.value?.tableApi?.getState().pagination.pageSize || 10;
      return pageIndex * pageSize + row.index + 1;
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
    cell: ({ row }) =>
      h("div", { class: "font-medium text-highlighted" }, row.original.name),
  },
  {
    id: "availableRating",
    header: "Available Rating",
    cell: ({ row }) => {
      const ratings = getAvailableRatings(row.original);
      if (ratings.length === 0) {
        return h("div", { class: "text-muted" }, "-");
      }
      return h(
        "ul",
        { class: "list-disc list-inside text-muted m-0 p-0" },
        ratings.map((rating) => h("li", { class: "text-sm", key: rating }, rating)),
      );
    },
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-2" }, [
        h(resolveComponent("UButton"), {
          color: "primary",
          variant: "soft",
          icon: "i-lucide-pencil",
          size: "xs",
          onClick: () => handleEdit(row.original),
        }),
      ]),
  },
]);
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="User Checker Management">
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
        <p class="text-muted">No checker users available</p>
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

      <UserCheckerGeneralUpdateModal
        :user="userToUpdate"
        @checker-updated="handleCheckerUpdated"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
