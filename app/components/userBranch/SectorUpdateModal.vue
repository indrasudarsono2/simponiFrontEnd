<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";
const { token } = useAuth();

defineOptions({
  name: "UserBranchSectorUpdateModal",
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
  user: User | null;
  sectors: Sector[];
}>();

const emit = defineEmits<{
  (e: "user-updated"): void;
  (e: "close"): void;
}>();

const schema = z.object({
  sectorId: z.number().optional(),
});

const loading = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  sectorId: undefined,
});

const toast = useToast();

// Computed property for sector options
const sectorOptions = computed(() => {
  return props.sectors.map((s) => ({
    value: s.id,
    label: s.sector,
  }));
});

// Watch for user changes and set initial value
watch(
  () => props.user,
  (newUser) => {
    if (newUser?.sector) {
      state.sectorId = newUser.sector.id;
    } else {
      state.sectorId = undefined;
    }
  },
  { immediate: true },
);

const isOpen = computed({
  get: () => props.user !== null,
  set: (value: boolean) => {
    if (!value) {
      emit("close");
    }
  },
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.user) return;

  loading.value = true;

  try {
    // Submit to API - update user's sector
    await $fetch(
      `http://${ip.ipBackEnd}/api/userBranchUnit/${props.user.nik}`,
      {
        method: "PUT",
        body: {
          sectorId: event.data.sectorId,
        },
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: `Updated sector for ${props.user.name}`,
      color: "success",
    });

    // Close modal
    emit("user-updated");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error?.data?.message || "Failed to update user sector",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function handleClose() {
  emit("close");
}
</script>

<template>
  <UModal v-model:open="isOpen" @close="handleClose">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-map" class="text-lg" />
        <h3 class="text-lg font-semibold">Update User Sector</h3>
      </div>
    </template>

    <template #body>
      <div v-if="user" class="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <p class="text-sm">
          <span class="font-medium">Name:</span> {{ user.name }}
        </p>
        <p class="text-sm">
          <span class="font-medium">NIK:</span> {{ user.nik }}
        </p>
        <p class="text-sm">
          <span class="font-medium">Current Sector:</span>
          {{ user.sector?.sector || "-" }}
        </p>
      </div>

      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <!-- Sector Selection -->
        <UFormField label="New Sector" name="sectorId">
          <USelect
            v-model="state.sectorId"
            :items="sectorOptions"
            placeholder="Select a sector (optional)"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="handleClose"
          />
          <UButton
            label="Update"
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
</template>
