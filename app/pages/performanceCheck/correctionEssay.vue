<script setup lang="ts">
import ip from "../../utils/config.json";
import EssayCorrectionModal from "../../components/performanceCheck/EssayCorrectionModal.vue";

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
}

interface GroupItem {
  id: number;
  group?: string | null;
  groupMembers?: GroupMemberItem[] | null;
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
  event: string;
  remarkDocument: string;
  persentage: number | null;
  groupMembers: GroupMemberItem[];
}

const { token } = useAuth();
const isEssayCorrectionModalOpen = ref(false);
const selectedMemberName = ref("");
const selectedMemberFinalScores = ref<FinalScoreItem[]>([]);
const selectedPersentage = ref<number | null>(null);

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
          event: eventItem.event || "-",
          remarkDocument: eventItem.remarkDoc?.remark || "-",
          persentage: Number.isFinite(
            Number(eventItem.eventQuestions?.[0]?.persentage),
          )
            ? Number(eventItem.eventQuestions?.[0]?.persentage)
            : null,
          groupMembers: [],
        },
      ];
    }

    return groups.map((group, groupIndex) => ({
      id: `${eventItem.id}-${group.id ?? groupIndex}`,
      no: eventIndex + 1,
      event: eventItem.event || "-",
      remarkDocument: eventItem.remarkDoc?.remark || "-",
      persentage: Number.isFinite(
        Number(eventItem.eventQuestions?.[0]?.persentage),
      )
        ? Number(eventItem.eventQuestions?.[0]?.persentage)
        : null,
      groupMembers: group.groupMembers || [],
    }));
  });
});

function hasFinalScore(member: GroupMemberItem): boolean {
  return (member.finalScores?.length || 0) !== 0;
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

function closeEssayCorrectionModal() {
  isEssayCorrectionModalOpen.value = false;
  selectedMemberName.value = "";
  selectedMemberFinalScores.value = [];
  selectedPersentage.value = null;
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
        <div
          v-if="status === 'pending'"
          class="flex items-center justify-center py-10 text-muted"
        >
          <UIcon name="i-lucide-loader-2" class="size-6 animate-spin mr-2" />
          Loading performance check data...
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
            <h2 class="text-lg font-semibold">Performance Check</h2>
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
                  v-for="row in tableRows"
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
                      </li>
                    </ul>
                    <span v-else class="text-muted">-</span>
                  </td>
                </tr>

                <tr v-if="tableRows.length === 0" class="border-t">
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
</template>
