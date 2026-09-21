<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface Sector {
  id: number;
  sector: string | null;
}

interface User {
  nik: string;
  licenseUserId: string | null;
  name: string | null;
  sector: Sector | null;
}

interface UserCheckerResponse {
  user: User[];
}

const { token } = useAuth();
const toast = useToast();

const searchQuery = ref("");
const selectedUser = ref<User | null>(null);
const page = ref(1);
const pageSize = 10;

const { data, status, error, refresh } = await useFetch<UserCheckerResponse>(
  `${apiBaseUrl}/api/userBranchUnit`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const users = computed(() => data.value?.user || []);
const loadErrorMessage = computed(() =>
  getFetchErrorMessage(
    error.value,
    "Unable to load users for your branch unit.",
  ),
);

watch(
  error,
  (currentError, previousError) => {
    if (!currentError || currentError === previousError) return;

    toast.add({
      title: "Branch unit required",
      description: loadErrorMessage.value,
      color: "warning",
    });
  },
  { immediate: true },
);

const filteredUsers = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();

  if (!keyword) return users.value;

  return users.value.filter((user) => {
    const name = user.name?.toLowerCase() || "";
    const nik = user.nik?.toLowerCase() || "";
    const sector = user.sector?.sector?.toLowerCase() || "";

    return (
      name.includes(keyword) ||
      nik.includes(keyword) ||
      sector.includes(keyword)
    );
  });
});

const total = computed(() => filteredUsers.value.length);
const paginatedUsers = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredUsers.value.slice(start, start + pageSize);
});
const detailModalOpen = computed({
  get: () => Boolean(selectedUser.value),
  set: (open: boolean) => {
    if (!open) selectedUser.value = null;
  },
});

watch(searchQuery, () => {
  page.value = 1;
});

function handleView(user: User) {
  selectedUser.value = user;
}

function handleRefresh() {
  refresh();
  toast.add({
    title: "Refreshed",
    description: "User checker list has been refreshed",
    color: "success",
  });
}
</script>

<template>
  <UDashboardPanel id="user-checker">
    <template #header>
      <UDashboardNavbar title="User List Checker">
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
          placeholder="Search name, NIK, or sector..."
        />

        <UButton
          label="Refresh"
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          @click="handleRefresh"
        />
      </div>

      <UAlert
        v-if="error"
        class="mb-4"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Unable to show users"
        :description="loadErrorMessage"
      />

      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="min-w-full border-collapse text-sm">
          <thead class="bg-elevated/50">
            <tr>
              <th class="border border-default px-4 py-3 text-left font-medium">
                No
              </th>
              <th class="border border-default px-4 py-3 text-left font-medium">
                Nama
              </th>
              <th class="border border-default px-4 py-3 text-left font-medium">
                Sector
              </th>
              <th class="border border-default px-4 py-3 text-left font-medium">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="status === 'pending'">
              <td class="border border-default px-4 py-6 text-center" colspan="4">
                Loading user checker data...
              </td>
            </tr>

            <tr v-else-if="!error && paginatedUsers.length === 0">
              <td class="border border-default px-4 py-6 text-center" colspan="4">
                No user checker data found.
              </td>
            </tr>

            <tr v-for="(user, index) in paginatedUsers" v-else :key="user.nik">
              <td class="border border-default px-4 py-3">
                {{ (page - 1) * pageSize + index + 1 }}
              </td>
              <td class="border border-default px-4 py-3">
                <div class="font-medium text-highlighted">
                  {{ user.name || "-" }}
                </div>
                <div class="text-xs text-muted">
                  {{ user.nik || "-" }}
                </div>
              </td>
              <td class="border border-default px-4 py-3">
                {{ user.sector?.sector || "-" }}
              </td>
              <td class="border border-default px-4 py-3">
                <UButton
                  label="View"
                  icon="i-lucide-eye"
                  color="primary"
                  variant="soft"
                  size="sm"
                  @click="handleView(user)"
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
          {{ Math.min(page * pageSize, total) }} of {{ total }} users
        </div>

        <UPagination v-model:page="page" :items-per-page="pageSize" :total="total" />
      </div>

      <UModal
        v-model:open="detailModalOpen"
        title="User Checker Detail"
        :ui="{ footer: 'justify-end' }"
      >
        <template #body>
          <div class="space-y-3 text-sm">
            <div>
              <div class="text-muted">Nama</div>
              <div class="font-medium text-highlighted">
                {{ selectedUser?.name || "-" }}
              </div>
            </div>
            <div>
              <div class="text-muted">NIK</div>
              <div class="font-medium text-highlighted">
                {{ selectedUser?.nik || "-" }}
              </div>
            </div>
            <div>
              <div class="text-muted">Sector</div>
              <div class="font-medium text-highlighted">
                {{ selectedUser?.sector?.sector || "-" }}
              </div>
            </div>
          </div>
        </template>

        <template #footer>
          <UButton
            label="Close"
            color="neutral"
            variant="outline"
            @click="selectedUser = null"
          />
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
