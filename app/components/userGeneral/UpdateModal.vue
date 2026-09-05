<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

defineOptions({
  name: "UserGeneralUpdateModal",
});

const props = defineProps<{
  user: {
    nik: string;
    licenseUserId: string;
    name: string;
    authenticationType: "AIRNAV_SSO" | "LOCAL" | null;
    branch: {
      id: number;
      branch: string;
    };
  } | null;
  branches: {
    id: number;
    branch: string;
  }[];
}>();

const emit = defineEmits<{
  (e: "user-updated"): void;
  (e: "close"): void;
}>();

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  nik: z.string().min(8, "NIK must be at least 8 characters"),
  licenseUserId: z.string().min(1, "License Number is required"),
  branchId: z.string().min(1, "Please select a branch"),
  authenticationType: z.enum(["AIRNAV_SSO", "LOCAL"]),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  name: undefined,
  nik: undefined,
  licenseUserId: undefined,
  branchId: undefined,
  authenticationType: undefined,
});

const toast = useToast();
const loading = ref(false);
const { token } = useAuth();

// Branch options for dropdown
const branchOptions = computed(() => {
  return props.branches.map((b) => ({
    value: String(b.id),
    label: b.branch,
  }));
});

// Watch for user prop changes and populate form
watch(
  () => props.user,
  (newUser) => {
    if (newUser) {
      state.name = newUser.name;
      state.nik = newUser.nik;
      state.licenseUserId = newUser.licenseUserId;
      state.branchId = String(newUser.branch?.id);
      state.authenticationType = newUser.authenticationType || undefined;
    } else {
      state.name = undefined;
      state.nik = undefined;
      state.licenseUserId = undefined;
      state.branchId = undefined;
      state.authenticationType = undefined;
    }
  },
  { immediate: true },
);

const isOpen = computed({
  get: () => props.user !== null,
  set: (value) => {
    if (!value) emit("close");
  },
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.user) return;

  loading.value = true;

  try {
    await $fetch(`${apiBaseUrl}/api/userGeneral/${props.user.nik}`, {
      method: "PUT",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
        "Content-Type": "application/json",
      },
      body: {
        name: event.data.name,
        nik: event.data.nik,
        licenseUserId: event.data.licenseUserId,
        branchId: parseInt(event.data.branchId),
        authenticationType: event.data.authenticationType,
      },
    });

    toast.add({
      title: "Success",
      description: "User updated successfully",
      color: "success",
    });

    emit("user-updated");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message || error?.message || "Failed to update user",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" title="Edit User">
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <!-- Branch Selection -->
        <UFormField label="Branch" name="branchId" required>
          <USelect
            v-model="state.branchId"
            :items="branchOptions"
            placeholder="Select branch"
            class="w-full"
          />
        </UFormField>

        <!-- NIK -->
        <UFormField label="Sign-in Method" name="authenticationType" required>
          <USelect
            v-model="state.authenticationType"
            :items="[
              { value: 'AIRNAV_SSO', label: 'AirNav SSO' },
              { value: 'LOCAL', label: 'Non-AirNav' },
            ]"
            placeholder="Select sign-in method"
            class="w-full"
          />
        </UFormField>

        <!-- NIK -->
        <UFormField label="NIK" name="nik" required>
          <UInput v-model="state.nik" placeholder="Enter NIK" class="w-full" />
        </UFormField>

        <!-- Name -->
        <UFormField label="Name" name="name" required>
          <UInput
            v-model="state.name"
            placeholder="Enter full name"
            class="w-full"
          />
        </UFormField>

        <!-- License Number -->
        <UFormField label="License Number" name="licenseUserId" required>
          <UInput
            v-model="state.licenseUserId"
            placeholder="Enter license number"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="emit('close')"
          />
          <UButton
            label="Update User"
            color="primary"
            type="submit"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
