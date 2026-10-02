<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import { sub } from "date-fns";
import type { DropdownMenuItem } from "@nuxt/ui";
import type { Period, Range } from "~/types";
import RatingAuthorityCard from "~/components/dashboard/RatingAuthorityCard.vue";

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

interface DashboardRatingAuthority {
  id: number;
  rating?: { id?: number; rating?: string | null } | null;
  expiredAt?: string | null;
  finalScore?: number | null;
  theoryScoreStarred?: boolean;
  applicationDoc?: { id?: number; number?: string | null } | null;
  practicalScores?: Array<{
    id: number;
    kind?: string | null;
    score?: number | null;
    starred?: boolean;
  }>;
  cwps?: Array<{
    id: number;
    name?: string | null;
    sector?: string | null;
    frequencies?: Array<{
      id: number;
      frequency?: string | null;
      isPrimary?: boolean | null;
    }>;
  }>;
}

interface DashboardOperationalData {
  name?: string | null;
  currentRatingAuthorities?: DashboardRatingAuthority[];
  latestFailedResults?: Array<{
    id: number;
    rating: string;
    event: string;
    applicationNumber: string;
    theoryScore: number | null;
    theoryFailed: boolean;
    practicalScores: Array<{ kind: string; score: number | null; failed: boolean }>;
  }>;
  [key: string]: any;
}

const scoreFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
function formatDashboardScore(value?: number | null, failed = false): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${scoreFormatter.format(value)}${failed ? "*" : ""}`;
}
function practicalKindLabel(kind: string): string {
  return kind.toUpperCase() === "PRACTICAL" ? "Live" : kind.toUpperCase() === "SIMULATOR" ? "Simulator" : kind;
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
const { data: dashboardData, refresh: refreshDashboardData } = await useFetch<DashboardOperationalData>(
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
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Home" :ui="{ right: 'gap-3' }">
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

        <RatingAuthorityCard
          :user-name="dashboardData?.name || '-'"
          :authorities="dashboardData?.currentRatingAuthorities || []"
        />
        <UCard v-if="dashboardData?.latestFailedResults?.length">
          <template #header>
            <div>
              <h2 class="font-semibold text-highlighted">Latest Failed Examination Results</h2>
              <p class="text-sm text-muted">These results do not grant a current rating authority.</p>
            </div>
          </template>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[680px] text-sm">
              <thead class="bg-elevated/60 text-left text-xs uppercase text-muted">
                <tr>
                  <th class="px-4 py-3">Rating</th>
                  <th class="px-4 py-3">Event</th>
                  <th class="px-4 py-3">Application Document</th>
                  <th class="px-4 py-3 text-center">Theory Score</th>
                  <th class="px-4 py-3">Practical Score</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr v-for="result in dashboardData.latestFailedResults" :key="result.id">
                  <td class="px-4 py-3 font-semibold">{{ result.rating }}</td>
                  <td class="px-4 py-3">{{ result.event }}</td>
                  <td class="px-4 py-3">{{ result.applicationNumber }}</td>
                  <td class="px-4 py-3 text-center">{{ formatDashboardScore(result.theoryScore, result.theoryFailed) }}</td>
                  <td class="px-4 py-3">
                    <span v-if="!result.practicalScores.length">-</span>
                    <span v-for="(test, index) in result.practicalScores" :key="`${result.id}-${index}`">
                      {{ index ? ', ' : '' }}{{ practicalKindLabel(test.kind) }}: {{ formatDashboardScore(test.score, test.failed) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="mt-3 text-xs text-muted">* Failed result; the actual recorded score is shown.</p>
        </UCard>
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
