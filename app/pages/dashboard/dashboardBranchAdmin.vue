<script setup lang="ts">
import ip from "../../utils/config.json";

type DistributionItem = {
  users: number;
};

type ExpirationRecord = {
  id: number;
  nik: string | null;
  name: string | null;
  branch: string | null;
  branchUnit: string | null;
  profession: string | null;
  expiredAt: string;
  rating?: string;
  level?: string | null;
};

type DashboardBranchAdmin = {
  generatedAt: string;
  summary: {
    users: number;
    branches: number;
    branchUnits: number;
    sectors: number;
    roles: number;
    professions: number;
  };
  licenses: {
    expired: number;
    expiringWithin30Days: number;
  };
  expirationAttention: {
    ratings: ExpirationRecord[];
    medex: ExpirationRecord[];
    ielp: ExpirationRecord[];
  };
  roleDistribution: Array<DistributionItem & { role: string }>;
  branchDistribution: Array<DistributionItem & { branch: string }>;
  ongoingIssues: Array<{
    id: number;
    branch: string | null;
    equipment: string | null;
    description: string | null;
    latestMessage: string | null;
    relatedMessages: Array<{
      message: string | null;
      createdAt: string;
    }>;
    reporterNik: string | null;
    reporterName: string | null;
    start: string | null;
    finish: string | null;
    isClosed: boolean;
    updatedAt: string;
    escalationEnabled: boolean;
    escalation: {
      level: number | null;
      status: string;
      dueAt: string | null;
      triggeredAt: string | null;
    } | null;
    dutyReports: Array<{
      id: number;
      attachedAt: string;
      shiftDate: string | null;
      shift: string | null;
    }>;
  }>;
  activeDutyUsers: Array<{
    logBookId: number;
    nik: string | null;
    name: string | null;
    branch: string | null;
    branchUnit: string | null;
    timeIn: string;
    medexExpired: string | null;
    ielpExpired: string | null;
    ielpLevel: string | null;
    ratings: Array<{
      name: string;
      expiredAt: string | null;
    }>;
    shift: string | null;
    dutyReportId: number | null;
    dutyDate: string | null;
    cwp: {
      id: number;
      name: string | null;
      rating: string | null;
    } | null;
  }>;
};

const { token } = useAuth();
const selectedIssueStatus = ref("all");
const selectedExpirationTab = ref("ratings");

const { data, status, error, refresh } = await useFetch<DashboardBranchAdmin>(
  `http://${ip.ipBackEnd}/api/dashboardBranchAdmin`,
  {
    headers: computed(() => ({
      Authorization: token.value ? `Bearer ${token.value}` : "",
    })),
  },
);

const summaryCards = computed(() => [
  {
    label: "Active Users",
    value: data.value?.summary.users ?? 0,
    icon: "i-lucide-users",
    color: "text-primary",
  },
  {
    label: "Branches",
    value: data.value?.summary.branches ?? 0,
    icon: "i-lucide-building-2",
    color: "text-info",
  },
  {
    label: "Branch Units",
    value: data.value?.summary.branchUnits ?? 0,
    icon: "i-lucide-network",
    color: "text-success",
  },
  {
    label: "Sectors",
    value: data.value?.summary.sectors ?? 0,
    icon: "i-lucide-map-pinned",
    color: "text-warning",
  },
  {
    label: "Roles",
    value: data.value?.summary.roles ?? 0,
    icon: "i-lucide-shield-check",
    color: "text-secondary",
  },
  {
    label: "Professions",
    value: data.value?.summary.professions ?? 0,
    icon: "i-lucide-briefcase-business",
    color: "text-error",
  },
]);

const issueTabs = computed(() => {
  const issues = data.value?.ongoingIssues ?? [];
  return [
    { label: `All (${issues.length})`, value: "all" },
    {
      label: `Open (${issues.filter((issue) => !issue.isClosed).length})`,
      value: "open",
    },
    {
      label: `Closed (${issues.filter((issue) => issue.isClosed).length})`,
      value: "closed",
    },
  ];
});

const filteredIssues = computed(() => {
  const issues = data.value?.ongoingIssues ?? [];
  if (selectedIssueStatus.value === "open") {
    return issues.filter((issue) => !issue.isClosed);
  }
  if (selectedIssueStatus.value === "closed") {
    return issues.filter((issue) => issue.isClosed);
  }
  return issues;
});

const expirationTabs = computed(() => {
  const attention = data.value?.expirationAttention;
  return [
    {
      label: `Rating (${attention?.ratings.length ?? 0})`,
      value: "ratings",
    },
    { label: `MEDEX (${attention?.medex.length ?? 0})`, value: "medex" },
    { label: `IELP (${attention?.ielp.length ?? 0})`, value: "ielp" },
  ];
});

const selectedExpirationRecords = computed<ExpirationRecord[]>(() => {
  const attention = data.value?.expirationAttention;
  if (!attention) return [];
  if (selectedExpirationTab.value === "medex") return attention.medex;
  if (selectedExpirationTab.value === "ielp") return attention.ielp;
  return attention.ratings;
});

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatExpiryDate(value: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function expiryColor(value: string | null): "success" | "error" | "neutral" {
  if (!value) return "neutral";
  return new Date(value).getTime() < Date.now() ? "error" : "success";
}

function expirationState(value: string) {
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today";
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}

function escalationColor(
  status: string | undefined,
): "success" | "error" | "warning" | "neutral" {
  if (!status) return "neutral";
  if (["SENT", "TRIGGERED", "COMPLETED"].includes(status)) return "error";
  if (["DUE", "QUEUED", "PENDING", "WAITING"].includes(status)) {
    return "warning";
  }
  if (status === "CANCELLED") return "neutral";
  return "success";
}
</script>

<template>
  <UDashboardPanel id="dashboard-branch-admin">
    <template #header>
      <UDashboardNavbar title="Branch Admin Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="Refresh"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            :loading="status === 'pending'"
            @click="() => refresh()"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <div class="flex items-center gap-2 text-sm text-muted">
            <UIcon name="i-lucide-database" class="size-4" />
            <span>
              Live system overview
              <template v-if="data?.generatedAt">
                · Updated {{ formatDate(data.generatedAt) }}
              </template>
            </span>
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="space-y-6 p-4 sm:p-6">
        <UAlert
          v-if="error"
          title="Unable to load the dashboard"
          :description="error.message"
          icon="i-lucide-circle-alert"
          color="error"
          variant="subtle"
        />

        <!-- <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <UCard v-for="card in summaryCards" :key="card.label">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-sm text-muted">{{ card.label }}</p>
                <p class="mt-1 text-3xl font-semibold text-highlighted">
                  {{ card.value.toLocaleString() }}
                </p>
              </div>
              <div class="rounded-xl bg-elevated p-3">
                <UIcon :name="card.icon" class="size-7" :class="card.color" />
              </div>
            </div>
          </UCard>
        </div> -->

        <div class="grid gap-4 xl:grid-cols-5">
          <UCard class="xl:order-1 xl:col-span-3">
            <template #header>
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h2 class="font-semibold text-highlighted">
                    Expiration Attention
                  </h2>
                  <p class="text-sm text-muted">
                    Expired credentials and credentials expiring within 30 days.
                  </p>
                </div>
                <UBadge
                  :label="`${selectedExpirationRecords.length} users`"
                  color="warning"
                  variant="subtle"
                />
              </div>
            </template>

            <div class="mb-4 overflow-x-auto pb-1">
              <UTabs
                v-model="selectedExpirationTab"
                :items="expirationTabs"
                :content="false"
                size="sm"
                class="min-w-max"
              />
            </div>

            <div
              v-if="selectedExpirationRecords.length"
              class="max-h-[32rem] space-y-2 overflow-y-auto pr-1"
            >
              <div
                v-for="record in selectedExpirationRecords"
                :key="record.id"
                class="flex flex-col gap-3 rounded-xl border border-default bg-elevated/30 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="truncate font-medium text-highlighted">
                      {{ record.name || "Unnamed user" }}
                    </p>
                    <UBadge
                      v-if="record.rating"
                      :label="record.rating"
                      color="primary"
                      variant="subtle"
                      size="sm"
                    />
                    <UBadge
                      v-if="record.level"
                      :label="`Level ${record.level}`"
                      color="info"
                      variant="subtle"
                      size="sm"
                    />
                  </div>
                  <p class="truncate text-xs text-muted">
                    {{ record.nik || "No NIK" }} ·
                    {{ record.branch || "No branch" }} ·
                    {{ record.branchUnit || "No branch unit" }}
                  </p>
                  <p class="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <UIcon name="i-lucide-briefcase-business" class="size-3.5" />
                    <span>
                      Profession: {{ record.profession || "Not assigned" }}
                    </span>
                  </p>
                </div>

                <div class="shrink-0 sm:text-right">
                  <UBadge
                    :label="expirationState(record.expiredAt)"
                    :color="expiryColor(record.expiredAt)"
                    variant="subtle"
                  />
                  <p class="mt-1 text-xs text-muted">
                    {{ formatExpiryDate(record.expiredAt) }}
                  </p>
                </div>
              </div>
            </div>

            <div
              v-else
              class="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center"
            >
              <UIcon name="i-lucide-badge-check" class="mb-3 size-8 text-success" />
              <p class="font-medium text-highlighted">No expiration attention required</p>
              <p class="text-sm text-muted">
                No {{ selectedExpirationTab }} records are expired or due within 30 days.
              </p>
            </div>
          </UCard>

          <UCard class="xl:order-3 xl:col-span-3">
            <template #header>
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h2 class="font-semibold text-highlighted">Ongoing Issues</h2>
                  <p class="text-sm text-muted">
                    Operational issues from the last month for your branch.
                  </p>
                </div>
                <UBadge
                  :label="`${filteredIssues.length} shown`"
                  color="neutral"
                  variant="subtle"
                />
              </div>
            </template>

            <div class="mb-4 overflow-x-auto pb-1">
              <UTabs
                v-model="selectedIssueStatus"
                :items="issueTabs"
                :content="false"
                size="sm"
                class="min-w-max"
              />
            </div>

            <div
              v-if="filteredIssues.length"
              class="max-h-[40rem] space-y-3 overflow-y-auto pr-1"
            >
              <div
                v-for="issue in filteredIssues"
                :key="issue.id"
                class="rounded-xl border border-default bg-elevated/30 p-4"
              >
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p class="font-medium text-highlighted">
                      {{ issue.equipment || "Other operational issue" }}
                    </p>
                    <p class="text-xs text-muted">
                      {{ issue.branch || "Unassigned branch" }} · Issue #{{
                        issue.id
                      }}
                    </p>
                  </div>
                  <div class="flex flex-wrap justify-end gap-1">
                    <UBadge
                      :label="issue.isClosed ? 'CLOSED' : 'OPEN'"
                      :color="issue.isClosed ? 'success' : 'error'"
                      variant="subtle"
                      size="sm"
                    />
                    <UBadge
                      :label="
                        issue.escalation?.status ||
                        (issue.escalationEnabled ? 'MONITORED' : 'DISABLED')
                      "
                      :color="escalationColor(issue.escalation?.status)"
                      variant="subtle"
                      size="sm"
                    />
                  </div>
                </div>

                <p class="mt-3 text-sm text-toned">
                  {{ issue.description || "No issue description provided." }}
                </p>

                <div
                  class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"
                >
                  <span class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-user-round" class="size-3.5" />
                    {{
                      issue.reporterName ||
                      issue.reporterNik ||
                      "Unknown reporter"
                    }}
                  </span>
                  <span v-if="issue.start" class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-clock" class="size-3.5" />
                    Started {{ formatDate(issue.start) }}
                  </span>
                  <span v-if="issue.finish" class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-circle-check" class="size-3.5" />
                    Finished {{ formatDate(issue.finish) }}
                  </span>
                  <span
                    v-if="issue.escalation?.level"
                    class="flex items-center gap-1.5"
                  >
                    <UIcon name="i-lucide-siren" class="size-3.5" />
                    Escalation level {{ issue.escalation.level }}
                  </span>
                </div>

                <div
                  v-if="issue.relatedMessages.length"
                  class="mt-3 border-t border-default pt-3"
                >
                  <p class="mb-2 text-xs text-muted">
                    Latest messages (newest first)
                  </p>
                  <div class="space-y-2">
                    <div
                      v-for="(message, index) in issue.relatedMessages"
                      :key="`${message.createdAt}-${index}`"
                      class="rounded-lg bg-elevated p-2.5 text-xs"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <span class="text-toned">
                          {{ message.message || "No message content" }}
                        </span>
                        <span class="shrink-0 text-muted">
                          {{ formatDate(message.createdAt) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="issue.dutyReports.length" class="mt-3 border-t border-default pt-3">
                  <p class="mb-2 text-xs text-muted">Related duty reports</p>
                  <div class="flex flex-wrap gap-1.5">
                    <UBadge
                      v-for="report in issue.dutyReports"
                      :key="report.id"
                      :label="`#${report.id}${report.shift ? ` · Shift ${report.shift}` : ''}${report.shiftDate ? ` · ${formatExpiryDate(report.shiftDate)}` : ''}`"
                      color="neutral"
                      variant="subtle"
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div
              v-else
              class="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center"
            >
              <UIcon
                name="i-lucide-circle-check-big"
                class="mb-3 size-8 text-success"
              />
              <p class="font-medium text-highlighted">No matching issues</p>
              <p class="mt-1 text-sm text-muted">
                No {{ selectedIssueStatus === "all" ? "" : selectedIssueStatus }}
                issue was recorded during the last month.
              </p>
            </div>
          </UCard>

          <UCard class="xl:order-2 xl:col-span-2 xl:row-span-2">
            <template #header>
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h2 class="font-semibold text-highlighted">Users on Duty</h2>
                  <p class="text-sm text-muted">
                    Active logbook sessions and assigned CWP.
                  </p>
                </div>
                <UBadge
                  :label="`${data?.activeDutyUsers.length ?? 0} active`"
                  color="success"
                  variant="subtle"
                />
              </div>
            </template>

            <div
              v-if="data?.activeDutyUsers.length"
              class="max-h-[64rem] space-y-3 overflow-y-auto pr-1"
            >
              <div
                v-for="user in data.activeDutyUsers"
                :key="user.logBookId"
                class="rounded-xl border border-default bg-elevated/30 p-3"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate font-medium text-highlighted">
                      {{ user.name || "Unnamed user" }}
                    </p>
                    <p class="truncate text-xs text-muted">
                      NIK {{ user.nik || "Not available" }}
                    </p>
                  </div>
                  <UBadge
                    :label="user.cwp?.name || 'No CWP'"
                    :color="user.cwp ? 'primary' : 'warning'"
                    variant="subtle"
                  />
                </div>

                <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span class="text-muted">Branch</span>
                    <p class="truncate font-medium text-highlighted">
                      {{ user.branch || "Not assigned" }}
                    </p>
                  </div>
                  <div>
                    <span class="text-muted">Branch unit</span>
                    <p class="truncate font-medium text-highlighted">
                      {{ user.branchUnit || "Not assigned" }}
                    </p>
                  </div>
                  <div>
                    <span class="text-muted">CWP rating</span>
                    <p class="font-medium text-highlighted">
                      {{ user.cwp?.rating || "Not assigned" }}
                    </p>
                  </div>
                  <div>
                    <span class="text-muted">Shift</span>
                    <p class="font-medium text-highlighted">
                      {{ user.shift || "Not specified" }}
                    </p>
                  </div>
                </div>

                <div class="mt-3 space-y-2 border-t border-default pt-3">
                  <div
                    class="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span class="text-xs text-muted">MEDEX expiration</span>
                    <UBadge
                      :label="formatExpiryDate(user.medexExpired)"
                      :color="expiryColor(user.medexExpired)"
                      variant="subtle"
                      size="sm"
                    />
                  </div>
                  <div
                    class="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span class="text-xs text-muted">
                      IELP expiration
                      <template v-if="user.ielpLevel">
                        (Level {{ user.ielpLevel }})
                      </template>
                    </span>
                    <UBadge
                      :label="formatExpiryDate(user.ielpExpired)"
                      :color="expiryColor(user.ielpExpired)"
                      variant="subtle"
                      size="sm"
                    />
                  </div>
                  <div class="flex items-start justify-between gap-2">
                    <span class="pt-1 text-xs text-muted"
                      >Rating expiration</span
                    >
                    <div class="flex max-w-[70%] flex-wrap justify-end gap-1">
                      <UBadge
                        v-for="rating in user.ratings"
                        :key="`${rating.name}-${rating.expiredAt}`"
                        :label="`${rating.name}: ${formatExpiryDate(rating.expiredAt)}`"
                        :color="expiryColor(rating.expiredAt)"
                        variant="subtle"
                        size="sm"
                      />
                      <UBadge
                        v-if="!user.ratings.length"
                        label="Not available"
                        color="neutral"
                        variant="subtle"
                        size="sm"
                      />
                    </div>
                  </div>
                </div>

                <div class="mt-3 flex items-center gap-1.5 text-xs text-muted">
                  <UIcon name="i-lucide-log-in" class="size-3.5" />
                  <span>Time in {{ formatDate(user.timeIn) }}</span>
                </div>
              </div>
            </div>

            <div
              v-else
              class="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-center"
            >
              <UIcon
                name="i-lucide-user-round-check"
                class="mb-3 size-8 text-muted"
              />
              <p class="font-medium text-highlighted">
                No users currently on duty
              </p>
              <p class="mt-1 text-sm text-muted">
                Active users appear after time-in and remain until time-out.
              </p>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
