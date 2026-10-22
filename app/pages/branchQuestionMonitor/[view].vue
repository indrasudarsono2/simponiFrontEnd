<script setup lang="ts">
import { csrfFetch } from "~/utils/csrfFetch";

import { CalendarDate, DateFormatter, parseDate } from '@internationalized/date';
const route = useRoute();
const api = useApiBaseUrl();
const { token } = useAuth();
const headers = computed(() => ({ Authorization: `Bearer ${token.value}` }));
const page = computed(() => String(route.params.view));
const title = computed(() => page.value === 'questions' ? 'Question Monitor' : page.value === 'essay' ? 'Statistic Essay' : 'Statistic Multiple Choice');
const { data: options } = await useFetch<any>(`${api}/api/branchQuestionMonitor/options`, { headers });
const branchId = ref(''), branchUnitId = ref(''), sectorId = ref(''), ratingId = ref('');
const type = ref('ESSAY'), attempt = ref('ALL');
const startDate = ref(`${new Date().getUTCFullYear()}-01-01`), endDate = ref(new Date().toISOString().slice(0,10));
const dateFormatter = new DateFormatter('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const dateRangeLabel = computed(() => {
  if (!startDate.value) return 'Pick a date range';
  const start = dateFormatter.format(parseDate(startDate.value).toDate('UTC'));
  return endDate.value ? `${start} - ${dateFormatter.format(parseDate(endDate.value).toDate('UTC'))}` : start;
});
const dateRange = computed({
  get: () => ({ start: startDate.value ? parseDate(startDate.value) : undefined, end: endDate.value ? parseDate(endDate.value) : undefined }),
  set: (value: { start?: CalendarDate; end?: CalendarDate }) => {
    startDate.value = value.start?.toString() || '';
    endDate.value = value.end?.toString() || '';
  },
});
const result = ref<any>(null), busy = ref(false), error = ref('');
const correctSort = ref<'asc' | 'desc' | null>(null);
const sortedQuestions = computed(() => {
  const questions = [...(result.value?.questions || [])];
  if (page.value !== 'multipleChoice' || !correctSort.value) return questions;
  const direction = correctSort.value === 'asc' ? 1 : -1;
  return questions.sort((a, b) => {
    if (a.percentageTrue == null) return b.percentageTrue == null ? a.id - b.id : 1;
    if (b.percentageTrue == null) return -1;
    return (Number(a.percentageTrue) - Number(b.percentageTrue)) * direction || a.id - b.id;
  });
});
function toggleCorrectSort() { correctSort.value = correctSort.value === 'desc' ? 'asc' : 'desc'; }
const detailOpen = ref(false), detail = ref<any[]>([]), detailBusy = ref(false);
const questionDetailOpen = ref(false), questionDetail = ref<any>(null), questionDetailBusy = ref(false), questionDetailError = ref('');
async function viewQuestion(id: number) {
  questionDetailOpen.value = true; questionDetailBusy.value = true; questionDetail.value = null; questionDetailError.value = '';
  try { questionDetail.value = await csrfFetch(`${api}/api/branchQuestionMonitor/load`, { method: 'POST', headers: headers.value, body: { ...payload(), view: 'QUESTION_DETAIL', questionId: id } }); }
  catch (e: any) { questionDetailError.value = e?.data?.message || 'Unable to load question details.'; }
  finally { questionDetailBusy.value = false; }
}
const answerColors = ['#3b82f6', '#4caf50', '#f0a432', '#df3439'];
const answerSlices = computed(() => {
  let cumulative = 0;
  const values = ['A','B','C','D'].map((label,index) => {
    const count = questionDetail.value?.answerSummary?.[label] || 0;
    const percentage = questionDetail.value?.total ? count / questionDetail.value.total * 100 : 0;
    const start = cumulative; cumulative += percentage;
    return { label, count, percentage, color: answerColors[index], start, end: cumulative };
  });
  return values;
});
const pieBackground = computed(() => `conic-gradient(${answerSlices.value.map(slice => `${slice.color} ${slice.start}% ${slice.end}%`).join(',')})`);
const units = computed(() => (options.value?.units || []).filter((item:any) => item.branchId === Number(branchId.value)));
const sectors = computed(() => (options.value?.sectors || []).filter((item:any) => item.branchUnitId === Number(branchUnitId.value)));
const ratings = computed(() => (options.value?.assignments || []).filter((item:any) => item.sectorId === Number(sectorId.value)).map((item:any) => item.rating));
const branchOptions = computed(() => (options.value?.branches || []).map((item:any) => ({ label: item.branch || `Branch ${item.id}`, value: String(item.id) })));
const unitOptions = computed(() => units.value.map((item:any) => ({ label: item.unit || `Unit ${item.id}`, value: String(item.id) })));
const sectorOptions = computed(() => sectors.value.map((item:any) => ({ label: item.sector || `Sector ${item.id}`, value: String(item.id) })));
const ratingOptions = computed(() => ratings.value.map((item:any) => ({ label: item.rating || `Rating ${item.id}`, value: String(item.id) })));
watch(branchId, () => { branchUnitId.value = ''; });
watch(branchUnitId, () => { sectorId.value = ''; });
watch(sectorId, () => { ratingId.value = ''; });
watch([branchId, branchUnitId, sectorId, ratingId, type, attempt, startDate, endDate, page], () => { result.value = null; detailOpen.value = false; });
const payload = () => ({ branchId: branchId.value, branchUnitId: branchUnitId.value, sectorId: sectorId.value, ratingId: ratingId.value, type: page.value === 'questions' ? type.value : page.value === 'essay' ? 'ESSAY' : 'MULTIPLE_CHOICE', attempt: attempt.value, startDate: startDate.value, endDate: endDate.value });
async function load() {
  busy.value = true; error.value = ''; result.value = null;
  try { result.value = await csrfFetch(`${api}/api/branchQuestionMonitor/load`, { method: 'POST', headers: headers.value, body: { ...payload(), view: page.value === 'questions' ? 'MONITOR' : 'STATISTIC' } }); }
  catch (e:any) { error.value = e?.data?.message || 'Unable to load data.'; }
  finally { busy.value = false; }
}
async function viewGroup(id:number) {
  detailOpen.value = true; detailBusy.value = true; detail.value = [];
  try { const response:any = await csrfFetch(`${api}/api/branchQuestionMonitor/load`, { method: 'POST', headers: headers.value, body: { ...payload(), view: 'DETAIL', groupId: id } }); detail.value = response.questions; }
  catch (e:any) { error.value = e?.data?.message || 'Unable to load questions.'; }
  finally { detailBusy.value = false; }
}
const plain = (value:unknown) => String(value || '').replace(/<[^>]*>/g, ' ');
const number = (value:any) => value == null ? '—' : Number(value).toFixed(2);
</script>

<template>
  <UDashboardPanel>
    <template #header><UDashboardNavbar :title="title"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar></template>
    <template #body>
      <div class="w-full min-w-0 space-y-4 shrink-0">
      <UCard class="relative shrink-0">
        <div class="grid gap-3 md:grid-cols-4 md:items-end">
          <UFormField label="Branch" required><USelect v-model="branchId" :items="branchOptions" value-key="value" placeholder="Select branch" class="w-full" /></UFormField>
          <UFormField label="Branch Unit" required><USelect v-model="branchUnitId" :items="unitOptions" value-key="value" placeholder="Select branch unit" :disabled="!branchId" class="w-full" /></UFormField>
          <UFormField label="Sector" required><USelect v-model="sectorId" :items="sectorOptions" value-key="value" placeholder="Select sector" :disabled="!branchUnitId" class="w-full" /></UFormField>
          <UFormField label="Rating" required><USelect v-model="ratingId" :items="ratingOptions" value-key="value" placeholder="Select rating" :disabled="!sectorId" class="w-full" /></UFormField>
          <UFormField v-if="page === 'questions'" label="Question type" required><USelect v-model="type" :items="[{ label: 'Essay', value: 'ESSAY' }, { label: 'Multiple Choice', value: 'MULTIPLE_CHOICE' }]" value-key="value" class="w-full" /></UFormField>
          <template v-else>
            <UFormField label="Submission Date Range (UTC)" class="sm:col-span-2">
              <UPopover :content="{ align: 'start' }" :modal="true">
                <UButton color="neutral" variant="outline" icon="i-lucide-calendar" class="w-full justify-between">
                  <span class="truncate">{{ dateRangeLabel }}</span>
                  <template #trailing><UIcon name="i-lucide-chevron-down" class="size-5 shrink-0 text-dimmed" /></template>
                </UButton>
                <template #content><UCalendar v-model="dateRange" class="p-2" :number-of-months="2" range /></template>
              </UPopover>
            </UFormField>
            <UFormField label="Attempts"><USelect v-model="attempt" :items="[{ label: 'All valid attempts', value: 'ALL' }, { label: 'First attempts', value: 'FIRST' }, { label: 'Rechecks', value: 'RECHECK' }, { label: 'Latest valid attempts', value: 'LATEST' }]" value-key="value" class="w-full" /></UFormField>
          </template>
        </div>
        <UButton class="mt-4" label="Load Data" :loading="busy" :disabled="!ratingId || (page !== 'questions' && (!startDate || !endDate))" @click="load" />
        <p v-if="error" class="mt-3 text-error">{{ error }}</p>
      </UCard>
      <UCard v-if="result" class="min-w-0 shrink-0">
        <template v-if="page === 'questions'">
          <p>Active questions: {{ result.total }} · Unassigned: {{ result.unassigned }} · Groups: {{ result.groups.length }}</p>
          <p class="text-sm text-muted mb-4">{{ result.scopeNote }}</p>
          <table class="w-full text-left"><thead><tr><th>Group</th><th>Required</th><th>Available</th><th>Coverage</th><th>Details</th></tr></thead><tbody><tr v-for="group in result.groups" :key="group.id" class="border-t"><td class="p-2">{{ group.group }}</td><td>{{ group.required }}</td><td>{{ group.available }}</td><td :class="group.available < group.required ? 'text-error' : 'text-success'">{{ group.available < group.required ? `Shortage: ${group.required-group.available}` : 'Ready' }}</td><td><UButton label="View Questions" variant="outline" size="sm" @click="viewGroup(group.id)" /></td></tr></tbody></table>
        </template>
        <template v-else>
          <p class="mb-3">{{ result.attempts }} submitted attempts · {{ result.questions.length }} questions. Invalidated attempts and unscored essays are excluded.</p>
          <div class="overflow-x-auto"><table class="w-full text-left"><thead><tr><th>Question / Version</th><th>Answers</th><template v-if="page === 'essay'"><th>Average score</th><th>Average %</th></template><template v-else><th>Correct</th><th>Incorrect</th><th :aria-sort="correctSort === 'desc' ? 'descending' : correctSort === 'asc' ? 'ascending' : 'none'"><button type="button" class="inline-flex items-center gap-1 cursor-pointer hover:text-primary" @click="toggleCorrectSort">Correct % <span aria-hidden="true">{{ correctSort === 'desc' ? '↓' : correctSort === 'asc' ? '↑' : '↕' }}</span></button></th><th>Answer distribution</th></template></tr></thead><tbody><tr v-for="item in sortedQuestions" :key="item.id" class="border-t"><td class="p-3 max-w-xl">{{ plain(item.question) }} <span class="text-muted">(v{{ item.version }})</span><UButton class="ml-2" label="Details" icon="i-lucide-eye" variant="outline" size="sm" @click="viewQuestion(item.id)" /></td><td>{{ item.total }}</td><template v-if="page === 'essay'"><td>{{ number(item.averageScore) }}</td><td>{{ number(item.averagePercentage) }}%</td></template><template v-else><td>{{ item.correct }}</td><td>{{ item.incorrect }}</td><td><div class="min-w-24">{{ number(item.percentageTrue) }}%<div class="h-2 rounded bg-gray-200"><div class="h-2 rounded bg-green-600" :style="{ width: `${item.percentageTrue}%` }" /></div></div></td><td>A: {{ item.answerSummary.A }} · B: {{ item.answerSummary.B }} · C: {{ item.answerSummary.C }} · D: {{ item.answerSummary.D }}</td></template></tr></tbody></table></div>
        </template>
        <p v-if="!(result.groups?.length || result.questions?.length)" class="py-4 text-muted">No data for the selected filters.</p>
      </UCard>
      </div>
      <UModal v-model:open="questionDetailOpen" :title="page === 'essay' ? 'Essay Question Detail' : 'Multiple Choice Question Detail'" :ui="{ content: 'sm:max-w-3xl' }">
        <template #body>
          <p v-if="questionDetailBusy">Loading question details…</p>
          <p v-if="questionDetailError" class="text-error">{{ questionDetailError }}</p>
          <div v-if="questionDetail" class="space-y-4">
            <div class="border border-default rounded p-3">{{ plain(questionDetail.question) }} <span class="text-muted">(Version {{ questionDetail.version }})</span></div>
            <template v-if="page === 'essay'">
              <div class="rounded border border-green-500 bg-green-50 p-3 text-green-900 dark:bg-green-950 dark:text-green-100">
                <h3 class="font-semibold mb-2">Correct / Model Answer</h3>
                <p class="whitespace-pre-wrap">{{ plain(questionDetail.modelAnswer) || 'No model answer has been recorded for this question.' }}</p>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div v-for="stat in [{ label: 'Scored answers', value: questionDetail.total }, { label: 'Maximum marks', value: number(questionDetail.maximumMarks) }, { label: 'Average score', value: number(questionDetail.averageScore) }, { label: 'Average percentage', value: number(questionDetail.averagePercentage) + '%' }, { label: 'Lowest score', value: number(questionDetail.minimumScore) }, { label: 'Highest score', value: number(questionDetail.maximumScore) }]" :key="stat.label" class="border border-default rounded p-3 text-center"><p class="text-sm text-muted">{{ stat.label }}</p><p class="font-semibold">{{ stat.value }}</p></div>
              </div>
              <h3 class="font-semibold">Scoring by checker</h3>
              <table class="w-full text-left"><thead><tr><th>Checker</th><th>Scored answers</th><th>Average score</th></tr></thead><tbody><tr v-for="(checker, index) in questionDetail.checkers" :key="index" class="border-t"><td class="py-2">{{ checker.name }}</td><td>{{ checker.count }}</td><td>{{ number(checker.averageScore) }}</td></tr></tbody></table>
              <p class="text-xs text-muted">Uses the selected dates and attempt filter. Unscored and invalidated answers are excluded. Model answer visibility is restricted to General Admin.</p>
            </template>
            <template v-else>
            <div class="border border-default rounded p-3 space-y-2"><p v-for="option in ['a','b','c','d']" :key="option"><span class="font-semibold">{{ option.toUpperCase() }}.</span> {{ plain(questionDetail[option]) || '—' }}</p></div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div v-for="stat in [{ label: 'Correct', value: questionDetail.correct }, { label: 'Incorrect', value: questionDetail.incorrect }, { label: 'Total', value: questionDetail.total }, { label: 'Correct percentage', value: `${number(questionDetail.percentageTrue)}%` }]" :key="stat.label" class="rounded border border-default p-2 text-center"><p class="text-sm text-muted">{{ stat.label }}</p><p class="font-semibold">{{ stat.value }}</p></div>
            </div>
            <div class="border border-default rounded p-3"><h3 class="font-semibold mb-3">Answer Summary</h3><div class="flex flex-col sm:flex-row items-center gap-5"><div class="size-28 shrink-0 rounded-full" :style="{ background: pieBackground }" role="img" aria-label="Distribution of selected answers A to D" /><div class="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 w-full"><div v-for="slice in answerSlices" :key="slice.label" class="border rounded p-2 flex justify-between gap-3 text-sm" :class="slice.label === questionDetail.correctAnswer ? 'border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200' : 'border-default'"><span class="flex items-center gap-2"><span class="size-2 rounded-full" :style="{ background: slice.color }" />{{ slice.label }}<span v-if="slice.label === questionDetail.correctAnswer" class="font-semibold"> · Correct answer</span></span><span>{{ slice.count }} ({{ number(slice.percentage) }}%)</span></div></div></div></div>
            <p class="text-xs text-muted">Based on the selected submission dates and attempt filter. The green box identifies the correct answer (General Admin only).</p>
            </template>
          </div>
        </template>
      </UModal>
      <UModal v-model:open="detailOpen" title="Questions — read only" :ui="{ content: 'sm:max-w-4xl' }"><template #body><p v-if="detailBusy">Loading…</p><p class="text-sm text-muted">Showing up to 200 questions. Answer keys are never included.</p><article v-for="question in detail" :key="question.id" class="border-b py-4"><p>{{ plain(question.question) }}</p><p v-for="option in ['a','b','c','d']" :key="option">{{ question[option] ? `${option.toUpperCase()}. ${plain(question[option])}` : '' }}</p></article></template></UModal>
    </template>
  </UDashboardPanel>
</template>
