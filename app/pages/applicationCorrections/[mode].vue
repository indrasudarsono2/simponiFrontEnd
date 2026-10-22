<script setup lang="ts">
type Row = { id: number; number: string; userNik: string; user: { name: string }; eventUser: { event: { event: string } } }
type FileOption = { id: number; file: string; createdAt: string }
type Detail = { id: number; number: string; member: string; version: string; lockedReason: string | null; selections: Record<string, number | null>; options: Record<string, FileOption[]>; ratings: { id: number; name: string; hours: string | null; proposal?: string }[]; availableRatings: { id: number; name: string }[]; history: { id: number; actorNik: string; kind: string; reason: string; createdAt: string }[] }
const route = useRoute()
const mode = computed(() => route.params.mode === 'ratings' ? 'ratings' : 'documents')
if (!['ratings', 'documents'].includes(String(route.params.mode))) throw createError({ statusCode: 404 })
const { apiFetch } = useApiFetch()
const toast = useToast()
const rows = ref<Row[]>([])
const detail = ref<Detail | null>(null)
const search = ref('')
const reason = ref('')
const selectedRatings = ref<number[]>([])
const selections = ref<Record<string, number | null>>({})
const busy = ref(false)
const confirmed = ref(false)
const labels: Record<string, string> = { licenseId: 'License', logbookUserId: 'Logbook', medexId: 'MEDEX', ielpId: 'IELP' }
const error = (e: unknown) => toast.add({ title: 'Correction not completed', description: (e as { data?: { message?: string } })?.data?.message || 'Please reload and try again.', color: 'error' })
async function load() {
  busy.value = true
  try { rows.value = await apiFetch('/api/applicationCorrections', { query: { search: search.value } }) as Row[] }
  catch (e) { error(e) }
  finally { busy.value = false }
}
async function open(id: number) {
  detail.value = null; confirmed.value = false; reason.value = ''; selectedRatings.value = []
  try { detail.value = await apiFetch(`/api/applicationCorrections/${id}`) as Detail; selections.value = { ...detail.value.selections } }
  catch (e) { error(e) }
}
const changedDocuments = computed(() => Object.fromEntries(Object.entries(selections.value).filter(([key, value]) => value !== detail.value?.selections[key])))
async function save(kind: 'ratings' | 'documents' | 'resubmit' | 'rollback') {
  if (!detail.value || !confirmed.value || reason.value.trim().length < 10) return
  busy.value = true
  const id = detail.value.id
  try {
    await apiFetch(`/api/applicationCorrections/${id}`, { method: 'POST', body: { kind, reason: reason.value, version: detail.value.version, ratingIds: selectedRatings.value, documents: changedDocuments.value } })
    toast.add({ title: kind === 'resubmit' ? 'Returned proposals moved to pending review' : 'Correction recorded; approval not granted', color: 'success' })
    await open(id)
  }
  catch (e) { error(e) }
  finally { busy.value = false }
}
onMounted(load)
</script>

<template>
  <UDashboardPanel>
    <template #header><UDashboardNavbar :title="mode === 'ratings' ? 'Rating Corrections' : 'Document Corrections'"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar></template>
    <template #body>
      <div class="space-y-5 p-4">
        <p class="text-sm text-muted">Checker Admin · own branch unit only · no self-corrections · initial issuance/OJTI excluded. Started examinations are locked.</p>
        <form class="flex gap-2" @submit.prevent="load"><UInput v-model="search" placeholder="Search member name, NIK or application" class="flex-1" /><UButton type="submit" :loading="busy">Search</UButton></form>
        <p class="text-sm text-muted">Up to 100 most recent matching applications.</p>
        <div class="max-h-64 overflow-auto space-y-2 rounded-lg border border-solid border-default p-3"><UButton v-for="row in rows" :key="row.id" block variant="outline" @click="open(row.id)">{{ row.user.name }} · {{ row.userNik }} · {{ row.number }} · {{ row.eventUser.event.event }}</UButton></div>
        <p v-if="!rows.length && !busy">No eligible applications found.</p>
        <section v-if="detail" class="space-y-4 rounded-lg border border-default p-4">
          <h2 class="font-semibold">{{ detail.member }} · {{ detail.number }}</h2>
          <UAlert v-if="detail.lockedReason" color="warning" :description="detail.lockedReason" />
          <p v-for="rating in detail.ratings" :key="rating.id">{{ rating.name }} · Hours: {{ rating.hours || 'blank' }} · Proposal: {{ rating.proposal || 'not assigned' }}</p>
          <template v-if="mode === 'ratings'">
            <p>Only missing ratings may be added. New control hours stay blank. Qualified group checkers are assigned automatically; new proposals require review. Existing ratings and scores are not overwritten.</p>
            <UCheckbox v-for="rating in detail.availableRatings" :key="rating.id" :label="rating.name" :model-value="selectedRatings.includes(rating.id)" @update:model-value="value => selectedRatings = value ? [...selectedRatings, rating.id] : selectedRatings.filter(id => id !== rating.id)" />
            <p v-if="!detail.availableRatings.length">No missing sector ratings.</p>
          </template>
          <template v-else>
            <p>Select an existing file belonging to this member. Changing a shared attachment returns affected rating proposals for review and clears application verification. It does not approve documents.</p>
            <div v-for="(label, key) in labels" :key="key" class="space-y-2">
              <label :for="String(key)" class="font-medium">{{ label }} · currently selected #{{ detail.selections[key] }}</label>
              <select :id="String(key)" v-model="selections[key]" class="block w-full rounded border border-default bg-default p-2">
                <option :value="detail.selections[key]">Keep current selection (#{{ detail.selections[key] }})</option>
                <option v-for="file in detail.options[key]" :key="file.id" :value="file.id">#{{ file.id }} · {{ new Date(file.createdAt).toLocaleString() }}</option>
              </select>
              <UButton v-for="file in detail.options[key]?.filter(f => f.id === selections[key])" :key="file.id" :to="`/file/view?url=${encodeURIComponent(file.file)}`" target="_blank" variant="link">Preview selected {{ label }}</UButton>
            </div>
          </template>
          <UTextarea v-model="reason" placeholder="Required correction reason (10–1000 characters)" :maxlength="1000" class="w-full" />
          <UCheckbox v-model="confirmed" label="I reviewed the selected changes and supporting documents. This action does not validate the proposal." />
          <div class="flex flex-wrap gap-3">
            <UButton :disabled="!!detail.lockedReason || !confirmed || reason.trim().length < 10 || (mode === 'ratings' ? !selectedRatings.length : !Object.keys(changedDocuments).length)" :loading="busy" @click="save(mode)">Save correction</UButton>
            <UButton v-if="mode === 'documents'" variant="outline" :disabled="!!detail.lockedReason || !confirmed || reason.trim().length < 10 || !!Object.keys(changedDocuments).length || !detail.ratings.some(r => r.proposal === 'RETURNED')" :loading="busy" @click="save('resubmit')">Resubmit returned proposals for review</UButton>
          </div>
          <h3 class="font-semibold">Correction history</h3>
          <p class="text-sm text-muted">Rollback is allowed only for the latest correction while its records remain unchanged and no examination has started. Audit history is retained.</p>
          <UButton v-if="detail.history.length && detail.history[0]?.kind !== 'rollback'" color="warning" variant="outline" :disabled="!!detail.lockedReason || !confirmed || reason.trim().length < 10 || busy" @click="save('rollback')">Roll back latest correction</UButton>
          <p v-for="item in detail.history" :key="item.id" class="text-sm">{{ item.createdAt }} · {{ item.actorNik }} · {{ item.kind }} · {{ item.reason }}</p>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>
