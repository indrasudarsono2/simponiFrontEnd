<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const { token } = useAuth();

interface User {
  nik: string;
  name: string;
}

interface EventDetail {
  id: number;
  event: string;
  startDate: string;
  finishDate: string;
  remarkDoc: {
    remark: string;
  };
  sector: {
    users: User[];
  };
}

interface EventResponse {
  event: EventDetail;
  userFilter: User[];
}

const props = defineProps<{
  eventId: number | null;
}>();

const emit = defineEmits<{
  usersAssigned: [];
  close: [];
}>();

const schema = z.object({
  selectedUsers: z.array(z.string()).min(1, "Please select at least one user"),
});

const open = ref(false);
const loading = ref(false);
const dataLoading = ref(false);
const toast = useToast();

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  selectedUsers: [],
});

const eventData = ref<EventResponse | null>(null);
const userSearch = ref("");

// Computed property to get users from userFilter
const availableUsers = computed(() => {
  return eventData.value?.userFilter || [];
});
const filteredUsers = computed(() => {
  const term = userSearch.value.trim().toLowerCase();
  if (!term) return availableUsers.value;
  return availableUsers.value.filter((user) =>
    `${user.name} ${user.nik}`.toLowerCase().includes(term),
  );
});

// Watch for eventId changes to fetch data
watch(
  () => props.eventId,
  async (newEventId) => {
    if (newEventId) {
      await fetchEventData(newEventId);
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.selectedUsers = [];
    userSearch.value = "";
    eventData.value = null;
    emit("close");
  }
});

async function fetchEventData(eventId: number) {
  dataLoading.value = true;
  try {
    const response = await $fetch<EventResponse>(
      `${apiBaseUrl}/api/eventsGetUser/${eventId}`,
      {
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );
    eventData.value = response;
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error?.message || "Failed to fetch event details",
      color: "error",
    });
  } finally {
    dataLoading.value = false;
  }
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.eventId) return;

  loading.value = true;

  try {
    await $fetch(`${apiBaseUrl}/api/eventsPostUser`, {
      method: "POST",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
        "Content-Type": "application/json",
      },
      body: {
        eventId: props.eventId,
        userNiks: event.data.selectedUsers,
      },
    });

    toast.add({
      title: "Success",
      description: "Users have been assigned to the event successfully",
      color: "success",
    });

    open.value = false;
    emit("usersAssigned");
  } catch (error: any) {
    const errorMessage =
      error?.data?.message || error?.message || "Failed to assign users";
    toast.add({
      title: "Error",
      description: errorMessage,
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

// Helper to check if a user is selected
function isUserSelected(nik: string): boolean {
  return state.selectedUsers?.includes(nik) || false;
}

function toggleUser(nik: string, selected: boolean) {
  const current = state.selectedUsers || [];
  state.selectedUsers = selected
    ? [...new Set([...current, nik])]
    : current.filter((item) => item !== nik);
}

function selectFilteredUsers() {
  state.selectedUsers = [...new Set([...(state.selectedUsers || []), ...filteredUsers.value.map((user) => user.nik)])];
}

// Helper to get user name by NIK
function getUserNameByNik(nik: string): string {
  const user = availableUsers.value.find((u) => u.nik === nik);
  return user ? `${user.name} (${user.nik})` : nik;
}

// Helper to remove a user from selection
function removeUser(nik: string) {
  if (state.selectedUsers) {
    state.selectedUsers = state.selectedUsers.filter((id) => id !== nik);
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Assign Users to Event"
    description="Select users to assign to this event"
    :ui="{ content: 'w-[min(96vw,80rem)] max-w-7xl max-h-[94vh]', body: 'overflow-y-auto' }"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <!-- Event Details (Read-only) -->
        <div
          v-if="eventData?.event"
          class="p-4 bg-elevated/50 rounded-lg border border-default space-y-2"
        >
          <div class="flex items-center gap-2">
            <span class="text-muted text-sm">Event:</span>
            <span class="font-medium">{{ eventData.event.event }}</span>
          </div>
          <div
            v-if="eventData.event.remarkDoc?.remark"
            class="flex items-center gap-2"
          >
            <span class="text-muted text-sm">Remark:</span>
            <span class="font-medium">{{
              eventData.event.remarkDoc.remark
            }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-muted text-sm">Period:</span>
            <span class="font-medium">
              {{ formatDate(eventData.event.startDate) }} -
              {{ formatDate(eventData.event.finishDate) }}
            </span>
          </div>
        </div>

        <USkeleton v-else-if="dataLoading" class="h-24 w-full" />

        <!-- User Selection -->
        <UFormField label="Select Users" name="selectedUsers" required>
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <UInput
                v-model="userSearch"
                icon="i-lucide-search"
                placeholder="Search by name or NIK"
                class="min-w-56 flex-1"
                :disabled="dataLoading"
              />
              <UButton label="Select filtered" variant="outline" size="sm" :disabled="loading || dataLoading || !filteredUsers.length" @click="selectFilteredUsers" />
            </div>
            <div class="grid min-h-80 max-h-[60vh] grid-cols-1 overflow-y-auto rounded-lg border border-default md:grid-cols-2" role="group" aria-label="Available users">
              <p v-if="dataLoading" class="p-3 text-sm text-muted">Loading available users...</p>
              <p v-else-if="!availableUsers.length" class="p-3 text-sm text-muted">No users are available for this event.</p>
              <p v-else-if="!filteredUsers.length" class="p-3 text-sm text-muted">No users match your search.</p>
              <label
                v-for="user in filteredUsers"
                :key="user.nik"
                class="flex cursor-pointer items-center gap-3 border-b border-default px-3 py-2 hover:bg-elevated/50"
              >
                <input
                  type="checkbox"
                  class="h-4 w-4 accent-primary"
                  :checked="isUserSelected(user.nik)"
                  :disabled="loading"
                  @change="toggleUser(user.nik, ($event.target as HTMLInputElement).checked)"
                >
                <span class="text-sm">{{ user.name }} <span class="text-muted">({{ user.nik }})</span></span>
              </label>
            </div>
            <p class="text-xs text-muted">{{ state.selectedUsers?.length || 0 }} of {{ availableUsers.length }} available users selected</p>
          </div>
        </UFormField>

        <!-- Selected Users Review -->
        <div
          v-if="state.selectedUsers && state.selectedUsers.length > 0"
          class="p-4 bg-elevated/50 rounded-lg border border-default"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-muted">
              Selected Users ({{ state.selectedUsers.length }})
            </span>
            <UButton
              label="Clear All"
              color="error"
              variant="ghost"
              size="xs"
              icon="i-lucide-trash-2"
              @click="state.selectedUsers = []"
            />
          </div>
          <div class="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
            <UBadge
              v-for="nik in state.selectedUsers"
              :key="nik"
              color="primary"
              variant="soft"
              size="lg"
              class="flex items-center gap-1"
            >
              {{ getUserNameByNik(nik) }}
              <UButton
                color="error"
                variant="ghost"
                size="md"
                icon="i-lucide-x"
                class="p-0.5 -mr-1"
                @click="removeUser(nik)"
              />
            </UBadge>
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
            label="Assign Users"
            color="primary"
            variant="solid"
            type="submit"
            :loading="loading"
            icon="i-lucide-users"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
