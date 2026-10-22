<script setup lang="ts">
const props = defineProps<{ eventId: number; eventUserId: number }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { apiFetch } = useApiFetch()
const toast = useToast()
const open = ref(true)
const loading = ref(false)
const saving = ref(false)
const selected = ref<number | undefined>()
const until = ref('')
const reason = ref('')
interface AccessData {
  event: { event: string; theoryMode: string; finishDate: string }
  user: { name: string }
  ratings: Array<{ id: number; rating: string; applicationDocId: number; unfinished: boolean; status: string; extension: { accessUntil: string; reason: string; actorNik: string } | null }>
}
const data = ref<AccessData | null>(null)
const options = computed(() => data.value?.ratings.filter(r => r.unfinished).map(r => ({ label: `${r.rating} · Application ${r.applicationDocId} · ${r.status}`, value: r.id })) || [])
const chosen = computed(() => data.value?.ratings.find(r => r.id === selected.value))
const available = computed(() => data.value?.event.theoryMode === 'MODE_1' && new Date(data.value.event.finishDate).getTime() < Date.now())
const utc = (value?: string) => value ? new Date(value).toISOString().replace('T', ' ').replace('.000Z', ' UTC') : '-'
watch(open, value => { if (!value) emit('close') })
onMounted(async () => {
  loading.value = true
  try { data.value = await apiFetch(`/api/events/${props.eventId}/exam-access/${props.eventUserId}`) as AccessData }
  catch (e: any) { toast.add({ title: 'Unable to load access', description: e?.data?.message || 'Please try again.', color: 'error' }) }
  finally { loading.value = false }
})
async function save() {
  if (!selected.value || !until.value || reason.value.trim().length < 10) return
  saving.value = true
  try {
    await apiFetch(`/api/events/${props.eventId}/exam-access/${props.eventUserId}`, { method: 'POST', body: { appRatingId: selected.value, accessUntil: new Date(`${until.value}Z`).toISOString(), reason: reason.value.trim() } })
    toast.add({ title: 'Exam access extended', description: 'Answers, scores and attempt countdowns are unchanged.', color: 'success' })
    emit('saved'); open.value = false
  } catch (e: any) { toast.add({ title: 'Unable to extend access', description: e?.data?.message || 'Check the deadline and try again.', color: 'error' }) }
  finally { saving.value = false }
}
</script>
<template>
  <UModal v-model:open="open" title="Extend Exam Access" description="Individual Mode 1 event-access exception" :dismissible="!saving">
    <template #body>
      <USkeleton v-if="loading" class="h-48" />
      <div v-else-if="data" class="space-y-4">
        <p>{{ data.user.name }} · {{ data.event.event }}</p>
        <p>Event ended: {{ utc(data.event.finishDate) }}</p>
        <UAlert color="warning" title="Access only — not an attempt reset" description="Saved answers and scores remain unchanged. An expired attempt countdown still requires the existing reset action. Mode 2 remains controlled by its shared session." />
        <p v-if="!available" class="text-warning">Only expired Mode 1 events can receive this exception.</p>
        <UFormField label="Unfinished rating" required><USelect v-model="selected" :items="options" class="w-full" :disabled="!available || saving" placeholder="Choose a rating" /></UFormField>
        <p v-if="chosen?.extension" class="text-sm">Existing extension: {{ utc(chosen.extension.accessUntil) }} · {{ chosen.extension.reason }}</p>
        <UFormField label="New access-until date/time (UTC)" required><UInput v-model="until" type="datetime-local" class="w-full" :disabled="!available || saving" /></UFormField>
        <UFormField label="Reason (10–500 characters)" required><UTextarea v-model="reason" :maxlength="500" class="w-full" :disabled="!available || saving" /></UFormField>
        <UButton label="Extend Access" :loading="saving" :disabled="!available || !selected || !until || reason.trim().length < 10" @click="save" />
      </div>
    </template>
  </UModal>
</template>
