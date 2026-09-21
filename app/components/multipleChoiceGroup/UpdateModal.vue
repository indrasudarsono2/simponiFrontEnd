<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { token } = useAuth();
interface MultipleChoice {
  id: number;
  branchUnitId: number;
  question: string;
  a: string;
  b: string;
  c: string;
  d: string;
  key: string;
  image: string | null;
}

interface Rating {
  id: number;
  professionId: number;
  rating: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface Sector {
  id: number;
  branchUnitId: number;
  sector: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface SubBranchUnitRating {
  rating: Rating;
  sector: Sector;
}

interface QuestionGroup {
  id: number;
  group: string;
  subBranchUnitRating: SubBranchUnitRating;
}

interface MultipleChoiceQuestionGroupSector {
  id: number;
  sector: string;
}

interface MultipleChoiceQuestionGroupDetail {
  group: string;
  kindOfQuestion: { question: string };
  subBranchUnitRating: { rating: { rating: string } };
}

interface MultipleChoiceQuestionGroup {
  multipleChoiceId: number;
  sector: MultipleChoiceQuestionGroupSector | null;
  questionGroup: MultipleChoiceQuestionGroupDetail | null;
}

interface SectorRatingGroupOption {
  id: number;
  label: string;
  sectorId: number;
  sector: string;
  ratingId: number;
  rating: string;
  questionGroupId: number;
  questionGroup: string;
}

const props = defineProps<{
  multipleChoice: MultipleChoice | null;
  questionGroups: QuestionGroup[] | undefined;
  multipleChoiceQuestionGroups: MultipleChoiceQuestionGroup[] | undefined;
}>();

const emit = defineEmits<{
  multipleChoiceGroupUpdated: [];
  close: [];
}>();

const schema = z.object({
  selectedGroups: z
    .array(z.number())
    .min(1, "At least one group must be selected"),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  selectedGroups: [],
});

// Transform questionGroups prop to options format
const groupOptions = computed<SectorRatingGroupOption[]>(() => {
  if (!props.questionGroups) return [];
  return props.questionGroups
    .map((qg) => ({
      id: qg.id,
      label: `${qg.group} | Rating: ${qg.subBranchUnitRating.rating.rating} | Sector: ${qg.subBranchUnitRating.sector.sector}`,
      sectorId: qg.subBranchUnitRating.sector.id,
      sector: qg.subBranchUnitRating.sector.sector,
      ratingId: qg.subBranchUnitRating.rating.id,
      rating: qg.subBranchUnitRating.rating.rating,
      questionGroupId: qg.id,
      questionGroup: qg.group,
    }))
    .sort(
      (a, b) =>
        a.sector.localeCompare(b.sector) ||
        a.rating.localeCompare(b.rating) ||
        a.questionGroup.localeCompare(b.questionGroup),
    );
});

function isGroupSelected(groupId: number) {
  return state.selectedGroups?.includes(groupId) || false;
}

const ratingBadgeClasses = [
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
];

const sectorBadgeClasses = [
  "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300",
  "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
];

function stableColorIndex(value: string, paletteLength: number) {
  const hash = [...value].reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
  return hash % paletteLength;
}

function getRatingBadgeClass(rating: string) {
  return ratingBadgeClasses[
    stableColorIndex(rating, ratingBadgeClasses.length)
  ];
}

function getSectorBadgeClass(sector: string) {
  return sectorBadgeClasses[
    stableColorIndex(sector, sectorBadgeClasses.length)
  ];
}

// Watch for multipleChoice prop changes to populate form
watch(
  () => props.multipleChoice,
  (newMC) => {
    if (newMC) {
      // Find already assigned groups for this multiple choice
      const assignedGroupIds =
        props.multipleChoiceQuestionGroups
          ?.filter((mcqg) => mcqg.multipleChoiceId === newMC.id)
          .map((mcqg) => {
            // Find matching questionGroup to get the id
            const match = props.questionGroups?.find(
              (qg) =>
                qg.group === mcqg.questionGroup?.group &&
                qg.subBranchUnitRating.sector.sector === mcqg.sector?.sector,
            );
            return match?.id;
          })
          .filter((id): id is number => id !== undefined) || [];

      // Pre-select assigned groups
      state.selectedGroups = assignedGroupIds;
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.selectedGroups = [];
    emit("close");
  }
});

const toast = useToast();
const loading = ref(false);

// Truncate HTML content for display (preserves HTML tags)
function truncateHtml(html: string, maxLength: number = 300) {
  if (!html || html.length <= maxLength) return html;
  return html.substring(0, maxLength) + "...";
}

// Get selected group details
const selectedGroupDetails = computed(() => {
  if (!state.selectedGroups || state.selectedGroups.length === 0) return [];
  return state.selectedGroups
    .map((id) => groupOptions.value.find((g) => g.id === id))
    .filter((g) => g !== undefined);
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.multipleChoice) return;

  loading.value = true;

  try {
    // Get selected group details
    const selectedDetails = event.data.selectedGroups
      .map((id) => groupOptions.value.find((g) => g.id === id))
      .filter((g) => g !== undefined);

    if (selectedDetails.length === 0) {
      throw new Error("No valid groups selected");
    }

    // Create assignments with array of questionGroupIds and sectorIds
    await $fetch(`${apiBaseUrl}/api/multipleChoiceGroups`, {
      method: "POST",
      body: {
        multipleChoiceId: props.multipleChoice.id,
        questionGroupId: selectedDetails.map((d) => d.questionGroupId),
        sectorId: selectedDetails.map((d) => d.sectorId),
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Multiple choice has been assigned to ${selectedDetails.length} group(s) successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("multipleChoiceGroupUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to assign multiple choice to groups. Please try again.";
    toast.add({
      title: "Error",
      description: errorMessage,
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Assign Multiple Choice to Question Groups"
    description="Select one or more sector-rating-group combinations"
    :ui="{
      content: 'max-w-5xl',
    }"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4 overflow-visible"
        @submit="onSubmit"
      >
        <!-- Display selected multiple choice -->
        <div class="p-3 bg-elevated/50 rounded border border-default space-y-2">
          <div class="text-sm font-medium">Selected Multiple Choice:</div>
          <div class="text-sm">
            <span class="text-muted">Question:</span>
            <p
              class="font-medium mt-1"
              v-html="truncateHtml(multipleChoice?.question || '')"
            ></p>
          </div>

          <div class="text-sm flex items-center gap-4 mt-2">
            <span class="text-muted">Answer Key:</span>
            <span class="font-medium text-primary">{{
              multipleChoice?.key
            }}</span>
          </div>
        </div>

        <!-- Multi-Select Group Combinations -->

        <UFormField
          label="Assign to Groups"
          name="selectedGroups"
          required
          description="Select one or more sector-rating-group combinations"
          class="relative z-50"
        >
          <USelectMenu
            v-model="state.selectedGroups"
            :items="groupOptions"
            label-key="label"
            value-key="id"
            placeholder="Search by group, rating, or sector..."
            multiple
            searchable
            class="w-full"
            :ui="{ item: 'p-0', content: 'z-50 max-h-80 overflow-y-auto' }"
            :popper="{ placement: 'bottom-start', strategy: 'fixed' }"
          >
            <template #default>
              <span
                v-if="
                  !state.selectedGroups || state.selectedGroups.length === 0
                "
              >
                Search and select question groups...
              </span>
              <span v-else>
                {{ state.selectedGroups.length }} group(s) selected
              </span>
            </template>

            <template #item="{ item }">
              <div
                class="flex w-full items-start gap-3 rounded-md px-3 py-2.5"
                :class="isGroupSelected(item.id) ? 'bg-primary/10' : ''"
              >
                <UIcon
                  :name="
                    isGroupSelected(item.id)
                      ? 'i-lucide-check-square-2'
                      : 'i-lucide-square'
                  "
                  class="mt-0.5 size-5 shrink-0"
                  :class="isGroupSelected(item.id) ? 'text-primary' : 'text-muted'"
                />
                <div class="min-w-0 flex-1 space-y-1.5">
                  <div class="whitespace-normal font-medium leading-snug text-highlighted">
                    {{ item.questionGroup }}
                  </div>
                  <div class="flex flex-wrap gap-1.5 text-xs">
                    <span
                      class="rounded px-2 py-0.5 font-medium"
                      :class="getRatingBadgeClass(item.rating)"
                    >
                      Rating: {{ item.rating }}
                    </span>
                    <span
                      class="rounded px-2 py-0.5 font-medium"
                      :class="getSectorBadgeClass(item.sector)"
                    >
                      Sector: {{ item.sector }}
                    </span>
                  </div>
                </div>
              </div>
            </template>
          </USelectMenu>
        </UFormField>

        <!-- Show selected groups summary -->
        <div
          v-if="selectedGroupDetails.length > 0"
          class="p-3 bg-elevated/50 rounded border border-default space-y-2"
        >
          <div class="text-sm font-medium">
            Selected Groups ({{ selectedGroupDetails.length }}):
          </div>
          <div class="space-y-1 max-h-40 overflow-y-auto">
            <div
              v-for="detail in selectedGroupDetails"
              :key="detail.id"
              class="flex items-start gap-3 rounded border border-primary/15 bg-primary/5 p-2.5 text-sm"
            >
              <UIcon name="i-lucide-check-circle" class="mt-0.5 shrink-0 text-primary" />
              <div class="min-w-0 space-y-1">
                <div class="font-medium text-highlighted">{{ detail.questionGroup }}</div>
                <div class="flex flex-wrap gap-1.5 text-xs">
                  <span
                    class="rounded px-2 py-0.5 font-medium"
                    :class="getRatingBadgeClass(detail.rating)"
                  >
                    Rating: {{ detail.rating }}
                  </span>
                  <span
                    class="rounded px-2 py-0.5 font-medium"
                    :class="getSectorBadgeClass(detail.sector)"
                  >
                    Sector: {{ detail.sector }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4 relative z-10">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            label="Assign to Groups"
            color="primary"
            variant="solid"
            type="submit"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
