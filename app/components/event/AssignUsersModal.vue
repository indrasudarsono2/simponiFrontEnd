<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";

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

// Computed property to get users from userFilter
const availableUsers = computed(() => {
  return eventData.value?.userFilter || [];
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
    eventData.value = null;
    emit("close");
  }
});

async function fetchEventData(eventId: number) {
  dataLoading.value = true;
  try {
    const response = await $fetch<EventResponse>(
      `http://${ip.ipBackEnd}/api/eventsGetUser/${eventId}`,
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
    await $fetch(`http://${ip.ipBackEnd}/api/eventsPostUser`, {
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
          <USelectMenu
            v-model="state.selectedUsers"
            :items="availableUsers"
            label-key="name"
            value-key="nik"
            multiple
            searchable
            placeholder="Search and select users..."
            class="w-full"
            :loading="dataLoading"
          >
            <template #item="{ item }">
              <div class="flex items-center gap-2 w-full">
                <UIcon
                  :name="
                    isUserSelected(item.nik)
                      ? 'i-lucide-check-square'
                      : 'i-lucide-square'
                  "
                  class="text-lg"
                  :class="
                    isUserSelected(item.nik) ? 'text-primary' : 'text-muted'
                  "
                />
                <span>{{ item.name }} ({{ item.nik }})</span>
              </div>
            </template>
          </USelectMenu>
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
          <div class="flex flex-wrap gap-2">
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
