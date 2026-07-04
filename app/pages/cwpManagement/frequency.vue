<script setup lang="ts">
import ip from "../../utils/config.json";

interface Rating {
  id: number;
  rating: string | null;
}

interface CwpFrequency {
  id: number;
  cwpId: number | null;
  frequency: string | null;
  isPrimary: boolean | null;
}

interface Cwp {
  id: number;
  cwp: string | null;
  rating: Rating | null;
  cwpFrequencies: CwpFrequency[];
}

const { token } = useAuth();
const toast = useToast();

const searchQuery = ref("");
const selectedCwp = ref<Cwp | null>(null);
const page = ref(1);
const pageSize = 10;

const { data, status, refresh } = await useFetch<Cwp[]>(
  `http://${ip.ipBackEnd}/api/cwpFrequencies`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const filteredCwps = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  const cwps = data.value || [];

  if (!keyword) return cwps;

  return cwps.filter((cwp) => {
    const cwpName = cwp.cwp?.toLowerCase() || "";
    const ratingName = cwp.rating?.rating?.toLowerCase() || "";
    const frequencies = cwp.cwpFrequencies
      ?.map((item) => item.frequency?.toLowerCase() || "")
      .join(" ");

    return (
      cwpName.includes(keyword) ||
      ratingName.includes(keyword) ||
      frequencies.includes(keyword)
    );
  });
});

const total = computed(() => filteredCwps.value.length);
const paginatedCwps = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredCwps.value.slice(start, start + pageSize);
});

watch(searchQuery, () => {
  page.value = 1;
});

function getFrequencyRows(cwp: Cwp) {
  return cwp.cwpFrequencies?.length ? cwp.cwpFrequencies : [null];
}

function getRowNumber(index: number) {
  return (page.value - 1) * pageSize + index + 1;
}

function handleManage(cwp: Cwp) {
  selectedCwp.value = cwp;
}

function handleClose() {
  selectedCwp.value = null;
}

function handleUpdated() {
  selectedCwp.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "CWP frequency list has been refreshed",
    color: "success",
  });
}
</script>

<template>
  <UDashboardPanel id="cwp-frequency-management">
    <template #header>
      <UDashboardNavbar title="CWP Frequency Management">
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
          placeholder="Search CWP or frequency..."
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
                CWP-RATING
              </th>
              <th class="border border-default px-4 py-3 text-left font-medium">
                Frequency
              </th>
              <th class="border border-default px-4 py-3 text-left font-medium">
                Status
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
                colspan="5"
              >
                Loading CWP frequencies...
              </td>
            </tr>

            <tr v-else-if="paginatedCwps.length === 0">
              <td
                class="border border-default px-4 py-6 text-center"
                colspan="5"
              >
                No CWP frequency data found.
              </td>
            </tr>

            <template
              v-for="(cwp, cwpIndex) in paginatedCwps"
              v-else
              :key="cwp.id"
            >
              <tr
                v-for="(frequency, rowIndex) in getFrequencyRows(cwp)"
                :key="`${cwp.id}-${frequency?.id || 'empty'}`"
              >
                <td
                  v-if="rowIndex === 0"
                  class="border border-default px-4 py-3 align-top"
                  :rowspan="getFrequencyRows(cwp).length"
                >
                  {{ getRowNumber(cwpIndex) }}
                </td>
                <td
                  v-if="rowIndex === 0"
                  class="border border-default px-4 py-3 align-top"
                  :rowspan="getFrequencyRows(cwp).length"
                >
                  <div class="font-medium text-highlighted">
                    {{ cwp.cwp || "-" }}
                  </div>
                  <div v-if="cwp.rating?.rating" class="text-xs text-muted">
                    {{ cwp.rating.rating }}
                  </div>
                </td>
                <td class="border border-default px-4 py-3">
                  {{ frequency?.frequency || "-" }}
                </td>
                <td class="border border-default px-4 py-3">
                  <UBadge
                    :color="frequency?.isPrimary ? 'success' : 'neutral'"
                    variant="soft"
                  >
                    {{ frequency?.isPrimary ? "Primary" : "Secondary" }}
                  </UBadge>
                </td>
                <td
                  v-if="rowIndex === 0"
                  class="border border-default px-4 py-3 align-top"
                  :rowspan="getFrequencyRows(cwp).length"
                >
                  <UButton
                    label="Manage"
                    icon="i-lucide-settings"
                    color="primary"
                    variant="soft"
                    size="sm"
                    @click="handleManage(cwp)"
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
          {{ Math.min(page * pageSize, total) }} of {{ total }} CWP
        </div>

        <UPagination
          v-model:page="page"
          :items-per-page="pageSize"
          :total="total"
        />
      </div>

      <CwpFrequencyManageModal
        :cwp="selectedCwp"
        @updated="handleUpdated"
        @close="handleClose"
      />
    </template>
  </UDashboardPanel>
</template>
