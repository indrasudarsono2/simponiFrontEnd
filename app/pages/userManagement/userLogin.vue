<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

interface Branch {
  id: number
  branch: string
}

interface LoginStatus {
  userNik: string
  failedLoginCount: number
  firstFailedAt: string | null
  lastFailedAt: string | null
  lockedUntil: string | null
  isCooldownActive: boolean
  retryAfterSeconds: number
  user: {
    name: string | null
    licenseUserId: string | null
    branch: Branch | null
  }
}

interface LoginStatusResponse {
  success: boolean
  data: LoginStatus[]
}

const apiBaseUrl = useApiBaseUrl()
const toast = useToast()
const { token } = useAuth()
const csrfToken = useCookie<string | null>('csrf_token')
const search = ref('')
const selectedBranch = ref('all')
const clearingNik = ref<string | null>(null)
const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')

const { data, status, refresh } = await useFetch<LoginStatusResponse>(
  `${apiBaseUrl}/api/userLoginSecurity`,
  {
    credentials: 'include',
    headers: { Authorization: token.value ? `Bearer ${token.value}` : '' }
  }
)

const loginStatuses = computed(() => data.value?.data || [])
const activeCooldowns = computed(() => loginStatuses.value.filter(item => item.isCooldownActive).length)

const branchOptions = computed(() => {
  const branches = new Map<number, string>()
  loginStatuses.value.forEach((item) => {
    if (item.user.branch) branches.set(item.user.branch.id, item.user.branch.branch)
  })
  return [
    { label: 'All Branches', value: 'all' },
    ...Array.from(branches, ([value, label]) => ({ label, value: String(value) }))
      .sort((a, b) => a.label.localeCompare(b.label))
  ]
})

const filteredStatuses = computed(() => {
  const query = search.value.trim().toLowerCase()
  return loginStatuses.value.filter((item) => {
    const matchesBranch = selectedBranch.value === 'all'
      || String(item.user.branch?.id) === selectedBranch.value
    const matchesSearch = !query
      || item.userNik.toLowerCase().includes(query)
      || String(item.user.name || '').toLowerCase().includes(query)
      || String(item.user.licenseUserId || '').toLowerCase().includes(query)
    return matchesBranch && matchesSearch
  })
})

const formatDateTime = (value: string | null) => value
  ? new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Jakarta'
    }).format(new Date(value))
  : '-'

const formatRemaining = (seconds: number) => {
  if (seconds <= 0) return 'Expired'
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'data' in error) {
    const payload = (error as { data?: { message?: string } }).data
    if (payload?.message) return payload.message
  }
  return 'Unable to clear the login failure status.'
}

const clearLoginStatus = async (item: LoginStatus) => {
  const displayName = item.user.name || item.userNik
  if (!window.confirm(`Clear failed login status for ${displayName}?`)) return

  clearingNik.value = item.userNik
  try {
    const result = await $fetch<{ success: boolean, message: string }>(
      `${apiBaseUrl}/api/userLoginSecurity/${encodeURIComponent(item.userNik)}/clear`,
      {
        method: 'POST',
        credentials: 'include',
        headers: csrfToken.value ? { 'X-CSRF-Token': csrfToken.value } : undefined
      }
    )
    toast.add({ title: 'Login status cleared', description: result.message, color: 'success' })
    await refresh()
  } catch (error) {
    toast.add({ title: 'Unable to clear status', description: getErrorMessage(error), color: 'error' })
  } finally {
    clearingNik.value = null
  }
}

const columns: TableColumn<LoginStatus>[] = [
  {
    accessorKey: 'user.name',
    header: 'User',
    cell: ({ row }) => h('div', {}, [
      h('div', { class: 'font-medium text-highlighted' }, row.original.user.name || '-'),
      h('div', { class: 'text-xs text-muted' }, `NIK: ${row.original.userNik}`)
    ])
  },
  {
    id: 'branch',
    header: 'Branch',
    cell: ({ row }) => row.original.user.branch?.branch || '-'
  },
  {
    accessorKey: 'failedLoginCount',
    header: 'Failed Attempts'
  },
  {
    id: 'lastFailedAt',
    header: 'Last Failure',
    cell: ({ row }) => formatDateTime(row.original.lastFailedAt)
  },
  {
    id: 'status',
    header: 'Login Status',
    cell: ({ row }) => row.original.isCooldownActive
      ? h(UBadge, { color: 'error', variant: 'soft', label: `Cooldown · ${formatRemaining(row.original.retryAfterSeconds)}` })
      : h(UBadge, { color: 'warning', variant: 'soft', label: 'Failed attempts recorded' })
  },
  {
    id: 'lockedUntil',
    header: 'Cooldown Until',
    cell: ({ row }) => formatDateTime(row.original.lockedUntil)
  },
  {
    id: 'actions',
    header: 'Action',
    cell: ({ row }) => h(UButton, {
      label: 'Clear Status',
      icon: 'i-lucide-lock-open',
      color: 'primary',
      variant: 'soft',
      size: 'sm',
      loading: clearingNik.value === row.original.userNik,
      disabled: clearingNik.value !== null,
      onClick: () => clearLoginStatus(row.original)
    })
  }
]
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="User Login Security">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid gap-4 sm:grid-cols-2">
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-muted">
                Users with failed logins
              </p>
              <p class="mt-1 text-2xl font-semibold">
                {{ loginStatuses.length }}
              </p>
            </div>
            <UIcon name="i-lucide-user-x" class="size-8 text-warning" />
          </div>
        </UCard>
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-muted">
                Active cooldowns
              </p>
              <p class="mt-1 text-2xl font-semibold">
                {{ activeCooldowns }}
              </p>
            </div>
            <UIcon name="i-lucide-lock-keyhole" class="size-8 text-error" />
          </div>
        </UCard>
      </div>

      <UCard>
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <USelect
            v-model="selectedBranch"
            :items="branchOptions"
            value-key="value"
            class="w-full sm:w-64"
          />
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search name, NIK, or license ID"
            class="w-full sm:max-w-md"
          />
          <UButton
            label="Refresh"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            :loading="status === 'pending'"
            class="sm:ml-auto"
            @click="refresh"
          />
        </div>

        <UTable
          :data="filteredStatuses"
          :columns="columns"
          :loading="status === 'pending'"
          class="w-full"
        />

        <div
          v-if="status === 'success' && filteredStatuses.length === 0"
          class="flex flex-col items-center py-12 text-center"
        >
          <UIcon name="i-lucide-shield-check" class="mb-3 size-10 text-success" />
          <p class="font-medium">
            No failed login status found
          </p>
          <p class="text-sm text-muted">
            Only users with recorded login failures appear on this page.
          </p>
        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
