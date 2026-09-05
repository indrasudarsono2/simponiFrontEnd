<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import { MODULE_TO_ITEM, type ModuleKey } from "../config/sidebarModules";

interface Menu {
  id: number;
  menu: string | null;
}

interface RoleMenu {
  id: number;
  menuId: number | null;
  menu: Menu | null;
}

interface Role {
  id: number;
  role: string | null;
  rolesMenu: RoleMenu[];
}

const { token } = useAuth();
const toast = useToast();

const searchQuery = ref("");
const selectedRole = ref<Role | null>(null);
const page = ref(1);
const pageSize = 10;

const { data, status, error, refresh } = await useFetch<Role[]>(
  `${apiBaseUrl}/api/rolesManagement`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const filteredRoles = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  const roles = Array.isArray(data.value) ? data.value : [];

  if (!keyword) return roles;

  return roles.filter((role) => {
    const roleName = role.role?.toLowerCase() || "";
    const menuNames = role.rolesMenu
      ?.map((roleMenu) => roleMenu.menu?.menu?.toLowerCase() || "")
      .join(" ");

    return roleName.includes(keyword) || menuNames.includes(keyword);
  });
});

const total = computed(() => filteredRoles.value.length);
const paginatedRoles = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredRoles.value.slice(start, start + pageSize);
});

watch(searchQuery, () => {
  page.value = 1;
});

function getMenuLabel(menuKey: string | null | undefined) {
  if (!menuKey) return "-";
  const moduleItem = MODULE_TO_ITEM[menuKey as ModuleKey];
  return moduleItem?.label || menuKey;
}

function handleManage(role: Role) {
  selectedRole.value = role;
}

function handleClose() {
  selectedRole.value = null;
}

function handleUpdated() {
  selectedRole.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Roles menu list has been refreshed",
    color: "success",
  });
}
</script>

<template>
  <UDashboardPanel id="roles-management">
    <template #header>
      <UDashboardNavbar title="Roles Management">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-1.5">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search roles or menus..."
        />

        <UButton
          label="Refresh"
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          @click="() => refresh()"
        />
      </div>

      <UAlert
        v-if="error"
        class="mb-4"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Failed to load roles"
        :description="getFetchErrorMessage(error, 'Please restart the backend server and try again.')"
      />

      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="min-w-full border-collapse text-sm">
          <thead class="bg-elevated/50">
            <tr>
              <th class="border border-default px-4 py-3 text-left font-medium">
                No
              </th>
              <th class="border border-default px-4 py-3 text-left font-medium">
                Roles
              </th>
              <th class="border border-default px-4 py-3 text-left font-medium">
                Menu
              </th>
              <th class="border border-default px-4 py-3 text-left font-medium">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="status === 'pending'">
              <td class="border border-default px-4 py-6 text-center" colspan="4">
                Loading roles...
              </td>
            </tr>

            <tr v-else-if="!error && paginatedRoles.length === 0">
              <td class="border border-default px-4 py-6 text-center" colspan="4">
                No roles data found.
              </td>
            </tr>

            <tr v-for="(role, index) in paginatedRoles" v-else :key="role.id">
              <td class="border border-default px-4 py-3">
                {{ (page - 1) * pageSize + index + 1 }}
              </td>
              <td class="border border-default px-4 py-3 font-medium text-highlighted">
                {{ role.role || "-" }}
              </td>
              <td class="border border-default px-4 py-3">
                <div
                  v-if="role.rolesMenu?.length"
                  class="flex flex-wrap gap-2"
                >
                  <UBadge
                    v-for="roleMenu in role.rolesMenu"
                    :key="roleMenu.id"
                    color="neutral"
                    variant="soft"
                  >
                    {{ getMenuLabel(roleMenu.menu?.menu) }}
                  </UBadge>
                </div>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="border border-default px-4 py-3">
                <UButton
                  label="Manage Menus"
                  icon="i-lucide-settings"
                  color="primary"
                  variant="soft"
                  size="sm"
                  @click="handleManage(role)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="mt-4 flex items-center justify-between gap-3 border-t border-default pt-4"
      >
        <div class="text-sm text-muted">
          Showing {{ total ? (page - 1) * pageSize + 1 : 0 }} to
          {{ Math.min(page * pageSize, total) }} of {{ total }} roles
        </div>

        <UPagination v-model:page="page" :items-per-page="pageSize" :total="total" />
      </div>

      <RolesManagementManageMenusModal
        :role="selectedRole"
        @menus-updated="handleUpdated"
        @close="handleClose"
      />
    </template>
  </UDashboardPanel>
</template>
