<script setup lang="ts">
interface LetterSummary {
  id: number
  status: string
  revision: number
  supervisor?: { nik: string; name: string | null }
  validatedAt?: string | null
  actions?: Array<{ id: number; action: string; reason?: string | null; createdAt: string }>
}
interface RatingRow { id: number; controlHour: string | null; rating?: { rating?: string | null } | null; proposalLetter?: LetterSummary | null }
interface DocumentLetters { id: number; number: string | null; ojtRecommendationStatus?: string | null; ojtUser?: { nik: string; name: string | null } | null; eventUser?: { event?: { remarkDoc?: { remark?: string | null } | null } | null } | null; appRatings: RatingRow[] }
interface Supervisor { nik: string; name: string | null }

const props = defineProps<{ applicationDocId: number | null }>()
const emit = defineEmits<{ close: [] }>()
const { apiFetch } = useApiFetch()
const toast = useToast()
const open = ref(false)
const loading = ref(false)
const doc = ref<DocumentLetters | null>(null)
const supervisors = ref<Supervisor[]>([])
const supervisorNik = ref<string | undefined>()
const isPenerbitan = computed(() => doc.value?.eventUser?.event?.remarkDoc?.remark?.trim().toUpperCase() === 'PENERBITAN')

async function load() {
  if (!props.applicationDocId) return
  loading.value = true
  try {
    const letters = await apiFetch(`/api/proposalLetters/application/${props.applicationDocId}`) as DocumentLetters
    const choices = letters.eventUser?.event?.remarkDoc?.remark?.trim().toUpperCase() === 'PENERBITAN' ? [] : await apiFetch('/api/proposalLetters/supervisors') as Supervisor[]
    doc.value = letters
    supervisors.value = choices
    supervisorNik.value = letters.appRatings.find(row => row.proposalLetter)?.proposalLetter?.supervisor?.nik || undefined
  } catch (error) {
    toast.add({ title: 'Unable to load proposal letters', description: error instanceof Error ? error.message : 'Please try again.', color: 'error' })
  } finally { loading.value = false }
}

watch(() => props.applicationDocId, (id) => { if (id) { open.value = true; void load() } }, { immediate: true })
watch(open, value => { if (!value) { doc.value = null; supervisorNik.value = undefined; emit('close') } })

async function assign() {
  if (!props.applicationDocId || (!isPenerbitan.value && !supervisorNik.value)) return
  loading.value = true
  try {
    await apiFetch(`/api/proposalLetters/application/${props.applicationDocId}/assign`, { method: 'POST', body: { supervisorNik: supervisorNik.value } })
    await load()
    toast.add({ title: isPenerbitan.value ? 'Sent to OJTI' : 'Supervisor assigned', description: 'One letter is ready for each proposed rating.', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Assignment failed', description: error instanceof Error ? error.message : 'Please try again.', color: 'error' })
  } finally { loading.value = false }
}
</script>

<template>
  <UModal v-model:open="open" title="Proposal Letters" description="One letter and separate decision per proposed rating" :ui="{ content: 'w-[min(96vw,72rem)] max-w-5xl max-h-[94vh]', body: 'overflow-y-auto' }">
    <template #body>
      <div class="space-y-5">
        <p v-if="isPenerbitan" class="text-sm text-muted">Application {{ doc?.number || '...' }}. Send a separate recommendation letter for each rating to {{ doc?.ojtUser?.name || 'the selected OJTI' }}. The Checker can verify after every rating letter is approved.</p>
        <p v-else class="text-sm text-muted">Application {{ doc?.number || '...' }}. Assign a supervisor from your branch unit. Validated letters remain locked; returned letters can be corrected separately.</p>
        <div v-if="isPenerbitan" class="rounded-lg border border-default p-4"><UButton label="Send rating letters to OJTI" :loading="loading" :disabled="!doc?.ojtUser" @click="assign" /></div>
        <div v-else class="flex flex-wrap items-end gap-3 rounded-lg border border-default p-4">
          <UFormField label="Pimpinan Unit Kerja" class="min-w-64 flex-1">
            <USelect v-model="supervisorNik" :items="supervisors.map(item => ({ label: item.name || item.nik, value: item.nik }))" placeholder="Choose a supervisor" class="w-full" />
          </UFormField>
          <UButton label="Assign / Reassign Unvalidated Letters" :loading="loading" :disabled="!supervisorNik" @click="assign" />
          <p v-if="!supervisors.length && !loading" class="w-full text-sm text-warning">No other user with the Supervisor role is assigned to your branch unit.</p>
        </div>
        <div v-for="row in doc?.appRatings || []" :key="row.id" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-default p-4">
          <div class="space-y-1">
            <p class="font-semibold">{{ row.rating?.rating || 'Rating' }}</p>
            <p class="text-sm text-muted">Control hours: {{ row.controlHour || '—' }} · {{ row.proposalLetter?.supervisor?.name || (isPenerbitan ? doc?.ojtUser?.name || 'OJTI not selected' : 'No supervisor assigned') }}</p>
            <p v-if="row.proposalLetter?.status === 'RETURNED'" class="text-sm text-warning">Returned: {{ row.proposalLetter.actions?.find(action => action.action === 'RETURNED')?.reason }}</p>
          </div>
          <div class="flex items-center gap-2">
            <UBadge :label="row.proposalLetter?.status || 'NOT ASSIGNED'" :color="row.proposalLetter?.status === 'VALIDATED' ? 'success' : row.proposalLetter?.status === 'RETURNED' ? 'warning' : 'neutral'" variant="soft" />
            <UButton v-if="row.proposalLetter" label="Open Letter" :to="`/proposalLetters/${row.proposalLetter.id}`" variant="outline" />
          </div>
        </div>
        <p v-if="!doc?.appRatings.length && !loading" class="text-sm text-muted">No ratings have been proposed in this application.</p>
      </div>
    </template>
  </UModal>
</template>
