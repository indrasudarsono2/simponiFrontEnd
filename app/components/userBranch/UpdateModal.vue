<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";
const { token } = useAuth();
defineOptions({
  name: "UserBranchUpdateModal",
});

// Define interfaces based on API response
interface Profession {
  id: number;
  profession: string;
}

interface ProfessionInBranch {
  id: number;
  profession: Profession;
}

interface BranchUnit {
  id: number;
  branchId: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface User {
  nik: string;
  licenseUserId: string;
  name: string;
  professionInBranch: ProfessionInBranch | null;
  branchUnit: BranchUnit | null;
}

const props = defineProps<{
  user: User | null;
  professionInBranch: ProfessionInBranch[];
  branchUnits: BranchUnit[];
}>();

const emit = defineEmits<{
  (e: "user-updated"): void;
  (e: "close"): void;
}>();

const schema = z.object({
  professionInBranchId: z.number().min(1, "Please select a profession"),
  branchUnitId: z.number().optional(),
});

const loading = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  professionInBranchId: undefined,
  branchUnitId: undefined,
});

const toast = useToast();

// Computed property for professionInBranch options
const professionOptions = computed(() => {
  return props.professionInBranch.map((pib) => ({
    value: pib.id,
    label: pib.profession.profession,
  }));
});

// Computed property for branchUnit options
const branchUnitOptions = computed(() => {
  return props.branchUnits.map((bu) => ({
    value: bu.id,
    label: bu.unit,
  }));
});

// Watch for user changes and set initial value
watch(
  () => props.user,
  (newUser) => {
    if (newUser?.professionInBranch) {
      state.professionInBranchId = newUser.professionInBranch.id;
    } else {
      state.professionInBranchId = undefined;
    }

    if (newUser?.branchUnit) {
      state.branchUnitId = newUser.branchUnit.id;
    } else {
      state.branchUnitId = undefined;
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
    // Submit to API - update user's professionInBranch and branchUnit
    await $fetch(`http://${ip.ipBackEnd}/api/userBranch/${props.user.nik}`, {
      method: "put",
      body: {
        professionInBranchId: event.data.professionInBranchId,
        branchUnitId: event.data.branchUnitId,
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Updated profession and branch unit for ${props.user.name}`,
      color: "success",
    });

    // Close modal
    emit("user-updated");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error?.data?.message || "Failed to update user",
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
        <UIcon name="i-lucide-pencil" class="text-lg" />
        <h3 class="text-lg font-semibold">Update User Profession</h3>
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
          <span class="font-medium">Current Profession:</span>
          {{ user.professionInBranch?.profession?.profession || "-" }}
        </p>
        <p class="text-sm">
          <span class="font-medium">Current Branch Unit:</span>
          {{ user.branchUnit?.unit || "-" }}
        </p>
      </div>

      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <!-- Profession Selection -->
        <UFormField label="New Profession" name="professionInBranchId" required>
          <USelect
            v-model="state.professionInBranchId"
            :items="professionOptions"
            placeholder="Select a profession"
            class="w-full"
          />
        </UFormField>

        <!-- Branch Unit Selection -->
        <UFormField label="New Branch Unit" name="branchUnitId">
          <USelect
            v-model="state.branchUnitId"
            :items="branchUnitOptions"
            placeholder="Select a branch unit (optional)"
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
