<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

defineOptions({
  name: "UserGeneralAddModal",
});

const props = defineProps<{
  branches: {
    id: number;
    branch: string;
  }[];
}>();

const emit = defineEmits<{
  (e: "user-added"): void;
}>();

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  nik: z.string().min(8, "NIK must be at least 8 characters"),
  licenseUserId: z.string().min(1, "License Number is required"),
  branchId: z.string().min(1, "Please select a branch"),
  authenticationType: z.enum(["AIRNAV_SSO", "LOCAL"]),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  name: undefined,
  nik: undefined,
  licenseUserId: undefined,
  branchId: undefined,
  authenticationType: "LOCAL",
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

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    await $fetch(`${apiBaseUrl}/api/userGeneral`, {
      method: "POST",
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
      description: "User added successfully",
      color: "success",
    });

    emit("user-added");
    open.value = false;

    // Reset form
    state.name = undefined;
    state.nik = undefined;
    state.licenseUserId = undefined;
    state.branchId = undefined;
    state.authenticationType = "LOCAL";
  } catch (error: any) {
    console.error("Add user error:", error);

    // Better error message extraction
    let errorMessage = "Failed to add user";
    if (error?.data?.message) {
      errorMessage = error.data.message;
    } else if (error?.data?.error) {
      errorMessage = error.data.error;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error?.data === "string") {
      errorMessage = error.data;
    }

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
  <div>
    <UButton
      label="Add User"
      color="primary"
      icon="i-lucide-plus"
      @click="open = true"
    />

    <UModal v-model:open="open" title="Add New User">
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
              class="w-full"
            />
          </UFormField>

          <!-- NIK -->
          <UFormField label="NIK" name="nik" required>
            <UInput
              v-model="state.nik"
              placeholder="Enter NIK"
              class="w-full"
            />
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
              @click="open = false"
            />
            <UButton
              label="Add User"
              color="primary"
              type="submit"
              :loading="loading"
            />
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
