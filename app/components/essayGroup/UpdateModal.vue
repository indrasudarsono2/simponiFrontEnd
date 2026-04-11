<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";
const { token } = useAuth();

interface Essay {
  id: number;
  question: string;
  answer: string;
  image: string;
  value: number;
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

interface EssayQuestionGroupSector {
  id: number;
  sector: string;
}

interface EssayQuestionGroupDetail {
  group: string;
  kindOfQuestion: { question: string };
  subBranchUnitRating: { rating: { rating: string } };
}

interface EssayQuestionGroup {
  essayId: number;
  sector: EssayQuestionGroupSector;
  questionGroup: EssayQuestionGroupDetail;
}

interface SectorRatingGroupOption {
  id: number; // questionGroup id
  label: string; // Format: "GROUP RATING SECTOR" (e.g., "PENDEK ACP WEST")
  sectorId: number;
  sector: string;
  ratingId: number;
  rating: string;
  questionGroupId: number;
  questionGroup: string;
}

const props = defineProps<{
  essay: Essay | null;
  questionGroups: QuestionGroup[] | undefined;
  essayQuestionGroups: EssayQuestionGroup[] | undefined;
}>();

const emit = defineEmits<{
  essayGroupUpdated: [];
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
  return props.questionGroups.map((qg) => ({
    id: qg.id,
    label: `${qg.group} ${qg.subBranchUnitRating.rating.rating} ${qg.subBranchUnitRating.sector.sector}`,
    sectorId: qg.subBranchUnitRating.sector.id,
    sector: qg.subBranchUnitRating.sector.sector,
    ratingId: qg.subBranchUnitRating.rating.id,
    rating: qg.subBranchUnitRating.rating.rating,
    questionGroupId: qg.id,
    questionGroup: qg.group,
  }));
});

// Watch for essay prop changes to populate form
watch(
  () => props.essay,
  (newEssay) => {
    if (newEssay) {
      // Find already assigned groups for this essay
      const assignedGroupIds =
        props.essayQuestionGroups
          ?.filter((eqg) => eqg.essayId === newEssay.id)
          .map((eqg) => {
            // Find matching questionGroup to get the id
            const match = props.questionGroups?.find(
              (qg) =>
                qg.group === eqg.questionGroup.group &&
                qg.subBranchUnitRating.sector.sector === eqg.sector.sector,
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
  if (!props.essay) return;

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
    await $fetch(`http://${ip.ipBackEnd}/api/essayGroups`, {
      method: "POST",
      body: {
        essayId: props.essay.id,
        questionGroupId: selectedDetails.map((d) => d.questionGroupId),
        sectorId: selectedDetails.map((d) => d.sectorId),
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Essay has been assigned to ${selectedDetails.length} group(s) successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("essayGroupUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to assign essay to groups. Please try again.";
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
    title="Assign Essay to Question Groups"
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
        <!-- Display selected essay -->
        <div class="p-3 bg-elevated/50 rounded border border-default space-y-2">
          <div class="text-sm font-medium">Selected Essay:</div>
          <div class="text-sm">
            <span class="text-muted">Question:</span>
            <p
              class="font-medium mt-1"
              v-html="truncateHtml(essay?.question || '')"
            ></p>
          </div>

          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">Score:</span>
            <span class="font-medium text-primary">{{ essay?.value }}</span>
          </div>
        </div>

        <!-- Multi-Select Group Combinations -->
        <UFormField
          label="Assign to Groups"
          name="selectedGroups"
          required
          description="Select one or more sector-rating-group combinations (e.g., PENDEK ACP WEST)"
          class="relative z-50"
        >
          <USelectMenu
            v-model="state.selectedGroups"
            :items="groupOptions"
            option-attribute="label"
            value-key="id"
            placeholder="Select groups..."
            multiple
            searchable
            class="w-full"
            :ui="{ item: 'text-sm', content: 'z-50 max-h-60 overflow-y-auto' }"
            :popper="{ placement: 'bottom-start', strategy: 'fixed' }"
          >
            <template #default>
              <span
                v-if="
                  !state.selectedGroups || state.selectedGroups.length === 0
                "
              >
                Select groups...
              </span>
              <span v-else>
                {{ state.selectedGroups.length }} group(s) selected
              </span>
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
              class="flex items-center gap-2 text-sm p-2 bg-primary/5 rounded"
            >
              <UIcon name="i-lucide-check-circle" class="text-primary" />
              <span class="font-medium">{{ detail.label }}</span>
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
