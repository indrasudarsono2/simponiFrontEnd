<script setup lang="ts">
import ip from "../../utils/config.json";

interface RatingItem {
  id: number;
  rating: string;
  description?: string | null;
}

interface MandatoryItem {
  id: number;
  mandatory: string;
}

const props = defineProps<{
  ratingItem: RatingItem | null;
  mandatoryItems: MandatoryItem[];
}>();

const emit = defineEmits<{
  mandatoryRatingAdded: [];
  close: [];
}>();

const { token } = useAuth();
const toast = useToast();

const open = ref(false);
const loading = ref(false);
const selectedMandatoryIds = ref<number[]>([]);

watch(
  () => props.ratingItem,
  (newValue) => {
    if (newValue) {
      selectedMandatoryIds.value = [];
      open.value = true;
    }
  },
  { immediate: true },
);

watch(open, (isOpen) => {
  if (!isOpen) {
    emit("close");
  }
});

const mandatoryOptions = computed(() =>
  (props.mandatoryItems || []).map((item) => ({
    label: item.mandatory,
    value: item.id,
  })),
);

const selectedMandatoryItems = computed(() => {
  const selected = new Set(selectedMandatoryIds.value);
  return (props.mandatoryItems || []).filter((item) => selected.has(item.id));
});

async function onSubmit() {
  if (!props.ratingItem?.id) return;
  if (!selectedMandatoryIds.value.length) {
    toast.add({
      title: "Validation Error",
      description: "Please select at least one mandatory item.",
      color: "error",
    });
    return;
  }

  loading.value = true;
  try {
    const response = await $fetch<{ message?: string }>(
      `http://${ip.ipBackEnd}/api/mandatoryRating`,
      {
        method: "POST",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
        body: {
          ratingId: props.ratingItem.id,
          mandatoryItem: selectedMandatoryIds.value,
        },
      },
    );

    const message = String(response?.message || "")
      .trim()
      .toLowerCase();
    if (message && message !== "success") {
      toast.add({
        title: "Error",
        description: response?.message || "Failed to assign mandatory rating.",
        color: "error",
      });
      return;
    }

    toast.add({
      title: "Success",
      description: "Mandatory rating assigned successfully.",
      color: "success",
    });

    open.value = false;
    emit("mandatoryRatingAdded");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error?.data?.message || "Failed to assign mandatory rating.",
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
    title="Add Mandatory Rating"
    description="Assign mandatory items to selected rating"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="Rating">
          <UInput
            :model-value="
              ratingItem
                ? `${ratingItem.rating} - ${ratingItem.description || '-'}`
                : '-'
            "
            disabled
          />
        </UFormField>

        <UFormField label="Mandatory Items" required>
          <USelectMenu
            v-model="selectedMandatoryIds"
            :items="mandatoryOptions"
            value-key="value"
            label-key="label"
            multiple
            searchable
            class="w-full"
            placeholder="Select mandatory item(s)"
          />
        </UFormField>

        <div class="rounded-lg border p-3 bg-muted/20 space-y-2">
          <p class="text-sm font-semibold text-highlighted">Summary</p>
          <p class="text-sm">
            <span class="text-muted">Rating:</span>
            <strong> {{ ratingItem?.rating || "-" }} </strong>
          </p>
          <p class="text-sm">
            <span class="text-muted">Selected Items:</span>
            <strong> {{ selectedMandatoryItems.length }} </strong>
          </p>
          <ul
            v-if="selectedMandatoryItems.length > 0"
            class="list-disc list-inside text-sm space-y-1"
          >
            <li v-for="item in selectedMandatoryItems" :key="item.id">
              {{ item.mandatory }}
            </li>
          </ul>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          label="Cancel"
          color="neutral"
          variant="soft"
          :disabled="loading"
          @click="open = false"
        />
        <UButton
          label="Submit"
          color="primary"
          icon="i-lucide-save"
          :loading="loading"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
