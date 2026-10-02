<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import EssayCorrectionModal from "../../components/performanceCheck/EssayCorrectionModal.vue";
import EssayCorrectionHistoryModal from "../../components/performanceCheck/EssayCorrectionHistoryModal.vue";

interface FinalScoreItem {
  id?: number;
  appRating?: { id?: number; rating?: { rating?: string | null } | null } | null;
  essayCorrections?: Array<{
    id?: number;
    answer?: string | null;
    essay?: {
      id?: number;
      image?: string | null;
      question?: string | null;
      answer?: string | null;
      value?: number | null;
    } | null;
  }> | null;
}

interface GroupMemberItem {
  id: number;
  userMember?: {
    name?: string | null;
  } | null;
  finalScores?: FinalScoreItem[] | null;
  essayCorrections?: Array<{
    id?: number;
    answer?: string | null;
    score?: number | null;
    essay?: {
      id?: number;
      image?: string | null;
      question?: string | null;
      answer?: string | null;
      value?: number | null;
    } | null;
  }> | null;
}

interface GroupItem {
  id: number;
  group?: string | null;
  groupMembers?: GroupMemberItem[] | null;
  essayCorrections?: Array<{
    id?: number;
    answer?: string | null;
    score?: number | null;
    essay?: {
      id?: number;
      image?: string | null;
      question?: string | null;
      answer?: string | null;
      value?: number | null;
    } | null;
  }> | null;
}

interface EventItem {
  id: number;
  event?: string | null;
  remarkDoc?: {
    remark?: string | null;
  } | null;
  eventQuestions?: Array<{
    id?: number;
    persentage?: number | null;
  }> | null;
  groups?: GroupItem[] | null;
}

interface PerformanceCheckResponse {
  event?: EventItem[] | null;
}
interface EventOptionsResponse {
  event?: Array<{ id: number; event?: string | null; createdAt: string }> | null;
}

interface TableRowItem {
  id: string;
  no: number;
  eventId: number;
  event: string;
  remarkDocument: string;
  persentage: number | null;
  groupMembers: GroupMemberItem[];
  groupEssayCorrections: Array<{
    id?: number;
    answer?: string | null;
    score?: number | null;
    essay?: {
      id?: number;
      image?: string | null;
      question?: string | null;
      answer?: string | null;
      value?: number | null;
    } | null;
  }>;
}

const { token } = useAuth();
const { apiFetch } = useApiFetch();
const isEssayCorrectionModalOpen = ref(false);
const isEssayCorrectionHistoryModalOpen = ref(false);
const selectedMemberName = ref("");
const selectedMemberFinalScores = ref<FinalScoreItem[]>([]);
const selectedPersentage = ref<number | null>(null);
const selectedHistoryEssayCorrections = ref<
  Array<{
    id?: number;
    answer?: string | null;
    score?: number | null;
    essay?: {
      id?: number;
      image?: string | null;
      question?: string | null;
      answer?: string | null;
      value?: number | null;
    } | null;
  }>
>([]);
const selectedEventFilter = ref<number | undefined>(undefined);
interface ResetRating { id: number; rating: string | null; status: string | null; canReset: boolean; reason: string | null; attemptNumber: number; priorFailures: number }
interface ResetOptions { member: { id: number; name: string; event: string | null }; ratings: ResetRating[]; resets: Array<{ id: number; appRatingId: number; checkerNik: string; reason: string; attemptNumber: number; createdAt: string }> }
const resetOpen = ref(false);
const resetLoading = ref(false);
const resetSaving = ref(false);
const resetData = ref<ResetOptions | null>(null);
const resetError = ref("");
const resetRatingId = ref<number | null>(null);
const resetReason = ref("");
const resetConfirmed = ref(false);
const resetToast = useToast();

async function openReset(member: GroupMemberItem) {
  resetOpen.value = true;
  resetLoading.value = true;
  resetData.value = null;
  resetError.value = "";
  resetRatingId.value = null;
  resetReason.value = "";
  resetConfirmed.value = false;
  try {
    const result = await apiFetch(`/api/performanceCheck/reset-options/${member.id}`) as ResetOptions;
    resetData.value = result;
    resetRatingId.value = result.ratings.find((rating) => rating.canReset)?.id ?? null;
  } catch (error: any) {
    resetError.value = error?.data?.message || "Unable to load reset options.";
  } finally {
    resetLoading.value = false;
  }
}

async function submitReset() {
  if (!resetData.value || !resetRatingId.value || !resetConfirmed.value || resetReason.value.trim().length < 10) return;
  resetSaving.value = true;
  resetError.value = "";
  try {
    await apiFetch(`/api/performanceCheck/reset-attempt`, {
      method: "POST",
      body: { groupMemberId: resetData.value.member.id, appRatingId: resetRatingId.value,
        reason: resetReason.value.trim(), confirmation: "RESET CURRENT ATTEMPT" },
    });
    resetOpen.value = false;
    resetToast.add({ title: "Examination reset", description: "The user can restart this attempt from Essay.", color: "success" });
    await refresh();
  } catch (error: any) {
    resetError.value = error?.data?.message || "Unable to reset examination.";
  } finally {
    resetSaving.value = false;
  }
}

const { data: availableEvents, status: optionsStatus, error: optionsError, refresh: refreshOptions } =
  await useFetch<EventOptionsResponse>(`${apiBaseUrl}/api/performanceCheck`, {
    query: { mode: "options" },
    headers: { Authorization: token.value ? `Bearer ${token.value}` : "" },
  });
const data = ref<PerformanceCheckResponse | null>(null);
const detailsLoading = ref(false);
const detailsError = ref("");
let requestSequence = 0;
async function refresh() {
  const eventId = selectedEventFilter.value;
  if (!eventId) return;
  const requestId = ++requestSequence;
  detailsLoading.value = true;
  detailsError.value = "";
  try {
    const response = await apiFetch(`/api/performanceCheck?eventId=${eventId}`) as PerformanceCheckResponse;
    if (requestId === requestSequence) data.value = response;
  } catch (error: any) {
    if (requestId === requestSequence) detailsError.value = error?.data?.message || "Failed to load performance check data.";
  } finally {
    if (requestId === requestSequence) detailsLoading.value = false;
  }
}
watch(selectedEventFilter, () => {
  requestSequence++;
  data.value = null;
  if (selectedEventFilter.value) void refresh();
});

const tableRows = computed<TableRowItem[]>(() => {
  const events = data.value?.event || [];

  return events.flatMap((eventItem, eventIndex) => {
    const groups = eventItem.groups || [];

    if (groups.length === 0) {
      return [
        {
          id: `${eventItem.id}-0`,
          no: eventIndex + 1,
          eventId: Number(eventItem.id || 0),
          event: eventItem.event || "-",
          remarkDocument: eventItem.remarkDoc?.remark || "-",
          persentage: Number.isFinite(
            Number(eventItem.eventQuestions?.[0]?.persentage),
          )
            ? Number(eventItem.eventQuestions?.[0]?.persentage)
            : null,
          groupMembers: [],
          groupEssayCorrections: [],
        },
      ];
    }

    return groups.map((group, groupIndex) => ({
      id: `${eventItem.id}-${group.id ?? groupIndex}`,
      no: eventIndex + 1,
      eventId: Number(eventItem.id || 0),
      event: eventItem.event || "-",
      remarkDocument: eventItem.remarkDoc?.remark || "-",
      persentage: Number.isFinite(
        Number(eventItem.eventQuestions?.[0]?.persentage),
      )
        ? Number(eventItem.eventQuestions?.[0]?.persentage)
        : null,
      groupMembers: group.groupMembers || [],
      groupEssayCorrections: group.essayCorrections || [],
    }));
  });
});

const eventFilterOptions = computed(() => {
  const events = [...(availableEvents.value?.event || [])].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id,
  );
  return events.map((eventItem) => ({
    label: eventItem.event || "-",
    value: Number(eventItem.id || 0),
  }));
});

const filteredTableRows = computed(() => {
  return tableRows.value;
});

function hasFinalScore(member: GroupMemberItem): boolean {
  return (member.finalScores || []).some((score) => (score.essayCorrections?.length || 0) > 0);
}

function getEssayCorrectionsForMember(
  row: TableRowItem,
  member: GroupMemberItem,
) {
  const memberCorrections = member.essayCorrections || [];
  if (memberCorrections.length > 0) return memberCorrections;
  return row.groupEssayCorrections || [];
}

function hasEssayCorrectionHistory(row: TableRowItem, member: GroupMemberItem) {
  return getEssayCorrectionsForMember(row, member).length > 0;
}

function openEssayCorrectionModal(
  member: GroupMemberItem,
  persentage: number | null,
) {
  selectedMemberName.value = member.userMember?.name || "-";
  selectedMemberFinalScores.value = member.finalScores || [];
  selectedPersentage.value = persentage;
  isEssayCorrectionModalOpen.value = true;
}

function openEssayCorrectionHistoryModal(
  row: TableRowItem,
  member: GroupMemberItem,
) {
  selectedMemberName.value = member.userMember?.name || "-";
  selectedHistoryEssayCorrections.value = getEssayCorrectionsForMember(
    row,
    member,
  );
  isEssayCorrectionHistoryModalOpen.value = true;
}

function closeEssayCorrectionModal() {
  isEssayCorrectionModalOpen.value = false;
  selectedMemberName.value = "";
  selectedMemberFinalScores.value = [];
  selectedPersentage.value = null;
}

function closeEssayCorrectionHistoryModal() {
  isEssayCorrectionHistoryModalOpen.value = false;
  selectedMemberName.value = "";
  selectedHistoryEssayCorrections.value = [];
}

const errorMessage = computed(() => {
  if (!optionsError.value) return "";
  const err = optionsError.value as {
    data?: { message?: string };
    message?: string;
  };
  return (
    err.data?.message ||
    err.message ||
    "Failed to fetch performance check data."
  );
});
</script>

<template>
  <UDashboardPanel
    @copy.capture.prevent
    @cut.capture.prevent
    @paste.capture.prevent
  >
    <template #header>
      <UDashboardNavbar title="Correction Essay">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <div v-if="optionsStatus === 'pending'" class="py-10">
          <div
            class="flex flex-col items-center justify-center gap-3 text-muted"
          >
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin" />
            <span class="text-sm">Loading performance check data...</span>
          </div>
        </div>

        <div
          v-else-if="optionsError"
          class="rounded-lg border border-error/30 bg-error/5 p-4 space-y-2"
        >
          <p class="font-medium text-error">{{ errorMessage }}</p>
          <UButton
            label="Retry"
            color="error"
            variant="outline"
            icon="i-lucide-refresh-cw"
            @click="refreshOptions()"
          />
        </div>

        <UCard v-else>
          <template #header>
            <div
              class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
            >
              <h2 class="text-lg font-semibold">Performance Check</h2>
              <USelect
                v-model="selectedEventFilter"
                :items="eventFilterOptions"
                class="w-full md:w-72"
                placeholder="Choose an event (newest first)"
              />
            </div>
          </template>

          <p v-if="!selectedEventFilter" class="text-sm text-muted">Choose an event to load its essay corrections.</p>
          <p v-else-if="detailsLoading" class="text-sm text-muted">Loading selected event...</p>
          <div v-else-if="detailsError" class="flex items-center gap-3 text-sm text-error">
            <span>{{ detailsError }}</span>
            <UButton label="Retry" size="xs" variant="outline" @click="refresh()" />
          </div>
          <div v-else class="overflow-x-auto rounded-lg border">
            <table class="min-w-full text-sm">
              <thead class="bg-muted/40">
                <tr>
                  <th class="px-3 py-2 text-left font-medium">No</th>
                  <th class="px-3 py-2 text-left font-medium">Event</th>
                  <th class="px-3 py-2 text-left font-medium">
                    Remark Document
                  </th>
                  <th class="px-3 py-2 text-left font-medium">Group Member</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in filteredTableRows"
                  :key="row.id"
                  class="border-t align-top"
                >
                  <td class="px-3 py-2">{{ row.no }}</td>
                  <td class="px-3 py-2">{{ row.event }}</td>
                  <td class="px-3 py-2">{{ row.remarkDocument }}</td>
                  <td class="px-3 py-2">
                    <ul
                      v-if="row.groupMembers.length > 0"
                      class="list-disc list-inside space-y-1"
                    >
                      <li
                        v-for="member in row.groupMembers"
                        :key="member.id"
                        class="flex items-center gap-2"
                      >
                        <span>{{ member.userMember?.name || "-" }}</span>
                        <UIcon
                          v-if="hasFinalScore(member)"
                          name="i-lucide-eye"
                          class="size-4 text-primary cursor-pointer"
                          @click="
                            openEssayCorrectionModal(member, row.persentage)
                          "
                        />
                        <UButton
                          label="History"
                          size="xs"
                          color="primary"
                          variant="soft"
                          icon="i-lucide-history"
                          :disabled="!hasEssayCorrectionHistory(row, member)"
                          @click="openEssayCorrectionHistoryModal(row, member)"
                        />
                        <UButton label="Reset attempt" size="xs" color="warning" variant="soft"
                          icon="i-lucide-rotate-ccw" @click="openReset(member)" />
                      </li>
                    </ul>
                    <span v-else class="text-muted">-</span>
                  </td>
                </tr>

                <tr v-if="filteredTableRows.length === 0" class="border-t">
                  <td class="px-3 py-3 text-muted" colspan="4">
                    No performance check data available.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <EssayCorrectionModal
    :is-open="isEssayCorrectionModalOpen"
    :member-name="selectedMemberName"
    :final-scores="selectedMemberFinalScores"
    :persentage="selectedPersentage"
    @close="closeEssayCorrectionModal"
  />

  <EssayCorrectionHistoryModal
    :is-open="isEssayCorrectionHistoryModalOpen"
    :member-name="selectedMemberName"
    :essay-corrections="selectedHistoryEssayCorrections"
    @close="closeEssayCorrectionHistoryModal"
  />

  <UModal v-model:open="resetOpen" title="Reset interrupted Mode 1 examination"
    description="Only the assigned checker may restart the current attempt. Earlier failed results remain recorded."
    :ui="{ content: 'max-w-2xl w-full' }">
    <template #body>
      <div class="space-y-4">
        <p v-if="resetLoading" class="text-sm text-muted">Loading assigned ratings...</p>
        <p v-if="resetError" class="rounded border border-error/30 bg-error/5 p-3 text-sm text-error">{{ resetError }}</p>
        <template v-if="resetData">
          <p class="text-sm font-medium">{{ resetData.member.name }} · {{ resetData.member.event }}</p>
          <p class="text-sm text-muted">Choose the rating whose current attempt should restart from Essay:</p>
          <div v-for="rating in resetData.ratings" :key="rating.id"
            class="rounded-lg border p-3 text-sm" :class="resetRatingId === rating.id ? 'border-primary' : ''">
            <label class="flex items-start gap-3" :class="rating.canReset ? 'cursor-pointer' : 'opacity-60'">
              <input v-model="resetRatingId" type="radio" :value="rating.id" :disabled="!rating.canReset" class="mt-1" />
              <span><strong>{{ rating.rating || 'Rating' }}</strong> · Attempt {{ rating.attemptNumber }} · {{ rating.status || 'Unknown' }}
                <span v-if="rating.priorFailures" class="block text-muted">{{ rating.priorFailures }} earlier failed result(s) will remain recorded.</span>
                <span v-if="rating.reason" class="block text-muted">{{ rating.reason }}</span>
              </span>
            </label>
          </div>
          <p v-if="resetData.ratings.length === 0" class="text-sm text-muted">No assigned ratings were found.</p>
          <label class="block text-sm font-medium" for="reset-reason">Reason for reset (required)</label>
          <UTextarea id="reset-reason" v-model="resetReason" class="w-full" :rows="3" placeholder="Describe the interruption or issue..." />
          <label class="flex items-start gap-2 text-sm"><input v-model="resetConfirmed" type="checkbox" class="mt-1" />
            <span>I understand that current draft answers and time will be cleared, and this same attempt will restart from Essay.</span></label>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="outline" @click="resetOpen = false" />
            <UButton label="Reset current attempt" color="warning" :loading="resetSaving"
              :disabled="!resetRatingId || resetReason.trim().length < 10 || !resetConfirmed" @click="submitReset" />
          </div>
          <div v-if="resetData.resets.length" class="border-t pt-3 text-sm">
            <h3 class="font-medium">Recent reset history</h3>
            <p v-for="item in resetData.resets" :key="item.id" class="mt-2 text-muted">
              Attempt {{ item.attemptNumber }} · {{ item.checkerNik }} · {{ new Date(item.createdAt).toISOString().replace('T', ' ').slice(0, 19) }} UTC — {{ item.reason }}
            </p>
          </div>
        </template>
      </div>
    </template>
  </UModal>
</template>
