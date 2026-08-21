<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { token } = useAuth();
interface Session {
  id: number;
  session: string;
  createdAt?: string;
}

const props = defineProps<{
  session: Session | null;
  branchName: string;
  branchUnitName: string;
}>();

const emit = defineEmits<{
  sessionUpdated: [];
  close: [];
}>();

const schema = z.object({
  session: z.string().min(2, "Session name must be at least 2 characters"),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  session: undefined,
});

// Watch for session prop changes to populate form
watch(
  () => props.session,
  (newSession) => {
    if (newSession) {
      state.session = newSession.session;
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.session = undefined;
    emit("close");
  }
});

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.session) return;

  loading.value = true;

  try {
    // Call API to update session
    await $fetch(`${apiBaseUrl}/api/sessions/${props.session.id}`, {
      method: "PUT",
      body: {
        session: event.data.session,
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Session "${event.data.session}" has been updated successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("sessionUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to update session. Please try again.";
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
    title="Update Session"
    description="Edit the session information"
  >
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
            label="Update Session"
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
