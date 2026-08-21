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
}

interface SectorCwp {
  id: number;
  cwpId: number | null;
  sectorId: number | null;
  cwp: Cwp | null;
}

interface Sector {
  id: number;
  sector: string | null;
  sectorCwps: SectorCwp[];
}

const { token } = useAuth();
const toast = useToast();

const searchQuery = ref("");
const selectedSector = ref<Sector | null>(null);
const page = ref(1);
const pageSize = 10;

const { data, status, refresh } = await useFetch<Sector[]>(
  `${apiBaseUrl}/api/cwpSectors`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const filteredSectors = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  const sectors = data.value || [];

  if (!keyword) return sectors;

  return sectors.filter((sector) => {
    const sectorName = sector.sector?.toLowerCase() || "";
    const cwpNames = sector.sectorCwps
      ?.map((sectorCwp) => sectorCwp.cwp?.cwp?.toLowerCase() || "")
      .join(" ");

    return sectorName.includes(keyword) || cwpNames.includes(keyword);
  });
});

const total = computed(() => filteredSectors.value.length);
const paginatedSectors = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredSectors.value.slice(start, start + pageSize);
});

watch(searchQuery, () => {
  page.value = 1;
});

function getSectorRows(sector: Sector) {
  return sector.sectorCwps?.length ? sector.sectorCwps : [null];
}

function getRowNumber(index: number) {
  return (page.value - 1) * pageSize + index + 1;
}

function handleManage(sector: Sector) {
  selectedSector.value = sector;
}

function handleClose() {
  selectedSector.value = null;
}

function handleUpdated() {
  selectedSector.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "CWP sector list has been refreshed",
    color: "success",
  });
}
</script>

<template>
  <UDashboardPanel id="cwp-sector-management">
    <template #header>
      <UDashboardNavbar title="CWP Sector Management">
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
          placeholder="Search sector or CWP..."
        />

        <UButton
          label="Refresh"
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          @click="() => refresh()"
        />
      </div>

      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="min-w-full border-collapse text-sm">
          <thead class="bg-elevated/50">
            <tr>
              <th class="border border-default px-4 py-3 text-left font-medium">
                No
              </th>
              <th class="border border-default px-4 py-3 text-left font-medium">
                Sector
              </th>
              <th class="border border-default px-4 py-3 text-left font-medium">
                CWP-RATING
              </th>
              <th class="border border-default px-4 py-3 text-left font-medium">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="status === 'pending'">
              <td
                class="border border-default px-4 py-6 text-center"
                colspan="4"
              >
                Loading CWP sectors...
              </td>
            </tr>

            <tr v-else-if="paginatedSectors.length === 0">
              <td
                class="border border-default px-4 py-6 text-center"
                colspan="4"
              >
                No sector CWP data found.
              </td>
            </tr>

            <template
              v-for="(sector, sectorIndex) in paginatedSectors"
              v-else
              :key="sector.id"
            >
              <tr
                v-for="(sectorCwp, rowIndex) in getSectorRows(sector)"
                :key="`${sector.id}-${sectorCwp?.id || 'empty'}`"
              >
                <td
                  v-if="rowIndex === 0"
                  class="border border-default px-4 py-3 align-top"
                  :rowspan="getSectorRows(sector).length"
                >
                  {{ getRowNumber(sectorIndex) }}
                </td>
                <td
                  v-if="rowIndex === 0"
                  class="border border-default px-4 py-3 align-top font-medium text-highlighted"
                  :rowspan="getSectorRows(sector).length"
                >
                  {{ sector.sector || "-" }}
                </td>
                <td class="border border-default px-4 py-3">
                  <div class="font-medium">
                    {{ sectorCwp?.cwp?.cwp || "-" }}
                  </div>
                  <div
                    v-if="sectorCwp?.cwp?.rating?.rating"
                    class="text-xs text-muted"
                  >
                    {{ sectorCwp.cwp.rating.rating }}
                  </div>
                </td>
                <td
                  v-if="rowIndex === 0"
                  class="border border-default px-4 py-3 align-top"
                  :rowspan="getSectorRows(sector).length"
                >
                  <UButton
                    label="Manage"
                    icon="i-lucide-settings"
                    color="primary"
                    variant="soft"
                    size="sm"
                    @click="handleManage(sector)"
                  />
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
          {{ Math.min(page * pageSize, total) }} of {{ total }} sectors
        </div>

        <UPagination
          v-model:page="page"
          :items-per-page="pageSize"
          :total="total"
        />
      </div>

      <CwpSectorManageModal
        :sector="selectedSector"
        @sector-cwps-updated="handleUpdated"
        @close="handleClose"
      />
    </template>
  </UDashboardPanel>
</template>
