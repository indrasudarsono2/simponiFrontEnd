<script setup lang="ts">
interface InboxLetter {
  id: number
  status: string
  revision: number
  createdAt: string
  applicationDoc: { number: string | null; user?: { name: string | null } | null }
  appRating: { rating?: { rating: string | null } | null }
}
interface InboxResponse { letters: InboxLetter[]; validatedCount: number }
const { apiFetch } = useApiFetch()
const toast = useToast()
const notValidatedLetters = ref<InboxLetter[]>([])
const validatedLetters = ref<InboxLetter[]>([])
const validatedCount = ref(0)
const validatedLoaded = ref(false)
const loading = ref(false)
const search = ref('')
const selectedTab = ref<'not-validated' | 'validated'>('not-validated')
const tabItems = computed(() => [
  { label: `Not Validated (${notValidatedLetters.value.length})`, value: 'not-validated' },
  { label: `Validated (${validatedCount.value})`, value: 'validated' },
])
const filtered = computed(() => (selectedTab.value === 'validated' ? validatedLetters.value : notValidatedLetters.value).filter(item => {
  const matchesSearch = `${item.applicationDoc.number || ''} ${item.applicationDoc.user?.name || ''} ${item.appRating.rating?.rating || ''} ${item.status}`.toLowerCase().includes(search.value.trim().toLowerCase())
  return matchesSearch
}))
const submissionLabel = (version: number) => version <= 1 ? 'Initial submission' : `Revision ${version - 1}`

async function load(status: 'not-validated' | 'validated') {
  loading.value = true
  try {
    const response = await apiFetch(`/api/proposalLetters/inbox?status=${status}`) as InboxResponse
    validatedCount.value = response.validatedCount
    if (status === 'validated') {
      validatedLetters.value = response.letters
      validatedLoaded.value = true
    } else {
      notValidatedLetters.value = response.letters
    }
  }
  catch (error) { toast.add({ title: 'Unable to load proposal letters', description: error instanceof Error ? error.message : 'Please try again.', color: 'error' }) }
  finally { loading.value = false }
}
onMounted(() => { void load('not-validated') })
</script>

<template>
  <UDashboardPanel>
    <template #header><UDashboardNavbar title="Proposal Letters"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar></template>
    <template #body>
      <div class="space-y-4 p-4">
        <UTabs v-model="selectedTab" :items="tabItems" :content="false" />
        <div class="flex flex-wrap gap-2"><UInput v-model="search" icon="i-lucide-search" placeholder="Search applicant, number, rating, or status" class="min-w-72 flex-1" /><UButton :label="selectedTab === 'validated' && !validatedLoaded ? 'Load Validated Letters' : 'Refresh'" :icon="selectedTab === 'validated' && !validatedLoaded ? 'i-lucide-download' : 'i-lucide-refresh-cw'" variant="outline" :loading="loading" @click="load(selectedTab)" /></div>
        <p v-if="selectedTab === 'validated' && !validatedLoaded" class="rounded-lg border border-default p-4 text-sm text-muted">{{ validatedCount }} validated letters. Click Load Validated Letters to view their details.</p>
        <p v-else-if="!filtered.length && !loading" class="rounded-lg border border-default p-4 text-sm text-muted">No {{ selectedTab === 'validated' ? 'validated' : 'not validated' }} proposal letters match your search.</p>
        <div v-for="letter in filtered" :key="letter.id" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-default p-4">
          <div><p class="font-semibold">{{ letter.applicationDoc.number }}/{{ letter.appRating.rating?.rating }}</p><p class="text-sm text-muted">{{ letter.applicationDoc.user?.name || 'Applicant' }} · {{ submissionLabel(letter.revision) }}</p></div>
          <div class="flex items-center gap-2"><UBadge :label="letter.status" :color="letter.status === 'VALIDATED' ? 'success' : letter.status === 'RETURNED' ? 'warning' : 'info'" variant="soft" /><UButton :label="letter.status === 'VALIDATED' ? 'View' : 'Review'" :to="`/proposalLetters/${letter.id}`" /></div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
