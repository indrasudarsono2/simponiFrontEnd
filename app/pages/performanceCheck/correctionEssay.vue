<script setup lang="ts">
import ip from "../../utils/config.json";
import EssayCorrectionModal from "../../components/performanceCheck/EssayCorrectionModal.vue";
import EssayCorrectionHistoryModal from "../../components/performanceCheck/EssayCorrectionHistoryModal.vue";

interface FinalScoreItem {
  id?: number;
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
const selectedEventFilter = ref<number | null>(null);

const { data, status, error, refresh } =
  await useFetch<PerformanceCheckResponse>(
    `http://${ip.ipBackEnd}/api/performanceCheck`,
    {
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    },
  );

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
  const events = data.value?.event || [];
  return events.map((eventItem) => ({
    label: eventItem.event || "-",
    value: Number(eventItem.id || 0),
  }));
});

const filteredTableRows = computed(() => {
  if (!selectedEventFilter.value) return tableRows.value;
  return tableRows.value.filter(
    (row) => row.eventId === selectedEventFilter.value,
  );
});

function hasFinalScore(member: GroupMemberItem): boolean {
  return (member.finalScores?.length || 0) !== 0;
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
  if (!error.value) return "";
  const err = error.value as {
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
        <div v-if="status === 'pending'" class="py-10">
          <div
            class="flex flex-col items-center justify-center gap-3 text-muted"
          >
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin" />
            <span class="text-sm">Loading performance check data...</span>
          </div>
        </div>

        <div
          v-else-if="error"
          class="rounded-lg border border-error/30 bg-error/5 p-4 space-y-2"
        >
          <p class="font-medium text-error">{{ errorMessage }}</p>
          <UButton
            label="Retry"
            color="error"
            variant="outline"
            icon="i-lucide-refresh-cw"
            @click="refresh()"
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
                :items="[
                  { label: 'All Events', value: null },
                  ...eventFilterOptions,
                ]"
                class="w-full md:w-72"
                placeholder="Filter by event"
              />
            </div>
          </template>

          <div class="overflow-x-auto rounded-lg border">
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
</template>
