<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
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

interface CheckerGroup {
  id: number;
  checker: string;
}

interface GroupMember {
  id: number;
  member: string;
}

interface Group {
  checkerGroups: CheckerGroup[];
  groupMembers: GroupMember[];
}

interface Event {
  id: number;
  name: string;
  event: string;
  sectorId: number;
  sectorName: string;
  session?: string;
  sector: Sector;
  remarkDoc: RemarkDoc;
  eventUsers?: { user: User }[];
  groups?: Group[];
}

interface DefiningCheckerRow {
  id: number;
  eventId: number;
  eventName: string;
  sectorId: number;
  sectorName: string;
  group: string;
  pic: string;
  checkers: string[];
  members: string[];
  remarkDoc: string;
  createdAt?: string;
}

const props = defineProps<{
  definingChecker: DefiningCheckerRow | null;
  events: Event[];
}>();

const emit = defineEmits<{
  definingCheckerUpdated: [];
  close: [];
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

// Get all checker NIKs already assigned to any group in this event (excluding current group)
const assignedCheckerNikSet = computed(() => {
  const groups = selectedEvent.value?.groups || [];
  const assignedNiks = new Set<string>();
  groups.forEach((group) => {
    group.checkerGroups?.forEach((cg) => {
      // Exclude checkers from the current group being edited
      if (
        cg.checker &&
        !props.definingChecker?.checkers?.includes(cg.checker)
      ) {
        assignedNiks.add(cg.checker);
      }
    });
  });
  return assignedNiks;
});

// Get all member NIKs already assigned to any group in this event (excluding current group)
const assignedMemberNikSet = computed(() => {
  const groups = selectedEvent.value?.groups || [];
  const assignedNiks = new Set<string>();
  groups.forEach((group) => {
    group.groupMembers?.forEach((gm) => {
      // Exclude members from the current group being edited
      if (gm.member && !props.definingChecker?.members?.includes(gm.member)) {
        assignedNiks.add(gm.member);
      }
    });
  });
  return assignedNiks;
});

// Get users with CHECKER role from selected event, excluding already assigned checkers
const availableCheckerUsers = computed(() => {
  if (!selectedEvent.value?.sector?.users) return [];
  return selectedEvent.value.sector.users.filter(
    (user) =>
      user.userRoles.some((ur) => ur.roles.role === "CHECKER") &&
      !assignedCheckerNikSet.value.has(user.nik),
  );
});

// Get eventUsers (users already assigned to the event) for member selection, excluding already assigned members
const availableEventUsers = computed(() => {
  if (!selectedEvent.value?.eventUsers) return [];
  return selectedEvent.value.eventUsers
    .map((eu) => eu.user)
    .filter((user) => !assignedMemberNikSet.value.has(user.nik));
});

// Options for PIC and Checkers (single selection for PIC, multiple for Checkers)
const checkerOptions = computed(() => {
  return availableCheckerUsers.value.map((user) => ({
    value: user.nik,
    label: `${user.name} (${user.nik})`,
  }));
});

// Options for Members (from eventUsers - users already assigned to the event)
const memberOptions = computed(() => {
  return availableEventUsers.value.map((user) => ({
    value: user.nik,
    label: `${user.name} (${user.nik})`,
  }));
});

// Get remarkDoc from selected event
const selectedRemarkDoc = computed(() => {
  return selectedEvent.value?.remarkDoc?.remark;
});

// Watch for definingChecker prop changes to populate form
watch(
  () => props.definingChecker,
  (newDefiningChecker: DefiningCheckerRow | null) => {
    if (newDefiningChecker) {
      state.eventId = newDefiningChecker.eventId;
      state.group = newDefiningChecker.group;
      state.pic = newDefiningChecker.pic;
      state.checkers = newDefiningChecker.checkers;
      state.members = newDefiningChecker.members;
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.eventId = undefined;
    state.group = undefined;
    state.pic = undefined;
    state.checkers = [];
    state.members = [];
    emit("close");
  }
});

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.definingChecker) return;

  loading.value = true;

  try {
    // Call API to update defining checker
    await $fetch(
      `${apiBaseUrl}/api/groups/${props.definingChecker.id}`,
      {
        method: "PUT",
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
      },
    );

    toast.add({
      title: "Success",
      description: `Group "${event.data.group}" has been updated successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("definingCheckerUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to update group. Please try again.";
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
    title="Update Group"
    description="Edit the checker group information"
  >
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
            label-key="name"
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
              availableCheckerUsers.length
            }}</span>
          </div>
          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">Available Members:</span>
            <span class="font-medium text-primary">{{
              availableEventUsers.length
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
            placeholder="Select PIC"
            class="w-full"
          />
          <p
            v-if="checkerOptions.length === 0"
            class="text-xs text-warning mt-1"
          >
            No checkers available
          </p>
        </UFormField>

        <UFormField label="Checkers" name="checkers" required>
          <USelect
            v-model="state.checkers"
            :items="checkerOptions"
            placeholder="Select checkers"
            class="w-full"
            multiple
          />
          <p
            v-if="checkerOptions.length === 0"
            class="text-xs text-warning mt-1"
          >
            No checkers available
          </p>
          <p v-else class="text-xs text-muted mt-1">
            Select multiple checkers (all checkers from any sector)
          </p>
        </UFormField>

        <UFormField label="Members" name="members" required>
          <USelect
            v-model="state.members"
            :items="memberOptions"
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
            label="Update Group"
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
