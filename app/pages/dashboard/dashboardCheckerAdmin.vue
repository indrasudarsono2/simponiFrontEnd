<script setup lang="ts">
import { csrfFetch } from "~/utils/csrfFetch";

const apiBaseUrl = useApiBaseUrl()
const { token } = useAuth();

interface CheckerAdminEvent {
  id: number;
  name: string | null;
  sector: string | null;
  startDate: string | null;
  finishDate: string | null;
  counts: {
    assigned: number; submitted: number; verified: number; theoryStarted: number;
    theoryPassed: number; waitingPractical: number; fullyPassed: number;
  };
  members: Array<{
    nik: string; name: string; submitted: boolean; verified: boolean;
    theoryStarted: boolean; theoryPassed: boolean; waitingPractical: boolean; fullyPassed: boolean;
    ratings: Array<{ id: number; rating: string; status: string; submitted: boolean; verified: boolean; theoryStarted: boolean; theoryPassed: boolean; waitingPractical: boolean; passed: boolean }>;
  }>;
}
interface CheckerAdminDashboard {
  examinationActivity?: {
    checkedAt: string; mode1Count: number; mode2Count: number; overdueMode1Count: number; total: number; truncated: boolean;
    attempts: Array<{ id: string; mode: string; nik: string; name: string; event: string; rating: string; section: string; deadline: string | null; status: string }>;
  };
  missingRoomCount: number;
  ratingCount: number;
  sectors: Array<{ id: number; sector: string | null; ratings: string[] }>;
  events: CheckerAdminEvent[];
}
const { data: checkerAdminData, status: checkerAdminStatus, error: checkerAdminError, refresh: refreshCheckerAdmin } =
  await useFetch<CheckerAdminDashboard>(`${apiBaseUrl}/api/dashboardCheckerAdmin`, {
    headers: { Authorization: token.value ? `Bearer ${token.value}` : "" },
  });
const selectedEventId = ref<number | null>(null);
const roomRecoveryOpen = ref(false);
const roomRecoveryBusy = ref(false);
const roomRecoveryError = ref('');
const roomRecoveryData = ref<{ total: number; participants: Array<{ id: number; user: { name: string | null }; event: { event: string | null } }> } | null>(null);
async function inspectMissingRooms() {
  roomRecoveryOpen.value = true;
  roomRecoveryBusy.value = true;
  roomRecoveryError.value = '';
  try { roomRecoveryData.value = await csrfFetch(`${apiBaseUrl}/api/room/missing-assignments`, { headers: { Authorization: `Bearer ${token.value}` } }); }
  catch (error: any) { roomRecoveryError.value = error?.data?.message || 'Unable to load missing room assignments.'; }
  finally { roomRecoveryBusy.value = false; }
}
async function repairMissingRooms() {
  roomRecoveryBusy.value = true;
  try {
    await csrfFetch(`${apiBaseUrl}/api/room/default-assignments`, { method: 'POST', headers: { Authorization: `Bearer ${token.value}` }, body: { eventUserIds: roomRecoveryData.value?.participants.map(item => item.id) } });
    await refreshCheckerAdmin();
    await inspectMissingRooms();
  } catch (error: any) { roomRecoveryError.value = error?.data?.message || 'Unable to assign default rooms.'; }
  finally { roomRecoveryBusy.value = false; }
}
const selectedEvent = computed(() => checkerAdminData.value?.events.find((event) => event.id === selectedEventId.value) || null);
type ProgressStage = 'assigned' | 'submitted' | 'verified' | 'theoryStarted' | 'theoryPassed' | 'waitingPractical' | 'fullyPassed';
const stages: Array<{ key: ProgressStage; label: string }> = [
  { key: 'assigned', label: 'Assigned' }, { key: 'submitted', label: 'Submitted' },
  { key: 'verified', label: 'Verified' }, { key: 'theoryStarted', label: 'Theory started' },
  { key: 'theoryPassed', label: 'Theory passed' }, { key: 'waitingPractical', label: 'Waiting practical' },
  { key: 'fullyPassed', label: 'Fully passed' },
];
const selectedStage = ref<ProgressStage>('assigned');
const selectedRating = ref('all');
const ratingTabs = computed(() => {
  const members = selectedEvent.value?.members || [];
  const ratings = [...new Set(members.flatMap((member) => member.ratings.map((rating) => rating.rating)))].sort();
  if (members.some((member) => member.ratings.length === 0)) ratings.push('Not selected');
  return ratings;
});
const memberMatchesStage = (member: CheckerAdminEvent['members'][number], ratingName?: string) => {
  if (!ratingName) return selectedStage.value === 'assigned' || member[selectedStage.value];
  if (ratingName === 'Not selected') return selectedStage.value === 'assigned' && member.ratings.length === 0;
  return member.ratings.some((rating) => rating.rating === ratingName &&
    (selectedStage.value === 'assigned' || selectedStage.value === 'fullyPassed' ?
      selectedStage.value === 'assigned' || rating.passed : rating[selectedStage.value]));
};
const ratingStageCount = (ratingName: string) =>
  (selectedEvent.value?.members || []).filter((member) => memberMatchesStage(member, ratingName)).length;
const visibleMembers = computed(() => (selectedEvent.value?.members || []).filter((member) =>
  memberMatchesStage(member, selectedRating.value === 'all' ? undefined : selectedRating.value)));
function openEventDetails(eventId: number) {
  selectedEventId.value = eventId;
  selectedStage.value = 'assigned';
  selectedRating.value = 'all';
}
const formatEventDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
  : '-';

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
        <UCard>
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h2 class="font-semibold">Examinations in progress — your branch unit</h2>
              <UButton label="Refresh examination status" :loading="checkerAdminStatus === 'pending'" @click="refreshCheckerAdmin()" />
            </div>
          </template>
          <p v-if="checkerAdminError" class="text-error">Unable to refresh examination status. Do not treat old counts as current.</p>
          <template v-if="checkerAdminData?.examinationActivity">
            <p>Unfinished attempts: {{ checkerAdminData.examinationActivity.total }} · Mode 1: {{ checkerAdminData.examinationActivity.mode1Count }} · Mode 2: {{ checkerAdminData.examinationActivity.mode2Count }} · Overdue Mode 1: {{ checkerAdminData.examinationActivity.overdueMode1Count }}</p>
            <p class="text-sm text-muted my-2">Last checked: {{ new Date(checkerAdminData.examinationActivity.checkedAt).toLocaleString() }}. Unfinished does not prove the user is online. Overdue attempts await finalization; paused sessions are not finished. Refresh before planning maintenance.</p>
            <div class="overflow-x-auto max-h-96">
              <table class="w-full text-sm text-left">
                <thead><tr><th>Participant / NIK</th><th>Event</th><th>Rating / Section</th><th>Mode</th><th>Deadline (local time)</th><th>Status</th></tr></thead>
                <tbody><tr v-for="attempt in checkerAdminData.examinationActivity.attempts" :key="attempt.id" class="border-t">
                  <td class="py-2">{{ attempt.name }}<br>{{ attempt.nik }}</td><td>{{ attempt.event }}</td>
                  <td>{{ attempt.rating }} / {{ attempt.section }}</td><td>{{ attempt.mode }}</td>
                  <td>{{ attempt.deadline ? new Date(attempt.deadline).toLocaleString() : 'Paused / awaiting finalization' }}</td>
                  <td>{{ attempt.status.replaceAll('_', ' ') }}</td>
                </tr></tbody>
              </table>
            </div>
            <p v-if="!checkerAdminData.examinationActivity.total" class="mt-2">No unfinished examination attempts found in your branch unit at the last check.</p>
            <p v-if="checkerAdminData.examinationActivity.truncated" class="text-warning">Showing up to 200 attempts per mode; summary counts include all matching attempts.</p>
          </template>
        </UCard>
        <UCard>
          <div class="flex items-center justify-between gap-3">
            <p>Verified Mode 1 participants without a room: {{ checkerAdminData?.missingRoomCount ?? 0 }}</p>
            <UButton label="Inspect missing assignments" variant="outline" @click="inspectMissingRooms" />
          </div>
        </UCard>
        <UModal v-model:open="roomRecoveryOpen" title="Missing Mode 1 room assignments">
          <template #body>
            <p v-if="roomRecoveryBusy">Loading…</p>
            <p v-if="roomRecoveryError" class="text-error">{{ roomRecoveryError }}</p>
            <p>{{ roomRecoveryData?.total ?? 0 }} participants. Showing up to 100; events need valid start and finish dates.</p>
            <ul class="max-h-80 overflow-auto my-3"><li v-for="item in roomRecoveryData?.participants || []" :key="item.id">{{ item.user?.name }} — {{ item.event.event }}</li></ul>
            <UButton label="Assign default rooms" :loading="roomRecoveryBusy" :disabled="!roomRecoveryData?.participants.length" @click="repairMissingRooms" />
          </template>
        </UModal>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="font-semibold">Ratings in Your Branch Unit</h2>
                <p class="text-sm text-muted">Configured sector–rating assignments, not the number of rating holders.</p>
              </div>
              <UButton label="Manage Ratings" to="/ratingCheckerAdmin/ratingCheckerAdmin" size="sm" variant="soft" />
            </div>
          </template>
          <p v-if="checkerAdminStatus === 'pending'" class="text-sm text-muted">Loading branch-unit ratings...</p>
          <p v-else-if="checkerAdminError" class="text-sm text-error">Unable to load branch-unit ratings.</p>
          <div v-else class="space-y-3">
            <p class="text-center text-sm font-medium">{{ checkerAdminData?.ratingCount || 0 }} distinct ratings across {{ checkerAdminData?.sectors.length || 0 }} sectors</p>
            <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-3">
              <div v-for="sector in checkerAdminData?.sectors || []" :key="sector.id" class="rounded-lg border border-default p-3 text-center">
                <p class="font-medium mb-2">{{ sector.sector || 'Unnamed sector' }}</p>
                <div class="flex flex-wrap justify-center gap-2">
                  <UBadge v-for="rating in sector.ratings" :key="rating" color="primary" variant="soft">{{ rating }}</UBadge>
                  <span v-if="!sector.ratings.length" class="text-sm text-muted">No ratings assigned.</span>
                </div>
              </div>
            </div>
            <p v-if="!checkerAdminData?.sectors.length" class="text-center text-sm text-muted">No sectors configured for this branch unit.</p>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="font-semibold">Performance Check Event Progress</h2>
                <p class="text-sm text-muted">People counts for the five newest events. Select an event for per-rating progress.</p>
              </div>
              <UButton label="Refresh" icon="i-lucide-refresh-cw" variant="soft" size="sm" :loading="checkerAdminStatus === 'pending'" @click="refreshCheckerAdmin()" />
            </div>
          </template>
          <p v-if="checkerAdminStatus === 'pending'" class="text-sm text-muted">Loading event progress...</p>
          <p v-else-if="checkerAdminError" class="text-sm text-error">Unable to load event progress.</p>
          <div v-else class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead><tr class="border-b text-left">
                <th class="p-2">Event</th><th class="p-2">Sector</th><th class="p-2">Range (UTC)</th>
                <th class="p-2 text-center">Assigned</th><th class="p-2 text-center">Submitted</th>
                <th class="p-2 text-center">Verified</th><th class="p-2 text-center">Theory started</th>
                <th class="p-2 text-center">Theory passed</th><th class="p-2 text-center">Waiting practical</th>
                <th class="p-2 text-center">Fully passed</th><th class="p-2"></th>
              </tr></thead>
              <tbody>
                <tr v-for="event in checkerAdminData?.events || []" :key="event.id" class="border-b">
                  <td class="p-2 font-medium">{{ event.name || `Event ${event.id}` }}</td>
                  <td class="p-2">{{ event.sector || '-' }}</td>
                  <td class="p-2 whitespace-nowrap">{{ formatEventDate(event.startDate) }} – {{ formatEventDate(event.finishDate) }}</td>
                  <td class="p-2 text-center">{{ event.counts.assigned }}</td>
                  <td class="p-2 text-center">{{ event.counts.submitted }}</td>
                  <td class="p-2 text-center">{{ event.counts.verified }}</td>
                  <td class="p-2 text-center">{{ event.counts.theoryStarted }}</td>
                  <td class="p-2 text-center">{{ event.counts.theoryPassed }}</td>
                  <td class="p-2 text-center">{{ event.counts.waitingPractical }}</td>
                  <td class="p-2 text-center font-semibold">{{ event.counts.fullyPassed }}</td>
                  <td class="p-2"><UButton label="Details" size="xs" variant="soft" @click="openEventDetails(event.id)" /></td>
                </tr>
                <tr v-if="!checkerAdminData?.events.length"><td colspan="11" class="p-4 text-muted">No events found for this branch unit.</td></tr>
              </tbody>
            </table>
          </div>
        </UCard>

        <UCard v-if="selectedEvent">
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <h2 class="font-semibold">{{ selectedEvent.name || `Event ${selectedEvent.id}` }} — Member Progress</h2>
              <UButton label="Close" size="xs" variant="ghost" @click="selectedEventId = null" />
            </div>
          </template>
          <p class="mb-3 text-xs text-muted">Overall counts are per person. Rating tabs count each person within that rating; a member can appear under more than one rating.</p>
          <div class="mb-3 flex flex-wrap gap-2 border-b pb-3" role="tablist" aria-label="Member progress stage">
            <UButton v-for="stage in stages" :key="stage.key" role="tab"
              :aria-selected="selectedStage === stage.key"
              :label="`${stage.label} (${selectedEvent.counts[stage.key]})`"
              :color="selectedStage === stage.key ? 'primary' : 'neutral'"
              :variant="selectedStage === stage.key ? 'solid' : 'soft'"
              size="sm" @click="selectedStage = stage.key" />
          </div>
          <div class="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Rating">
            <UButton role="tab" :aria-selected="selectedRating === 'all'"
              :label="`All ratings (${selectedEvent.counts[selectedStage]})`"
              :color="selectedRating === 'all' ? 'primary' : 'neutral'"
              :variant="selectedRating === 'all' ? 'solid' : 'soft'"
              size="xs" @click="selectedRating = 'all'" />
            <UButton v-for="ratingName in ratingTabs" :key="ratingName" role="tab"
              :aria-selected="selectedRating === ratingName"
              :label="`${ratingName} (${ratingStageCount(ratingName)})`"
              :color="selectedRating === ratingName ? 'primary' : 'neutral'"
              :variant="selectedRating === ratingName ? 'solid' : 'soft'"
              size="xs" @click="selectedRating = ratingName" />
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead><tr class="border-b text-left"><th class="p-2">Member</th><th class="p-2">Application</th><th class="p-2">Verification</th><th class="p-2">Rating progress</th><th class="p-2">Overall</th></tr></thead>
              <tbody>
                <tr v-for="member in visibleMembers" :key="member.nik" class="border-b align-top">
                  <td class="p-2">{{ member.name }}</td>
                  <td class="p-2">{{ member.submitted ? 'Submitted' : 'Not submitted' }}</td>
                  <td class="p-2">{{ member.verified ? 'Verified' : 'Pending' }}</td>
                  <td class="p-2"><div v-for="rating in member.ratings.filter((item) => selectedRating === 'all' || item.rating === selectedRating)" :key="rating.id" class="mb-1">
                    <UBadge color="neutral" variant="soft">{{ rating.rating }}</UBadge>
                    <span class="ml-2">{{ rating.passed ? 'Passed theory & practical' : rating.theoryPassed ? 'Theory passed; practical pending' : rating.status }}</span>
                  </div><span v-if="!member.ratings.length" class="text-muted">No proposed rating</span></td>
                  <td class="p-2">{{ member.fullyPassed ? 'Fully passed' : 'In progress' }}</td>
                </tr>
                <tr v-if="!visibleMembers.length"><td colspan="5" class="p-4 text-muted">No members in this state and rating.</td></tr>
              </tbody>
            </table>
          </div>
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
