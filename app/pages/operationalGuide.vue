<script setup lang="ts">
import { operationalGuideSteps, type OperationalGuideCheck } from '~/composables/useOperationalGuide'

const guide = useOperationalGuide()
const training = useTrainingMode()
const toast = useToast()
async function startTraining() {
  try {
    training.start()
    guide.data.value = null
    await navigateTo('/document/license')
  } catch (error) {
    training.stop()
    toast.add({ title: 'Unable to start training', description: error instanceof Error ? error.message : 'Please try again.', color: 'error' })
  }
}
const isComplete = (key: OperationalGuideCheck | 'examination') =>
  key !== 'examination' && Boolean(guide.data.value?.checks[key])

onMounted(() => {
  guide.active.value = true
  void guide.refresh()
})
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Examination Guide">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <div class="space-y-5 p-4 sm:p-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold">
            Prepare for your examination
          </h1><p class="mt-1 text-sm text-muted">
            {{ training.active.value ? 'Practice with sample documents. Nothing you submit here reaches the real application.' : 'This guide follows your real Operational records. It does not upload files, submit forms, or store a token.' }}
          </p>
        </div><div class="flex gap-2">
          <UButton
            v-if="!training.active.value"
            label="Start Training"
            icon="i-lucide-graduation-cap"
            @click="startTraining"
          /><UButton
            label="Check progress"
            icon="i-lucide-refresh-cw"
            variant="outline"
            :loading="guide.loading.value"
            @click="guide.refresh"
          /><UButton
            label="Close guide"
            color="neutral"
            variant="ghost"
            @click="guide.stop"
          />
        </div>
      </div>
      <UAlert
        v-if="guide.error.value"
        title="Could not load progress"
        :description="guide.error.value"
        color="error"
        variant="soft"
      />
      <UAlert
        v-if="guide.data.value && !guide.data.value.event"
        title="No active assigned event"
        description="You can prepare documents now. Checker Admin must assign you to an active event before you can create its application and take the examination."
        color="warning"
        variant="soft"
      />
      <UAlert
        v-else-if="guide.data.value?.event"
        :title="`Event: ${guide.data.value.event.name || 'Assigned event'}`"
        :description="`Application type: ${guide.data.value.event.remark || 'Not set'}. Existing valid IELP and MEDEX are automatically marked complete; you do not need to re-enter them.`"
        color="info"
        variant="soft"
      />
      <div class="space-y-3">
        <div
          v-for="(item, index) in operationalGuideSteps"
          :key="item.key"
          class="flex flex-wrap items-center gap-3 rounded-lg border border-default p-4"
          :class="guide.data.value && guide.nextStep.value.key === item.key ? 'border-primary/50 bg-primary/5' : ''"
        >
          <UBadge :color="isComplete(item.key) ? 'success' : guide.nextStep.value.key === item.key ? 'primary' : 'neutral'" variant="soft">
            {{ isComplete(item.key) ? 'Done' : index + 1 }}
          </UBadge>
          <div class="min-w-0 flex-1">
            <h2 :class="guide.nextStep.value.key === item.key ? 'font-bold' : 'font-medium'">
              {{ item.label }}
            </h2><p class="text-sm text-muted">
              {{ item.description }}
            </p>
          </div>
          <UButton
            :label="item.key === 'checker' && !isComplete(item.key) ? 'View application' : training.active.value ? 'Open practice page' : 'Open real page'"
            :to="item.to"
            size="sm"
            variant="outline"
          />
        </div>
      </div>
      <p class="text-xs text-muted">
        After completing an action, return here or press “Check progress” in the floating guide. Status is read only when requested—there is no background polling. Training records disappear when you exit Training Mode or reload this tab.
      </p>
    </div>
  </UDashboardPanel>
</template>
