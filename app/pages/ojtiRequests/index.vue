<script setup lang="ts">
type OjtLetter = {
  id: number;
  status: string;
  createdAt: string;
  appRating: { rating: { rating: string } | null; controlHour: string | null };
  applicationDoc: { id: number; number: string | null; user: { nik: string; name: string | null } | null; eventUser: { event: { event: string | null } | null } | null };
};
const { apiFetch } = useApiFetch();
const toast = useToast();
const letters = ref<OjtLetter[]>([]);
const loading = ref(false);
async function load() {
  loading.value = true;
  try { letters.value = await apiFetch('/api/ojtiRecommendations/inbox') as OjtLetter[]; }
  catch (error) { toast.add({ title: 'Unable to load OJTI letters', description: error instanceof Error ? error.message : 'Please try again.', color: 'error' }); }
  finally { loading.value = false; }
}
onMounted(() => { void load(); });
</script>

<template>
  <UDashboardPanel>
    <template #header><UDashboardNavbar title="OJTI Requests"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar></template>
    <template #body>
      <div class="space-y-4 p-4">
        <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="loading" @click="load">Refresh</UButton>
        <p v-if="!loading && !letters.length" class="text-muted">No recommendation letters have been sent to you.</p>
        <article v-for="letter in letters" :key="letter.id" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-default p-4">
          <div>
            <p class="font-semibold">{{ letter.applicationDoc.user?.name || letter.applicationDoc.user?.nik }} · {{ letter.appRating.rating?.rating || 'Rating' }}</p>
            <p class="text-sm text-muted">{{ letter.applicationDoc.number }} · {{ letter.applicationDoc.eventUser?.event?.event }} · {{ letter.appRating.controlHour || '—' }} hours</p>
          </div>
          <div class="flex items-center gap-2"><UBadge :label="letter.status" :color="letter.status === 'VALIDATED' ? 'success' : letter.status === 'RETURNED' ? 'warning' : 'info'" variant="soft" /><UButton :to="`/proposalLetters/${letter.id}`" :label="letter.status === 'PENDING' ? 'Review letter' : 'View letter'" /></div>
        </article>
      </div>
    </template>
  </UDashboardPanel>
</template>
