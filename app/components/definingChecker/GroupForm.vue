<script setup lang="ts">
type Assignment = { ratingId: number; checker: string }
const props = defineProps<{ events: any[]; initial?: any }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()
const { apiFetch } = useApiFetch()
const toast = useToast()
const busy = ref(false)
const state = reactive({ eventId: undefined as number | undefined, group: '', pic: '', ratingIds: [] as number[], assignments: [] as Assignment[], members: [] as string[] })
const selectedEvent = computed(() => props.events.find(e => e.id === state.eventId))
const penerbitan = computed(() => selectedEvent.value?.remarkDoc?.remark === 'PENERBITAN')
const ratings = computed<{ id: number; rating: string }[]>(() => (selectedEvent.value?.sector?.subBranchUnitRatings || []).map((r: any) => r.rating))
const authority = (u: any): number[] => [...new Set<number>((u?.userRoles || []).filter((r: any) => r.roles?.role === 'CHECKER').flatMap((r: any) => (r.checkerRatings || []).map((a: any) => a.ratingId)))]
const users = computed<any[]>(() => (selectedEvent.value?.sector?.users || []).filter((u: any) => authority(u).some(id => state.ratingIds.includes(id))))
const options = (ratingId?: number) => users.value.filter(u => !ratingId || authority(u).includes(ratingId)).map(u => ({ value: u.nik, label: `${u.name} (${u.nik}) — ${ratings.value.filter(r => authority(u).includes(r.id)).map(r => r.rating).join(', ')}` }))
const missing = computed(() => state.ratingIds.filter(id => !state.assignments.some(a => a.ratingId === id)))
const members = computed(() => {
  const elsewhere = new Set((selectedEvent.value?.groups || []).filter((g: any) => g.id !== props.initial?.id).flatMap((g: any) => g.groupMembers.map((m: any) => m.member)))
  const checkers = new Set(state.assignments.map(a => a.checker))
  return (selectedEvent.value?.eventUsers || []).map((eu: any) => eu.user).filter((u: any) => !elsewhere.has(u.nik) && !checkers.has(u.nik)).map((u: any) => ({ value: u.nik, label: `${u.name} (${u.nik})` }))
})
watch(() => state.eventId, () => { state.pic = ''; state.ratingIds = []; state.assignments = []; state.members = [] }, { flush: 'sync' })
watch(() => props.initial, initial => {
  if (!initial) return
  state.eventId = initial.eventId
  state.group = initial.group
  state.pic = initial.pic
  state.ratingIds = [...(initial.ratingIds || [])]
  state.assignments = [...(initial.assignments || [])]
  state.members = [...initial.members]
}, { immediate: true })
function chooseRatings(id: number, selected: boolean) {
  state.ratingIds = penerbitan.value ? selected ? [id] : [] : selected ? [...state.ratingIds, id] : state.ratingIds.filter(r => r !== id)
  state.assignments = state.assignments.filter(a => state.ratingIds.includes(a.ratingId))
  fillPic()
}
function fillPic() {
  const pic = users.value.find(u => u.nik === state.pic)
  for (const id of state.ratingIds) if (authority(pic).includes(id) && !state.assignments.some(a => a.ratingId === id && (penerbitan.value ? a.checker === state.pic : true))) state.assignments.push({ ratingId: id, checker: state.pic })
}
function choosePic(niks: string[]) {
  const old = state.pic
  state.pic = niks[0] || ''
  state.assignments = state.assignments.filter(a => a.checker !== old)
  fillPic()
}
function assign(id: number, niks: string[]) {
  state.assignments = state.assignments.filter(a => a.ratingId !== id)
  if (penerbitan.value && state.pic) state.assignments.push({ ratingId: id, checker: state.pic })
  state.assignments.push(...niks.filter(n => !penerbitan.value || n !== state.pic).map(checker => ({ ratingId: id, checker })))
}
async function save() {
  if (busy.value) return
  if (!state.eventId || state.group.trim().length < 2 || !state.pic || !state.members.length || missing.value.length || (penerbitan.value && state.assignments.length < 2)) {
    toast.add({ title: 'Complete the group', description: 'Choose ratings, PIC, qualified checker coverage, and members. PENERBITAN requires an additional checker.', color: 'error' }); return
  }
  busy.value = true
  try {
    await apiFetch(props.initial ? `/api/groups/${props.initial.id}` : '/api/groups', { method: props.initial ? 'PUT' : 'POST', body: { ...state, checkers: [...new Set(state.assignments.map(a => a.checker))] } })
    toast.add({ title: 'Group saved', color: 'success' }); emit('saved')
  } catch (error: any) { toast.add({ title: 'Unable to save group', description: error?.data?.message || error.message, color: 'error' }) }
  finally { busy.value = false }
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="save">
    <UFormField label="Event" required><USelect v-model="state.eventId" :items="events" label-key="event" value-key="id" class="w-full" :disabled="Boolean(initial)" placeholder="Select event" /></UFormField>
    <p v-if="selectedEvent" class="text-sm text-muted">{{ selectedEvent.remarkDoc?.remark }} · {{ selectedEvent.sector?.sector }}</p>
    <UFormField label="Group name" required><UInput v-model="state.group" class="w-full" maxlength="150" /></UFormField>
    <UFormField label="Group ratings" required>
      <div class="flex flex-wrap gap-4 rounded border border-default p-4">
        <label v-for="r in ratings" :key="r.id" class="flex items-center gap-2"><input type="checkbox" :checked="state.ratingIds.includes(r.id)" @change="chooseRatings(r.id, ($event.target as HTMLInputElement).checked)">{{ r.rating }}</label>
        <span v-if="!ratings.length" class="text-sm text-muted">Select an event with configured sector ratings.</span>
      </div>
      <p class="mt-1 text-xs text-muted">{{ penerbitan ? 'PENERBITAN: one rating; PIC plus at least one additional qualified checker.' : 'PERPANJANGAN: select the ratings this group covers.' }}</p>
    </UFormField>
    <UFormField label="PIC (Person in Charge)" required>
      <DefiningCheckerUserPicker :options="options()" :selected="state.pic ? [state.pic] : []" :disabled="!state.ratingIds.length" search-placeholder="Search eligible PIC by name or NIK" @change="choosePic" />
    </UFormField>
    <div v-if="state.ratingIds.length" class="rounded border border-default p-4 space-y-4">
      <h3 class="font-semibold">Rating checker assignments</h3>
      <div v-for="id in state.ratingIds" :key="id" class="space-y-2">
        <p class="font-medium">{{ ratings.find(r => r.id === id)?.rating }} <span v-if="!state.assignments.some(a => a.ratingId === id)" class="text-warning text-xs">— additional qualified checker required</span></p>
        <p v-if="penerbitan" class="text-sm text-muted">PIC participates in practical scoring. Select additional checker(s) below; every assigned checker must submit a practical score and evaluation sheet.</p>
        <DefiningCheckerUserPicker :options="options(id).filter(o => !penerbitan || o.value !== state.pic)" :selected="state.assignments.filter(a => a.ratingId === id && (!penerbitan || a.checker !== state.pic)).map(a => a.checker)" :multiple="penerbitan" :disabled="!state.pic" @change="assign(id, $event)" />
      </div>
    </div>
    <UFormField label="Members" required>
      <DefiningCheckerUserPicker :options="members" :selected="state.members" :disabled="!state.pic" multiple search-placeholder="Search event members by name or NIK" @change="state.members = $event" />
      <p class="text-xs text-muted mt-1">Members already in another event group and assigned checkers are excluded. Application ratings must be covered by this group.</p>
    </UFormField>
    <p v-if="initial && !initial.assignmentPolicy" class="text-warning text-sm">Legacy group: saving adopts explicit rating assignments. Groups with application documents are locked and cannot be reassigned here.</p>
    <div class="flex justify-end gap-2"><UButton label="Cancel" color="neutral" variant="subtle" :disabled="busy" @click="emit('cancel')" /><UButton type="submit" label="Save Group" :loading="busy" /></div>
  </form>
</template>
