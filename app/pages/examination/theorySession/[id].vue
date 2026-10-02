<script setup lang="ts">
interface Clock {
  id: number
  name: string
  status: 'WAITING' | 'RUNNING' | 'PAUSED' | 'ENDING' | 'ENDED'
  remainingMs: number
  serverNow: string
  endedAt?: string | null
  receivedAt?: number
}
type OptionKey = 'A' | 'B' | 'C' | 'D'
interface Question { id: number; question: string; image?: string | null; a?: string; b?: string; c?: string; d?: string; optionOrder?: OptionKey[] }
interface QuestionGroup { group: string; questions: Question[] }
interface Attempt {
  appRatingId: number | null
  rating: string | null
  clock: Clock
  questions: { essay: QuestionGroup[]; multipleChoice: QuestionGroup[] } | null
  essayAnswers: Record<string, string>
  multipleChoiceAnswers: Record<string, string>
  essaySubmittedAt: string | null
  multipleChoiceSubmittedAt: string | null
  finalizedAt: string | null
  multipleChoiceResult?: { score: number | null; wrongQuestionIds: number[]; wrongQuestions: Array<{ id: number; question: string; image?: string | null; selectedAnswer: string | null }> }
}
interface MySession {
  id: number
  session: Clock
  eligibleRatings: Array<{ id: number; rating: string }>
  appRatingId: number | null
}

const route = useRoute()
const sessionId = Number(route.params.id)
const { apiFetch } = useApiFetch()
const toast = useToast()
const attempt = ref<Attempt | null>(null)
const mySession = ref<MySession | null>(null)
const chosenRating = ref<number | undefined>()
const essayAnswers = ref<Record<string, string>>({})
const multipleChoiceAnswers = ref<Record<string, string>>({})
const activePart = ref<'ESSAY' | 'MULTIPLE_CHOICE'>('ESSAY')
const mcView = ref<'GROUP' | 'SINGLE'>('GROUP')
const activeMcGroupIndex = ref('0')
const activeMcQuestionIndex = ref(0)
const mcTabScroller = ref<HTMLElement | null>(null)
const busy = ref(false)
const tick = ref(0)
let polling: ReturnType<typeof setInterval> | undefined
let ticker: ReturnType<typeof setInterval> | undefined
let essayDebounce: ReturnType<typeof setTimeout> | undefined
let mcDebounce: ReturnType<typeof setTimeout> | undefined
let essaySave: Promise<void> = Promise.resolve()
let mcSave: Promise<void> = Promise.resolve()

const clock = computed(() => attempt.value?.clock || mySession.value?.session)
const feedbackRemainingMs = computed(() => {
  void tick.value
  if (clock.value?.status !== 'ENDED' || !clock.value.endedAt) return 0
  const serverNow = new Date(clock.value.serverNow).getTime() + Math.max(0, Date.now() - (clock.value.receivedAt || Date.now()))
  return Math.max(0, new Date(clock.value.endedAt).getTime() + 60_000 - serverNow)
})
const inFeedbackWindow = computed(() => clock.value?.status === 'ENDED' && feedbackRemainingMs.value > 0)
const feedbackSeconds = computed(() => Math.ceil(feedbackRemainingMs.value / 1000))
let redirecting = false
async function leaveExpiredSession() {
  if (redirecting) return
  redirecting = true
  await navigateTo('/examination/examination', { replace: true })
}
watch([() => clock.value?.status, feedbackRemainingMs], ([status, remaining]) => {
  if (status === 'ENDED' && remaining <= 0) void leaveExpiredSession()
})
const remaining = computed(() => {
  void tick.value
  const current = clock.value
  if (!current) return 0
  return Math.max(0, current.remainingMs - (current.status === 'RUNNING' ? Math.max(0, Date.now() - (current.receivedAt || Date.now())) : 0))
})
const timeLabel = computed(() => {
  const seconds = Math.ceil(remaining.value / 1000)
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
})
const canAnswer = computed(() => clock.value?.status === 'RUNNING' && remaining.value > 0 && !attempt.value?.finalizedAt)
const optionSlots: OptionKey[] = ['A', 'B', 'C', 'D']
function optionOrder(question: Question): OptionKey[] {
  const saved = question.optionOrder
  if (saved?.length === 4 && new Set(saved).size === 4 && saved.every(key => optionSlots.includes(key))) return saved
  // Older snapshots have no saved order. Derive one from immutable IDs so it
  // stays identical after refresh, across devices, and in both question views.
  const keys = [...optionSlots]
  let seed = (question.id ^ (attempt.value?.appRatingId || 0) ^ 0x9e3779b9) >>> 0
  for (let index = keys.length - 1; index > 0; index--) {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    const other = (seed >>> 0) % (index + 1)
    const selected = keys[index]!
    keys[index] = keys[other]!
    keys[other] = selected
  }
  if (keys.every((key, index) => key === optionSlots[index])) keys.push(keys.shift()!)
  return keys
}
const optionText = (question: Question, key: OptionKey) => question[key.toLowerCase() as Lowercase<OptionKey>] || '-'
const mcGroups = computed(() => attempt.value?.questions?.multipleChoice || [])
const activeMcGroup = computed(() => mcGroups.value[Number(activeMcGroupIndex.value)] || mcGroups.value[0] || null)
const mcQuestionItems = computed(() => {
  let number = 0
  return mcGroups.value.flatMap((group, groupIndex) => group.questions.map(question => ({
    question,
    groupName: group.group || `Group ${groupIndex + 1}`,
    number: ++number,
  })))
})
const activeMcQuestion = computed(() => mcQuestionItems.value[activeMcQuestionIndex.value] || null)
const isMcAnswered = (questionId: number) => ['A', 'B', 'C', 'D'].includes(multipleChoiceAnswers.value[String(questionId)] || '')
const unansweredMcCount = computed(() => mcQuestionItems.value.filter(item => !isMcAnswered(item.question.id)).length)
function nextUnansweredMcQuestion() {
  const questions = mcQuestionItems.value
  if (!questions.length) return
  const next = questions.findIndex((item, index) => index > activeMcQuestionIndex.value && !isMcAnswered(item.question.id))
  const wrapped = next < 0 ? questions.findIndex(item => !isMcAnswered(item.question.id)) : next
  if (wrapped >= 0) activeMcQuestionIndex.value = wrapped
}
const answeredInGroup = (group: QuestionGroup) => group.questions.filter(question =>
  ['A', 'B', 'C', 'D'].includes(multipleChoiceAnswers.value[String(question.id)] || '')
).length
const mcTabs = computed(() => mcGroups.value.map((group, index) => ({
  label: group.group || `Group ${index + 1}`,
  value: String(index),
  ui: { trigger: answeredInGroup(group) === group.questions.length
    ? 'data-[state=inactive]:text-green-600 data-[state=active]:text-green-700'
    : 'data-[state=inactive]:text-orange-600 data-[state=active]:text-orange-700' },
})))
function slideMcTabs(direction: 'left' | 'right') {
  mcTabScroller.value?.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' })
}

function stamp(value: Clock): Clock { return { ...value, receivedAt: Date.now() } }

async function loadAttempt() {
  const loaded = await apiFetch(`/api/theorySessions/${sessionId}/attempt`) as Attempt
  const previous = attempt.value
  loaded.clock = stamp(loaded.clock)
  attempt.value = loaded
  if (!previous || previous.appRatingId !== loaded.appRatingId || loaded.clock.status === 'ENDED') {
    essayAnswers.value = { ...loaded.essayAnswers }
    multipleChoiceAnswers.value = { ...loaded.multipleChoiceAnswers }
  }
  if (!previous || previous.appRatingId !== loaded.appRatingId) {
    activeMcGroupIndex.value = '0'
    activeMcQuestionIndex.value = 0
  }
  if (Number(activeMcGroupIndex.value) >= (loaded.questions?.multipleChoice.length || 0)) activeMcGroupIndex.value = '0'
  if (activeMcQuestionIndex.value >= (loaded.questions?.multipleChoice.flatMap(group => group.questions).length || 0)) activeMcQuestionIndex.value = 0
  if (!loaded.questions?.essay?.length) activePart.value = 'MULTIPLE_CHOICE'
}

async function load() {
  if (!Number.isInteger(sessionId) || sessionId < 1) return
  try {
    const sessions = await apiFetch('/api/theorySessions/mine') as MySession[]
    mySession.value = sessions.find(item => item.session.id === sessionId) || null
    if (!mySession.value) throw new Error('You are not assigned to this session.')
    mySession.value.session = stamp(mySession.value.session)
    await loadAttempt()
  } catch (error) {
    if (String(error).includes('410') || String(error).includes('feedback window has closed')) {
      await leaveExpiredSession()
      return
    }
    toast.add({ title: 'Unable to load examination session', description: error instanceof Error ? error.message : 'Please try again.', color: 'error' })
  }
}

async function refreshClock() {
  if (!mySession.value) return
  try {
    const updated = stamp(await apiFetch(`/api/theorySessions/${sessionId}/clock`) as Clock)
    const previous = clock.value?.status
    mySession.value.session = updated
    if (attempt.value) attempt.value.clock = updated
    if (updated.status === 'ENDED' && feedbackRemainingMs.value <= 0) {
      await leaveExpiredSession()
    } else if (previous !== updated.status || updated.status === 'ENDED' && !attempt.value?.multipleChoiceResult) {
      await loadAttempt()
    }
  } catch { /* A transient network error must not reset the local display. */ }
}

async function chooseRating() {
  if (!chosenRating.value) return
  busy.value = true
  try {
    await apiFetch(`/api/theorySessions/${sessionId}/choose-rating`, { method: 'POST', body: { appRatingId: chosenRating.value } })
    await loadAttempt()
    toast.add({ title: 'Rating locked for this session', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Cannot select rating', description: error instanceof Error ? error.message : 'Please try again.', color: 'error' })
  } finally { busy.value = false }
}

function queueSave(kind: 'ESSAY' | 'MULTIPLE_CHOICE') {
  if (!canAnswer.value) return
  const task = async () => {
    const answers = { ...(kind === 'ESSAY' ? essayAnswers.value : multipleChoiceAnswers.value) }
    const call = () => apiFetch(`/api/theorySessions/${sessionId}/draft`, { method: 'PATCH', body: { kind, answers } }).then(() => undefined)
    if (kind === 'ESSAY') essaySave = essaySave.then(call, call)
    else mcSave = mcSave.then(call, call)
    try { await (kind === 'ESSAY' ? essaySave : mcSave) }
    catch (error) { toast.add({ title: 'Answer not saved', description: error instanceof Error ? error.message : 'Check connection and try again.', color: 'error' }) }
  }
  if (kind === 'ESSAY') {
    if (essayDebounce) clearTimeout(essayDebounce)
    essayDebounce = setTimeout(() => { void task() }, 700)
  } else {
    if (mcDebounce) clearTimeout(mcDebounce)
    mcDebounce = setTimeout(() => { void task() }, 250)
  }
}

async function submit(kind: 'ESSAY' | 'MULTIPLE_CHOICE') {
  if (!canAnswer.value || busy.value) return
  if (!window.confirm(`Submit ${kind === 'ESSAY' ? 'Essay' : 'Multiple Choice'}? You cannot edit this part after submission, but may continue the other part.`)) return
  busy.value = true
  try {
    if (kind === 'ESSAY' && essayDebounce) clearTimeout(essayDebounce)
    if (kind === 'MULTIPLE_CHOICE' && mcDebounce) clearTimeout(mcDebounce)
    await (kind === 'ESSAY' ? essaySave : mcSave)
    await apiFetch(`/api/theorySessions/${sessionId}/submit`, { method: 'POST', body: { kind, answers: kind === 'ESSAY' ? essayAnswers.value : multipleChoiceAnswers.value } })
    await loadAttempt()
    toast.add({ title: `${kind === 'ESSAY' ? 'Essay' : 'Multiple Choice'} submitted`, color: 'success' })
  } catch (error) {
    toast.add({ title: 'Submission failed', description: error instanceof Error ? error.message : 'Please try again.', color: 'error' })
  } finally { busy.value = false }
}

onMounted(() => {
  void load()
  polling = setInterval(() => { void refreshClock() }, 3000)
  ticker = setInterval(() => { tick.value++ }, 1000)
})
onBeforeUnmount(() => {
  if (polling) clearInterval(polling)
  if (ticker) clearInterval(ticker)
  if (essayDebounce) clearTimeout(essayDebounce)
  if (mcDebounce) clearTimeout(mcDebounce)
})
</script>

<template>
  <UDashboardPanel>
    <template #header><UDashboardNavbar title="Theory Examination"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar></template>
    <template #body>
      <div class="space-y-5 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-default p-4">
          <div><p class="font-semibold">{{ mySession?.session.name || 'Theory session' }}</p><p class="text-sm text-muted">{{ attempt?.rating || 'Choose a rating' }} · {{ clock?.status || 'Loading' }}</p></div>
          <p class="font-mono text-2xl tabular-nums" role="timer" aria-live="off">{{ timeLabel }}</p>
        </div>

        <UAlert v-if="clock?.status === 'WAITING'" title="Waiting for the examination lead" description="You may choose your rating now. Questions will appear when the lead starts the shared timer." color="info" />
        <UAlert v-else-if="clock?.status === 'PAUSED'" title="Session paused" description="Answers are locked until the examination lead resumes the shared timer." color="warning" />
        <UAlert v-else-if="clock?.status === 'ENDING'" title="Time is over" description="The server is finalizing all participants' answers." color="warning" />
        <UAlert v-else-if="inFeedbackWindow" title="Time is over" :description="`Only incorrect Multiple Choice answers are shown. Returning to examinations in ${feedbackSeconds} seconds.`" color="info" />

        <div v-if="inFeedbackWindow" class="space-y-4">
          <p v-if="!attempt?.multipleChoiceResult" class="text-sm text-muted">Preparing your answer feedback…</p>
          <template v-else>
            <p v-if="!attempt.multipleChoiceResult.wrongQuestions.length" class="text-sm text-muted">No incorrect Multiple Choice answers.</p>
            <div v-for="(item, index) in attempt.multipleChoiceResult.wrongQuestions" :key="item.id" class="space-y-2 rounded-lg border border-default p-4">
              <div class="flex gap-2 font-medium"><span>{{ index + 1 }}.</span><div class="rich-question" v-html="item.question" /></div>
              <img v-if="item.image" :src="item.image" alt="Question illustration" class="max-h-80 object-contain">
              <p class="text-sm text-error">Your answer: {{ item.selectedAnswer || 'Not answered' }}</p>
            </div>
          </template>
        </div>

        <div v-if="mySession && !attempt?.appRatingId && clock && ['WAITING', 'RUNNING', 'PAUSED'].includes(clock.status)" class="rounded-lg border border-default p-4 space-y-3">
          <p class="font-medium">Choose one rating for this session</p>
          <p class="text-sm text-muted">This choice is final. A different rating requires a different session.</p>
          <div class="flex flex-wrap gap-2"><UButton v-for="rating in mySession.eligibleRatings" :key="rating.id" :label="rating.rating" :variant="chosenRating === rating.id ? 'solid' : 'outline'" @click="chosenRating = rating.id" /></div>
          <p v-if="!mySession.eligibleRatings.length" class="text-sm text-muted">No eligible rating is available. Contact your checker admin.</p>
          <UButton label="Confirm Rating" :disabled="!chosenRating || busy" :loading="busy" @click="chooseRating" />
        </div>

        <template v-if="attempt?.questions && clock?.status !== 'WAITING' && clock?.status !== 'ENDING' && clock?.status !== 'ENDED' && remaining > 0">
          <UAlert v-if="attempt.essaySubmittedAt && attempt.multipleChoiceSubmittedAt" title="Both parts submitted" description="Your answers are locked. Incorrect Multiple Choice answers will appear briefly after the shared session ends." color="info" />
          <div class="flex flex-wrap gap-2">
            <UButton v-if="attempt.questions.essay.length" label="Essay" :variant="activePart === 'ESSAY' ? 'solid' : 'outline'" @click="activePart = 'ESSAY'" />
            <UButton v-if="attempt.questions.multipleChoice.length" label="Multiple Choice" :variant="activePart === 'MULTIPLE_CHOICE' ? 'solid' : 'outline'" @click="activePart = 'MULTIPLE_CHOICE'" />
          </div>
          <div v-if="activePart === 'ESSAY'" class="space-y-4">
            <div v-for="group in attempt.questions.essay" :key="group.group" class="space-y-3">
              <h2 class="font-semibold">{{ group.group }}</h2>
              <div v-for="(question, index) in group.questions" :key="question.id" class="rounded-lg border border-default p-4 space-y-3">
                <div class="flex gap-2 font-medium"><span>{{ index + 1 }}.</span><div class="rich-question" v-html="question.question" /></div>
                <img v-if="question.image" :src="question.image" alt="Question illustration" class="max-h-80 object-contain">
                <RichTextEditor
                  v-model="essayAnswers[String(question.id)]"
                  placeholder="Write your answer here..."
                  :disabled="!canAnswer || !!attempt.essaySubmittedAt"
                  @update:model-value="queueSave('ESSAY')"
                />
              </div>
            </div>
            <UButton v-if="!attempt.essaySubmittedAt && canAnswer" label="Submit Essay" :loading="busy" @click="submit('ESSAY')" />
            <UBadge v-else-if="attempt.essaySubmittedAt" label="Essay submitted" color="success" />
          </div>
          <div v-else class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex gap-2" role="group" aria-label="Multiple Choice view">
                <UButton label="Group Tabs" :variant="mcView === 'GROUP' ? 'solid' : 'outline'" @click="mcView = 'GROUP'" />
                <UButton label="One by One" :variant="mcView === 'SINGLE' ? 'solid' : 'outline'" @click="mcView = 'SINGLE'" />
              </div>
              <p class="text-sm text-muted">{{ mcQuestionItems.length - unansweredMcCount }}/{{ mcQuestionItems.length }} answered</p>
            </div>
            <template v-if="mcView === 'GROUP'">
            <div class="flex min-w-0 items-center gap-2">
              <UButton icon="i-lucide-chevron-left" color="neutral" variant="outline" size="sm" aria-label="Slide tabs left" class="shrink-0" @click="slideMcTabs('left')" />
              <div ref="mcTabScroller" class="min-w-0 flex-1 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]">
                <UTabs v-model="activeMcGroupIndex" :items="mcTabs" :content="false" size="lg" class="w-max min-w-full" :ui="{ list: 'flex w-max min-w-full flex-nowrap', trigger: 'shrink-0 whitespace-nowrap' }">
                  <template #trailing="{ item }">
                    <span class="ml-2 shrink-0 rounded-md px-2 py-1 text-sm font-semibold" :class="answeredInGroup(mcGroups[Number(item.value)]!) === mcGroups[Number(item.value)]!.questions.length ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'">
                      {{ answeredInGroup(mcGroups[Number(item.value)]!) }}/{{ mcGroups[Number(item.value)]!.questions.length }}
                    </span>
                  </template>
                </UTabs>
              </div>
              <UButton icon="i-lucide-chevron-right" color="neutral" variant="outline" size="sm" aria-label="Slide tabs right" class="shrink-0" @click="slideMcTabs('right')" />
            </div>
            <div v-if="activeMcGroup" :key="activeMcGroupIndex" class="space-y-3 rounded-lg border border-default p-4">
              <h2 class="font-semibold">{{ activeMcGroup.group || `Group ${Number(activeMcGroupIndex) + 1}` }}</h2>
              <div v-for="(question, index) in activeMcGroup.questions" :key="question.id" class="rounded-lg border border-default p-4 space-y-3">
                <div class="flex items-start justify-between gap-2"><div class="flex gap-2 font-medium"><span>{{ index + 1 }}.</span><div class="rich-question" v-html="question.question" /></div></div>
                <img v-if="question.image" :src="question.image" alt="Question illustration" class="max-h-80 object-contain">
                <div class="grid gap-2 sm:grid-cols-2"><label v-for="(sourceKey, slotIndex) in optionOrder(question)" :key="slotIndex" class="flex items-start gap-2 rounded border border-default p-2 text-sm"><input v-model="multipleChoiceAnswers[String(question.id)]" type="radio" :name="`question-${question.id}`" :value="sourceKey" :disabled="!canAnswer || !!attempt.multipleChoiceSubmittedAt" @change="queueSave('MULTIPLE_CHOICE')"><span>{{ optionSlots[slotIndex] }}. {{ optionText(question, sourceKey) }}</span></label></div>
              </div>
            </div>
            </template>
            <div v-else class="space-y-4">
              <div class="rounded-lg border border-default p-4">
                <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p class="font-medium">Question navigator · {{ unansweredMcCount }} unanswered</p>
                  <UButton label="Next Unanswered" variant="outline" size="sm" :disabled="unansweredMcCount === 0" @click="nextUnansweredMcQuestion" />
                </div>
                <div class="flex max-h-44 flex-wrap gap-2 overflow-y-auto p-1">
                  <button
                    v-for="(item, index) in mcQuestionItems"
                    :key="item.question.id"
                    type="button"
                    class="h-9 min-w-9 rounded border px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    :class="[isMcAnswered(item.question.id) ? 'border-green-400 bg-green-50 text-green-800' : 'border-orange-400 bg-orange-50 text-orange-800', index === activeMcQuestionIndex ? 'ring-2 ring-primary ring-offset-2' : '']"
                    :aria-label="`Question ${item.number}, ${isMcAnswered(item.question.id) ? 'answered' : 'unanswered'}`"
                    :aria-current="index === activeMcQuestionIndex ? 'step' : undefined"
                    :title="`${item.groupName} · ${isMcAnswered(item.question.id) ? 'Answered' : 'Unanswered'}`"
                    @click="activeMcQuestionIndex = index"
                  >{{ item.number }}</button>
                </div>
                <p class="mt-2 text-xs text-muted">Green: answered · Orange: unanswered · Ring: current question</p>
              </div>
              <div v-if="activeMcQuestion" :key="activeMcQuestion.question.id" class="space-y-3 rounded-lg border border-default p-4">
                <p class="text-sm text-muted">{{ activeMcQuestion.groupName }} · Question {{ activeMcQuestion.number }} of {{ mcQuestionItems.length }}</p>
                <div class="flex items-start justify-between gap-2"><div class="rich-question font-medium" v-html="activeMcQuestion.question.question" /></div>
                <img v-if="activeMcQuestion.question.image" :src="activeMcQuestion.question.image" alt="Question illustration" class="max-h-80 object-contain">
                <div class="grid gap-2 sm:grid-cols-2"><label v-for="(sourceKey, slotIndex) in optionOrder(activeMcQuestion.question)" :key="slotIndex" class="flex items-start gap-2 rounded border border-default p-2 text-sm"><input v-model="multipleChoiceAnswers[String(activeMcQuestion.question.id)]" type="radio" :name="`question-${activeMcQuestion.question.id}`" :value="sourceKey" :disabled="!canAnswer || !!attempt.multipleChoiceSubmittedAt" @change="queueSave('MULTIPLE_CHOICE')"><span>{{ optionSlots[slotIndex] }}. {{ optionText(activeMcQuestion.question, sourceKey) }}</span></label></div>
              </div>
              <div class="flex justify-between gap-2">
                <UButton label="Previous" icon="i-lucide-chevron-left" variant="outline" :disabled="activeMcQuestionIndex === 0" @click="activeMcQuestionIndex--" />
                <UButton label="Next" trailing-icon="i-lucide-chevron-right" variant="outline" :disabled="activeMcQuestionIndex >= mcQuestionItems.length - 1" @click="activeMcQuestionIndex++" />
              </div>
            </div>
            <UButton v-if="!attempt.multipleChoiceSubmittedAt && canAnswer" label="Submit Multiple Choice" :loading="busy" @click="submit('MULTIPLE_CHOICE')" />
            <UBadge v-else-if="attempt.multipleChoiceSubmittedAt" label="Multiple Choice submitted" color="success" />
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
.rich-question :deep(p) { margin: 0 0 0.5rem; }
.rich-question :deep(p:last-child) { margin-bottom: 0; }
.rich-question :deep(ul) { list-style: disc; padding-left: 1.5rem; }
.rich-question :deep(ol) { list-style: decimal; padding-left: 1.5rem; }
.rich-question :deep(blockquote) { border-left: 3px solid currentColor; padding-left: 0.75rem; font-style: italic; }
.rich-question :deep(h1) { font-size: 1.25rem; font-weight: 700; }
.rich-question :deep(h2) { font-size: 1.1rem; font-weight: 700; }
</style>
