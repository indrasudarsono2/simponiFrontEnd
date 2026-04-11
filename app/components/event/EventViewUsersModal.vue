<script setup lang="ts">
import ip from "../../utils/config.json";

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
    emit("close");
  }
});

async function fetchAssignedUsers(eventId: number) {
  dataLoading.value = true;
  try {
    const response = await $fetch<AssignedUser[]>(
      `http://${ip.ipBackEnd}/api/eventsGetEventUser/${eventId}`,
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

  loading.value = true;

  try {
    // Send array of IDs to delete in a single POST request
    await $fetch(`http://${ip.ipBackEnd}/api/eventsDeleteEventUser`, {
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

function selectAllUsers() {
  if (selectedUserIds.value.length === assignedUsers.value.length) {
    selectedUserIds.value = [];
  } else {
    selectedUserIds.value = assignedUsers.value.map((u) => u.id);
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="View Assigned Users"
    description="View and manage users assigned to this event"
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
          <!-- Select All / Actions -->
          <div class="flex items-center justify-between">
            <UButton
              :label="
                selectedUserIds.length === assignedUsers.length
                  ? 'Deselect All'
                  : 'Select All'
              "
              color="neutral"
              variant="ghost"
              size="sm"
              @click="selectAllUsers"
            />
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
          <div class="border border-default rounded-lg divide-y divide-default">
            <div
              v-for="assignedUser in assignedUsers"
              :key="assignedUser.id"
              class="flex items-center gap-3 p-3 hover:bg-elevated/50 transition-colors"
            >
              <UCheckbox
                :model-value="isUserSelected(assignedUser.id)"
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
            </div>
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
