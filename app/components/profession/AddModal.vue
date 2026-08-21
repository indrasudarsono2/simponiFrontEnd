<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { token } = useAuth();

const schema = z.object({
  profession: z
    .string()
    .min(2, "Profession name must be at least 2 characters"),
  description: z.string().min(5, "Description must be cleared"),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  profession: undefined,
  description: undefined,
});

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    // Call API to create profession
    await $fetch(`${apiBaseUrl}/api/professions`, {
      method: "POST",
      body: {
        profession: event.data.profession,
        description: event.data.description,
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Profession "${event.data.profession}" has been created successfully`,
      color: "success",
    });

    // Reset form and close modal
    state.profession = undefined;
    open.value = false;

    // Emit event to refresh parent table
    emit("professionAdded");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to create profession. Please try again.";
    toast.add({
      title: "Error",
      description: errorMessage,
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

const emit = defineEmits<{
  professionAdded: [];
}>();

const handleUndefined = () => {
  open.value = false;
  state.profession = undefined;
  state.description = undefined;
};
</script>

<template>
  <UModal
    v-model:open="open"
    title="Add New Profession"
    description="Create a new profession in the system"
  >
    <UButton label="Add Profession" icon="i-lucide-plus" color="primary" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Profession Name"
          placeholder="Enter profession name"
          name="name"
          required
        >
          <UInput v-model="state.profession" class="w-full" placeholder="ATC" />
        </UFormField>

        <UFormField
          label="Description"
          placeholder="Enter profession description"
          name="description"
          required
        >
          <UInput
            v-model="state.description"
            class="w-full"
            placeholder="e.g., Air Traffic Controller"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="handleUndefined()"
          />
          <UButton
            label="Create Profession"
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
