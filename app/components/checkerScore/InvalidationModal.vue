<script setup lang="ts">
const isInvalidationModalOpen = defineModel<boolean>('open', { required: true })
const invalidationReason = defineModel<string>('reason', { required: true })
const fraudCategory = defineModel<string | undefined>('fraudCategory')
const invalidationConfirmed = defineModel<boolean>('confirmed', { required: true })
defineProps<{
  fraudCategoryOptions: Array<{ label: string, value: string }>
  invalidationLoading: boolean
}>()
const emit = defineEmits<{ submit: [] }>()
</script>

<template>
  <UModal
    v-model:open="isInvalidationModalOpen"
    title="Invalidate Examination Attempt"
    description="The existing result will remain in the audit history but will no longer be valid."
    :ui="{ content: 'max-w-xl w-full' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="Fraud category">
          <USelect
            v-model="fraudCategory"
            :items="fraudCategoryOptions"
            placeholder="Select category (optional)"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Reason" required>
          <UTextarea
            v-model="invalidationReason"
            :rows="5"
            :maxlength="2000"
            placeholder="Describe the evidence and reason for requiring re-examination..."
            class="w-full"
          />
          <template #hint>
            {{ invalidationReason.trim().length }}/2000
          </template>
        </UFormField>

        <UCheckbox
          v-model="invalidationConfirmed"
          label="I have reviewed the evidence and confirm that this attempt must be invalidated."
        />
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          :disabled="invalidationLoading"
          @click="isInvalidationModalOpen = false"
        />
        <UButton
          label="Invalidate & Require Re-examination"
          icon="i-lucide-shield-alert"
          color="error"
          :loading="invalidationLoading"
          :disabled="
            invalidationLoading
              || invalidationReason.trim().length < 10
              || !invalidationConfirmed
          "
          @click="emit('submit')"
        />
      </div>
    </template>
  </UModal>
</template>
