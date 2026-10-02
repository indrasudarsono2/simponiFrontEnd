<script setup lang="ts">
import { CalendarDate, DateFormatter, getLocalTimeZone, parseDate } from "@internationalized/date";

const apiBaseUrl = useApiBaseUrl();
const { token } = useAuth();
const csrfToken = useCookie<string | null>("csrf_token");
const toast = useToast();

interface BranchUnitOption {
  id: number;
  branchId: number;
  unit: string | null;
}

interface BranchOption { id: number; branch: string | null }
interface OptionsResponse { branches: BranchOption[]; units: BranchUnitOption[] }
interface GroupStatistic { group: string; isTrue: number; isFalse: number; total: number; percentageTrue: number }

interface RatingSummary {
  ratingId: number;
  rating: string;
  groups: GroupStatistic[];
}

interface PerformanceResponse {
  mats: GroupStatistic[];
  ratings: RatingSummary[];
}

const { data: optionsData, status: optionsStatus, error: optionsError, refresh: refreshOptions } =
  await useFetch<OptionsResponse>(`${apiBaseUrl}/api/pfcScore/branchUnit`, {
    credentials: "include",
    headers: { Authorization: token.value ? `Bearer ${token.value}` : "" },
  });

const branchId = ref<number | undefined>();
const branchUnitId = ref<number | undefined>();
const today = new Date();
const toDateInput = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const startDate = ref(toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)));
const endDate = ref(toDateInput(today));
const df = new DateFormatter("en-US", { dateStyle: "medium" });
const dateRange = computed({
  get: () => ({
    start: startDate.value ? parseDate(startDate.value) : undefined,
    end: endDate.value ? parseDate(endDate.value) : undefined,
  }),
  set: (value: { start?: CalendarDate; end?: CalendarDate }) => {
    startDate.value = value.start ? `${value.start.year}-${String(value.start.month).padStart(2, "0")}-${String(value.start.day).padStart(2, "0")}` : "";
    endDate.value = value.end ? `${value.end.year}-${String(value.end.month).padStart(2, "0")}-${String(value.end.day).padStart(2, "0")}` : "";
  },
});
const loading = ref(false);
const result = ref<PerformanceResponse | null>(null);

const branchOptions = computed(() => (optionsData.value?.branches || []).map((item) => ({
  label: item.branch || `Branch ${item.id}`,
  value: item.id,
})));
const unitOptions = computed(() => (optionsData.value?.units || []).filter((item) => item.branchId === branchId.value).map((item) => ({
  label: item.unit || `Unit ${item.id}`,
  value: item.id,
})));

watch(branchId, () => { branchUnitId.value = undefined; result.value = null; });
watch([branchUnitId, startDate, endDate], () => { result.value = null; });
const ratingRadars = computed(() => (result.value?.ratings || []).filter((item) => item.groups.length).map((item) => ({
  rating: item.rating,
  statistic: item.groups,
})));
const matsRadar = computed(() => result.value?.mats?.length ? [{ rating: "MATS", statistic: result.value.mats }] : []);

async function loadPerformance() {
  if (!branchId.value || !branchUnitId.value) {
    toast.add({ title: "Select a branch and branch unit", color: "warning" });
    return;
  }
  if (!startDate.value || !endDate.value || startDate.value > endDate.value) {
    toast.add({ title: "Select a valid date range", color: "warning" });
    return;
  }
  try {
    loading.value = true;
    result.value = await $fetch<PerformanceResponse>(`${apiBaseUrl}/api/pfcScore/branchUnit`, {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
        "X-CSRF-Token": csrfToken.value || "",
      },
      body: {
        branchId: branchId.value,
        branchUnitId: branchUnitId.value,
        startDate: startDate.value,
        endDate: endDate.value,
      },
    });
  } catch (error: any) {
    toast.add({
      title: "Unable to load branch-unit performance",
      description: error?.data?.message || error?.message || "Please try again.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Branch Performance">
        <template #leading><UDashboardSidebarCollapse /></template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Branch Performance</h2>
          </template>
          <p v-if="optionsStatus === 'pending'" class="text-sm text-muted">Loading branch units...</p>
          <div v-else-if="optionsError" class="flex items-center gap-3 text-sm text-error">
            Unable to load branch units.
            <UButton label="Retry" variant="outline" @click="refreshOptions()" />
          </div>
          <div v-else class="grid gap-3 md:grid-cols-4 md:items-end">
            <UFormField label="Branch" required>
              <USelect v-model="branchId" :items="branchOptions" value-key="value" placeholder="Select branch" class="w-full" />
            </UFormField>
            <UFormField label="Branch Unit" required>
              <USelect v-model="branchUnitId" :items="unitOptions" value-key="value" placeholder="Select branch unit" :disabled="!branchId" class="w-full" />
            </UFormField>
            <UFormField label="Date Range" required>
              <UPopover :content="{ align: 'start' }" :modal="true">
                <UButton color="neutral" variant="outline" icon="i-lucide-calendar" class="w-full justify-between">
                  <span class="truncate">
                    <template v-if="dateRange.start">
                      <template v-if="dateRange.end">{{ df.format(dateRange.start.toDate(getLocalTimeZone())) }} - {{ df.format(dateRange.end.toDate(getLocalTimeZone())) }}</template>
                      <template v-else>{{ df.format(dateRange.start.toDate(getLocalTimeZone())) }}</template>
                    </template>
                    <template v-else>Pick a date range</template>
                  </span>
                  <template #trailing><UIcon name="i-lucide-chevron-down" class="size-5 shrink-0 text-dimmed" /></template>
                </UButton>
                <template #content><UCalendar v-model="dateRange" class="p-2" :number-of-months="2" range /></template>
              </UPopover>
            </UFormField>
            <div class="flex items-end">
              <UButton label="Load performance" icon="i-lucide-search" :loading="loading" :disabled="!branchId || !branchUnitId || !startDate || !endDate" @click="loadPerformance" />
            </div>
          </div>
          <p class="mt-3 text-xs text-muted">Date Range filters event creation. Each member’s latest valid attempt per event and rating is counted once.</p>
        </UCard>

        <UCard v-if="result">
          <template #header><h2 class="text-lg font-semibold">Question Groups by Rating</h2></template>
          <p v-if="!ratingRadars.length" class="text-sm text-muted">No categorized multiple-choice answers for the selected branch unit and period.</p>
          <StatisticsMandatoryRadar v-else :ratings="ratingRadars" />
        </UCard>

        <UCard v-if="result">
          <template #header><h2 class="text-lg font-semibold">MATS by Mandatory Item</h2></template>
          <p v-if="!matsRadar.length" class="text-sm text-muted">No MATS answers for the selected branch unit and period.</p>
          <StatisticsMandatoryRadar v-else :ratings="matsRadar" :show-rating="false" />
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
