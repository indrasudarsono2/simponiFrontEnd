<script setup lang="ts">
import { csrfFetch } from "~/utils/csrfFetch";

interface Setting { kindOfQuestionId: number; quantity: number | null; persentage: number | null; minutes: number | null }
interface Group { id: number; group: string | null; quantity: number | null; kindOfQuestionId: number }
interface Rating { id: number; rating: { rating: string }; questionGroups: Group[] }
interface Configuration {
  event: string; theoryMode: string; difficulty: string; eventQuestions: Setting[];
  sector: { sector: string; subBranchUnitRatings: Rating[] } | null;
  mats: { mode: string; quantity: number } | null;
  captureIssues?: string[];
}
interface Version { id: number; version: number; source: string; actorName: string | null; actorNik: string | null; reason: string; createdAt: string; lockedAt: string | null; snapshot: Configuration }
interface ConfigurationResponse { versions: Version[]; live: Configuration | null; editable: boolean }
const props = defineProps<{ eventId: number | null }>();
const emit = defineEmits<{ close: [] }>();
const apiBaseUrl = useApiBaseUrl();
const { token } = useAuth();
const open = ref(false);
const loading = ref(false);
const error = ref('');
const response = ref<ConfigurationResponse | null>(null);
const selectedVersion = ref<number | null>(null);
const history = ref(false);
const reason = ref('');
const saving = ref(false);
const toast = useToast();
const versionRecord = computed(() => response.value?.versions.find(v => v.id === selectedVersion.value));
const data = computed(() => versionRecord.value?.snapshot || response.value?.live || null);
const selectedRating = ref(0);
let requestVersion = 0;
const ratings = computed(() => data.value?.sector?.subBranchUnitRatings || []);
const activeRating = computed(() => ratings.value.find(r => r.id === selectedRating.value));
const setting = (kind: number) => data.value?.eventQuestions.find(s => s.kindOfQuestionId === kind);
const groups = (kind: number) => activeRating.value?.questionGroups.filter(g => g.kindOfQuestionId === kind) || [];
const total = (kind: number) => groups(kind).reduce((sum, g) => sum + Number(g.quantity || 0), 0);
const extraMats = computed(() => data.value?.mats?.mode !== 'CATEGORY_PORTION' ? Number(data.value?.mats?.quantity || 0) : 0);
watch(() => props.eventId, async id => {
  const version = ++requestVersion;
  if (!id) { open.value = false; return; }
  open.value = true;
  loading.value = true;
    response.value = null;
  error.value = '';
  try {
    const result = await csrfFetch<ConfigurationResponse>(`${apiBaseUrl}/api/events/${id}/question-configuration`, { headers: { Authorization: `Bearer ${token.value}` } });
    if (version !== requestVersion) return;
    response.value = result;
    selectedVersion.value = result.versions[0]?.id || null;
    selectedRating.value = data.value?.sector?.subBranchUnitRatings[0]?.id || 0;
    history.value = false;
    reason.value = '';
  } catch (e: any) {
    if (version === requestVersion) error.value = e?.data?.message || 'Unable to load examination configuration.';
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}, { immediate: true });
watch(open, value => { if (!value) { requestVersion++; emit('close'); } });
watch(selectedVersion, () => { selectedRating.value = data.value?.sector?.subBranchUnitRatings[0]?.id || 0; });
const utc = (value: string) => new Date(value).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
async function finalize() {
  if (!props.eventId || saving.value) return;
  const eventId = props.eventId;
  saving.value = true;
  try {
    await csrfFetch(`${apiBaseUrl}/api/events/${eventId}/question-configuration/finalize`, { method: 'POST', headers: { Authorization: `Bearer ${token.value}` }, body: { reason: reason.value } });
    if (props.eventId !== eventId) return;
    response.value = await csrfFetch<ConfigurationResponse>(`${apiBaseUrl}/api/events/${eventId}/question-configuration`, { headers: { Authorization: `Bearer ${token.value}` } });
    selectedVersion.value = response.value.versions[0]?.id || null;
    reason.value = '';
    toast.add({ title: 'Configuration finalized', description: 'A new audit version has been saved.', color: 'success' });
  } catch (e: any) {
    toast.add({ title: 'Unable to finalize configuration', description: e?.data?.message || 'Please try again.', color: 'error' });
  } finally { saving.value = false; }
}
</script>

<template>
  <UModal v-model:open="open" title="Examination Configuration" :ui="{ content: 'sm:max-w-5xl' }">
    <template #body>
      <p v-if="loading" class="py-8 text-center text-muted">Loading configuration…</p>
      <UAlert v-else-if="error" color="error" :description="error" />
      <div v-else-if="data" class="space-y-5">
        <div class="flex flex-wrap gap-2">
          <UButton :variant="history ? 'outline' : 'solid'" @click="history = false">Configuration</UButton>
          <UButton :variant="history ? 'solid' : 'outline'" @click="history = true">Configuration History ({{ response?.versions.length || 0 }})</UButton>
        </div>
        <div v-if="history" class="space-y-3">
          <p v-if="!response?.versions.length" class="text-muted">No saved configuration yet.</p>
          <div v-for="version in response?.versions" :key="version.id" class="rounded-lg border border-default p-3 space-y-1">
            <div class="flex justify-between gap-2"><strong>Version {{ version.version }}</strong><UButton size="sm" variant="outline" @click="selectedVersion = version.id; history = false">View configuration</UButton></div>
            <p class="text-sm">{{ version.source === 'BACKFILL_CURRENT' ? 'Captured from current settings — original historical configuration is unknown' : version.source === 'AUTO_FINALIZED' ? 'Automatically finalized before examination' : 'Manually finalized configuration' }}</p>
            <p class="text-sm text-muted">{{ utc(version.createdAt) }} · {{ version.actorName || version.actorNik || 'System backfill' }}</p>
            <p class="text-sm">{{ version.reason }}</p>
            <p v-if="version.lockedAt" class="text-sm text-muted">Locked: {{ utc(version.lockedAt) }}</p>
          </div>
        </div>
        <template v-else>
        <div class="flex flex-wrap gap-2">
          <UButton v-for="version in response?.versions" :key="version.id" size="sm" :variant="selectedVersion === version.id ? 'solid' : 'outline'" @click="selectedVersion = version.id">Version {{ version.version }}</UButton>
          <UButton v-if="response?.live && response.editable" size="sm" :variant="selectedVersion === null ? 'solid' : 'outline'" @click="selectedVersion = null">Current settings / new version</UButton>
        </div>
        <UAlert v-if="versionRecord?.source === 'BACKFILL_CURRENT'" color="warning" description="Captured from current settings. This is not proof of the original configuration used by earlier examinations." />
        <UAlert v-if="!selectedVersion" color="info" description="Preview of current settings. You can finalize now, or the system will automatically finalize valid settings at first examination access." />
        <UAlert v-if="versionRecord?.source === 'AUTO_FINALIZED'" color="info" description="Automatically finalized before examination." />
        <p v-if="versionRecord" class="text-sm text-muted">Version {{ versionRecord.version }} · {{ utc(versionRecord.createdAt) }} · {{ versionRecord.actorName || 'System backfill' }}{{ versionRecord.lockedAt ? ' · Locked' : '' }}</p>
        <UAlert v-if="data.captureIssues?.length" color="warning" :description="data.captureIssues.join(' ')" />
        <div>
          <h3 class="font-semibold">{{ data.event }}</h3>
          <p class="text-sm text-muted">{{ data.sector?.sector }} · {{ data.theoryMode === 'MODE_2' ? 'Mode 2' : 'Mode 1' }} · {{ data.difficulty }}</p>
        </div>
        <p class="text-sm text-muted">Question counts, weights, and time below apply to all ratings in this event.</p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr class="border-b border-default text-left"><th class="p-2">Examination</th><th class="p-2">Configured questions</th><th class="p-2">Weight</th><th class="p-2">Duration</th></tr></thead>
            <tbody>
              <tr v-for="part in [{ id: 1, name: 'Essay' }, { id: 2, name: 'Multiple Choice' }]" :key="part.id" class="border-b border-default">
                <td class="p-2">{{ part.name }}</td><td class="p-2">{{ setting(part.id)?.quantity ?? 'Not configured' }}</td>
                <td class="p-2">{{ setting(part.id) ? `${Number((Number(setting(part.id)?.persentage || 0) * 100).toFixed(2))}%` : 'Not configured' }}</td>
                <td class="p-2">{{ data.theoryMode === 'MODE_2' ? 'Shared session countdown' : setting(part.id)?.minutes != null ? `${setting(part.id)?.minutes} minutes` : 'Not configured' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <UAlert v-if="Math.abs(data.eventQuestions.reduce((sum, s) => sum + Number(s.persentage || 0), 0) - 1) > 0.000001" color="warning" description="Essay and Multiple Choice weights must total 100%." />
        <div class="flex flex-wrap gap-2">
          <UButton v-for="rating in ratings" :key="rating.id" :variant="selectedRating === rating.id ? 'solid' : 'outline'" @click="selectedRating = rating.id">{{ rating.rating?.rating || 'Unknown rating' }}</UButton>
        </div>
        <p v-if="!ratings.length" class="text-muted">No ratings configured in this sector.</p>
        <div v-else class="grid gap-4 md:grid-cols-2">
          <section v-for="part in [{ id: 1, name: 'Essay Composition' }, { id: 2, name: 'Multiple-choice Composition' }]" :key="part.id" class="rounded-lg border border-default p-4">
            <h4 class="mb-3 font-semibold">{{ part.name }}</h4>
            <table class="w-full text-sm">
              <thead><tr class="border-b border-default text-left"><th class="py-2">Question group</th><th class="py-2 text-right">Questions</th></tr></thead>
              <tbody>
                <tr v-for="group in groups(part.id)" :key="group.id" class="border-b border-default"><td class="py-2 pr-3">{{ group.group }}</td><td class="py-2 text-right">{{ group.quantity ?? 0 }}</td></tr>
                <tr v-if="part.id === 2 && extraMats" class="border-b border-default"><td class="py-2">MATS (additional)</td><td class="py-2 text-right">{{ extraMats }}</td></tr>
              </tbody>
              <tfoot><tr class="font-semibold"><td class="py-2">Total selected questions</td><td class="py-2 text-right">{{ total(part.id) + (part.id === 2 ? extraMats : 0) }}</td></tr></tfoot>
            </table>
            <p v-if="!groups(part.id).length" class="mt-2 text-sm text-warning">No question groups configured for this rating.</p>
            <p v-if="part.id === 2 && data.mats?.mode === 'CATEGORY_PORTION'" class="mt-2 text-sm text-muted">MATS questions are included within the group quantities.</p>
          </section>
        </div>
        <div v-if="response?.editable && selectedVersion === null" class="space-y-3 border-t border-default pt-4">
          <UFormField :label="response.versions.length ? 'Reason for new version (required)' : 'Finalization note'">
            <UTextarea v-model="reason" class="w-full" placeholder="Explain why the configuration is being finalized or changed" />
          </UFormField>
          <UButton :loading="saving" :disabled="!!response.versions.length && !reason.trim()" @click="finalize">Finalize Configuration</UButton>
          <p class="text-sm text-muted">Saved settings will be used for examinations. If finalization is forgotten, valid settings are automatically saved at first examination access. Incomplete settings will block examination.</p>
        </div>
        <p v-else-if="!response?.editable" class="text-sm text-muted">Configuration is locked because an examination has started.</p>
        </template>
      </div>
    </template>
  </UModal>
</template>
