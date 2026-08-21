<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import type { CalendarDate } from '@internationalized/date'
import { parseDate } from '@internationalized/date'

const toast = useToast()
const { token } = useAuth()

type UserOption = { nik: string, name: string }
type LogBook = {
  id?: number
  duration?: number | null
  timeIn?: string | null
  timeOut?: string | null
  supervisorLogBook?: { name?: string | null } | null
  shift?: { shiftName?: { shift?: string | null } | null } | null
  cwp?: {
    cwp?: string | null
    rating?: { rating?: string | null } | null
  } | null
  dutyReport?: { shiftDate?: string | null } | null
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== 'object' || error === null) return fallback

  const fetchError = error as {
    data?: { message?: string, statusMessage?: string }
    message?: string
  }

  return fetchError.data?.message
    || fetchError.data?.statusMessage
    || fetchError.message
    || fallback
}

// ── State ──
const loading = ref(false)
const loadingBranches = ref(false)
const loadingUsers = ref(false)
const logBooks = ref<LogBook[]>([])
const selectedUser = ref<UserOption | null>(null)
const selectedUserNik = ref<string>('')
const selectedBranchId = ref<number | undefined>()
const branches = ref<{ id: number, branch: string }[]>([])
const users = ref<UserOption[]>([])

// ── Date Range ──
const startDateStr = ref('')
const endDateStr = ref('')

const extractDatePart = (value: string) => {
  if (!value) return ''
  return value.split('T')[0]?.trim() || ''
}

const parseDateString = (value: string): CalendarDate | null => {
  const datePart = extractDatePart(value)
  if (!datePart) return null
  try {
    return parseDate(datePart)
  } catch {
    return null
  }
}

const formatCalendarDate = (value?: CalendarDate) => {
  if (!value) return ''
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
}

const formatDisplayDate = (value: string) => {
  const datePart = extractDatePart(value)
  const [year, month, day] = datePart.split('-').map(Number)
  if (!year || !month || !day) return ''

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(year, month - 1, day))
}

const dateRangeLabel = computed(() => {
  if (!startDateStr.value) return ''
  const start = formatDisplayDate(startDateStr.value)
  const end = formatDisplayDate(endDateStr.value)
  return end ? `${start} - ${end}` : start
})

const dateRange = computed({
  get: () => {
    const start = parseDateString(startDateStr.value)
    const end = parseDateString(endDateStr.value)
    return {
      start: start ?? undefined,
      end: end ?? undefined
    }
  },
  set: (newValue: { start?: CalendarDate, end?: CalendarDate }) => {
    startDateStr.value = formatCalendarDate(newValue.start)
    endDateStr.value = formatCalendarDate(newValue.end)
  }
})

// ── Rating Summary ──
const ratingSummary = computed(() => {
  const map = new Map<string, { hours: number, minutes: number }>()
  for (const lb of logBooks.value) {
    const rating = lb.cwp?.rating?.rating || 'No Rating'
    const existing = map.get(rating) || { hours: 0, minutes: 0 }
    existing.minutes += lb.duration || 0
    map.set(rating, existing)
  }
  const result: { rating: string, hours: number, minutes: number }[] = []
  for (const [rating, dur] of map) {
    const totalMinutes = dur.hours * 60 + dur.minutes
    result.push({
      rating,
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    })
  }
  return result
})

// ── CWP Summary ──
const cwpSummary = computed(() => {
  const map = new Map<string, { hours: number, minutes: number }>()
  for (const lb of logBooks.value) {
    const cwp = lb.cwp?.cwp || 'No CWP'
    const existing = map.get(cwp) || { hours: 0, minutes: 0 }
    existing.minutes += lb.duration || 0
    map.set(cwp, existing)
  }
  const result: { cwp: string, hours: number, minutes: number }[] = []
  for (const [cwp, dur] of map) {
    const totalMinutes = dur.hours * 60 + dur.minutes
    result.push({
      cwp,
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    })
  }
  return result
})

// ── Load Branches ──
async function loadBranches() {
  loadingBranches.value = true
  try {
    const data = await $fetch<{ id: number, branch: string }[]>(
      `${apiBaseUrl}/api/branches`, {
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : ''
        }
      })
    branches.value = data || []
  } catch (error: unknown) {
    toast.add({
      title: 'Error',
      description: getErrorMessage(error, 'Failed to load branches'),
      color: 'error'
    })
  } finally {
    loadingBranches.value = false
  }
}

// ── Load Users by Branch ──
async function loadUsersByBranch(branchId?: number) {
  if (!branchId) {
    users.value = []
    selectedUserNik.value = ''
    selectedUser.value = null
    return
  }
  loadingUsers.value = true
  try {
    const data = await $fetch<{ users: UserOption[] }>(
      `${apiBaseUrl}/api/personalLogbookGa/users-by-branch/${branchId}`,
      {
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : ''
        }
      }
    )
    users.value = data.users || []
    // Reset user selection when branch changes
    selectedUserNik.value = ''
    selectedUser.value = null
  } catch (error: unknown) {
    toast.add({
      title: 'Error',
      description: getErrorMessage(error, 'Failed to load users'),
      color: 'error'
    })
  } finally {
    loadingUsers.value = false
  }
}

// ── Watch branch change ──
watch(selectedBranchId, (newBranchId) => {
  loadUsersByBranch(newBranchId)
})

// ── Load Personal Logbook ──
async function loadPersonalLogbook() {
  if (!startDateStr.value || !endDateStr.value || !selectedUserNik.value)
    return

  loading.value = true
  logBooks.value = []
  selectedUser.value = null

  try {
    const data = await $fetch<{ logBooks: LogBook[], user: UserOption }>(
      `${apiBaseUrl}/api/personalLogbookGa`, {
        method: 'POST',
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : ''
        },
        body: {
          nik: selectedUserNik.value,
          startDate: startDateStr.value,
          endDate: endDateStr.value
        }
      }
    )
    logBooks.value = data.logBooks || []
    selectedUser.value
      = data.user
        || users.value.find(u => u.nik === selectedUserNik.value)
        || null
  } catch (error: unknown) {
    toast.add({
      title: 'Error',
      description: getErrorMessage(error, 'Failed to load personal logbook'),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// ── Format duration ──
function formatDuration(duration: number | null | undefined): string {
  if (duration === null || duration === undefined) return '-'
  const h = Math.floor(duration / 60)
  const m = duration % 60
  if (duration === 0) return '0 min'
  let result = ''
  if (h > 0) result += `${h} h `
  if (m > 0) result += `${m} min`
  return result.trim()
}

// ── Init ──
onMounted(() => {
  loadBranches()
})
</script>

<template>
  <UDashboardPanel id="personal-logbook-ga">
    <template #header>
      <UDashboardNavbar title="Personal Logbook (General Admin)">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <!-- Filter Card -->
        <UCard>
          <template #header>
            <div class="flex flex-col gap-1">
              <h2 class="font-semibold text-highlighted">
                Select Date, Branch & User
              </h2>
              <p class="text-sm text-muted">
                Choose a branch first, then select one of its users.
              </p>
            </div>
          </template>

          <div class="space-y-4">
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <!-- Date Range Picker -->
              <UFormField label="Date Range" required>
                <UPopover :content="{ align: 'start' }" :modal="true">
                  <UButton
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-calendar"
                    class="w-full justify-between"
                  >
                    <span v-if="dateRangeLabel" class="truncate">
                      {{ dateRangeLabel }}
                    </span>
                    <span v-else class="text-muted"> Pick a date range </span>

                    <template #trailing>
                      <UIcon name="i-lucide-calendar" class="size-4" />
                    </template>
                  </UButton>

                  <template #content>
                    <UCalendar
                      v-model="dateRange"
                      class="p-2"
                      :number-of-months="2"
                      range
                    />
                  </template>
                </UPopover>
              </UFormField>

              <!-- Branch Selection -->
              <UFormField label="Branch" required>
                <USelect
                  v-model="selectedBranchId"
                  :items="
                    branches.map((b) => ({
                      label: b.branch || `Branch ${b.id}`,
                      value: b.id
                    }))
                  "
                  placeholder="Select a branch..."
                  :loading="loadingBranches"
                  searchable
                  searchable-placeholder="Search branch..."
                  class="w-full"
                />
              </UFormField>

              <!-- User Selection -->
              <UFormField label="User" required>
                <USelect
                  v-model="selectedUserNik"
                  :items="
                    users.map((u) => ({
                      label: `${u.name} (${u.nik})`,
                      value: u.nik
                    }))
                  "
                  placeholder="Select a user..."
                  :loading="loadingUsers"
                  :disabled="!selectedBranchId"
                  searchable
                  searchable-placeholder="Search user..."
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="flex flex-wrap items-center gap-4">
              <UButton
                label="Load Data"
                icon="i-lucide-search"
                color="primary"
                :loading="loading"
                :disabled="!startDateStr || !selectedUserNik || !selectedBranchId"
                @click="loadPersonalLogbook"
              />
            </div>
          </div>
        </UCard>

        <!-- Loading State -->
        <div v-if="loading" class="py-8 text-center text-muted">
          Loading personal logbook data...
        </div>

        <!-- Empty State -->
        <div
          v-else-if="!logBooks.length && selectedUser"
          class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
        >
          No logbook entries found for
          {{ selectedUser.name }} in the selected date range.
        </div>

        <!-- Initial State -->
        <div
          v-else-if="!logBooks.length"
          class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
        >
          Choose branch, date and user, then click Load Data to show personal
          logbook.
        </div>

        <!-- Data Loaded -->
        <template v-else>
          <!-- Rating Summary & CWP Summary -->
          <div
            v-if="logBooks.length"
            class="grid grid-cols-1 gap-4 lg:grid-cols-2"
          >
            <UCard>
              <template #header>
                <div class="flex flex-col gap-1">
                  <h2 class="font-semibold text-highlighted">
                    Rating Summary
                  </h2>
                  <p class="text-sm text-muted">
                    Total hours accumulated per rating.
                  </p>
                </div>
              </template>

              <div class="overflow-x-auto rounded-lg border border-default">
                <table class="min-w-full border-collapse text-sm">
                  <thead class="bg-elevated/50">
                    <tr>
                      <th class="border border-default px-4 py-3 text-center">
                        No
                      </th>
                      <th class="border border-default px-4 py-3 text-center">
                        Rating
                      </th>
                      <th class="border border-default px-4 py-3 text-center">
                        Total Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in ratingSummary" :key="item.rating">
                      <td
                        class="border border-default px-4 py-3 align-top text-center"
                      >
                        {{ idx + 1 }}
                      </td>
                      <td
                        class="border border-default px-4 py-3 align-top font-medium text-center"
                      >
                        {{ item.rating }}
                      </td>
                      <td
                        class="border border-default px-4 py-3 align-top text-center"
                      >
                        {{ item.hours }} h {{ item.minutes }} min
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </UCard>

            <UCard>
              <template #header>
                <div class="flex flex-col gap-1">
                  <h2 class="font-semibold text-highlighted">
                    CWP Summary
                  </h2>
                  <p class="text-sm text-muted">
                    Total hours accumulated per CWP.
                  </p>
                </div>
              </template>

              <div class="overflow-x-auto rounded-lg border border-default">
                <table class="min-w-full border-collapse text-sm">
                  <thead class="bg-elevated/50">
                    <tr>
                      <th class="border border-default px-4 py-3 text-center">
                        No
                      </th>
                      <th class="border border-default px-4 py-3 text-center">
                        CWP
                      </th>
                      <th class="border border-default px-4 py-3 text-center">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in cwpSummary" :key="item.cwp">
                      <td
                        class="border border-default px-4 py-3 align-top text-center"
                      >
                        {{ idx + 1 }}
                      </td>
                      <td
                        class="border border-default px-4 py-3 align-top font-medium text-center"
                      >
                        {{ item.cwp }}
                      </td>
                      <td
                        class="border border-default px-4 py-3 align-top text-center"
                      >
                        {{ item.hours }} h {{ item.minutes }} min
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </UCard>
          </div>

          <!-- Logbook Table -->
          <UCard>
            <template #header>
              <div class="flex flex-col gap-1">
                <h2 class="font-semibold text-highlighted">
                  Logbook Entries
                  <span class="text-sm font-normal text-muted">
                    ({{ logBooks.length }} entries)
                  </span>
                </h2>
                <p class="text-sm text-muted">
                  {{ selectedUser?.name }} ({{ selectedUser?.nik }})
                </p>
              </div>
            </template>

            <div class="overflow-x-auto rounded-lg border border-default">
              <table class="min-w-full border-collapse text-sm">
                <thead class="bg-elevated/50">
                  <tr>
                    <th class="border border-default px-4 py-3 text-center">
                      No
                    </th>
                    <th class="border border-default px-4 py-3 text-center">
                      Date
                    </th>
                    <th class="border border-default px-4 py-3 text-center">
                      CWP
                    </th>
                    <th class="border border-default px-4 py-3 text-center">
                      Rating
                    </th>
                    <th class="border border-default px-4 py-3 text-center">
                      Duration
                    </th>
                    <th class="border border-default px-4 py-3 text-center">
                      Supervisor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(lb, idx) in logBooks" :key="lb.id || idx">
                    <td
                      class="border border-default px-4 py-3 align-top text-center"
                    >
                      {{ idx + 1 }}
                    </td>
                    <td
                      class="border border-default px-4 py-3 align-top text-center whitespace-nowrap"
                    >
                      {{
                        lb.dutyReport?.shiftDate
                          ? formatDisplayDate(lb.dutyReport.shiftDate)
                          : "-"
                      }}
                    </td>
                    <td
                      class="border border-default px-4 py-3 align-top font-medium text-center"
                    >
                      {{ lb.cwp?.cwp || "-" }}
                    </td>
                    <td
                      class="border border-default px-4 py-3 align-top text-center"
                    >
                      {{ lb.cwp?.rating?.rating || "-" }}
                    </td>
                    <td
                      class="border border-default px-4 py-3 align-top text-center"
                    >
                      {{ formatDuration(lb.duration) }}
                    </td>
                    <td class="border border-default px-4 py-3 align-top">
                      {{ lb.supervisorLogBook?.name || "-" }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
