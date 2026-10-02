<script setup lang="ts">
interface EligibleUser {
  id: number
  userNik: string
  eventName?: string
  user?: { name?: string | null } | null
  applicationDocs?: Array<{ appRatings?: Array<{ id: number; rating?: { rating?: string | null } | null }> }>
}
interface EventOption {
  id: number
  event: string
  difficulty: string
  eventUsers: EligibleUser[]
}
interface Clock {
  id: number
  status: string
  remainingMs: number
  serverNow: string
  durationSeconds: number
  receivedAt?: number
}
interface Session {
  id: number
  eventId: number
  name: string
  status: string
  event: { event: string; difficulty: string }
  events?: Array<{ id: number; event: string }>
  participants: Array<{ id: number; appRatingId: number | null; eventUser: { id: number; userNik: string; user?: { name?: string | null } | null }; appRating?: { rating?: { rating?: string | null } | null } | null }>
  actions: Array<{ id: number; action: string; actorNik: string; seconds: number | null; reason: string | null; createdAt: string }>
  clock: Clock
}

const { apiFetch } = useApiFetch()
const toast = useToast()
const events = ref<EventOption[]>([])
const sessions = ref<Session[]>([])
const selectedEventIds = ref<number[]>([])
const selectedUsers = ref<number[]>([])
const sessionName = ref('')
const durationMinutes = ref(120)
const extraMinutes = ref<Record<number, number>>({})
const extraReasons = ref<Record<number, string>>({})
const busy = ref(false)
const nowTick = ref(0)
let clockPolling: ReturnType<typeof setInterval> | undefined
let listPolling: ReturnType<typeof setInterval> | undefined
let ticker: ReturnType<typeof setInterval> | undefined
let clockRequestPending = false

const selectedEvents = computed(() => events.value.filter(event => selectedEventIds.value.includes(event.id)))
const eligibleUsers = computed(() => selectedEvents.value.flatMap(event => event.eventUsers
  .filter(user => user.applicationDocs?.some(doc => doc.appRatings?.length))
  .map(user => ({ ...user, eventName: event.event })))
  .sort((a, b) => (a.user?.name || a.userNik).localeCompare(b.user?.name || b.userNik, undefined, { sensitivity: 'base' })))

const sortedParticipants = (participants: Session['participants']) => [...participants]
  .sort((a, b) => (a.eventUser.user?.name || a.eventUser.userNik).localeCompare(b.eventUser.user?.name || b.eventUser.userNik, undefined, { sensitivity: 'base' }))

function displayRemaining(clock: Clock) {
  void nowTick.value
  const since = Date.now() - (clock.receivedAt || Date.now())
  const remaining = Math.max(0, clock.remainingMs - (clock.status === 'RUNNING' ? Math.max(0, since) : 0))
  const seconds = Math.ceil(remaining / 1000)
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

async function load(silent = false) {
  try {
    const [eventData, sessionData] = await Promise.all([
      apiFetch('/api/theorySessions/lead/events') as Promise<EventOption[]>,
      apiFetch('/api/theorySessions/lead') as Promise<Session[]>,
    ])
    events.value = eventData
    const receivedAt = Date.now()
    sessions.value = sessionData.map(session => ({ ...session, clock: { ...session.clock, receivedAt } }))
  } catch (error) {
    if (!silent) toast.add({ title: 'Unable to load theory sessions', description: error instanceof Error ? error.message : 'Please try again.', color: 'error' })
  }
}

async function pollClocks() {
  if (clockRequestPending || !sessions.value.some(session => ['WAITING', 'RUNNING', 'PAUSED', 'ENDING'].includes(session.status))) return
  clockRequestPending = true
  try {
    const clocks = await apiFetch('/api/theorySessions/lead/clocks') as Clock[]
    const byId = new Map(clocks.map(clock => [clock.id, clock]))
    const receivedAt = Date.now()
    const ended = sessions.value.some(session => session.status !== 'ENDED' && byId.get(session.id)?.status === 'ENDED')
    sessions.value = sessions.value.map(session => {
      const clock = byId.get(session.id)
      return clock ? { ...session, status: clock.status, clock: { ...clock, receivedAt } } : session
    })
    if (ended) await load(true)
  } catch { /* Keep the locally calculated countdown during transient failures. */ }
  finally { clockRequestPending = false }
}

function toggleUser(id: number, checked: boolean) {
  if (!checked) {
    selectedUsers.value = selectedUsers.value.filter(item => item !== id)
    return
  }
  const user = eligibleUsers.value.find(item => item.id === id)
  selectedUsers.value = [...selectedUsers.value.filter(item => eligibleUsers.value.find(eligible => eligible.id === item)?.userNik !== user?.userNik), id]
}

function toggleEvent(id: number, checked: boolean) {
  selectedEventIds.value = checked ? [...selectedEventIds.value, id] : selectedEventIds.value.filter(item => item !== id)
  selectedUsers.value = selectedUsers.value.filter(userId => events.value.some(event => selectedEventIds.value.includes(event.id) && event.eventUsers.some(user => user.id === userId)))
}

async function createSession() {
  if (!selectedEventIds.value.length || !sessionName.value.trim() || selectedUsers.value.length < 1) {
    toast.add({ title: 'Choose active events, name, and participants', color: 'warning' })
    return
  }
  busy.value = true
  try {
    await apiFetch('/api/theorySessions', { method: 'POST', body: { eventIds: selectedEventIds.value, name: sessionName.value.trim(), durationMinutes: Number(durationMinutes.value), eventUserIds: selectedUsers.value } })
    sessionName.value = ''
    selectedUsers.value = []
    await load()
    toast.add({ title: 'Theory session created', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Unable to create session', description: error instanceof Error ? error.message : 'Please try again.', color: 'error' })
  } finally { busy.value = false }
}

async function control(session: Session, action: 'start' | 'pause' | 'resume' | 'add_time') {
  busy.value = true
  try {
    await apiFetch(`/api/theorySessions/${session.id}/control/${action}`, {
      method: 'POST',
      body: action === 'add_time' ? { minutes: Number(extraMinutes.value[session.id]), reason: extraReasons.value[session.id] || '' } : {},
    })
    extraMinutes.value[session.id] = 0
    extraReasons.value[session.id] = ''
    await load()
    toast.add({ title: `Session ${action.replace('_', ' ')}`, color: 'success' })
  } catch (error) {
    toast.add({ title: 'Session action failed', description: error instanceof Error ? error.message : 'Please try again.', color: 'error' })
  } finally { busy.value = false }
}

onMounted(() => {
  void load()
  clockPolling = setInterval(() => { void pollClocks() }, 3000)
  listPolling = setInterval(() => { void load(true) }, 30000)
  ticker = setInterval(() => { nowTick.value++ }, 1000)
})
onBeforeUnmount(() => { if (clockPolling) clearInterval(clockPolling); if (listPolling) clearInterval(listPolling); if (ticker) clearInterval(ticker) })
</script>

<template>
  <UDashboardPanel>
    <template #header><UDashboardNavbar title="Theory Sessions"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar></template>
    <template #body>
      <div class="space-y-6 p-4">
        <div class="rounded-lg border border-default p-4 space-y-4">
          <div><h2 class="font-semibold">Create Mode 2 session</h2><p class="text-sm text-muted">Select active events, assign their participants, and set one shared duration. Each participant chooses one eligible rating when joining.</p></div>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
            <UFormField label="Session name"><UInput v-model="sessionName" placeholder="e.g. Morning examination" class="w-full" /></UFormField>
            <UFormField label="Duration (minutes)"><UInput v-model.number="durationMinutes" type="number" min="1" max="1440" class="w-full" /></UFormField>
          </div>
          <div class="rounded border border-default p-3">
            <p class="mb-2 text-sm font-medium">Active events ({{ selectedEventIds.length }} selected)</p>
            <div class="max-h-40 space-y-1 overflow-y-auto">
              <label v-for="event in events" :key="event.id" class="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" :checked="selectedEventIds.includes(event.id)" @change="toggleEvent(event.id, ($event.target as HTMLInputElement).checked)">{{ event.event }}</label>
              <p v-if="!events.length" class="text-sm text-muted">No active Mode 2 events in your branch unit.</p>
            </div>
          </div>
          <div v-if="selectedEvents.length" class="max-h-64 overflow-y-auto rounded border border-default p-3">
            <p class="mb-2 text-sm font-medium">Participants ({{ selectedUsers.length }} selected)</p>
            <div v-for="user in eligibleUsers" :key="user.id" class="py-1">
              <label class="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" :checked="selectedUsers.includes(user.id)" @change="toggleUser(user.id, ($event.target as HTMLInputElement).checked)">{{ user.user?.name || user.userNik }} · {{ user.eventName }} — {{ user.applicationDocs?.flatMap(doc => doc.appRatings?.map(item => item.rating?.rating) || []).join(', ') }}</label>
            </div>
            <p v-if="!eligibleUsers.length" class="text-sm text-muted">No exam-ready participants for this event.</p>
          </div>
          <UButton label="Create Session" icon="i-lucide-plus" :loading="busy" @click="createSession" />
        </div>

        <div v-for="session in sessions" :key="session.id" class="rounded-lg border border-default p-4 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div><h2 class="font-semibold">{{ session.name }}</h2><p class="text-sm text-muted">{{ session.events?.length ? session.events.map(event => event.event).join(', ') : session.event.event }} · {{ session.participants.length }} participants</p></div>
            <div class="text-right"><UBadge :label="session.status" variant="soft" /><p class="mt-1 font-mono text-2xl tabular-nums">{{ displayRemaining(session.clock) }}</p></div>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton v-if="session.status === 'WAITING'" label="Start" :disabled="busy" @click="control(session, 'start')" />
            <UButton v-if="session.status === 'RUNNING'" label="Pause" color="warning" :disabled="busy" @click="control(session, 'pause')" />
            <UButton v-if="session.status === 'PAUSED'" label="Resume" :disabled="busy" @click="control(session, 'resume')" />
          </div>
          <div v-if="['RUNNING', 'PAUSED'].includes(session.status)" class="flex flex-wrap items-end gap-2 rounded border border-default p-3">
            <UFormField label="Extra minutes"><UInput v-model.number="extraMinutes[session.id]" type="number" min="1" max="1440" class="w-28" /></UFormField>
            <UFormField label="Reason"><UInput v-model="extraReasons[session.id]" placeholder="Describe the disruption" class="min-w-60" /></UFormField>
            <UButton label="Add Time" color="warning" :disabled="busy" @click="control(session, 'add_time')" />
          </div>
          <div class="text-sm"><p class="font-medium">Participants</p><p v-for="participant in sortedParticipants(session.participants)" :key="participant.id">{{ participant.eventUser.user?.name || participant.eventUser.userNik }} — {{ participant.appRating?.rating?.rating || 'Rating not chosen' }}</p></div>
          <details v-if="session.actions.length"><summary class="cursor-pointer text-sm">Recent timer actions</summary><p v-for="action in session.actions" :key="action.id" class="text-xs text-muted">{{ new Date(action.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) }} UTC · {{ action.action }} · {{ action.actorNik }} <span v-if="action.seconds">({{ action.seconds / 60 }} min)</span> {{ action.reason }}</p></details>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
