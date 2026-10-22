<script setup lang="ts">
const route = useRoute()
const { apiFetch } = useApiFetch()
const toast = useToast()
const id = Number(route.query.applicationDocId)
const data = ref<{ number: string; version: string; ratings: { id: number; rating: string }[] } | null>(null)
const hours = ref<Record<number, string>>({})
const busy = ref(false)
const failed = ref(false)
function showError(error: unknown) {
  toast.add({ title: 'Unable to complete control hours', description: (error as { data?: { message?: string } })?.data?.message || 'Please reload and try again.', color: 'error' })
}
onMounted(async () => {
  if (!Number.isSafeInteger(id) || id < 1) { failed.value = true; return }
  try { data.value = await apiFetch(`/api/applicationDocument/${id}/missing-hours`) as typeof data.value }
  catch (error) { failed.value = true; showError(error) }
})
async function save() {
  if (!data.value) return
  busy.value = true
  try {
    const result = await apiFetch(`/api/applicationDocument/${id}/missing-hours`, { method: 'PATCH', body: { version: data.value.version, hours: data.value.ratings.map(r => ({ id: r.id, hours: String(hours.value[r.id] ?? '') })) } }) as { message: string }
    toast.add({ title: 'Control hours saved', description: result.message, color: 'success' })
    await navigateTo('/dashboard/dashboardOperational')
  }
  catch (error) { showError(error) }
  finally { busy.value = false }
}
</script>
<template>
  <UDashboardPanel>
    <template #header><UDashboardNavbar title="Complete Missing Control Hours"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar></template>
    <template #body>
      <form class="space-y-4 p-4 max-w-xl" @submit.prevent="save">
        <p v-if="failed">Your application could not be loaded. Return to the dashboard and try again.</p>
        <template v-if="data">
          <h2 class="font-semibold">{{ data.number }}</h2>
          <p>Complete the blank hours below. Existing hours, documents, validation and verification are not changed. The token is not accepted until the normal requirements are satisfied.</p>
          <div v-for="rating in data.ratings" :key="rating.id">
            <label :for="`hours-${rating.id}`" class="block">{{ rating.rating }} control hours</label>
            <input :id="`hours-${rating.id}`" v-model="hours[rating.id]" type="number" min="0" max="999999.99" step="0.01" required class="w-full rounded border border-default bg-default p-2" />
          </div>
          <UButton v-if="data.ratings.length" type="submit" :loading="busy">Save hours and return to dashboard</UButton>
          <p v-else>There are no missing control hours.</p>
        </template>
        <UButton to="/dashboard/dashboardOperational" variant="outline">Back to dashboard</UButton>
      </form>
    </template>
  </UDashboardPanel>
</template>
