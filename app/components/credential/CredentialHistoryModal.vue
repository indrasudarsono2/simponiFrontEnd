<script setup lang="ts">
const props = defineProps<{
  open: boolean;
  credentialType: "ielp" | "medex";
  credentialId: number | null;
}>();
const emit = defineEmits<{ (event: "update:open", value: boolean): void }>();
const { apiFetch } = useApiFetch();
const apiBaseUrl = useApiBaseUrl();
const loading = ref(false);
const errorMessage = ref("");
const payload = ref<any>(null);

const title = computed(() => `${props.credentialType.toUpperCase()} History`);

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function eventLabel(value?: string) {
  return String(value || "").replaceAll("_", " ");
}

function displayValue(value: unknown) {
  if (value == null || value === "") return "-";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDate(value);
  return String(value);
}

function resolveFileUrl(path?: string | null) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiBaseUrl}${path}`;
}

async function loadHistory() {
  if (!props.open || !props.credentialId) return;
  loading.value = true;
  errorMessage.value = "";
  payload.value = null;
  try {
    payload.value = await apiFetch(`/api/credentialHistory/${props.credentialType}/${props.credentialId}`);
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.message || "Unable to load credential history.";
  } finally {
    loading.value = false;
  }
}

watch(() => [props.open, props.credentialId], loadHistory, { immediate: true });
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :description="payload?.owner ? `${payload.owner.name || '-'} (${payload.owner.nik || '-'})` : 'Complete submission, verification, and revision history'"
    :ui="{ content: 'max-w-5xl w-full' }"
    @update:open="(value) => emit('update:open', value)"
  >
    <template #body>
      <div v-if="loading" class="flex items-center justify-center gap-2 py-12 text-muted">
        <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" /> Loading history...
      </div>
      <div v-else-if="errorMessage" class="rounded-lg border border-error/30 bg-error/5 p-4 text-error">
        {{ errorMessage }}
      </div>
      <div v-else-if="payload" class="max-h-[72vh] space-y-6 overflow-y-auto pr-1">
        <section>
          <h3 class="mb-3 font-semibold">Versions</h3>
          <div class="grid gap-3 md:grid-cols-2">
            <UCard v-for="revision in payload.revisions" :key="revision.id">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-medium">Version {{ revision.version }}</p>
                  <p class="text-xs text-muted">Submitted {{ formatDate(revision.userConfirmedAt || revision.createdAt) }}</p>
                </div>
                <div class="flex flex-wrap justify-end gap-1">
                  <UBadge v-if="revision.isCurrent" color="success" variant="soft">Current</UBadge>
                  <UBadge :color="revision.verificationStatus === 'APPROVED' ? 'success' : revision.verificationStatus === 'REJECTED' ? 'error' : 'warning'" variant="soft">
                    {{ revision.verificationStatus }}
                  </UBadge>
                </div>
              </div>
              <dl class="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><dt class="text-muted">Checker</dt><dd>{{ revision.verifiedBy?.name || revision.requestedChecker?.name || '-' }}</dd></div>
                <div><dt class="text-muted">Verified</dt><dd>{{ formatDate(revision.verifiedAt) }}</dd></div>
                <div class="col-span-2"><dt class="text-muted">Note</dt><dd>{{ revision.verificationNote || '-' }}</dd></div>
                <div class="col-span-2"><dt class="text-muted">Application Documents</dt><dd>{{ revision.applicationDocs?.map((doc: any) => doc.number).filter(Boolean).join(', ') || 'None' }}</dd></div>
              </dl>
              <a v-if="revision.file" :href="resolveFileUrl(revision.file)" target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex text-xs font-medium text-primary hover:underline">Open version file</a>
            </UCard>
          </div>
        </section>

        <section>
          <h3 class="mb-3 font-semibold">Activity Timeline</h3>
          <div class="space-y-3 border-l-2 border-default pl-4">
            <div v-for="event in payload.history" :key="event.id" class="relative rounded-lg border border-default p-3">
              <span class="absolute -left-[21px] top-4 size-3 rounded-full bg-primary ring-4 ring-default" />
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p class="font-medium">{{ eventLabel(event.eventType) }} · v{{ event.version }}</p>
                  <p class="text-xs text-muted">{{ event.actor?.name || event.actor?.nik || 'System' }} · {{ formatDate(event.createdAt) }}</p>
                </div>
                <a v-if="event.file" :href="resolveFileUrl(event.file)" target="_blank" rel="noopener noreferrer" class="text-xs text-primary hover:underline">Open file</a>
              </div>
              <p v-if="event.note" class="mt-2 text-sm">{{ event.note }}</p>
              <div v-if="event.changes && Object.keys(event.changes).length" class="mt-3 overflow-x-auto">
                <table class="min-w-full text-xs">
                  <thead><tr><th class="p-1 text-left">Changed field</th><th class="p-1 text-left">Previous</th><th class="p-1 text-left">New</th></tr></thead>
                  <tbody>
                    <tr v-for="(change, field) in event.changes" :key="field" class="border-t border-default">
                      <td class="p-1 font-medium">{{ eventLabel(String(field)) }}</td>
                      <td class="p-1">{{ displayValue((change as any).from) }}</td>
                      <td class="p-1">{{ displayValue((change as any).to) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>
  </UModal>
</template>
