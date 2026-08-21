<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import type { Period, Range } from "~/types";

const props = defineProps<{
  period: Period;
  range: Range;
  dashboardData: any;
  refreshDashboardData?: () => Promise<void>;
}>();
const { token: authToken } = useAuth();
const toast = useToast();
const dashboardTokenInput = ref("");
const isSubmittingDashboardToken = ref(false);

// Reactive current time for countdown updates
const now = ref(new Date());

// Update current time every second for countdown
let countdownInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  countdownInterval = setInterval(() => {
    now.value = new Date();
  }, 1000);
});

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
});

// Calculate days remaining until expiration
function getDaysRemaining(expiredDate: string | null): number | null {
  if (!expiredDate) return null;
  const expired = new Date(expiredDate);
  const diffTime = expired.getTime() - now.value.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Format countdown display
function formatCountdown(expiredDate: string | null): string {
  const days = getDaysRemaining(expiredDate);
  if (days === null) return "-";
  if (days < 0) return "Expired";
  if (days === 0) return "Today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

// Get color based on days remaining
function getCountdownColor(expiredDate: string | null): string {
  const days = getDaysRemaining(expiredDate);
  if (days === null) return "text-gray-500";
  if (days < 0) return "text-red-600 font-semibold";
  if (days <= 7) return "text-orange-500 font-semibold";
  if (days <= 30) return "text-yellow-500";
  return "text-green-600";
}

// Format date for display (e.g., "31 Mar 2026")
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTimeUTC(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "-";

  const datePart = date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const timePart = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

  return `${datePart} ${timePart} UTC`;
}

function diffDaysFromNow(targetDate: Date): number {
  const diffMs = targetDate.getTime() - now.value.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatEventRemainingText(
  startDate: string | null | undefined,
  finishDate: string | null | undefined,
): string {
  if (!startDate || !finishDate) return "Remaining unavailable";

  const start = new Date(startDate);
  const finish = new Date(finishDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(finish.getTime())) {
    return "Remaining unavailable";
  }

  if (start.getTime() > now.value.getTime()) {
    const daysToGo = diffDaysFromNow(start);
    if (daysToGo <= 0) return "Today";
    if (daysToGo === 1) return "1 Day to go";
    return `${daysToGo} Days to go`;
  }

  if (finish.getTime() > now.value.getTime()) {
    const daysLeft = diffDaysFromNow(finish);
    if (daysLeft <= 0) return "Today";
    if (daysLeft === 1) return "1 Day left";
    return `${daysLeft} Days left`;
  }

  return "Expired";
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function pickLatestByDate<T extends { updatedAt?: string; createdAt?: string }>(
  items: T[],
): T | undefined {
  if (!items.length) return undefined;
  return [...items].sort((a, b) => {
    const aTs = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTs = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTs - aTs;
  })[0];
}

// Computed stats based on dashboard data
const stats = computed(() => {
  const data = props.dashboardData;

  // IELP data
  const ielpList = toArray(data?.ielp);
  const ielp = ielpList.length ? ielpList[ielpList.length - 1] : undefined;
  const ielpExpired = ielp?.expired;

  // MEDEX data
  const medexList = toArray(data?.medex);
  const medex = medexList.length
    ? medexList[medexList.length - 1]
    : undefined;
  const medexExpired = medex?.expired;

  return [
    {
      title: "IELP",
      icon: "i-lucide-file-badge",
      value: formatDate(ielpExpired),
      subtext: formatCountdown(ielpExpired),
      subtextColor: getCountdownColor(ielpExpired),
      variation: null,
    },
    {
      title: "MEDEX",
      icon: "i-lucide-stethoscope",
      value: formatDate(medexExpired),
      subtext: formatCountdown(medexExpired),
      subtextColor: getCountdownColor(medexExpired),
      variation: null,
    },
  ];
});

const currentEventUser = computed(() => props.dashboardData?.eventUsers?.[0]);

const available1Data = computed(() => {
  const event = currentEventUser.value?.event;
  const eventName = event?.event || "-";
  const remainingText = formatEventRemainingText(
    event?.startDate,
    event?.finishDate,
  );

  const dateRangeText =
    event?.startDate && event?.finishDate
      ? `${formatDateTimeUTC(event.startDate)} - ${formatDateTimeUTC(event.finishDate)}`
      : "-";

  return {
    title: "Coming up Event",
    icon: "i-lucide-calendar-days",
    value: eventName,
    subtext: remainingText,
    detail: dateRangeText,
  };
});

const available2Data = computed(() => {
  const applicationDocs = [
    ...toArray(currentEventUser.value?.applicationDocs),
    ...toArray(currentEventUser.value?.applicationDoc),
  ] as Array<{
    id?: number;
    number?: string;
    briefingDate?: string | null;
    updatedAt?: string;
    createdAt?: string;
  }>;
  const applicationDoc = pickLatestByDate(applicationDocs);

  return {
    title: "Data",
    icon: "i-lucide-file-text",
    number: applicationDoc?.number || "-",
    applicationDocId: applicationDoc?.id as number | undefined,
    briefingDate: applicationDoc?.briefingDate as string | null | undefined,
  };
});

const briefingDateUTCText = computed(() => {
  if (!available2Data.value.briefingDate) return "";
  return formatDateTimeUTC(available2Data.value.briefingDate);
});

const isBriefingDateLocked = computed(() =>
  Boolean(available2Data.value.briefingDate),
);

async function submitDashboardToken() {
  if (isBriefingDateLocked.value) {
    return;
  }

  if (!available2Data.value.applicationDocId) {
    toast.add({
      title: "Error",
      description: "Application document ID is not available",
      color: "error",
    });
    return;
  }

  if (!dashboardTokenInput.value.trim()) {
    toast.add({
      title: "Validation Error",
      description: "Token is required",
      color: "error",
    });
    return;
  }

  isSubmittingDashboardToken.value = true;
  try {
    const response = await $fetch<{ message?: string }>(
      `${apiBaseUrl}/api/dashboardToken`,
      {
        method: "POST",
        headers: {
          Authorization: authToken.value ? `Bearer ${authToken.value}` : "",
        },
        body: {
          applicationDocId: available2Data.value.applicationDocId,
          token: dashboardTokenInput.value.trim(),
        },
      },
    );

    const message = response?.message?.toLowerCase().trim();

    if (message === "ok") {
      toast.add({
        title: "Success",
        description: "Token submitted successfully",
        color: "success",
      });
      dashboardTokenInput.value = "";
      await props.refreshDashboardData?.();
      return;
    }

    if (message === "invalid token") {
      toast.add({
        title: "Invalid Token",
        description:
          "The token you entered is invalid. Please check and try again.",
        color: "error",
      });
      return;
    }

    toast.add({
      title: "Error",
      description: response?.message || "Failed to submit token",
      color: "error",
    });
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error?.data?.message || "Failed to submit token",
      color: "error",
    });
  } finally {
    isSubmittingDashboardToken.value = false;
  }
}
</script>

<template>
  <UPageGrid class="grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
    <UPageCard
      v-for="(stat, index) in stats"
      :key="index"
      :icon="stat.icon"
      :title="stat.title"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading:
          'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase',
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <div class="flex flex-col gap-1">
        <span class="text-2xl font-semibold text-highlighted">
          {{ stat.value }}
        </span>

        <span :class="['text-lg', stat.subtextColor]">
          {{ stat.subtext }}
        </span>
      </div>
    </UPageCard>

    <UPageCard
      :icon="available1Data.icon"
      :title="available1Data.title"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading:
          'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase',
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <div class="flex flex-col gap-1">
        <span class="text-2xl font-semibold text-highlighted break-words">
          {{ available1Data.value }}
        </span>
        <span class="text-lg text-primary font-semibold">
          {{ available1Data.subtext }}
        </span>
        <span class="text-md text-muted break-words">
          {{ available1Data.detail }}
        </span>
      </div>
    </UPageCard>

    <UPageCard
      :icon="available2Data.icon"
      :title="available2Data.title"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading:
          'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase',
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <div class="flex flex-col gap-3 w-full">
        <div class="flex flex-col gap-1">
          <span class="text-2xl font-semibold text-highlighted break-words">
            {{ available2Data.number }}
          </span>
          <span class="text-xs text-muted">Application Doc Number</span>
        </div>

        <template v-if="isBriefingDateLocked">
          <div class="flex flex-col gap-1">
            <span class="text-xs text-muted">Briefing Date (UTC)</span>
            <span class="text-sm font-semibold text-primary break-words">
              {{ briefingDateUTCText }}
            </span>
          </div>
        </template>

        <template v-else>
          <UInput
            v-model="dashboardTokenInput"
            placeholder="Input token"
            :disabled="
              !available2Data.applicationDocId || isSubmittingDashboardToken
            "
          />

          <UButton
            label="Send Token"
            color="primary"
            block
            :loading="isSubmittingDashboardToken"
            :disabled="
              !available2Data.applicationDocId || isSubmittingDashboardToken
            "
            @click="submitDashboardToken"
          />
        </template>
      </div>
    </UPageCard>
  </UPageGrid>
</template>
