<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

const { token } = useAuth();

interface User {
  nik: string;
  name: string;
}

interface AssignedUser {
  id: number;
  user: User;
}

const props = defineProps<{
  eventId: number | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const open = ref(false);
const loading = ref(false);
const dataLoading = ref(false);
const toast = useToast();

const assignedUsers = ref<AssignedUser[]>([]);
const selectedUserIds = ref<number[]>([]);
const userSearch = ref("");
const filteredUsers = computed(() => {
  const term = userSearch.value.trim().toLowerCase();
  if (!term) return assignedUsers.value;
  return assignedUsers.value.filter(({ user }) =>
    `${user.name} ${user.nik}`.toLowerCase().includes(term),
  );
});
const allVisibleSelected = computed(() =>
  filteredUsers.value.length > 0 && filteredUsers.value.every(({ id }) => selectedUserIds.value.includes(id)),
);

// Watch for eventId changes to fetch data
watch(
  () => props.eventId,
  async (newEventId) => {
    if (newEventId) {
      await fetchAssignedUsers(newEventId);
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    assignedUsers.value = [];
    selectedUserIds.value = [];
    userSearch.value = "";
    emit("close");
  }
});

async function fetchAssignedUsers(eventId: number) {
  dataLoading.value = true;
  try {
    const response = await $fetch<AssignedUser[]>(
      `${apiBaseUrl}/api/eventsGetEventUser/${eventId}`,
      {
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );
    assignedUsers.value = response || [];
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error?.message || "Failed to fetch assigned users",
      color: "error",
    });
  } finally {
    dataLoading.value = false;
  }
}

function toggleUserSelection(userId: number) {
  const index = selectedUserIds.value.indexOf(userId);
  if (index > -1) {
    selectedUserIds.value.splice(index, 1);
  } else {
    selectedUserIds.value.push(userId);
  }
}

function isUserSelected(userId: number): boolean {
  return selectedUserIds.value.includes(userId);
}

async function deleteSelectedUsers() {
  if (!props.eventId || selectedUserIds.value.length === 0) return;
  if (!window.confirm(`Remove ${selectedUserIds.value.length} selected user(s) from this event?`)) return;

  loading.value = true;

  try {
    // Send array of IDs to delete in a single POST request
    await $fetch(`${apiBaseUrl}/api/eventsDeleteEventUser`, {
      method: "POST",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
        "Content-Type": "application/json",
      },
      body: {
        ids: selectedUserIds.value,
      },
    });

    toast.add({
      title: "Success",
      description: "Selected users have been removed from the event",
      color: "success",
    });

    // Refresh the list
    await fetchAssignedUsers(props.eventId);
    selectedUserIds.value = [];
  } catch (error: any) {
    const errorMessage =
      error?.data?.message || error?.message || "Failed to remove users";
    toast.add({
      title: "Error",
      description: errorMessage,
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function selectVisibleUsers() {
  const visibleIds = new Set(filteredUsers.value.map(({ id }) => id));
  if (allVisibleSelected.value) {
    selectedUserIds.value = selectedUserIds.value.filter((id) => !visibleIds.has(id));
  } else {
    selectedUserIds.value = [...new Set([...selectedUserIds.value, ...visibleIds])];
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="View Assigned Users"
    description="View and manage users assigned to this event"
    :ui="{ content: 'w-[min(96vw,80rem)] max-w-7xl max-h-[94vh]', body: 'overflow-y-auto' }"
  >
    <template #body>
      <div class="space-y-4">
        <!-- Loading State -->
        <USkeleton v-if="dataLoading" class="h-32 w-full" />

        <!-- Empty State -->
        <div
          v-else-if="assignedUsers.length === 0"
          class="text-center py-8 text-muted"
        >
          <UIcon name="i-lucide-users" class="text-4xl mb-2 opacity-50" />
          <p>No users assigned to this event</p>
        </div>

        <!-- Users List -->
        <div v-else class="space-y-3">
          <UInput
            v-model="userSearch"
            icon="i-lucide-search"
            placeholder="Search assigned users by name or NIK"
            class="w-full"
          />
          <!-- Select All / Actions -->
          <div class="flex flex-wrap items-center justify-between gap-2">
            <UButton
              :label="allVisibleSelected ? 'Deselect filtered' : 'Select filtered'"
              color="neutral"
              variant="ghost"
              size="sm"
              :disabled="!filteredUsers.length || loading"
              @click="selectVisibleUsers"
            />
            <span class="text-sm text-muted">Showing {{ filteredUsers.length }} of {{ assignedUsers.length }} assigned users</span>
            <UButton
              v-if="selectedUserIds.length > 0"
              label="Delete Selected"
              color="error"
              variant="soft"
              size="sm"
              icon="i-lucide-trash-2"
              :loading="loading"
              @click="deleteSelectedUsers"
            />
          </div>

          <!-- User List with Checkboxes -->
          <div class="grid min-h-80 max-h-[60vh] grid-cols-1 overflow-y-auto rounded-lg border border-default md:grid-cols-2">
            <p v-if="!filteredUsers.length" class="p-4 text-sm text-muted">No assigned users match your search.</p>
            <label
              v-for="assignedUser in filteredUsers"
              :key="assignedUser.id"
              class="flex cursor-pointer items-center gap-3 border-b border-default p-3 transition-colors hover:bg-elevated/50"
            >
              <UCheckbox
                :model-value="isUserSelected(assignedUser.id)"
                :disabled="loading"
                @update:model-value="toggleUserSelection(assignedUser.id)"
              />
              <div class="flex-1">
                <div class="font-medium">{{ assignedUser.user.name }}</div>
                <div class="text-sm text-muted">
                  NIK: {{ assignedUser.user.nik }}
                </div>
              </div>
              <UBadge
                v-if="isUserSelected(assignedUser.id)"
                color="primary"
                variant="soft"
                size="sm"
              >
                Selected
              </UBadge>
            </label>
          </div>

          <!-- Selection Summary -->
          <div
            v-if="selectedUserIds.length > 0"
            class="text-sm text-muted text-center"
          >
            {{ selectedUserIds.length }} of {{ assignedUsers.length }} users
            selected
          </div>
        </div>

        <!-- Close Button -->
        <div class="flex justify-end pt-4">
          <UButton
            label="Close"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
