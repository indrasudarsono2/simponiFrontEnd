<script setup lang="ts">
const props = defineProps<{ scope: 'general' | 'branch' | 'unit' }>()
const { apiFetch } = useApiFetch()
const branch = ref('all'), unit = ref('all'), page = ref(0)
const busy = ref(false), error = ref('')
interface Result {
  checkedAt: string; total: number; mode1Count: number; mode2Count: number; overdueMode1Count: number; hasNext: boolean;
  branches: Array<{ id: number; name: string }>; branchUnits: Array<{ id: number; name: string; branchId: number }>;
  attempts: Array<{ id: string; branchId: number | null; branchUnitId: number | null; branch: string; branchUnit: string; nik: string; name: string; event: string; rating: string; section: string; mode: string; deadline: string | null; status: string }>;
}
const result = ref<Result | null>(null)
const visibleUnits = computed(() => (result.value?.branchUnits || []).filter(item => branch.value === 'all' || String(item.branchId) === branch.value))
const filteredAttempts = computed(() => (result.value?.attempts || []).filter(item =>
  (branch.value === 'all' || String(item.branchId) === branch.value) && (unit.value === 'all' || String(item.branchUnitId) === unit.value)))
const counts = computed(() => ({ total: filteredAttempts.value.length,
  mode1: filteredAttempts.value.filter(item => item.mode === 'MODE_1').length,
  mode2: filteredAttempts.value.filter(item => item.mode === 'MODE_2').length,
  overdue: filteredAttempts.value.filter(item => item.mode === 'MODE_1' && item.status === 'OVERDUE').length }))
const visibleAttempts = computed(() => filteredAttempts.value.slice(page.value * 100, (page.value + 1) * 100))
let sequence = 0
async function load() {
  const current = ++sequence; busy.value = true; error.value = ''; result.value = null
  try {
    const data = await apiFetch('/api/adminExaminationActivity', { query: { scope: props.scope, snapshot: 'true' } }) as Result
    if (current === sequence) { result.value = data; page.value = 0 }
  } catch (e: any) { if (current === sequence) error.value = e?.data?.message || 'Unable to load examination status.' }
  finally { if (current === sequence) busy.value = false }
}
function changeBranch() { unit.value = 'all'; page.value = 0 }
function changeUnit() { page.value = 0 }
function movePage(delta: number) { page.value += delta }
onMounted(load)
onBeforeUnmount(() => { sequence++ })
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-semibold">Examinations in progress</h2>
        <UButton label="Refresh status" :loading="busy" @click="load" />
      </div>
    </template>
    <div class="flex flex-wrap gap-4 mb-4">
      <label v-if="scope === 'general'" class="flex flex-col gap-1">Branch
        <select v-model="branch" :disabled="busy" class="rounded border border-default bg-default p-2" @change="changeBranch">
          <option value="all">All branches</option>
          <option v-for="item in result?.branches || []" :key="item.id" :value="String(item.id)">{{ item.name }}</option>
        </select>
      </label>
      <label v-if="scope !== 'unit'" class="flex flex-col gap-1">Branch unit
        <select v-model="unit" :disabled="busy" class="rounded border border-default bg-default p-2" @change="changeUnit">
          <option value="all">All branch units</option>
          <option v-for="item in visibleUnits" :key="item.id" :value="String(item.id)">{{ item.name }}</option>
        </select>
      </label>
    </div>
    <p v-if="error" class="text-error">{{ error }} No current result is available.</p>
    <p v-else-if="busy">Loading examination activity…</p>
    <template v-else-if="result">
      <p>Unfinished attempts: {{ counts.total }} · Mode 1: {{ counts.mode1 }} · Mode 2: {{ counts.mode2 }} · Overdue Mode 1: {{ counts.overdue }}</p>
      <p class="text-sm text-muted my-2">Last checked: {{ new Date(result.checkedAt).toLocaleString() }}. An unfinished attempt does not prove the user is online. Overdue attempts await finalization. Refresh before planning maintenance.</p>
      <div class="overflow-auto max-h-[32rem]">
        <table class="w-full text-sm text-left">
          <thead><tr><th>Branch</th><th>Branch unit</th><th>Participant / NIK</th><th>Event</th><th>Rating / Section</th><th>Mode</th><th>Deadline (local time)</th><th>Status</th></tr></thead>
          <tbody><tr v-for="attempt in visibleAttempts" :key="attempt.id" class="border-t">
            <td class="py-2 pr-3">{{ attempt.branch }}</td><td class="pr-3">{{ attempt.branchUnit }}</td>
            <td class="pr-3">{{ attempt.name }}<br>{{ attempt.nik }}</td><td class="pr-3">{{ attempt.event }}</td>
            <td class="pr-3">{{ attempt.rating }} / {{ attempt.section }}</td><td>{{ attempt.mode }}</td>
            <td>{{ attempt.deadline ? new Date(attempt.deadline).toLocaleString() : 'Paused / awaiting finalization' }}</td>
            <td>{{ attempt.status.replaceAll('_', ' ') }}</td>
          </tr></tbody>
        </table>
      </div>
      <p v-if="!counts.total" class="mt-3">No unfinished attempts found in the selected filters.</p>
      <div class="flex items-center gap-3 mt-3">
        <UButton label="Previous" :disabled="page === 0 || busy" @click="movePage(-1)" />
        <span>Page {{ page + 1 }} · 100 attempts per page · Filters use the loaded snapshot</span>
        <UButton label="Next" :disabled="(page + 1) * 100 >= counts.total || busy" @click="movePage(1)" />
      </div>
    </template>
  </UCard>
</template>
