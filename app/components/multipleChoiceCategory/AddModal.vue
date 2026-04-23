<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";
const { token } = useAuth();
interface SubBranchUnitRating {
  id: number;
  rating: {
    id: number;
    rating: string;
    description: string;
  };
}

interface Sector {
  id: number;
  name: string;
  subBranchUnitRatings: SubBranchUnitRating[];
}

interface MandatoryRatingItem {
  id: number;
  rating: {
    id: number;
    rating: string;
  };
  mandatoryItem: {
    id: number;
    mandatory: string;
  };
}

interface ExistingQuestionGroup {
  id: number;
  mandatoryRatingId?: number | null;
  group: string;
  quantity: number;
  subBranchUnitRating: {
    rating: { id: number };
    sector: { id: number };
  };
}

const props = defineProps<{
  sectors: Sector[];
  mandatoryRatings: MandatoryRatingItem[];
  questionGroups: ExistingQuestionGroup[];
}>();

const emit = defineEmits<{
  questionGroupAdded: [];
}>();

const schema = z.object({
  sectorId: z.coerce.number().min(1, "Sector is required"),
  ratingId: z.coerce.number().min(1, "Rating is required"),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  sectorId: undefined,
  ratingId: undefined,
});

const groupQuantities = reactive<Record<number, number | undefined>>({});
const additionalGroupName = ref("");
const additionalQuantity = ref<number | undefined>(undefined);
const additionalGroupTouched = ref(false);
const additionalQuantityTouched = ref(false);
const quantityTouched = reactive<Record<number, boolean>>({});
const submitAttempted = ref(false);

// Available ratings derived from the selected sector's subBranchUnitRatings
const availableRatings = computed(() => {
  if (!state.sectorId) return [];
  const sector = props.sectors.find((s) => s.id === state.sectorId);
  if (!sector) return [];
  return sector.subBranchUnitRatings.map((sub) => ({
    id: sub.rating.id,
    name: sub.rating.rating,
    description: sub.rating.description,
  }));
});

// Reset ratingId when sector changes
watch(
  () => state.sectorId,
  () => {
    state.ratingId = undefined;
    submitAttempted.value = false;
    additionalGroupName.value = "";
    additionalQuantity.value = undefined;
    additionalGroupTouched.value = false;
    additionalQuantityTouched.value = false;
    Object.keys(groupQuantities).forEach((key) => {
      delete groupQuantities[Number(key)];
    });
    Object.keys(quantityTouched).forEach((key) => {
      delete quantityTouched[Number(key)];
    });
  },
);

watch(
  () => state.ratingId,
  () => {
    submitAttempted.value = false;
    additionalGroupName.value = "";
    additionalQuantity.value = undefined;
    additionalGroupTouched.value = false;
    additionalQuantityTouched.value = false;
    Object.keys(groupQuantities).forEach((key) => {
      delete groupQuantities[Number(key)];
    });
    Object.keys(quantityTouched).forEach((key) => {
      delete quantityTouched[Number(key)];
    });
  },
);

// Get selected sector info
const selectedSector = computed(() => {
  if (!state.sectorId) return null;
  return props.sectors.find((s) => s.id === state.sectorId);
});

// Get selected rating info
const selectedRating = computed(() => {
  if (!state.ratingId) return null;
  return availableRatings.value.find((r) => r.id === state.ratingId);
});

const selectedMandatoryRatings = computed<MandatoryRatingItem[]>(() => {
  if (!state.ratingId) return [];
  return props.mandatoryRatings.filter(
    (item) => item.rating.id === state.ratingId,
  );
});

const selectedExistingGroups = computed<ExistingQuestionGroup[]>(() => {
  if (!state.sectorId || !state.ratingId) return [];
  return props.questionGroups.filter(
    (item) =>
      item.subBranchUnitRating?.sector?.id === state.sectorId &&
      item.subBranchUnitRating?.rating?.id === state.ratingId,
  );
});

const hasExistingGroups = computed(() => selectedExistingGroups.value.length > 0);

const totalConfiguredQuantity = computed(() => {
  if (hasExistingGroups.value) {
    const next = Number(additionalQuantity.value);
    return Number.isFinite(next) && next > 0 ? next : 0;
  }

  return selectedMandatoryRatings.value.reduce((sum, item) => {
    const value = Number(groupQuantities[item.id]);
    if (!Number.isFinite(value) || value < 1) return sum;
    return sum + value;
  }, 0);
});

const existingTotalQuantity = computed(() => {
  return selectedExistingGroups.value.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
});

function getQuantityError(mandatoryRatingId: number): string {
  const shouldValidate =
    submitAttempted.value || Boolean(quantityTouched[mandatoryRatingId]);
  if (!shouldValidate) return "";

  const value = Number(groupQuantities[mandatoryRatingId]);
  if (!Number.isFinite(value) || value < 1) {
    return "Quantity is required and must be at least 1.";
  }

  return "";
}

function getAdditionalGroupNameError(): string {
  const shouldValidate = submitAttempted.value || additionalGroupTouched.value;
  if (!shouldValidate) return "";
  if (!additionalGroupName.value.trim()) return "Group name is required.";
  return "";
}

function getAdditionalQuantityError(): string {
  const shouldValidate =
    submitAttempted.value || additionalQuantityTouched.value;
  if (!shouldValidate) return "";

  const value = Number(additionalQuantity.value);
  if (!Number.isFinite(value) || value < 1) {
    return "Quantity is required and must be at least 1.";
  }
  return "";
}

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  submitAttempted.value = true;
  if (hasExistingGroups.value) {
    additionalGroupTouched.value = true;
    additionalQuantityTouched.value = true;
  } else {
    selectedMandatoryRatings.value.forEach((item) => {
      quantityTouched[item.id] = true;
    });
  }

  loading.value = true;

  try {
    let body: Record<string, unknown> = {
      sectorId: event.data.sectorId,
      ratingId: event.data.ratingId,
    };

    if (hasExistingGroups.value) {
      const groupName = additionalGroupName.value.trim();
      const quantity = Number(additionalQuantity.value);
      if (!groupName) {
        throw new Error("Group name is required.");
      }
      if (!Number.isFinite(quantity) || quantity < 1) {
        throw new Error("Quantity must be at least 1.");
      }
      body = {
        ...body,
        group: [
          {
            mandatoryRatingId: null,
            mandatory: groupName,
            quantity,
          },
        ],
      };
    } else {
      const group = selectedMandatoryRatings.value.map((item) => ({
        mandatoryRatingId: item.id,
        mandatory: item.mandatoryItem.mandatory,
        quantity: Number(groupQuantities[item.id] || 0),
      }));

      if (group.length === 0) {
        throw new Error("No mandatory rating found for selected rating.");
      }

      const invalidGroup = group.find(
        (item) => !Number.isFinite(item.quantity) || item.quantity < 1,
      );
      if (invalidGroup) {
        throw new Error(
          "All mandatory quantities must be filled with value at least 1.",
        );
      }

      body = { ...body, group };
    }

    // Call API to create question group
    await $fetch(`http://${ip.ipBackEnd}/api/questionGroupsMultipleChoice`, {
      method: "POST",
      body,
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: "Question group has been created successfully",
      color: "success",
    });

    // Reset form and close modal
    state.sectorId = undefined;
    state.ratingId = undefined;
    submitAttempted.value = false;
    additionalGroupName.value = "";
    additionalQuantity.value = undefined;
    additionalGroupTouched.value = false;
    additionalQuantityTouched.value = false;
    Object.keys(groupQuantities).forEach((key) => {
      delete groupQuantities[Number(key)];
    });
    Object.keys(quantityTouched).forEach((key) => {
      delete quantityTouched[Number(key)];
    });
    open.value = false;

    // Emit event to refresh parent table
    emit("questionGroupAdded");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to create question group. Please try again.";
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
    title="Add New Question Group"
    description="Create question groups from mandatory items or add extra non-mandatory group"
  >
    <UButton label="Add Question Group" icon="i-lucide-plus" color="primary" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Sector" name="sectorId" required>
          <USelect
            v-model="state.sectorId"
            :items="sectors"
            label-key="name"
            value-key="id"
            placeholder="Select a sector"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Rating" name="ratingId" required>
          <USelect
            v-model="state.ratingId"
            :items="availableRatings"
            label-key="name"
            value-key="id"
            placeholder="Select a rating"
            :disabled="!state.sectorId"
            class="w-full"
          />
          <template v-if="!state.sectorId" #hint>
            <span class="text-xs text-muted">Select a sector first</span>
          </template>
        </UFormField>

        <div
          v-if="state.ratingId && !hasExistingGroups"
          class="rounded-lg border border-default overflow-hidden"
        >
          <div
            class="flex items-center justify-between px-3 py-2 border-b border-default bg-elevated/40 text-sm"
          >
            <span class="text-muted">Total Questions Set</span>
            <span class="font-semibold text-primary">
              {{ totalConfiguredQuantity }}
            </span>
          </div>
          <table class="w-full text-sm">
            <thead class="bg-elevated/60">
              <tr>
                <th class="text-left px-3 py-2 font-medium">Mandatory</th>
                <th class="text-left px-3 py-2 font-medium w-40">Quantity</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in selectedMandatoryRatings"
                :key="item.id"
                class="border-t border-default"
              >
                <td class="px-3 py-2 align-top">
                  {{ item.mandatoryItem.mandatory }}
                </td>
                <td class="px-3 py-2">
                  <UInput
                    v-model.number="groupQuantities[item.id]"
                    type="number"
                    min="1"
                    class="w-full"
                    placeholder="0"
                    @blur="quantityTouched[item.id] = true"
                  />
                  <p
                    v-if="getQuantityError(item.id)"
                    class="mt-1 text-xs text-error"
                  >
                    {{ getQuantityError(item.id) }}
                  </p>
                </td>
              </tr>
              <tr v-if="selectedMandatoryRatings.length === 0">
                <td colspan="2" class="px-3 py-4 text-center text-muted">
                  No mandatory items found for this rating.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="state.ratingId && hasExistingGroups" class="space-y-3">
          <div class="rounded-lg border border-default p-3 bg-elevated/40">
            <div class="text-sm">
              Mandatory groups for this sector-rating already exist
              ({{ selectedExistingGroups.length }} group(s), total
              {{ existingTotalQuantity }} question(s)).
            </div>
          </div>

          <UFormField label="Group Name" required>
            <UInput
              v-model="additionalGroupName"
              class="w-full"
              placeholder="Enter additional group name"
              @blur="additionalGroupTouched = true"
            />
            <template v-if="getAdditionalGroupNameError()" #hint>
              <span class="text-xs text-error">{{
                getAdditionalGroupNameError()
              }}</span>
            </template>
          </UFormField>

          <UFormField label="Quantity" required>
            <UInput
              v-model.number="additionalQuantity"
              type="number"
              min="1"
              class="w-full"
              placeholder="Enter quantity"
              @blur="additionalQuantityTouched = true"
            />
            <template v-if="getAdditionalQuantityError()" #hint>
              <span class="text-xs text-error">{{
                getAdditionalQuantityError()
              }}</span>
            </template>
          </UFormField>
        </div>

        <!-- Show summary when all fields are filled -->
        <div
          v-if="selectedSector && selectedRating"
          class="p-3 bg-elevated/50 rounded border border-default space-y-2"
        >
          <div class="text-sm font-medium">Summary:</div>
          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">Sector:</span>
            <span class="font-medium">{{ selectedSector.name }}</span>
          </div>
          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">Rating:</span>
            <span class="font-medium text-primary">{{
              selectedRating.name
            }}</span>
          </div>
          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">Description:</span>
            <span class="font-medium text-muted">{{
              selectedRating.description
            }}</span>
          </div>
          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">
              {{ hasExistingGroups ? "Existing Groups:" : "Mandatory Items:" }}
            </span>
            <span class="font-medium">
              {{
                hasExistingGroups
                  ? selectedExistingGroups.length
                  : selectedMandatoryRatings.length
              }}
            </span>
          </div>
          <div v-if="hasExistingGroups" class="text-sm flex items-center gap-2">
            <span class="text-muted">Existing Questions:</span>
            <span class="font-medium">{{ existingTotalQuantity }}</span>
          </div>
          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">Total Questions Set:</span>
            <span class="font-medium text-primary">{{
              totalConfiguredQuantity
            }}</span>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            label="Create Question Group"
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
