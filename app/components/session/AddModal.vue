<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";
const { token } = useAuth();
const props = defineProps<{
  branchName: string;
  branchUnitName: string;
  branchUnitId: number;
}>();

const schema = z.object({
  session: z.string().min(2, "Session name must be at least 2 characters"),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  session: undefined,
});

const emit = defineEmits<{
  sessionAdded: [];
}>();

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    // Call API to create session
    await $fetch(`http://${ip.ipBackEnd}/api/sessions`, {
      method: "POST",
      body: {
        session: event.data.session,
        branchUnitId: props.branchUnitId,
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Session "${event.data.session}" has been created successfully`,
      color: "success",
    });

    // Reset form and close modal
    state.session = undefined;
    open.value = false;

    // Emit event to refresh parent table
    emit("sessionAdded");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to create session. Please try again.";
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
    title="Add New Session"
    description="Create a new session for event preparation"
  >
    <UButton label="Add Session" icon="i-lucide-plus" color="primary" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <!-- Context Info -->
        <div class="p-3 bg-elevated/50 rounded-lg border border-default mb-4">
          <div class="text-sm space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-muted">Branch:</span>
              <span class="font-medium">{{ branchName }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted">Branch Unit:</span>
              <span class="font-medium">{{ branchUnitName }}</span>
            </div>
          </div>
        </div>

        <UFormField
          label="Session Name"
          placeholder="Enter session name"
          name="session"
          required
        >
          <UInput
            v-model="state.session"
            class="w-full"
            placeholder="e.g., 2026 Semester 1"
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
            label="Create Session"
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
