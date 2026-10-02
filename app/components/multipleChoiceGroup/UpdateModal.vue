<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { apiFetch } = useApiFetch();
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

const MAX_GROUPS_PER_QUESTION = 5;

const schema = z.object({
  selectedGroups: z
    .array(z.number())
    .min(1, "At least one group must be selected")
    .max(MAX_GROUPS_PER_QUESTION, `A question can be assigned to a maximum of ${MAX_GROUPS_PER_QUESTION} groups`),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  selectedGroups: [],
});
const selectedSectorId = ref(0);

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

const groupsBySector = computed(() => {
  const sectors = new Map<
    number,
    {
      id: number;
      name: string;
      ratings: Map<number, { id: number; name: string; groups: SectorRatingGroupOption[] }>;
    }
  >();

  for (const group of groupOptions.value) {
    let sector = sectors.get(group.sectorId);
    if (!sector) {
      sector = { id: group.sectorId, name: group.sector, ratings: new Map() };
      sectors.set(group.sectorId, sector);
    }

    let rating = sector.ratings.get(group.ratingId);
    if (!rating) {
      rating = { id: group.ratingId, name: group.rating, groups: [] };
      sector.ratings.set(group.ratingId, rating);
    }
    rating.groups.push(group);
  }

  return [...sectors.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((sector) => ({
      id: sector.id,
      name: sector.name,
      ratings: [...sector.ratings.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((rating) => ({
          ...rating,
          groups: rating.groups.sort((a, b) =>
            a.questionGroup.localeCompare(b.questionGroup),
          ),
        })),
    }));
});

const sectorFilterOptions = computed(() => [
  { label: "All sectors", value: 0 },
  ...groupsBySector.value.map((sector) => ({ label: sector.name, value: sector.id })),
]);
const visibleGroupsBySector = computed(() =>
  selectedSectorId.value === 0
    ? groupsBySector.value
    : groupsBySector.value.filter((sector) => sector.id === selectedSectorId.value),
);

function isGroupSelected(groupId: number) {
  return state.selectedGroups?.includes(groupId) ?? false;
}

function toggleGroup(groupId: number, checked: boolean) {
  const selected = state.selectedGroups ?? [];
  if (checked && selected.length >= MAX_GROUPS_PER_QUESTION && !selected.includes(groupId)) return;
  state.selectedGroups = checked
    ? [...new Set([...selected, groupId])]
    : selected.filter((id) => id !== groupId);
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
                qg.subBranchUnitRating.sector.sector === mcqg.sector?.sector &&
                qg.subBranchUnitRating.rating.rating ===
                  mcqg.questionGroup?.subBranchUnitRating.rating.rating,
            );
            return match?.id;
          })
          .filter((id): id is number => id !== undefined) || [];

      // Pre-select assigned groups
      state.selectedGroups = assignedGroupIds;
      selectedSectorId.value = 0;
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.selectedGroups = [];
    selectedSectorId.value = 0;
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
    await apiFetch("/api/multipleChoiceGroups", {
      method: "POST",
      body: {
        multipleChoiceId: props.multipleChoice.id,
        questionGroupId: selectedDetails.map((d) => d.questionGroupId),
        sectorId: selectedDetails.map((d) => d.sectorId),
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
    description="Select up to five sector-rating-group combinations"
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

        <!-- Sector → rating → group assignment grid -->
        <UFormField
          label="Assign to Groups"
          name="selectedGroups"
          required
          description="Choose up to five groups under the relevant sector and rating."
        >
          <div class="mb-3 flex flex-wrap items-end gap-3">
            <div class="min-w-52 flex-1 sm:flex-none">
              <label class="mb-1 block text-sm font-medium">Filter by sector</label>
              <USelect
                v-model="selectedSectorId"
                :items="sectorFilterOptions"
                label-key="label"
                value-key="value"
                class="w-full"
              />
            </div>
            <span class="pb-2 text-xs text-muted">
              Changing the filter keeps groups already selected from other sectors.
            </span>
          </div>
          <div
            v-if="visibleGroupsBySector.length"
            class="max-h-80 space-y-4 overflow-y-auto rounded-lg border border-default bg-elevated/30 p-3"
          >
            <section
              v-for="sector in visibleGroupsBySector"
              :key="sector.id"
              class="overflow-hidden rounded-lg border border-default bg-default"
            >
              <h3 class="border-b border-default bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                Sector: {{ sector.name }}
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2">
                <div
                  v-for="rating in sector.ratings"
                  :key="rating.id"
                  class="border-b border-default p-3 md:border-r"
                >
                  <h4 class="mb-2 text-sm font-semibold">
                    Rating: {{ rating.name }}
                  </h4>
                  <div class="space-y-1">
                    <label
                      v-for="group in rating.groups"
                      :key="group.id"
                      class="flex items-start gap-2 rounded px-2 py-1.5 text-sm"
                      :class="(state.selectedGroups?.length ?? 0) >= MAX_GROUPS_PER_QUESTION && !isGroupSelected(group.id) ? 'cursor-not-allowed text-muted' : 'cursor-pointer hover:bg-elevated'"
                    >
                      <input
                        type="checkbox"
                        class="mt-0.5 size-4 shrink-0 accent-primary"
                        :aria-label="`${group.questionGroup}, rating ${group.rating}, sector ${group.sector}`"
                        :checked="isGroupSelected(group.id)"
                        :disabled="(state.selectedGroups?.length ?? 0) >= MAX_GROUPS_PER_QUESTION && !isGroupSelected(group.id)"
                        @change="toggleGroup(group.id, ($event.target as HTMLInputElement).checked)"
                      />
                      <span class="min-w-0 flex-1 truncate" :title="group.questionGroup">{{ group.questionGroup }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </section>
          </div>
          <p v-else class="rounded-lg border border-default p-4 text-sm text-muted">
            No question groups are available for assignment.
          </p>
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
                <div class="max-w-72 truncate font-medium text-highlighted" :title="detail.questionGroup">{{ detail.questionGroup }}</div>
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
