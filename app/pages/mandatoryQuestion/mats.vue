<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel } from '@tanstack/table-core'

const apiBaseUrl = useApiBaseUrl()

type MatsQuestion = {
  id: number
  mandatoryItemId: number
  mandatoryItem?: { id: number, mandatory: string } | null
  question: string
  image: string | null
  a: string
  b: string
  c: string
  d: string
  key: 'A' | 'B' | 'C' | 'D'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type MatsResponse = {
  configuration: { id: number, quantity: number, mode: 'SEPARATE_POOL' | 'CATEGORY_PORTION' }
  questions: MatsQuestion[]
  mandatoryItems: Array<{ id: number, mandatory: string }>
  allocations: Array<{ id: number, mandatoryItemId: number, quantity: number }>
}

const { token, getRoleNames } = useAuth()
const toast = useToast()
const UButton = resolveComponent('UButton')
const USelect = resolveComponent('USelect')
const table = useTemplateRef('table')
const isGeneralAdmin = computed(() =>
  getRoleNames().some(role => role.trim().toUpperCase() === 'GENERAL ADMIN')
)

const authHeaders = computed(() => ({
  Authorization: token.value ? `Bearer ${token.value}` : ''
}))

const { data, status, error, refresh } = await useFetch<MatsResponse>(
  `${apiBaseUrl}/api/mats`,
  { headers: authHeaders }
)

const search = ref('')
const quantity = ref(0)
const mode = ref<'SEPARATE_POOL' | 'CATEGORY_PORTION'>('SEPARATE_POOL')
const allocationValues = ref<Record<number, number>>({})
const savingAllocations = ref(false)
const savingQuantity = ref(false)
const editorOpen = ref(false)
const deleteOpen = ref(false)
const importOpen = ref(false)
const savingQuestion = ref(false)
const deletingQuestion = ref(false)
const editingQuestion = ref<MatsQuestion | null>(null)
const deletingItem = ref<MatsQuestion | null>(null)
const selectedFile = ref<File | null>(null)
const imagePreview = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const csvFileInput = ref<HTMLInputElement | null>(null)
const selectedCsvFile = ref<File | null>(null)
const importingCsv = ref(false)
const tableImagePreviewOpen = ref(false)
const tableImagePreviewSrc = ref('')
const columnFilters = ref([{ id: 'question', value: '' }])
const pagination = ref({ pageIndex: 0, pageSize: 10 })
const pageSizeOptions = [
  { label: '10 / page', value: 10 },
  { label: '20 / page', value: 20 },
  { label: '50 / page', value: 50 },
  { label: '100 / page', value: 100 }
]
const selectedPageSize = computed({
  get: () => pagination.value.pageSize,
  set: (value: number) => {
    pagination.value.pageSize = Number(value)
    pagination.value.pageIndex = 0
  }
})

const emptyForm = () => ({
  question: '',
  a: '',
  b: '',
  c: '',
  d: '',
  key: 'A' as MatsQuestion['key'],
  mandatoryItemId: undefined as number | undefined,
  isActive: true
})
const form = reactive(emptyForm())

watch(
  () => data.value?.configuration.quantity,
  (value) => {
    if (value != null) quantity.value = value
  },
  { immediate: true }
)
watch(() => data.value?.configuration.mode, (value) => {
  if (value) mode.value = value
}, { immediate: true })
watch(() => data.value?.allocations, (values) => {
  allocationValues.value = Object.fromEntries((values || []).map(item => [item.mandatoryItemId, item.quantity]))
}, { immediate: true })

const mandatoryItemOptions = computed(() => (data.value?.mandatoryItems || []).map(item => ({
  label: item.mandatory,
  value: item.id
})))
const activeMode = computed(() => data.value?.configuration.mode || 'SEPARATE_POOL')
const activeModeLabel = computed(() => activeMode.value === 'CATEGORY_PORTION'
  ? 'Category Portion'
  : 'Separate Global Pool')
const hasUnsavedModeChange = computed(() => mode.value !== activeMode.value)
const categorySaveStatus = ref<Record<number, 'saving' | 'saved' | 'error' | undefined>>({})
const categoryRequestId = new Map<number, number>()

const activeCount = computed(
  () => data.value?.questions.filter(question => question.isActive).length || 0
)

const filteredQuestions = computed(() => {
  const query = search.value.trim().toLowerCase()
  const questions = data.value?.questions || []
  if (!query) return questions
  return questions.filter(item =>
    [item.question, item.a, item.b, item.c, item.d, item.key, item.mandatoryItem?.mandatory]
      .some(value => stripHtml(value).toLowerCase().includes(query))
  )
})

function stripHtml(value: string | null | undefined) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const requestError = error as {
      message?: string
      data?: { message?: string }
    }
    return requestError.data?.message || requestError.message || fallback
  }
  return fallback
}

function resolveImageUrl(value?: string | null) {
  const path = String(value || '').trim()
  if (!path || /^(https?:|data:|blob:)/i.test(path)) return path
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

function openTableImage(value?: string | null) {
  tableImagePreviewSrc.value = resolveImageUrl(value)
  tableImagePreviewOpen.value = Boolean(tableImagePreviewSrc.value)
}

async function updateQuestionCategory(question: MatsQuestion, value: number) {
  const mandatoryItemId = Number(value)
  if (!mandatoryItemId || mandatoryItemId === question.mandatoryItemId) return
  const mandatoryItem = data.value?.mandatoryItems.find(item => item.id === mandatoryItemId)
  if (!mandatoryItem) return

  const previousId = question.mandatoryItemId
  const previousItem = question.mandatoryItem
  const requestId = (categoryRequestId.get(question.id) || 0) + 1
  categoryRequestId.set(question.id, requestId)
  question.mandatoryItemId = mandatoryItemId
  question.mandatoryItem = mandatoryItem
  categorySaveStatus.value[question.id] = 'saving'

  try {
    await $fetch(`${apiBaseUrl}/api/mats/questions/${question.id}/category`, {
      method: 'PATCH',
      headers: authHeaders.value,
      body: { mandatoryItemId }
    })
    if (categoryRequestId.get(question.id) !== requestId) return
    categorySaveStatus.value[question.id] = 'saved'
    window.setTimeout(() => {
      if (categorySaveStatus.value[question.id] === 'saved') categorySaveStatus.value[question.id] = undefined
    }, 1500)
  } catch (requestError: unknown) {
    if (categoryRequestId.get(question.id) !== requestId) return
    question.mandatoryItemId = previousId
    question.mandatoryItem = previousItem
    categorySaveStatus.value[question.id] = 'error'
    toast.add({
      title: 'Unable to update Mandatory Item',
      description: getErrorMessage(requestError, 'The category assignment was not saved.'),
      color: 'error'
    })
  }
}

const columns: TableColumn<MatsQuestion>[] = [
  {
    accessorKey: 'mandatoryItem',
    header: 'Mandatory Item',
    cell: ({ row }) => h('div', { class: 'flex min-w-52 flex-col gap-1' }, [
      h(USelect, {
        'modelValue': row.original.mandatoryItemId,
        'items': mandatoryItemOptions.value,
        'valueKey': 'value',
        'disabled': categorySaveStatus.value[row.original.id] === 'saving',
        'class': 'w-full',
        'onUpdate:modelValue': (value: number) => updateQuestionCategory(row.original, value)
      }),
      h('span', {
        class: [
          'block min-h-4 text-xs',
          categorySaveStatus.value[row.original.id] === 'error'
            ? 'text-error'
            : categorySaveStatus.value[row.original.id] === 'saved'
              ? 'text-success'
              : 'text-muted'
        ]
      }, categorySaveStatus.value[row.original.id] === 'saving'
        ? 'Saving...'
        : categorySaveStatus.value[row.original.id] === 'saved'
          ? 'Saved'
          : categorySaveStatus.value[row.original.id] === 'error'
            ? 'Save failed'
            : '')
    ])
  },
  {
    id: 'no',
    header: 'NO',
    cell: ({ row }) => row.index + 1
  },
  {
    accessorKey: 'question',
    header: ({ column }) => h(UButton, {
      color: 'neutral',
      variant: 'ghost',
      label: 'Multiple Choice Question',
      icon: column.getIsSorted()
        ? column.getIsSorted() === 'asc'
          ? 'i-lucide-arrow-up-narrow-wide'
          : 'i-lucide-arrow-down-wide-narrow'
        : 'i-lucide-arrow-up-down',
      class: '-mx-2.5',
      onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
    }),
    cell: ({ row }) => h('div', {
      class: 'max-w-md whitespace-normal break-words py-2 font-medium text-highlighted',
      textContent: stripHtml(row.original.question)
    })
  },
  ...(['a', 'b', 'c', 'd'] as const).map(option => ({
    accessorKey: option,
    header: option.toUpperCase(),
    cell: ({ row }: { row: { original: MatsQuestion } }) => h('div', {
      class: 'max-w-xs whitespace-normal break-words py-2 text-sm',
      textContent: stripHtml(row.original[option])
    })
  })),
  {
    accessorKey: 'key',
    header: 'Key',
    cell: ({ row }) => h('span', { class: 'font-semibold text-primary' }, row.original.key)
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => h('span', {
      class: row.original.isActive
        ? 'rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success'
        : 'rounded-full bg-elevated px-2 py-1 text-xs text-muted'
    }, row.original.isActive ? 'Active' : 'Inactive')
  },
  {
    accessorKey: 'image',
    header: 'Image',
    cell: ({ row }) => row.original.image
      ? h('button', {
          type: 'button',
          class: 'rounded focus:outline-none focus:ring-2 focus:ring-primary/60',
          onClick: () => openTableImage(row.original.image)
        }, [h('img', {
          src: resolveImageUrl(row.original.image),
          alt: 'MATS question',
          class: 'h-16 w-24 cursor-zoom-in rounded border border-default object-cover'
        })])
      : h('span', { class: 'text-xs text-muted' }, 'No image')
  },
  {
    id: 'actions',
    header: 'Action',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-2' }, [
      h(UButton, { icon: 'i-lucide-pencil', color: 'primary', variant: 'soft', size: 'sm', onClick: () => openEdit(row.original) }),
      h(UButton, { icon: 'i-lucide-trash-2', color: 'error', variant: 'soft', size: 'sm', onClick: () => selectForDelete(row.original) })
    ])
  }
]

function resetEditor() {
  Object.assign(form, emptyForm())
  editingQuestion.value = null
  selectedFile.value = null
  imagePreview.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function openCreate() {
  resetEditor()
  editorOpen.value = true
}

function openEdit(question: MatsQuestion) {
  editingQuestion.value = question
  Object.assign(form, {
    question: question.question,
    a: question.a,
    b: question.b,
    c: question.c,
    d: question.d,
    key: question.key,
    mandatoryItemId: question.mandatoryItemId,
    isActive: question.isActive
  })
  selectedFile.value = null
  imagePreview.value = resolveImageUrl(question.image)
  editorOpen.value = true
}

function selectForDelete(question: MatsQuestion) {
  deletingItem.value = question
  deleteOpen.value = true
}

function handleFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.add({ title: 'Invalid image', description: 'Choose an image file.', color: 'error' })
    input.value = ''
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    toast.add({ title: 'Image too large', description: 'Maximum image size is 2 MB.', color: 'error' })
    input.value = ''
    return
  }
  selectedFile.value = file
  imagePreview.value = URL.createObjectURL(file)
}

async function saveConfiguration() {
  if (!Number.isInteger(quantity.value) || quantity.value < 0) {
    toast.add({ title: 'Invalid quantity', description: 'Quantity must be a non-negative whole number.', color: 'error' })
    return
  }
  savingQuantity.value = true
  try {
    await $fetch(`${apiBaseUrl}/api/mats/configuration`, {
      method: 'PUT',
      headers: authHeaders.value,
      body: { quantity: quantity.value, mode: mode.value }
    })
    toast.add({ title: 'Configuration saved', description: `${quantity.value} MATS questions will appear in each examination.`, color: 'success' })
    await refresh()
  } catch (requestError: unknown) {
    toast.add({ title: 'Unable to save', description: getErrorMessage(requestError, 'Failed to save MATS configuration.'), color: 'error' })
  } finally {
    savingQuantity.value = false
  }
}

async function saveAllocations() {
  savingAllocations.value = true
  try {
    await $fetch(`${apiBaseUrl}/api/mats/allocations`, {
      method: 'PUT', headers: authHeaders.value,
      body: { allocations: (data.value?.mandatoryItems || []).map(item => ({
        mandatoryItemId: item.id, quantity: Number(allocationValues.value[item.id] || 0)
      })) }
    })
    toast.add({ title: 'Category allocations saved', color: 'success' })
    await refresh()
  } catch (requestError: unknown) {
    toast.add({ title: 'Unable to save allocations', description: getErrorMessage(requestError, 'Failed to save category allocations.'), color: 'error' })
  } finally {
    savingAllocations.value = false
  }
}

async function saveQuestion() {
  const values = [form.question, form.a, form.b, form.c, form.d]
  if (values.some(value => !stripHtml(value))) {
    toast.add({ title: 'Incomplete question', description: 'Question and all four options are required.', color: 'error' })
    return
  }
  if (!form.mandatoryItemId) {
    toast.add({ title: 'Mandatory Item required', color: 'error' })
    return
  }
  savingQuestion.value = true
  try {
    const body = new FormData()
    body.append('question', form.question)
    body.append('a', form.a)
    body.append('b', form.b)
    body.append('c', form.c)
    body.append('d', form.d)
    body.append('key', form.key)
    body.append('mandatoryItemId', String(form.mandatoryItemId))
    body.append('isActive', String(form.isActive))
    if (selectedFile.value) body.append('image', selectedFile.value)

    const id = editingQuestion.value?.id
    await $fetch(
      id
        ? `${apiBaseUrl}/api/mats/questions/${id}`
        : `${apiBaseUrl}/api/mats/questions`,
      { method: id ? 'PUT' : 'POST', headers: authHeaders.value, body }
    )
    toast.add({ title: id ? 'Question updated' : 'Question created', color: 'success' })
    editorOpen.value = false
    resetEditor()
    await refresh()
  } catch (requestError: unknown) {
    toast.add({ title: 'Unable to save question', description: getErrorMessage(requestError, 'Failed to save MATS question.'), color: 'error' })
  } finally {
    savingQuestion.value = false
  }
}

async function deleteQuestion() {
  if (!deletingItem.value) return
  deletingQuestion.value = true
  try {
    await $fetch(`${apiBaseUrl}/api/mats/questions/${deletingItem.value.id}`, {
      method: 'DELETE',
      headers: authHeaders.value
    })
    toast.add({ title: 'Question deleted', color: 'success' })
    deleteOpen.value = false
    deletingItem.value = null
    await refresh()
  } catch (requestError: unknown) {
    toast.add({ title: 'Unable to delete question', description: getErrorMessage(requestError, 'Failed to delete MATS question.'), color: 'error' })
  } finally {
    deletingQuestion.value = false
  }
}

function escapeCsvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function downloadCsvTemplate() {
  downloadCsv('mats-question-template.csv', [
    ['matsQuestionId', 'mandatoryItemId', 'question', 'a', 'b', 'c', 'd', 'key', 'isActive'],
    ['', data.value?.mandatoryItems?.[0]?.id || '', '<p>What is the purpose of this MATS procedure?</p>', 'Option A', 'Option B', 'Option C', 'Option D', 'A', 'true']
  ])
}

function downloadCurrentQuestions() {
  const rows = (data.value?.questions || []).map(item => [
    item.id, item.mandatoryItemId, item.question, item.a, item.b, item.c, item.d, item.key, item.isActive
  ])
  downloadCsv(`mats-questions-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['matsQuestionId', 'mandatoryItemId', 'question', 'a', 'b', 'c', 'd', 'key', 'isActive'],
    ...rows
  ])
}

function handleCsvFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  if (!file) {
    selectedCsvFile.value = null
    return
  }
  if (!file.name.toLowerCase().endsWith('.csv') || file.size > 2 * 1024 * 1024) {
    toast.add({ title: 'Invalid CSV', description: 'Choose a CSV file no larger than 2 MB.', color: 'error' })
    input.value = ''
    selectedCsvFile.value = null
    return
  }
  selectedCsvFile.value = file
}

async function importCsv() {
  if (!selectedCsvFile.value) {
    toast.add({ title: 'CSV required', description: 'Choose a CSV file to import.', color: 'error' })
    return
  }
  importingCsv.value = true
  try {
    const body = new FormData()
    body.append('csv', selectedCsvFile.value)
    const response = await $fetch<{ imported: number, created: number, updated: number }>(
      `${apiBaseUrl}/api/mats/questions/import-csv`,
      { method: 'POST', headers: authHeaders.value, body }
    )
    toast.add({
      title: 'CSV imported',
      description: `${response.imported} processed: ${response.created} created and ${response.updated} updated.`,
      color: 'success'
    })
    importOpen.value = false
    selectedCsvFile.value = null
    if (csvFileInput.value) csvFileInput.value.value = ''
    await refresh()
  } catch (requestError: unknown) {
    const details = requestError && typeof requestError === 'object'
      ? (requestError as { data?: { errors?: string[] } }).data?.errors
      : undefined
    toast.add({
      title: 'CSV import failed',
      description: details?.length ? details.slice(0, 3).join(' ') : getErrorMessage(requestError, 'Failed to import MATS questions.'),
      color: 'error'
    })
  } finally {
    importingCsv.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="mats-questions">
    <template #header>
      <UDashboardNavbar title="MATS Questions">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              label="Download CSV"
              icon="i-lucide-download"
              color="neutral"
              variant="outline"
              :disabled="!data?.questions.length"
              @click="downloadCurrentQuestions"
            />
            <UButton
              label="Import CSV"
              icon="i-lucide-upload"
              color="neutral"
              variant="outline"
              @click="importOpen = true"
            />
            <UButton label="Add MATS Question" icon="i-lucide-plus" @click="openCreate" />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="!isGeneralAdmin" class="p-6">
        <UAlert
          title="Access denied"
          description="Only General Admin can manage MATS questions."
          color="error"
          icon="i-lucide-shield-alert"
        />
      </div>

      <div v-else class="space-y-5 p-4 sm:p-6">
        <UCard>
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p class="text-base font-semibold">
                Questions per examination
              </p>
              <p class="mt-1 text-sm text-muted">
                Applied globally to every branch, sector, and rating.
              </p>
              <div class="mt-3 flex flex-wrap gap-2 text-xs">
                <UBadge
                  :label="`Active Mode: ${activeModeLabel}`"
                  :color="activeMode === 'CATEGORY_PORTION' ? 'primary' : 'info'"
                  variant="solid"
                />
                <UBadge
                  v-if="hasUnsavedModeChange"
                  label="Mode change not saved"
                  color="warning"
                  variant="subtle"
                />
                <UBadge :label="`${activeCount} active questions`" color="success" variant="subtle" />
                <UBadge :label="`${data?.questions.length || 0} total questions`" color="neutral" variant="subtle" />
              </div>
            </div>
            <div class="flex items-end gap-2">
              <UFormField label="Examination mode">
                <USelect
                  v-model="mode"
                  :items="[
                    { label: 'Separate Global Pool', value: 'SEPARATE_POOL' },
                    { label: 'Category Portion', value: 'CATEGORY_PORTION' }
                  ]"
                  value-key="value"
                  class="w-56"
                />
              </UFormField>
              <UFormField label="MATS quantity">
                <UInput
                  v-model.number="quantity"
                  type="number"
                  min="0"
                  :max="activeCount"
                  class="w-32"
                  :disabled="mode === 'CATEGORY_PORTION'"
                />
              </UFormField>
              <UButton
                label="Save quantity"
                icon="i-lucide-save"
                :loading="savingQuantity"
                @click="saveConfiguration"
              />
            </div>
          </div>
        </UCard>

        <UCard v-if="mode === 'CATEGORY_PORTION'">
          <template #header>
            <div>
              <h2 class="font-semibold">
                MATS Portion by Mandatory Item
              </h2>
              <p class="text-sm text-muted">
                Each value consumes part of the branch category quantity.
              </p>
            </div>
          </template>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <UFormField
              v-for="item in data?.mandatoryItems || []"
              :key="item.id"
              :label="item.mandatory"
            >
              <UInput
                v-model.number="allocationValues[item.id]"
                type="number"
                min="0"
                class="w-full"
              />
            </UFormField>
          </div>
          <div class="mt-4 flex justify-end">
            <UButton
              label="Save category allocations"
              icon="i-lucide-save"
              :loading="savingAllocations"
              @click="saveAllocations"
            />
          </div>
        </UCard>

        <UCard>
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Search MATS questions..."
              class="w-full sm:max-w-sm"
            />
            <div class="flex items-center gap-2">
              <USelect
                v-model="selectedPageSize"
                :items="pageSizeOptions"
                label-key="label"
                value-key="value"
                class="w-28"
              />
              <UButton
                label="Refresh"
                icon="i-lucide-refresh-cw"
                color="neutral"
                variant="outline"
                @click="() => refresh()"
              />
            </div>
          </div>

          <div v-if="status === 'pending'" class="flex justify-center gap-2 py-10 text-muted">
            <UIcon name="i-lucide-loader-2" class="animate-spin" /> Loading MATS questions...
          </div>
          <UAlert
            v-else-if="error"
            title="Unable to load MATS questions"
            :description="error.message"
            color="error"
          />
          <div v-else-if="filteredQuestions.length === 0" class="py-10 text-center text-muted">
            No MATS questions found.
          </div>
          <div v-else>
            <UTable
              ref="table"
              v-model:column-filters="columnFilters"
              v-model:pagination="pagination"
              :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
              :data="filteredQuestions"
              :columns="columns"
              class="shrink-0"
              :ui="{
                base: 'table-auto border-collapse border border-default',
                thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                tbody: '[&>tr]:last:[&>td]:border-b',
                th: 'border border-default px-3 py-2',
                td: 'border border-default align-middle px-3 py-2',
                separator: 'h-0'
              }"
            />
            <div class="mt-4 flex items-center justify-between gap-3 border-t border-default pt-4">
              <div class="text-sm text-muted">
                Showing {{ pagination.pageIndex * pagination.pageSize + 1 }} to
                {{ Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredQuestions.length) }}
                of {{ filteredQuestions.length }} questions
              </div>
              <UPagination
                :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
                :items-per-page="table?.tableApi?.getState().pagination.pageSize"
                :total="table?.tableApi?.getFilteredRowModel().rows.length"
                @update:page="(page: number) => table?.tableApi?.setPageIndex(page - 1)"
              />
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="editorOpen" :title="editingQuestion ? 'Edit MATS Question' : 'Add MATS Question'" :ui="{ content: 'max-w-4xl' }">
    <template #body>
      <div class="space-y-4">
        <UFormField label="Question" required>
          <RichTextEditor v-model="form.question" placeholder="Enter MATS question..." />
        </UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Option A" required>
            <UTextarea v-model="form.a" class="w-full" />
          </UFormField>
          <UFormField label="Option B" required>
            <UTextarea v-model="form.b" class="w-full" />
          </UFormField>
          <UFormField label="Option C" required>
            <UTextarea v-model="form.c" class="w-full" />
          </UFormField>
          <UFormField label="Option D" required>
            <UTextarea v-model="form.d" class="w-full" />
          </UFormField>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Mandatory Item" required>
            <USelect
              v-model="form.mandatoryItemId"
              :items="mandatoryItemOptions"
              value-key="value"
              placeholder="Select Mandatory Item"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Correct answer" required>
            <USelect v-model="form.key" :items="['A', 'B', 'C', 'D']" class="w-full" />
          </UFormField>
          <UFormField label="Status">
            <USwitch v-model="form.isActive" label="Active question" />
          </UFormField>
        </div>
        <UFormField label="Image (optional)">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="block w-full text-sm"
            @change="handleFile"
          >
          <img
            v-if="imagePreview"
            :src="imagePreview"
            alt="Preview"
            class="mt-3 max-h-48 rounded border border-default"
          >
        </UFormField>
        <div class="flex justify-end gap-2 pt-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            @click="editorOpen = false"
          />
          <UButton
            :label="editingQuestion ? 'Save changes' : 'Create question'"
            icon="i-lucide-save"
            :loading="savingQuestion"
            @click="saveQuestion"
          />
        </div>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="tableImagePreviewOpen" title="Image Preview" :ui="{ content: 'max-w-4xl' }">
    <template #body>
      <div class="flex items-center justify-center">
        <img
          :src="tableImagePreviewSrc"
          alt="MATS question image"
          class="max-h-[75vh] rounded border border-default"
        >
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="importOpen"
    title="Import MATS Questions"
    description="Create or update MATS questions from CSV"
    :ui="{ content: 'max-w-3xl' }"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="importCsv">
        <UAlert
          title="CSV format"
          description="Use: matsQuestionId, mandatoryItemId, question, a, b, c, d, key, isActive. Leave matsQuestionId empty to create a question; keep it to update an existing MATS question."
          color="info"
          icon="i-lucide-info"
        />
        <div class="flex items-center justify-between gap-3 rounded-lg border border-default p-4">
          <div>
            <p class="font-medium">
              CSV template
            </p>
            <p class="text-sm text-muted">
              Download the expected columns and an example row.
            </p>
          </div>
          <UButton
            label="Download template"
            icon="i-lucide-download"
            variant="soft"
            type="button"
            @click="downloadCsvTemplate"
          />
        </div>
        <UFormField label="CSV file" required>
          <input
            ref="csvFileInput"
            type="file"
            accept=".csv,text/csv"
            class="block w-full cursor-pointer text-sm"
            @change="handleCsvFile"
          >
        </UFormField>
        <p v-if="selectedCsvFile" class="rounded border border-default bg-elevated/40 p-3 text-sm">
          Selected: <strong>{{ selectedCsvFile.name }}</strong>
        </p>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            type="button"
            @click="importOpen = false"
          />
          <UButton
            label="Import questions"
            icon="i-lucide-upload"
            type="submit"
            :loading="importingCsv"
          />
        </div>
      </form>
    </template>
  </UModal>

  <UModal v-model:open="deleteOpen" title="Delete MATS question">
    <template #body>
      <p>Delete <strong>{{ stripHtml(deletingItem?.question || '') }}</strong>?</p>
      <p class="mt-2 text-sm text-muted">
        Historical examination statistics will remain available.
      </p>
      <div class="mt-5 flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          @click="deleteOpen = false"
        />
        <UButton
          label="Delete"
          color="error"
          icon="i-lucide-trash-2"
          :loading="deletingQuestion"
          @click="deleteQuestion"
        />
      </div>
    </template>
  </UModal>
</template>
