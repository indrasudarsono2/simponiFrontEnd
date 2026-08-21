<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

interface UserOption {
  nik: string;
  name: string | null;
  licenseUserId: string | null;
}

interface EscalationActor {
  id: number;
  actor: string | null;
  remark: string | null;
}

interface EscalationLevel {
  id: number;
  level: string;
  escalationActors: EscalationActor[];
}

interface ActorRow {
  actor: string;
  remark?: string;
}

const props = defineProps<{
  escalationLevel: EscalationLevel | null;
}>();

const emit = defineEmits<{
  escalationActorsUpdated: [];
  close: [];
}>();

const { token } = useAuth();
const toast = useToast();

const actorSchema = z.object({
  actor: z.string().min(1, "Actor is required"),
  remark: z.string().optional(),
});

const schema = z.object({
  actors: z.array(actorSchema),
});

type Schema = z.output<typeof schema>;

const open = ref(false);
const loading = ref(false);
const userOptions = ref<UserOption[]>([]);
const state = reactive<Schema>({
  actors: [],
});

const userSelectItems = computed(() =>
  userOptions.value.map((user) => ({
    label: user.name ? `${user.name} (${user.nik})` : user.nik,
    value: user.nik,
  })),
);

async function loadUsers() {
  userOptions.value = await $fetch<UserOption[]>(
    `${apiBaseUrl}/api/escalationActors/users`,
    {
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    },
  );
}

function resetRows(escalationLevel: EscalationLevel | null) {
  state.actors = escalationLevel?.escalationActors?.length
    ? escalationLevel.escalationActors.map((item) => ({
        actor: item.actor || "",
        remark: item.remark || undefined,
      }))
    : [];
}

function addActorRow() {
  state.actors.push({
    actor: "",
    remark: undefined,
  });
}

function removeActorRow(index: number) {
  state.actors.splice(index, 1);
}

watch(
  () => props.escalationLevel,
  async (escalationLevel) => {
    if (!escalationLevel) return;

    resetRows(escalationLevel);
    await loadUsers();
    open.value = true;
  },
);

watch(open, (isOpen) => {
  if (isOpen) return;

  state.actors = [];
  emit("close");
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.escalationLevel) return;

  loading.value = true;

  try {
    await $fetch(
      `${apiBaseUrl}/api/escalationActors/${props.escalationLevel.id}`,
      {
        method: "PUT",
        body: {
          actors: event.data.actors,
        },
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: `Actors for level ${props.escalationLevel.level} have been updated`,
      color: "success",
    });

    open.value = false;
    emit("escalationActorsUpdated");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to update escalation actors",
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
    :title="`Manage Actors - Level ${escalationLevel?.level || ''}`"
    description="Add or remove actors for this escalation level"
    :ui="{ content: 'max-w-3xl' }"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-info"
          title="Actor removal"
          description="Remove an actor row here and save to delete that actor from this level."
        />

        <div class="space-y-3">
          <div
            v-for="(actorRow, index) in state.actors"
            :key="index"
            class="grid grid-cols-1 gap-3 rounded-lg border border-default p-3 md:grid-cols-[1fr_1fr_auto]"
          >
            <UFormField :name="`actors.${index}.actor`" label="Actor" required>
              <USelectMenu
                v-model="actorRow.actor"
                class="w-full"
                :items="userSelectItems"
                value-key="value"
                label-key="label"
                searchable
                placeholder="Select user"
              />
            </UFormField>

            <UFormField :name="`actors.${index}.remark`" label="Remark">
              <UInput
                v-model="actorRow.remark"
                class="w-full"
                placeholder="Optional remark"
              />
            </UFormField>

            <div class="flex items-end">
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="soft"
                :disabled="loading"
                @click="removeActorRow(index)"
              />
            </div>
          </div>
        </div>

        <UButton
          label="Add Actor"
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          :disabled="loading"
          @click="addActorRow"
        />

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            label="Save Actors"
            color="primary"
            type="submit"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
