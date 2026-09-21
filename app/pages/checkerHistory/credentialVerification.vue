<script setup lang="ts">
interface CredentialTask {
  id: number;
  credentialType: "IELP" | "MEDEX";
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  institution?: string | null;
  level?: string | null;
  released?: string | null;
  expired?: string | null;
  examiner?: string | null;
  rater?: string | null;
  file?: string | null;
  createdAt: string;
  verifiedAt?: string | null;
  verificationNote?: string | null;
  user?: { nik: string; name?: string | null } | null;
  verifiedBy?: { nik: string; name?: string | null } | null;
}

const { apiFetch } = useApiFetch();
const apiBaseUrl = useApiBaseUrl();
const toast = useToast();
const tasks = ref<CredentialTask[]>([]);
const loading = ref(false);
const statusFilter = ref("PENDING");
const selectedTask = ref<CredentialTask | null>(null);
const decision = ref<"APPROVED" | "REJECTED">("APPROVED");
const note = ref("");
const reviewOpen = ref(false);
const submitting = ref(false);

const filteredTasks = computed(() =>
  statusFilter.value === "ALL"
    ? tasks.value
    : tasks.value.filter((item) => item.verificationStatus === statusFilter.value),
);

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function fileViewerUrl(file?: string | null) {
  if (!file) return null;
  const source = file.startsWith("/") ? `${apiBaseUrl}${file}` : file;
  return `/file/view?url=${encodeURIComponent(source)}`;
}

async function loadTasks() {
  loading.value = true;
  try {
    tasks.value = await apiFetch("/api/credentialVerification/tasks") as CredentialTask[];
  } catch (error: any) {
    toast.add({ title: "Unable to load verification tasks", description: error?.data?.message || error?.message, color: "error" });
  } finally {
    loading.value = false;
  }
}

function openReview(task: CredentialTask, nextDecision: "APPROVED" | "REJECTED") {
  selectedTask.value = task;
  decision.value = nextDecision;
  note.value = "";
  reviewOpen.value = true;
}

async function submitReview() {
  if (!selectedTask.value) return;
  if (decision.value === "REJECTED" && !note.value.trim()) {
    toast.add({ title: "Rejection note required", color: "error" });
    return;
  }
  submitting.value = true;
  try {
    const response = await apiFetch(`/api/credentialVerification/${selectedTask.value.credentialType.toLowerCase()}/${selectedTask.value.id}`, {
      method: "PATCH",
      body: { status: decision.value, note: note.value },
    }) as { message?: string };
    toast.add({
      title: decision.value === "APPROVED" ? "Credential approved and sent" : "Credential rejected",
      description: response.message,
      color: "success",
    });
    reviewOpen.value = false;
    await loadTasks();
  } catch (error: any) {
    toast.add({ title: "Verification failed", description: error?.data?.message || error?.message, color: "error" });
  } finally {
    submitting.value = false;
  }
}

await loadTasks();
</script>

<template>
  <UDashboardPanel id="credential-verification">
    <template #header>
      <UDashboardNavbar title="IELP / MEDEX Verification">
        <template #right>
          <UButton icon="i-lucide-refresh-cw" label="Refresh" color="neutral" variant="outline" :loading="loading" @click="loadTasks" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="space-y-4">
        <USelect v-model="statusFilter" :items="[{label:'Pending',value:'PENDING'},{label:'Approved',value:'APPROVED'},{label:'Rejected',value:'REJECTED'},{label:'All',value:'ALL'}]" value-key="value" class="w-48" />
        <div class="overflow-x-auto rounded-lg border border-default">
          <table class="w-full text-sm">
            <thead class="bg-elevated/60 text-left"><tr><th class="p-3">Type</th><th class="p-3">User</th><th class="p-3">Institution</th><th class="p-3">Released / Expired</th><th class="p-3">Details</th><th class="p-3">File</th><th class="p-3">Status</th><th class="p-3">Action</th></tr></thead>
            <tbody>
              <tr v-for="task in filteredTasks" :key="`${task.credentialType}-${task.id}`" class="border-t border-default">
                <td class="p-3 font-medium">{{ task.credentialType }}</td>
                <td class="p-3">{{ task.user?.name || task.user?.nik }}<div class="text-xs text-muted">{{ task.user?.nik }}</div></td>
                <td class="p-3">{{ task.institution || '-' }}</td>
                <td class="p-3"><div>{{ formatDate(task.released) }}</div><div class="text-muted">to {{ formatDate(task.expired) }}</div></td>
                <td class="p-3">{{ task.credentialType === 'IELP' ? `Level ${task.level || '-'} · ${task.rater || '-'}` : task.examiner || '-' }}</td>
                <td class="p-3"><NuxtLink v-if="fileViewerUrl(task.file)" :to="fileViewerUrl(task.file)!" class="text-primary hover:underline">View file</NuxtLink><span v-else class="text-muted">No file</span></td>
                <td class="p-3"><UBadge :color="task.verificationStatus === 'APPROVED' ? 'success' : task.verificationStatus === 'REJECTED' ? 'error' : 'warning'">{{ task.verificationStatus }}</UBadge><div v-if="task.verifiedBy" class="mt-1 text-xs text-muted">{{ task.verifiedBy.name || task.verifiedBy.nik }} · {{ formatDate(task.verifiedAt) }}</div><div v-if="task.verificationNote" class="mt-1 text-xs">{{ task.verificationNote }}</div></td>
                <td class="p-3"><div v-if="task.verificationStatus === 'PENDING'" class="flex gap-2"><UButton size="xs" label="Approve" color="success" @click="openReview(task, 'APPROVED')" /><UButton size="xs" label="Reject" color="error" variant="outline" @click="openReview(task, 'REJECTED')" /></div><span v-else class="text-muted">Completed</span></td>
              </tr>
              <tr v-if="!loading && filteredTasks.length === 0"><td colspan="8" class="p-8 text-center text-muted">No verification tasks found.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="reviewOpen" :title="decision === 'APPROVED' ? 'Approve credential' : 'Reject credential'">
    <template #body><div class="space-y-4"><p v-if="decision === 'APPROVED'">The {{ selectedTask?.credentialType }} data for <strong>{{ selectedTask?.user?.name || selectedTask?.user?.nik }}</strong> will be approved and sent to e-chain. Continue?</p><p v-else>Reject {{ selectedTask?.credentialType }} for <strong>{{ selectedTask?.user?.name || selectedTask?.user?.nik }}</strong>.</p><UFormField :label="decision === 'REJECTED' ? 'Reason (required)' : 'Note (optional)'"><UTextarea v-model="note" class="w-full" /></UFormField><div class="flex justify-end gap-2"><UButton label="Cancel" color="neutral" variant="outline" @click="reviewOpen = false" /><UButton :label="decision === 'APPROVED' ? 'Yes, approve and send' : 'Reject'" :color="decision === 'APPROVED' ? 'success' : 'error'" :loading="submitting" @click="submitReview" /></div></div></template>
  </UModal>
</template>
