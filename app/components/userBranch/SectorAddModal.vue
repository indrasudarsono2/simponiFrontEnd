<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";
const { token } = useAuth();

defineOptions({
  name: "UserBranchSectorAddModal",
});

// Define interfaces based on API response
interface Sector {
  id: number;
  branchUnitId: number;
  sector: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface User {
  nik: string;
  licenseUserId: string;
  name: string;
  professionInBranch: any | null;
  branchUnit: any | null;
  sector: Sector | null;
}

const props = defineProps<{
  users: User[];
  sectors: Sector[];
}>();

const emit = defineEmits<{
  (e: "user-added"): void;
}>();

const schema = z.object({
  sectorId: z.number().min(1, "Please select a sector"),
  selectedUserNiks: z
    .array(z.string())
    .min(1, "Please select at least one user"),
});

const open = ref(false);
const loading = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  sectorId: undefined,
  selectedUserNiks: [],
});

// Selected user objects for USelectMenu (full objects, not just niks)
const selectedUserObjects = ref<{ value: string; label: string }[]>([]);

const toast = useToast();

// Computed property for sector options
const sectorOptions = computed(() => {
  return props.sectors.map((s) => ({
    value: s.id,
    label: s.sector,
  }));
});

// Computed property for user options (only users without sector)
const userOptions = computed(() => {
  return props.users
    .filter((user) => !user.sector)
    .map((user) => ({
      value: user.nik,
      label: `${user.name} (${user.nik})`,
    }));
});

// Watch selectedUserObjects and update state.selectedUserNiks
watch(
  selectedUserObjects,
  (newVal) => {
    state.selectedUserNiks = newVal.map((item) => item.value);
  },
  { deep: true },
);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    // Submit to API - assign multiple users to a sector
    await $fetch(`http://${ip.ipBackEnd}/api/userBranchUnit/assignSector`, {
      method: "POST",
      body: {
        sectorId: event.data.sectorId,
        userNikList: event.data.selectedUserNiks,
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Assigned ${event.data.selectedUserNiks.length} user(s) to sector`,
      color: "success",
    });

    // Reset form
    state.sectorId = undefined;
    state.selectedUserNiks = [];
    selectedUserObjects.value = [];

    // Close modal
    open.value = false;

    // Emit event to refresh data
    emit("user-added");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error?.data?.message || "Failed to assign users",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function handleClose() {
  // Reset form when closing
  state.sectorId = undefined;
  state.selectedUserNiks = [];
  selectedUserObjects.value = [];
  open.value = false;
}
</script>

<template>
  <div>
    <UButton
      label="Assign Sector"
      color="primary"
      variant="solid"
      icon="i-lucide-map"
      @click="open = true"
    />

    <UModal v-model:open="open" @close="handleClose">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-map" class="text-lg" />
          <h3 class="text-lg font-semibold">Assign Users to Sector</h3>
        </div>
      </template>

      <template #body>
        <UForm
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <!-- Sector Selection -->
          <UFormField label="Sector" name="sectorId" required>
            <USelect
              v-model="state.sectorId"
              :items="sectorOptions"
              placeholder="Select a sector"
              class="w-full"
            />
          </UFormField>

          <!-- Users Multi-Selection -->
          <UFormField
            label="Users"
            name="selectedUserNiks"
            required
            :hint="`${userOptions.length} users available`"
          >
            <USelectMenu
              v-model="selectedUserObjects"
              :items="userOptions"
              multiple
              placeholder="Select users to assign"
              class="w-full"
            />
          </UFormField>

          <!-- Selected Users Preview -->
          <div
            v-if="state.selectedUserNiks && state.selectedUserNiks.length > 0"
            class="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg"
          >
            <p class="text-sm font-medium mb-2">
              Selected Users ({{ state.selectedUserNiks.length }}):
            </p>
            <div class="flex flex-wrap gap-1">
              <UBadge
                v-for="nik in state.selectedUserNiks"
                :key="nik"
                color="primary"
                variant="soft"
                size="lg"
              >
                {{ props.users.find((u) => u.nik === nik)?.name || nik }}
              </UBadge>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <UButton
              label="Cancel"
              color="neutral"
              variant="subtle"
              :disabled="loading"
              @click="handleClose"
            />
            <UButton
              label="Assign Users"
              color="primary"
              variant="solid"
              type="submit"
              :loading="loading"
              :disabled="loading"
            />
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
