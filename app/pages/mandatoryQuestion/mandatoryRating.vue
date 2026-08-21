<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface MandatoryItem {
  id: number;
  mandatory: string;
}

interface MandatoryRatingRelation {
  id?: number;
  mandatoryItemId?: number;
  mandatoryItem?: MandatoryItem | null;
  mandatory?: MandatoryItem | null;
}

interface RatingItem {
  id: number;
  rating: string;
  description?: string | null;
  mandatoryRatings?: MandatoryRatingRelation[];
}

interface MandatoryRatingResponse {
  rating?: RatingItem[];
  mandatoryItem?: MandatoryItem[];
}

const { token } = useAuth();
const toast = useToast();

const selectedRatingForAdd = ref<RatingItem | null>(null);
const deletingMandatoryRatingId = ref<number | null>(null);

const {
  data: apiResponse,
  status,
  error,
  refresh,
} = await useFetch<MandatoryRatingResponse>(
  `${apiBaseUrl}/api/mandatoryRating`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const ratings = computed<RatingItem[]>(() => apiResponse.value?.rating || []);
const mandatoryItems = computed<MandatoryItem[]>(
  () => apiResponse.value?.mandatoryItem || [],
);
const availableMandatoryItemsForSelectedRating = computed<MandatoryItem[]>(() => {
  const selectedRating = selectedRatingForAdd.value;
  const allItems = mandatoryItems.value || [];
  if (!selectedRating) return allItems;

  const assignedIds = new Set<number>(
    (selectedRating.mandatoryRatings || [])
      .map((relation) =>
        Number(
          relation?.mandatoryItem?.id ??
            relation?.mandatory?.id ??
            relation?.mandatoryItemId ??
            0,
        ),
      )
      .filter((id) => Number.isFinite(id) && id > 0),
  );

  return allItems.filter((item) => !assignedIds.has(item.id));
});

function getMandatoryRatingEntries(item: RatingItem): Array<{
  mandatoryRatingId: number | null;
  label: string;
}> {
  return (item.mandatoryRatings || [])
    .map((relation) => ({
      mandatoryRatingId:
        Number(relation?.id) > 0 ? Number(relation.id) : null,
      label:
        relation.mandatoryItem?.mandatory || relation.mandatory?.mandatory || "",
    }))
    .filter((entry) => entry.label);
}

async function deleteSingleMandatoryRating(
  rating: RatingItem,
  mandatoryRatingId: number | null,
  label: string,
) {
  if (!mandatoryRatingId) {
    toast.add({
      title: "Error",
      description: "Mandatory rating ID is not available.",
      color: "error",
    });
    return;
  }

  const isConfirmed = window.confirm(
    `Are you sure you want to remove "${label}" from rating ${rating.rating}?`,
  );
  if (!isConfirmed) return;

  try {
    deletingMandatoryRatingId.value = mandatoryRatingId;
    const response = await $fetch<{ message?: string }>(
      `${apiBaseUrl}/api/mandatoryRating/${mandatoryRatingId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    const message = String(response?.message || "").trim().toLowerCase();
    if (message && message !== "success") {
      toast.add({
        title: "Error",
        description: response?.message || "Failed to delete mandatory rating.",
        color: "error",
      });
      return;
    }

    toast.add({
      title: "Success",
      description: "Mandatory rating deleted successfully.",
      color: "success",
    });
    await refresh();
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message || "Failed to delete mandatory rating.",
      color: "error",
    });
  } finally {
    deletingMandatoryRatingId.value = null;
  }
}

function handleAdded() {
  selectedRatingForAdd.value = null;
  void refresh();
}

function closeAddModal() {
  selectedRatingForAdd.value = null;
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Mandatory Rating">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4">
        <UCard>
          <div
            v-if="status === 'pending'"
            class="flex items-center justify-center py-8 text-muted gap-2"
          >
            <UIcon name="i-lucide-loader-2" class="animate-spin" />
            <span>Loading mandatory ratings...</span>
          </div>

          <div
            v-else-if="error"
            class="rounded-lg border border-error/30 bg-error/5 p-4 space-y-2"
          >
            <p class="font-medium text-error">
              Failed to fetch mandatory ratings.
            </p>
            <UButton
              label="Retry"
              color="error"
              variant="outline"
              icon="i-lucide-refresh-cw"
              @click="refresh()"
            />
          </div>

          <div v-else-if="ratings.length === 0" class="py-6 text-muted">
            No rating data available.
          </div>

          <div v-else class="overflow-x-auto">
            <table
              class="w-full border-collapse border border-gray-200 text-sm"
            >
              <thead>
                <tr class="bg-gray-100">
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    No
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Rating
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Description
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Mandatory Ratings
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in ratings"
                  :key="item.id"
                  class="hover:bg-gray-50"
                >
                  <td class="border border-gray-300 px-4 py-2 text-center">
                    {{ index + 1 }}
                  </td>
                  <td class="border border-gray-300 px-4 py-2 text-center">
                    {{ item.rating }}
                  </td>
                  <td class="border border-gray-300 px-4 py-2">
                    {{ item.description || "-" }}
                  </td>
                  <td class="border border-gray-300 px-4 py-2">
                    <ul
                      v-if="getMandatoryRatingEntries(item).length > 0"
                      class="list-disc list-inside space-y-1"
                    >
                      <li
                        v-for="(entry, idx) in getMandatoryRatingEntries(item)"
                        :key="`${item.id}-${entry.mandatoryRatingId || idx}`"
                        class="flex items-center justify-between gap-2"
                      >
                        <span>{{ idx + 1 }}. {{ entry.label }}</span>
                        <UButton
                          icon="i-lucide-x"
                          color="error"
                          variant="ghost"
                          size="xs"
                          :loading="
                            deletingMandatoryRatingId ===
                            entry.mandatoryRatingId
                          "
                          @click="
                            deleteSingleMandatoryRating(
                              item,
                              entry.mandatoryRatingId,
                              entry.label,
                            )
                          "
                        />
                      </li>
                    </ul>
                    <span v-else>-</span>
                  </td>
                  <td class="border border-gray-300 px-4 py-2">
                    <div class="flex items-center justify-center">
                      <UButton
                        label="Add"
                        icon="i-lucide-plus"
                        color="primary"
                        variant="soft"
                        size="sm"
                        :disabled="
                          ((item.mandatoryRatings || []).length || 0) >=
                          mandatoryItems.length
                        "
                        @click="selectedRatingForAdd = item"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <MandatoryRatingAddModal
    :rating-item="selectedRatingForAdd"
    :mandatory-items="availableMandatoryItemsForSelectedRating"
    @mandatory-rating-added="handleAdded"
    @close="closeAddModal"
  />
</template>
