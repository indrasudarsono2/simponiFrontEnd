<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface Rating {
  id: number;
  rating: string | null;
}

interface Cwp {
  id: number;
  cwp: string | null;
  rating: Rating | null;
  supervisorId: number | null;
}

interface CwpSupervisor {
  id: number;
  cwpId: number | null;
  supervisorId: number | null;
  cwp: Cwp | null;
}

interface Supervisor {
  id: number;
  supervisor: string | null;
  cwpSupervisors: CwpSupervisor[];
}

interface CwpSupervisorResponse {
  supervisors: Supervisor[];
  cwps: Cwp[];
}

const { token } = useAuth();
const toast = useToast();

const searchQuery = ref("");
const selectedSupervisor = ref<Supervisor | null>(null);
const supervisorToDelete = ref<Supervisor | null>(null);
const page = ref(1);
const pageSize = 10;

const { data, status, error, refresh } = await useFetch<CwpSupervisorResponse>(
  `${apiBaseUrl}/api/cwpSupervisors`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const supervisors = computed(() => data.value?.supervisors || []);
const cwps = computed(() => data.value?.cwps || []);

const filteredSupervisors = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();

  if (!keyword) return supervisors.value;

  return supervisors.value.filter((supervisor) => {
    const supervisorName = supervisor.supervisor?.toLowerCase() || "";
    const cwpNames = supervisor.cwpSupervisors
      ?.map((item) => `${item.cwp?.cwp || ""} ${item.cwp?.rating?.rating || ""}`)
      .join(" ")
      .toLowerCase();

    return supervisorName.includes(keyword) || cwpNames.includes(keyword);
  });
});

const total = computed(() => filteredSupervisors.value.length);
const paginatedSupervisors = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredSupervisors.value.slice(start, start + pageSize);
});

watch(searchQuery, () => {
  page.value = 1;
});

function getCwpRows(supervisor: Supervisor) {
  const rows = [...(supervisor.cwpSupervisors || [])].sort((first, second) =>
    (first.cwp?.cwp || "").localeCompare(second.cwp?.cwp || ""),
  );

  return rows.length ? rows : [null];
}

function getRowNumber(index: number) {
  return (page.value - 1) * pageSize + index + 1;
}

function formatCwp(cwp: Cwp | null | undefined) {
  if (!cwp) return "-";
  return `${cwp.cwp || "-"}${cwp.rating?.rating ? ` - ${cwp.rating.rating}` : ""}`;
}

function handleEdit(supervisor: Supervisor) {
  selectedSupervisor.value = supervisor;
}

function handleDelete(supervisor: Supervisor) {
  supervisorToDelete.value = supervisor;
}

function handleClose() {
  selectedSupervisor.value = null;
  supervisorToDelete.value = null;
}

function handleChanged() {
  selectedSupervisor.value = null;
  supervisorToDelete.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "CWP supervisor list has been refreshed.",
    color: "success",
  });
}
</script>

<template>
  <UDashboardPanel id="cwp-supervisor-management">
    <template #header>
      <UDashboardNavbar title="CWP Supervisor Management">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-1.5">
        <div class="flex flex-wrap items-center gap-1.5">
          <UInput
            v-model="searchQuery"
            class="max-w-sm"
            icon="i-lucide-search"
            placeholder="Search supervisor or CWP..."
          />

          <CwpSupervisorAddModal :cwps="cwps" @created="handleChanged" />
        </div>

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
        title="Failed to load CWP supervisor"
        :description="getFetchErrorMessage(error, 'Please restart the backend server and try again.')"
      />

      <UAlert
        v-if="!error && status !== 'pending' && cwps.length === 0"
        class="mb-4"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="No related CWP"
        description="No related CWP found for your branch unit. Please create CWP first."
      />

      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="min-w-full border-collapse text-sm">
          <thead class="bg-elevated/50">
            <tr>
              <th class="border border-default px-4 py-3 text-left font-medium">
                No
              </th>
              <th class="border border-default px-4 py-3 text-left font-medium">
                Supervisor
              </th>
              <th class="border border-default px-4 py-3 text-left font-medium">
                CWP
              </th>
              <th class="border border-default px-4 py-3 text-left font-medium">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="status === 'pending'">
              <td class="border border-default px-4 py-6 text-center" colspan="4">
                Loading CWP supervisors...
              </td>
            </tr>

            <tr v-else-if="!error && paginatedSupervisors.length === 0">
              <td class="border border-default px-4 py-6 text-center" colspan="4">
                No CWP supervisor data found.
              </td>
            </tr>

            <template
              v-for="(supervisor, supervisorIndex) in paginatedSupervisors"
              v-else
              :key="supervisor.id"
            >
              <tr
                v-for="(cwpSupervisor, rowIndex) in getCwpRows(supervisor)"
                :key="`${supervisor.id}-${cwpSupervisor?.id || 'empty'}`"
              >
                <td
                  v-if="rowIndex === 0"
                  class="border border-default px-4 py-3 align-top"
                  :rowspan="getCwpRows(supervisor).length"
                >
                  {{ getRowNumber(supervisorIndex) }}
                </td>
                <td
                  v-if="rowIndex === 0"
                  class="border border-default px-4 py-3 align-top font-medium text-highlighted"
                  :rowspan="getCwpRows(supervisor).length"
                >
                  {{ supervisor.supervisor || "-" }}
                </td>
                <td class="border border-default px-4 py-3">
                  {{ formatCwp(cwpSupervisor?.cwp) }}
                </td>
                <td
                  v-if="rowIndex === 0"
                  class="border border-default px-4 py-3 align-top"
                  :rowspan="getCwpRows(supervisor).length"
                >
                  <div class="flex flex-wrap items-center gap-2">
                    <UButton
                      icon="i-lucide-pencil"
                      label="Edit"
                      color="primary"
                      variant="soft"
                      size="sm"
                      @click="handleEdit(supervisor)"
                    />
                    <UButton
                      icon="i-lucide-trash-2"
                      label="Delete"
                      color="error"
                      variant="soft"
                      size="sm"
                      @click="handleDelete(supervisor)"
                    />
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div
        class="mt-4 flex items-center justify-between gap-3 border-t border-default pt-4"
      >
        <div class="text-sm text-muted">
          Showing {{ total ? (page - 1) * pageSize + 1 : 0 }} to
          {{ Math.min(page * pageSize, total) }} of {{ total }} supervisors
        </div>

        <UPagination
          v-model:page="page"
          :items-per-page="pageSize"
          :total="total"
        />
      </div>

      <CwpSupervisorUpdateModal
        :supervisor-data="selectedSupervisor"
        :cwps="cwps"
        @updated="handleChanged"
        @close="handleClose"
      />

      <CwpSupervisorDeleteModal
        :supervisor-data="supervisorToDelete"
        @deleted="handleChanged"
        @close="handleClose"
      />
    </template>
  </UDashboardPanel>
</template>
