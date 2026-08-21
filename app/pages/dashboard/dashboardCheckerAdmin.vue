<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import { sub } from "date-fns";
import type { DropdownMenuItem } from "@nuxt/ui";
import type { Period, Range } from "~/types";

const { isNotificationsSlideoverOpen } = useDashboard();
const { token } = useAuth();

const items = [
  [
    {
      label: "New mail",
      icon: "i-lucide-send",
      to: "/inbox",
    },
    {
      label: "New customer",
      icon: "i-lucide-user-plus",
      to: "/customers",
    },
  ],
] satisfies DropdownMenuItem[][];

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date(),
});
const period = ref<Period>("daily");
const openFileModal = ref(false);
const selectedFileUrl = ref("");
const selectedFileName = ref("");

interface Profession {
  profession: string;
}

interface ProfessionInBranch {
  id: number;
  profession: Profession | null;
}

interface ContentOfBriefing {
  id: number;
  contentOfBriefing: string | null;
  file: string | null;
}

interface DashboardBriefing {
  id: number;
  speaker: string | null;
  speakerUser?: {
    name: string | null;
  } | null;
  createdAt: string;
  contentOfBriefings?: ContentOfBriefing[];
  briefingDestinations?: {
    id: number;
    professionInBranch: ProfessionInBranch | null;
  }[];
}

// Current UTC time that updates every minute
const currentUTCTime = ref(new Date().toISOString());

// Update UTC time every minute
let timeInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  timeInterval = setInterval(() => {
    currentUTCTime.value = new Date().toISOString();
  }, 60000); // Update every minute
});

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval);
  }
});

// Format UTC time for display (01 April 2026 hh:mm format)
const formattedUTCTime = computed(() => {
  const date = new Date(currentUTCTime.value);
  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = date.toLocaleString("en-GB", {
    month: "long",
    timeZone: "UTC",
  });
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes}`;
});

// Fetch dashboard operational data
const { data: dashboardData, refresh: refreshDashboardData } = await useFetch(
  `${apiBaseUrl}/api/dashboardOperational`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const { data: dashboardBriefings, refresh: refreshDashboardBriefings } =
  await useFetch<DashboardBriefing[]>(
    `${apiBaseUrl}/api/dashboardBriefings`,
    {
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    },
  );

const formatBriefingDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const extractDestinationLabels = (
  destinations?: DashboardBriefing["briefingDestinations"],
) => {
  if (!destinations?.length) return [];

  return destinations
    .map((item) => item.professionInBranch?.profession?.profession)
    .filter((value): value is string => Boolean(value));
};

const getBriefingFilePath = (contents?: ContentOfBriefing[]) =>
  contents?.find((item) => item.file)?.file || "";

const getBriefingFileName = (contents?: ContentOfBriefing[]) => {
  const filePath = getBriefingFilePath(contents);
  return filePath ? filePath.split("/").pop() || filePath : "";
};

function openFilePreview(contents?: ContentOfBriefing[]) {
  const filePath = getBriefingFilePath(contents);
  if (!filePath) return;

  selectedFileUrl.value = filePath;
  selectedFileName.value = getBriefingFileName(contents);
  openFileModal.value = true;
}
</script>

<template>
  <UDashboardPanel id="dashboard-checker-admin">
    <template #header>
      <UDashboardNavbar title="Checker Admin Dashboard" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <!-- <template #right>
          <UTooltip text="Notifications" :shortcuts="['N']">
            <UButton
              color="neutral"
              variant="ghost"
              square
              @click="isNotificationsSlideoverOpen = true"
            >
              <UChip color="error" inset>
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip>

          <UDropdownMenu :items="items">
            <UButton icon="i-lucide-plus" size="md" class="rounded-full" />
          </UDropdownMenu>
        </template> -->
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <!-- NOTE: The `-ms-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
          <!-- <HomeDateRangePicker v-model="range" class="-ms-1" />

          <HomePeriodSelect v-model="period" :range="range" /> -->

          <div class="flex items-center gap-2 text-sm text-muted">
            <UIcon name="i-lucide-clock" class="size-4" />
            <span>UTC: {{ formattedUTCTime }}</span>
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <BriefingFilePreviewModal
        v-model:open="openFileModal"
        :file-name="selectedFileName"
        :file-url="selectedFileUrl"
      />

      <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <HomeStats
          :period="period"
          :range="range"
          :dashboard-data="dashboardData"
          :refresh-dashboard-data="refreshDashboardData"
        />
        <!-- <HomeChart :period="period" :range="range" />
        <HomeSales :period="period" :range="range" /> -->
        <UCard :ui="{ body: 'space-y-4' }">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="font-semibold text-highlighted">Latest Briefings</h2>
                <p class="text-sm text-muted">
                  Showing briefings targeted to your profession destination.
                </p>
              </div>

              <UButton
                label="Refresh"
                icon="i-lucide-refresh-cw"
                color="neutral"
                variant="ghost"
                @click="() => refreshDashboardBriefings()"
              />
            </div>
          </template>

          <div
            v-if="dashboardBriefings && dashboardBriefings.length > 0"
            class="space-y-3"
          >
            <div
              v-for="briefing in dashboardBriefings"
              :key="briefing.id"
              class="rounded-xl border border-default bg-elevated/30 p-4 space-y-3"
            >
              <div
                class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"
              >
                <div>
                  <div class="font-medium text-highlighted">
                    {{ briefing.speakerUser?.name || briefing.speaker || "-" }}
                  </div>
                  <div class="text-xs text-muted">
                    UTC {{ formatBriefingDate(briefing.createdAt) }}
                  </div>
                </div>

                <div class="text-xs text-muted md:text-right">
                  {{
                    extractDestinationLabels(briefing.briefingDestinations).join(
                      ", ",
                    ) || "-"
                  }}
                </div>
              </div>

              <div
                class="text-sm text-muted whitespace-normal [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                v-html="
                  briefing.contentOfBriefings?.[0]?.contentOfBriefing || '-'
                "
              />

              <div
                v-if="getBriefingFilePath(briefing.contentOfBriefings)"
                class="flex justify-end"
              >
                <UButton
                  :label="getBriefingFileName(briefing.contentOfBriefings)"
                  icon="i-lucide-paperclip"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="openFilePreview(briefing.contentOfBriefings)"
                />
              </div>
            </div>
          </div>

          <div
            v-else
            class="rounded-xl border border-dashed border-default bg-elevated/20 p-6 text-sm text-muted"
          >
            No briefing is currently targeted to your profession destination.
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
