<script setup lang="ts">
const props = defineProps<{ sample: string }>()
const emit = defineEmits<{ selected: [file: File] }>()
const loading = ref(false)
const toast = useToast()

async function selectSample() {
  loading.value = true
  try {
    const response = await fetch(`/training-samples/${props.sample}`)
    if (!response.ok) throw new Error('Sample file is unavailable')
    const name = props.sample.split('/').at(-1) || 'sample.pdf'
    emit('selected', new File([await response.blob()], name, { type: 'application/pdf' }))
  } catch (error) {
    toast.add({ title: 'Sample unavailable', description: error instanceof Error ? error.message : 'Please try again.', color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UButton
    label="Use training sample"
    icon="i-lucide-file-check"
    color="primary"
    variant="soft"
    :loading="loading"
    @click="selectSample"
  />
</template>
