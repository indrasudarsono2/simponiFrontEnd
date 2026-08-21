<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface MandatoryItem {
  id: number;
  mandatory: string;
}

const { token } = useAuth();

const selectedMandatoryToUpdate = ref<MandatoryItem | null>(null);
const selectedMandatoryToDelete = ref<MandatoryItem | null>(null);

const {
  data: mandatoryApiResponse,
  status,
  error,
  refresh,
} = await useFetch<any>(`${apiBaseUrl}/api/mandatoryItem`, {
  headers: {
    Authorization: token.value ? `Bearer ${token.value}` : "",
  },
});

const mandatoryItems = computed<MandatoryItem[]>(() => {
  const payload = mandatoryApiResponse.value;
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.mandatory)
      ? payload.mandatory
      : Array.isArray(payload?.mandatoryItem)
        ? payload.mandatoryItem
        : Array.isArray(payload?.mandatoryItems)
          ? payload.mandatoryItems
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

  return source
    .map((item: any) => ({
      id: Number(item?.id ?? item?.mandatoryItemId ?? 0),
      mandatory: String(item?.mandatory ?? item?.item ?? item?.name ?? "-"),
    }))
    .filter((item: MandatoryItem) => Number.isFinite(item.id) && item.id > 0);
});

function handleAdded() {
  void refresh();
}

function handleUpdated() {
  selectedMandatoryToUpdate.value = null;
  void refresh();
}

function handleDeleted() {
  selectedMandatoryToDelete.value = null;
  void refresh();
}

function closeUpdateModal() {
  selectedMandatoryToUpdate.value = null;
}

function closeDeleteModal() {
  selectedMandatoryToDelete.value = null;
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Mandatory Items">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 space-y-4">
        <div class="flex justify-end">
          <MandatoryItemAddModal @mandatory-added="handleAdded" />
        </div>

        <UCard>
          <div
            v-if="status === 'pending'"
            class="flex items-center justify-center py-8 text-muted gap-2"
          >
            <UIcon name="i-lucide-loader-2" class="animate-spin" />
            <span>Loading mandatory items...</span>
          </div>

          <div
            v-else-if="error"
            class="rounded-lg border border-error/30 bg-error/5 p-4 space-y-2"
          >
            <p class="font-medium text-error">
              Failed to fetch mandatory items.
            </p>
            <UButton
              label="Retry"
              color="error"
              variant="outline"
              icon="i-lucide-refresh-cw"
              @click="refresh()"
            />
          </div>

          <div v-else-if="mandatoryItems.length === 0" class="py-6 text-muted">
            No mandatory items available.
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
                    Item
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in mandatoryItems"
                  :key="item.id"
                  class="hover:bg-gray-50"
                >
                  <td class="border border-gray-300 px-4 py-2 text-center">
                    {{ index + 1 }}
                  </td>
                  <td class="border border-gray-300 px-4 py-2">
                    {{ item.mandatory }}
                  </td>
                  <td class="border border-gray-300 px-4 py-2">
                    <div class="flex items-center justify-center gap-2">
                      <UButton
                        icon="i-lucide-pencil"
                        color="primary"
                        variant="soft"
                        size="sm"
                        @click="selectedMandatoryToUpdate = item"
                      />
                      <UButton
                        icon="i-lucide-trash-2"
                        color="error"
                        variant="soft"
                        size="sm"
                        @click="selectedMandatoryToDelete = item"
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

  <MandatoryItemUpdateModal
    :mandatory-item="selectedMandatoryToUpdate"
    @mandatory-updated="handleUpdated"
    @close="closeUpdateModal"
  />

  <MandatoryItemDeleteModal
    :mandatory-item="selectedMandatoryToDelete"
    @mandatory-deleted="handleDeleted"
    @close="closeDeleteModal"
  />
</template>
