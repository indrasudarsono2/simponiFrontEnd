<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";
const { token } = useAuth();
interface UserRole {
  id: number;
  roles: {
    role: string;
  };
}

interface User {
  nik: string;
  name: string;
  userRoles: UserRole[];
}

interface Sector {
  id: number;
  sector: string;
  users: User[];
}

interface RemarkDoc {
  id: number;
  remark: string;
}

interface Event {
  id: number;
  event: string;
  sector: Sector;
  remarkDoc: RemarkDoc;
  eventUsers?: { user: User }[];
}

const props = defineProps<{
  events: Event[];
}>();

const emit = defineEmits<{
  definingCheckerAdded: [];
}>();

const schema = z.object({
  eventId: z.coerce.number().min(1, "Event is required"),
  group: z.string().min(2, "Group name must be at least 2 characters"),
  pic: z.string().min(1, "PIC is required"),
  checkers: z.array(z.string()).min(1, "At least one checker is required"),
  members: z.array(z.string()).min(1, "At least one member is required"),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  eventId: undefined,
  group: undefined,
  pic: undefined,
  checkers: [],
  members: [],
});

// Get selected event info
const selectedEvent = computed(() => {
  if (!state.eventId) return null;
  return props.events.find((e) => e.id === state.eventId);
});

// Get users with CHECKER role from selected event
const checkerUsers = computed(() => {
  if (!selectedEvent.value?.sector?.users) return [];
  return selectedEvent.value.sector.users.filter((user) =>
    user.userRoles.some((ur) => ur.roles.role === "CHECKER"),
  );
});

// Get eventUsers (users already assigned to the event) for member selection
const eventAssignedUsers = computed(() => {
  if (!selectedEvent.value?.eventUsers) return [];
  return selectedEvent.value.eventUsers.map((eu) => eu.user);
});

// Options for PIC and Checkers (single selection for PIC, multiple for Checkers)
const checkerOptions = computed(() => {
  return checkerUsers.value.map((user) => ({
    value: user.nik,
    label: `${user.name} (${user.nik})`,
  }));
});

// Options for Members (from eventUsers - users already assigned to the event)
const memberOptions = computed(() => {
  return eventAssignedUsers.value.map((user) => ({
    value: user.nik,
    label: `${user.name} (${user.nik})`,
  }));
});

watch(
  () => state.eventId,
  (newEventId, oldEventId) => {
    if (newEventId !== oldEventId) {
      // Reset all user selections when event changes
      state.pic = undefined;
      state.checkers = [];
      state.members = [];
    }
  },
);

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    // Call API to create defining checker
    await $fetch(`http://${ip.ipBackEnd}/api/groups`, {
      method: "POST",
      body: {
        eventId: event.data.eventId,
        group: event.data.group,
        pic: event.data.pic,
        checkers: event.data.checkers,
        members: event.data.members,
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Group "${event.data.group}" has been created successfully`,
      color: "success",
    });

    // Reset form and close modal
    state.eventId = undefined;
    state.group = undefined;
    state.pic = undefined;
    state.checkers = [];
    state.members = [];
    open.value = false;

    // Emit event to refresh parent table
    emit("definingCheckerAdded");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to create group. Please try again.";
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
    title="Add New Group"
    description="Create a new checker group for an event"
  >
    <UButton label="Add Group" icon="i-lucide-plus" color="primary" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Event" name="eventId" required>
          <USelect
            v-model="state.eventId"
            :items="events"
            label-key="event"
            value-key="id"
            placeholder="Select an event"
            class="w-full"
          />
        </UFormField>

        <!-- Show event details when event is selected -->
        <div
          v-if="selectedEvent"
          class="p-3 bg-elevated/50 rounded border border-default space-y-2"
        >
          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">Event:</span>
            <span class="font-medium">{{ selectedEvent.event }}</span>
          </div>
          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">Remark Doc:</span>
            <span class="font-medium">{{
              selectedEvent.remarkDoc?.remark
            }}</span>
          </div>
          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">Sector:</span>
            <span class="font-medium">{{ selectedEvent.sector?.sector }}</span>
          </div>
          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">Available Checkers:</span>
            <span class="font-medium text-primary">{{
              checkerUsers.length
            }}</span>
          </div>
          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">Available Members:</span>
            <span class="font-medium text-primary">{{
              eventAssignedUsers.length
            }}</span>
          </div>
        </div>

        <UFormField
          label="Group Name"
          placeholder="Enter group name"
          name="group"
          required
        >
          <UInput
            v-model="state.group"
            class="w-full"
            placeholder="e.g., PENERBITAN FENNY"
          />
        </UFormField>

        <UFormField label="PIC (Person in Charge)" name="pic" required>
          <USelect
            v-model="state.pic"
            :items="checkerOptions"
            label-key="label"
            value-key="value"
            placeholder="Select PIC"
            class="w-full"
          />
          <p
            v-if="checkerOptions.length === 0"
            class="text-xs text-warning mt-1"
          >
            No checkers available for this event
          </p>
        </UFormField>

        <UFormField label="Checkers" name="checkers" required>
          <USelect
            v-model="state.checkers"
            :items="checkerOptions"
            label-key="label"
            value-key="value"
            placeholder="Select checkers"
            class="w-full"
            multiple
          />
          <p
            v-if="checkerOptions.length === 0"
            class="text-xs text-warning mt-1"
          >
            No checkers available for this event
          </p>
          <p v-else class="text-xs text-muted mt-1">
            Select multiple checkers with CHECKER role
          </p>
        </UFormField>

        <UFormField label="Members" name="members" required>
          <USelect
            v-model="state.members"
            :items="memberOptions"
            label-key="label"
            value-key="value"
            placeholder="Select members"
            class="w-full"
            multiple
            :disabled="!selectedEvent"
          />
          <p v-if="!selectedEvent" class="text-xs text-muted mt-1">
            Please select an event first
          </p>
          <p
            v-else-if="memberOptions.length === 0"
            class="text-xs text-warning mt-1"
          >
            No users assigned to this event. Please assign users to the event
            first.
          </p>
          <p v-else class="text-xs text-muted mt-1">
            Select members from users assigned to this event
          </p>
        </UFormField>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            label="Create Group"
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
