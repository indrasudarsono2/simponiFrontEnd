<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
const { token } = useAuth()
const toast = useToast()

interface BranchOption {
  id: number
  branch?: string | null
}

interface CheckerRow {
  nik: string
  name?: string | null
  branch?: { id: number, branch?: string | null } | null
  branchUnit?: { id: number, unit?: string | null } | null
  sector?: { id: number, sector?: string | null } | null
  checkerRatings: Array<{ id: number, rating?: string | null }>
}

interface CheckerResponse {
  branches: BranchOption[]
  checkers: CheckerRow[]
}

const ALL_BRANCHES_ID = 0
const selectedBranchId = ref<number | undefined>()
const branches = ref<BranchOption[]>([])
const checkers = ref<CheckerRow[]>([])
const loading = ref(false)
const errorMessage = ref('')
const searchQuery = ref('')
let checkerRequestId = 0

const branchOptions = computed(() => [
  { label: 'All Branches', value: ALL_BRANCHES_ID },
  ...branches.value.map(branch => ({
    label: branch.branch || `Branch ${branch.id}`,
    value: branch.id
  }))
])

const filteredCheckers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return checkers.value
  return checkers.value.filter((checker) => {
    const ratings = checker.checkerRatings.map(rating => rating.rating).join(' ')
    return [
      checker.nik,
      checker.name,
      checker.branch?.branch,
      checker.branchUnit?.unit,
      checker.sector?.sector,
      ratings
    ].some(value => String(value || '').toLowerCase().includes(query))
  })
})

const representedBranches = computed(() =>
  new Set(checkers.value.map(checker => checker.branch?.id).filter(Boolean)).size
)
const assignedRatingCount = computed(() =>
  checkers.value.reduce((total, checker) => total + checker.checkerRatings.length, 0)
)

async function loadBranches() {
  try {
    const response = await $fetch<CheckerResponse>(`${apiBaseUrl}/api/pfcScore/checker`, {
      headers: { Authorization: token.value ? `Bearer ${token.value}` : '' }
    })
    branches.value = response.branches || []
  } catch (error) {
    const value = error as { data?: { message?: string }, message?: string }
    errorMessage.value = value.data?.message || value.message || 'Failed to load branches.'
  }
}

async function loadCheckers() {
  const requestId = ++checkerRequestId
  checkers.value = []
  errorMessage.value = ''
  if (selectedBranchId.value == null) return

  loading.value = true
  try {
    const response = await $fetch<CheckerResponse>(`${apiBaseUrl}/api/pfcScore/checker`, {
      headers: { Authorization: token.value ? `Bearer ${token.value}` : '' },
      query: {
        branchId: selectedBranchId.value === ALL_BRANCHES_ID
          ? 'all'
          : selectedBranchId.value
      }
    })
    if (requestId !== checkerRequestId) return
    branches.value = response.branches || []
    checkers.value = response.checkers || []
  } catch (error) {
    if (requestId !== checkerRequestId) return
    const value = error as { data?: { message?: string }, message?: string }
    errorMessage.value = value.data?.message || value.message || 'Failed to load checkers.'
    toast.add({ title: 'Failed to load checkers', color: 'error' })
  } finally {
    if (requestId === checkerRequestId) loading.value = false
  }
}

watch(selectedBranchId, loadCheckers)
await loadBranches()
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Performance Checkers">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UCard>
          <template #header>
            <div>
              <h2 class="font-semibold">
                Checker Filter
              </h2>
              <p class="text-sm text-muted">
                Select a branch to load its checkers and their assigned ratings.
              </p>
            </div>
          </template>

          <div class="grid grid-cols-2 items-end gap-4">
            <UFormField label="Branch" required class="w-full">
              <USelect
                v-model="selectedBranchId"
                :items="branchOptions"
                value-key="value"
                placeholder="Select branch"
                class="w-full"
              />
            </UFormField>
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="Search checker or rating..."
              :disabled="selectedBranchId == null"
              class="w-full"
            />
          </div>
        </UCard>

        <div class="flex flex-nowrap gap-4">
          <UCard class="min-w-0 flex-1">
            <p class="text-sm text-muted">
              Checkers
            </p>
            <p class="text-2xl font-semibold">
              {{ checkers.length }}
            </p>
          </UCard>
          <UCard class="min-w-0 flex-1">
            <p class="text-sm text-muted">
              Branches
            </p>
            <p class="text-2xl font-semibold">
              {{ representedBranches }}
            </p>
          </UCard>
          <UCard class="min-w-0 flex-1">
            <p class="text-sm text-muted">
              Rating Assignments
            </p>
            <p class="text-2xl font-semibold">
              {{ assignedRatingCount }}
            </p>
          </UCard>
        </div>

        <div
          v-if="errorMessage"
          class="rounded-lg border border-error/30 bg-error/5 p-4 text-error"
        >
          {{ errorMessage }}
        </div>

        <UCard v-else>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-semibold">
                Checker List
              </h2>
              <UBadge color="neutral" variant="soft">
                {{ filteredCheckers.length }} records
              </UBadge>
            </div>
          </template>

          <div class="overflow-x-auto rounded-lg border border-default">
            <table class="min-w-[900px] w-full border-collapse text-sm">
              <thead class="bg-muted/40">
                <tr>
                  <th class="border border-default px-3 py-2 text-center">
                    No
                  </th>
                  <th class="border border-default px-3 py-2 text-left">
                    NIK
                  </th>
                  <th class="border border-default px-3 py-2 text-left">
                    Name
                  </th>
                  <th class="border border-default px-3 py-2 text-left">
                    Branch
                  </th>
                  <th class="border border-default px-3 py-2 text-left">
                    Branch Unit
                  </th>
                  <th class="border border-default px-3 py-2 text-left">
                    Sector
                  </th>
                  <th class="border border-default px-3 py-2 text-left">
                    Ratings Can Check
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(checker, index) in filteredCheckers" :key="checker.nik">
                  <td class="border border-default px-3 py-2 text-center">
                    {{ index + 1 }}
                  </td>
                  <td class="border border-default px-3 py-2 font-medium">
                    {{ checker.nik }}
                  </td>
                  <td class="border border-default px-3 py-2">
                    {{ checker.name || '-' }}
                  </td>
                  <td class="border border-default px-3 py-2">
                    {{ checker.branch?.branch || '-' }}
                  </td>
                  <td class="border border-default px-3 py-2">
                    {{ checker.branchUnit?.unit || '-' }}
                  </td>
                  <td class="border border-default px-3 py-2">
                    {{ checker.sector?.sector || '-' }}
                  </td>
                  <td class="border border-default px-3 py-2">
                    <div v-if="checker.checkerRatings.length" class="flex flex-wrap gap-1.5">
                      <UBadge
                        v-for="rating in checker.checkerRatings"
                        :key="rating.id"
                        color="primary"
                        variant="soft"
                      >
                        {{ rating.rating || `Rating ${rating.id}` }}
                      </UBadge>
                    </div>
                    <span v-else class="text-muted">No rating assigned</span>
                  </td>
                </tr>
                <tr v-if="!loading && selectedBranchId != null && filteredCheckers.length === 0">
                  <td colspan="7" class="border border-default px-3 py-8 text-center text-muted">
                    No checkers were found for the selected branch.
                  </td>
                </tr>
                <tr v-if="loading">
                  <td colspan="7" class="border border-default px-3 py-8 text-center text-muted">
                    Loading checkers...
                  </td>
                </tr>
                <tr v-if="selectedBranchId == null">
                  <td colspan="7" class="border border-default px-3 py-8 text-center text-muted">
                    Select a branch to load checker data.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
