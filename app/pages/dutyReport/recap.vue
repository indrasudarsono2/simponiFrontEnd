<script setup lang="ts">
import ip from '../../utils/config.json'

interface ShiftDetail {
  id: number
  start: string | null
  end: string | null
  isControl: boolean
}

interface ShiftName {
  id: number
  shift: string | null
  shifts: ShiftDetail[]
}

interface Cwp {
  id: number
  cwp: string | null
  rating?: {
    id: number
    rating: string | null
  } | null
  cwpFrequencies?: CwpFrequency[]
}

interface CwpFrequency {
  id: number
  cwpId: number | null
  frequency: string | null
  isPrimary: boolean | null
  cwp?: Cwp | null
  statusFrequencies?: StatusFrequency[]
}

interface CwpSupervisor {
  id: number
  cwp: Cwp | null
}

interface SupervisorDefinition {
  id: number
  supervisor: string | null
  cwpSupervisors: CwpSupervisor[]
}

interface OnGoingIssue {
  id: number
  other: string | null
  start?: string | null
  finish?: string | null
  isClosed?: boolean
  equipment?: {
    equipment: string | null
  } | null
  reporterUser?: SupervisorUser | null
  messages?: {
    id: number
    message: string | null
    createdAt: string
  }[]
}

interface DutyReportOnGoingIssue {
  id: number
  dutyReportId: number
  onGoingIssueId: number
  attachedAt: string
  onGoingIssue: OnGoingIssue
}

interface SupervisorUser {
  nik: string | null
  name: string | null
}

interface StatusFreq {
  id: number
  status: string | null
}

interface StatusFrequency {
  id: number
  dutyReportId: number | null
  cwpFrequencyId: number | null
  statusFreqId: number | null
  remark: string | null
  statusFreq: StatusFreq | null
  cwpFrequency?: CwpFrequency | null
}

interface LogBook {
  id: number
  userNik: string | null
  timeIn: string | null
  timeOut: string | null
  duration: number | null
  isFinal: boolean
  user?: SupervisorUser | null
  cwp?: Cwp | null
}

interface LhdReport {
  id: number
  time: string | null
  message: string | null
  lhdBook: {
    id: number
    code: string | null
    lhd: string | null
  } | null
}

interface DutyReportRecap {
  id: number
  shiftDate: string | null
  others: string | null
  supervisor: string | null
  supervisorCwp: SupervisorDefinition | null
  shiftName: ShiftName | null
  onGoingIssue: OnGoingIssue | null
  onGoingIssueLinks?: DutyReportOnGoingIssue[]
  spv: SupervisorUser | null
  logBooks?: LogBook[]
  statusFrequencies?: StatusFrequency[]
  lhdReports?: LhdReport[]
}

function formatLocalDateInput(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDisplayDate(value?: string | null) {
  if (!value) return '-'

  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return '-'

  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

const selectedDate = ref(formatLocalDateInput(new Date()))
const selectedShiftNameId = ref<number | undefined>()
const recapRows = ref<DutyReportRecap[]>([])
const recapLoading = ref(false)
const toast = useToast()
const { token } = useAuth()

const shiftTabs = computed(() => {
  const shiftMap = new Map<number, ShiftName>()

  for (const row of recapRows.value) {
    if (row.shiftName?.id) shiftMap.set(row.shiftName.id, row.shiftName)
  }

  return Array.from(shiftMap.values()).map(shiftName => ({
    label: shiftName.shift || `Shift ${shiftName.id}`,
    value: shiftName.id
  }))
})

const filteredRecapRows = computed(() =>
  recapRows.value.filter(
    row => row.shiftName?.id === selectedShiftNameId.value
  )
)

const positionLogRows = computed(() =>
  filteredRecapRows.value.flatMap(dutyReport =>
    (dutyReport.logBooks || []).map(logBook => ({
      dutyReport,
      logBook
    }))
  )
)

const frequencyStatusRows = computed(() =>
  filteredRecapRows.value.flatMap((dutyReport) => {
    const statusFrequencyMap = new Map(
      (dutyReport.statusFrequencies || [])
        .filter(statusFrequency => statusFrequency.cwpFrequencyId)
        .map(statusFrequency => [
          statusFrequency.cwpFrequencyId,
          statusFrequency
        ])
    )

    return (dutyReport.supervisorCwp?.cwpSupervisors || []).flatMap(
      cwpSupervisor =>
        (cwpSupervisor.cwp?.cwpFrequencies || []).map(frequency => ({
          dutyReport,
          cwp: cwpSupervisor.cwp,
          frequency,
          statusFrequency: statusFrequencyMap.get(frequency.id) || null
        }))
    )
  })
)

const lhdReportRows = computed(() =>
  filteredRecapRows.value.flatMap(dutyReport =>
    (dutyReport.lhdReports || []).map(lhdReport => ({
      dutyReport,
      lhdReport
    }))
  )
)

const frequencyStatusGroups = computed(() => {
  const groups: {
    key: string
    cwp: Cwp | null
    rows: (typeof frequencyStatusRows.value)[number][]
  }[] = []

  for (const row of frequencyStatusRows.value) {
    const key = `${row.dutyReport.id}-${row.cwp?.id || 'empty'}`
    let group = groups.find(item => item.key === key)

    if (!group) {
      group = {
        key,
        cwp: row.cwp,
        rows: []
      }
      groups.push(group)
    }

    group.rows.push(row)
  }

  return groups
})

const frequencyStatusDebugData = computed(() => ({
  selectedDate: selectedDate.value,
  selectedShiftNameId: selectedShiftNameId.value,
  filteredDutyReports: filteredRecapRows.value.map(dutyReport => ({
    id: dutyReport.id,
    shiftDate: dutyReport.shiftDate,
    supervisor: dutyReport.supervisor,
    supervisorName: dutyReport.spv?.name || null,
    shiftName: dutyReport.shiftName,
    supervisorCwp: dutyReport.supervisorCwp,
    statusFrequencies: dutyReport.statusFrequencies || []
  })),
  renderedRows: frequencyStatusRows.value.map(row => ({
    dutyReportId: row.dutyReport.id,
    cwpId: row.cwp?.id || null,
    cwp: row.cwp?.cwp || null,
    rating: row.cwp?.rating?.rating || null,
    cwpFrequencyId: row.frequency?.id || null,
    frequency: row.frequency?.frequency || null,
    isPrimary: row.frequency?.isPrimary ?? null,
    statusFrequencyId: row.statusFrequency?.id || null,
    statusFreqId: row.statusFrequency?.statusFreqId || null,
    status: row.statusFrequency?.statusFreq?.status || null,
    remark: row.statusFrequency?.remark || ''
  }))
}))

watch(shiftTabs, (nextTabs) => {
  if (!nextTabs.length) {
    selectedShiftNameId.value = undefined
    return
  }

  const hasSelected = nextTabs.some(
    tab => tab.value === selectedShiftNameId.value
  )

  if (!hasSelected) selectedShiftNameId.value = nextTabs[0]?.value
})

function formatShiftLabel(shiftName: ShiftName | null) {
  if (!shiftName) return '-'

  const shifts = shiftName.shifts || []
  const firstShift = shifts[0]
  const lastShift = shifts[shifts.length - 1]

  return `${shiftName.shift || 'Shift'}(${firstShift?.start || '-'}-${lastShift?.end || '-'})`
}

function formatSupervisorCwps(supervisor: SupervisorDefinition | null) {
  const cwpRows = supervisor?.cwpSupervisors || []
  if (!cwpRows.length) return '-'

  return cwpRows.map(row => row.cwp?.cwp || '-').join(', ')
}

function formatOnGoingIssue(issue: OnGoingIssue | null) {
  if (!issue) return '-'

  return issue.equipment?.equipment || issue.other || `Issue ${issue.id}`
}

function getRelatedOnGoingIssues(dutyReport: DutyReportRecap) {
  const linkedIssues = (dutyReport.onGoingIssueLinks || []).map(link => ({
    issue: link.onGoingIssue,
    attachedAt: link.attachedAt
  }))

  if (linkedIssues.length) return linkedIssues
  return dutyReport.onGoingIssue
    ? [{ issue: dutyReport.onGoingIssue, attachedAt: null }]
    : []
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

function formatUtcTime(value?: string | null) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')

  return `${hours}:${minutes}`
}

function formatDuration(value?: number | null) {
  if (value === null || value === undefined) return '-'

  const hours = Math.floor(value / 60)
  const minutes = value % 60

  if (!hours) return `${minutes} min`
  if (!minutes) return `${hours} h`

  return `${hours} h ${minutes} min`
}

function _downloadFrequencyStatusDebug() {
  const blob = new Blob(
    [JSON.stringify(frequencyStatusDebugData.value, null, 2)],
    {
      type: 'application/json'
    }
  )
  const link = document.createElement('a')
  const date = selectedDate.value || 'date'
  const shift = selectedShiftNameId.value || 'shift'

  link.href = URL.createObjectURL(blob)
  link.download = `recap-frequency-status-${date}-${shift}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

async function loadDutyReportRecap() {
  if (!selectedDate.value) {
    toast.add({
      title: 'Date Required',
      description: 'Please choose recap date first.',
      color: 'warning'
    })
    return
  }

  recapLoading.value = true

  try {
    recapRows.value = await $fetch<DutyReportRecap[]>(
      `http://${ip.ipBackEnd}/api/dutyReports/recap?date=${selectedDate.value}`,
      {
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : ''
        }
      }
    )
    selectedShiftNameId.value = shiftTabs.value[0]?.value

    toast.add({
      title: 'Loaded',
      description: 'Duty report recap has been loaded.',
      color: 'success'
    })
  } catch (error: unknown) {
    const requestError = error as {
      data?: { message?: string, statusMessage?: string }
      message?: string
    }
    toast.add({
      title: 'Load Failed',
      description:
        requestError.data?.message
        || requestError.data?.statusMessage
        || requestError.message
        || 'Failed to load duty report recap.',
      color: 'error'
    })
  } finally {
    recapLoading.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="duty-report-recap">
    <template #header>
      <UDashboardNavbar title="Duty Report Recap">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4 p-4 sm:p-6">
        <UCard>
          <template #header>
            <div class="flex flex-col gap-1">
              <h2 class="font-semibold text-highlighted">
                Select Recap Date
              </h2>
              <p class="text-sm text-muted">
                Choose the local date for Duty Report recap data.
              </p>
            </div>
          </template>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <UFormField label="Date" required>
              <UInput v-model="selectedDate" type="date" class="w-full" />
            </UFormField>

            <div class="rounded-lg border border-default bg-elevated/30 p-3">
              <div class="text-xs uppercase text-muted">
                Selected Date
              </div>
              <div class="font-medium text-highlighted">
                {{ formatDisplayDate(selectedDate) }}
              </div>
            </div>
          </div>

          <div class="mt-4">
            <UButton
              label="Load Recap"
              icon="i-lucide-search"
              color="primary"
              :loading="recapLoading"
              :disabled="!selectedDate"
              @click="loadDutyReportRecap"
            />
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex flex-col gap-1">
              <h2 class="font-semibold text-highlighted">
                Recap Data
              </h2>
              <p class="text-sm text-muted">
                Recap content will be loaded for the selected date in the next
                step.
              </p>
            </div>
          </template>

          <div v-if="recapLoading" class="py-8 text-center text-muted">
            Loading duty report recap...
          </div>

          <div
            v-else-if="!recapRows.length"
            class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
          >
            Choose date and click Load Recap to show duty report recap.
          </div>

          <div v-else class="space-y-4">
            <UTabs
              v-if="shiftTabs.length"
              v-model="selectedShiftNameId"
              :items="shiftTabs"
              :content="false"
              size="lg"
            />

            <div class="overflow-x-auto rounded-lg border border-default">
              <table class="min-w-full border-collapse text-sm">
                <thead class="bg-elevated/50">
                  <tr>
                    <th class="border border-default px-4 py-3 text-left">
                      No
                    </th>
                    <th class="border border-default px-4 py-3 text-left">
                      Supervisor Assignment
                    </th>
                    <th class="border border-default px-4 py-3 text-left">
                      Shift
                    </th>
                    <th class="border border-default px-4 py-3 text-left">
                      On Going Issue
                    </th>
                    <th class="border border-default px-4 py-3 text-left">
                      Supervisor
                    </th>
                    <th class="border border-default px-4 py-3 text-left">
                      Shift Date
                    </th>
                    <th class="border border-default px-4 py-3 text-left">
                      Other
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!filteredRecapRows.length">
                    <td
                      colspan="7"
                      class="border border-default px-4 py-6 text-center text-muted"
                    >
                      No recap data found for this shift.
                    </td>
                  </tr>
                  <tr
                    v-for="(row, index) in filteredRecapRows"
                    v-else
                    :key="row.id"
                  >
                    <td class="border border-default px-4 py-3 align-top">
                      {{ index + 1 }}
                    </td>
                    <td class="border border-default px-4 py-3 align-top">
                      <div class="font-medium text-highlighted">
                        {{ row.supervisorCwp?.supervisor || "-" }}
                      </div>
                      <div class="text-xs text-muted">
                        {{ formatSupervisorCwps(row.supervisorCwp) }}
                      </div>
                    </td>
                    <td class="border border-default px-4 py-3 align-top">
                      {{ formatShiftLabel(row.shiftName) }}
                    </td>
                    <td class="border border-default px-4 py-3 align-top">
                      <div
                        v-if="getRelatedOnGoingIssues(row).length"
                        class="min-w-64 space-y-3"
                      >
                        <div
                          v-for="related in getRelatedOnGoingIssues(row)"
                          :key="related.issue.id"
                          class="rounded-lg border border-default bg-elevated/30 p-3"
                        >
                          <div class="flex items-start justify-between gap-2">
                            <div class="font-medium text-highlighted">
                              {{ formatOnGoingIssue(related.issue) }}
                            </div>
                            <UBadge
                              :color="
                                related.issue.isClosed ? 'neutral' : 'warning'
                              "
                              variant="soft"
                              size="xs"
                            >
                              {{
                                related.issue.isClosed ? "Closed" : "Active"
                              }}
                            </UBadge>
                          </div>

                          <div
                            v-if="
                              related.issue.equipment?.equipment
                                && related.issue.other
                            "
                            class="mt-1 text-xs text-muted"
                          >
                            {{ related.issue.other }}
                          </div>

                          <div class="mt-2 space-y-1 text-xs text-muted">
                            <div>
                              Reporter:
                              {{ related.issue.reporterUser?.name || "-" }}
                            </div>
                            <div>
                              Started:
                              {{ formatDateTime(related.issue.start) }}
                            </div>
                            <div v-if="related.attachedAt">
                              Linked to report:
                              {{ formatDateTime(related.attachedAt) }}
                            </div>
                            <div v-if="related.issue.messages?.[0]">
                              Latest update:
                              {{ related.issue.messages[0].message || "-" }}
                            </div>
                          </div>
                        </div>
                      </div>
                      <span v-else>-</span>
                    </td>
                    <td class="border border-default px-4 py-3 align-top">
                      {{ row.spv?.name || row.supervisor || "-" }}
                    </td>
                    <td class="border border-default px-4 py-3 align-top">
                      {{ formatDisplayDate(row.shiftDate) }}
                    </td>
                    <td
                      class="border border-default px-4 py-3 align-top text-muted"
                    >
                      {{ row.others || "-" }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <UCard>
              <template #header>
                <div class="flex flex-col gap-1">
                  <h3 class="font-semibold text-highlighted">
                    Position Log
                  </h3>
                  <p class="text-sm text-muted">
                    Related logbook data for the selected shift recap.
                  </p>
                </div>
              </template>

              <div
                v-if="!positionLogRows.length"
                class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
              >
                No position log found for this shift.
              </div>

              <div
                v-else
                class="overflow-x-auto rounded-lg border border-default"
              >
                <table class="min-w-full border-collapse text-sm">
                  <thead class="bg-elevated/50">
                    <tr>
                      <th class="border border-default px-4 py-3 text-left">
                        No
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        CWP
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Name
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Time In
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Time Out
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Duration
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="({ logBook }, index) in positionLogRows"
                      :key="logBook.id"
                    >
                      <td class="border border-default px-4 py-3 align-top">
                        {{ index + 1 }}
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        <div class="font-medium text-highlighted">
                          {{ logBook.cwp?.cwp || "-" }}
                        </div>
                        <div
                          v-if="logBook.cwp?.rating?.rating"
                          class="text-xs text-muted"
                        >
                          {{ logBook.cwp.rating.rating }}
                        </div>
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        {{ logBook.user?.name || logBook.userNik || "-" }}
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        {{ formatUtcTime(logBook.timeIn) }}
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        {{ formatUtcTime(logBook.timeOut) }}
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        {{ formatDuration(logBook.duration) }}
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        <UBadge
                          :color="logBook.isFinal ? 'success' : 'neutral'"
                          variant="soft"
                        >
                          {{ logBook.isFinal ? "Final Result" : "Draft" }}
                        </UBadge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </UCard>

            <UCard>
              <template #header>
                <div
                  class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                  <div class="flex flex-col gap-1">
                    <h3 class="font-semibold text-highlighted">
                      Frequency Status
                    </h3>
                    <p class="text-sm text-muted">
                      Related frequency status data for the selected shift
                      recap.
                    </p>
                  </div>
                </div>
              </template>

              <div
                v-if="!frequencyStatusRows.length"
                class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
              >
                No frequency status found for this shift.
              </div>

              <div
                v-else
                class="overflow-x-auto rounded-lg border border-default"
              >
                <table class="min-w-full border-collapse text-sm">
                  <thead class="bg-elevated/50">
                    <tr>
                      <th class="border border-default px-4 py-3 text-left">
                        No
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        CWP
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Frequency
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Is Primary
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Status Frequency
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Remark
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <template
                      v-for="(group, groupIndex) in frequencyStatusGroups"
                      :key="group.key"
                    >
                      <tr
                        v-for="(row, rowIndex) in group.rows"
                        :key="`${group.key}-${row.frequency?.id || rowIndex}`"
                      >
                        <td
                          v-if="rowIndex === 0"
                          class="border border-default px-4 py-3 align-top"
                          :rowspan="group.rows.length"
                        >
                          {{ groupIndex + 1 }}
                        </td>
                        <td
                          v-if="rowIndex === 0"
                          class="border border-default px-4 py-3 align-top"
                          :rowspan="group.rows.length"
                        >
                          <div class="font-medium text-highlighted">
                            {{ group.cwp?.cwp || "-" }}
                          </div>
                          <div
                            v-if="group.cwp?.rating?.rating"
                            class="text-xs text-muted"
                          >
                            {{ group.cwp.rating.rating }}
                          </div>
                        </td>
                        <td class="border border-default px-4 py-3 align-top">
                          {{ row.frequency?.frequency || "-" }}
                        </td>
                        <td class="border border-default px-4 py-3 align-top">
                          <UBadge
                            :color="
                              row.frequency?.isPrimary ? 'success' : 'neutral'
                            "
                            variant="soft"
                          >
                            {{
                              row.frequency?.isPrimary ? "Primary" : "Secondary"
                            }}
                          </UBadge>
                        </td>
                        <td class="border border-default px-4 py-3 align-top">
                          {{ row.statusFrequency?.statusFreq?.status || "-" }}
                        </td>
                        <td
                          class="border border-default px-4 py-3 align-top text-muted"
                        >
                          <div
                            v-if="row.statusFrequency?.remark"
                            class="prose prose-sm max-w-none dark:prose-invert"
                            v-html="row.statusFrequency.remark"
                          />
                          <span v-else>-</span>
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </UCard>

            <UCard>
              <template #header>
                <div class="flex flex-col gap-1">
                  <h3 class="font-semibold text-highlighted">LHD Report</h3>
                  <p class="text-sm text-muted">
                    Related Large Heading Deviation occurrences for the selected
                    shift recap.
                  </p>
                </div>
              </template>

              <div
                v-if="!lhdReportRows.length"
                class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center text-sm text-muted"
              >
                No LHD occurrence found for this shift.
              </div>

              <div
                v-else
                class="overflow-x-auto rounded-lg border border-default"
              >
                <table class="min-w-full border-collapse text-sm">
                  <thead class="bg-elevated/50">
                    <tr>
                      <th class="border border-default px-4 py-3 text-left">
                        No
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Supervisor / CWP
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        ICAO Code
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        LHD Classification
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Occurrence Time
                      </th>
                      <th class="border border-default px-4 py-3 text-left">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="({ dutyReport, lhdReport }, index) in lhdReportRows"
                      :key="lhdReport.id"
                    >
                      <td class="border border-default px-4 py-3 align-top">
                        {{ index + 1 }}
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        <div class="font-medium text-highlighted">
                          {{ dutyReport.spv?.name || dutyReport.supervisor || "-" }}
                        </div>
                        <div class="text-xs text-muted">
                          {{ formatSupervisorCwps(dutyReport.supervisorCwp) }}
                        </div>
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        <UBadge color="neutral" variant="soft">
                          {{ lhdReport.lhdBook?.code || "-" }}
                        </UBadge>
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        {{ lhdReport.lhdBook?.lhd || "-" }}
                      </td>
                      <td class="border border-default px-4 py-3 align-top">
                        {{ formatDateTime(lhdReport.time) }}
                      </td>
                      <td
                        class="border border-default px-4 py-3 align-top whitespace-pre-wrap text-muted"
                      >
                        {{ lhdReport.message || "-" }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </UCard>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
