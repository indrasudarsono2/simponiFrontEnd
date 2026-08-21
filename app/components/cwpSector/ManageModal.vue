<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

interface Rating {
  id: number;
  rating: string | null;
}

interface Cwp {
  id: number;
  cwp: string | null;
  rating: Rating | null;
}

interface SectorCwp {
  id: number;
  cwpId: number | null;
  cwp: Cwp | null;
}

interface Sector {
  id: number;
  sector: string | null;
  sectorCwps: SectorCwp[];
}

interface SectorOption {
  id: number;
  sector: string | null;
}

interface OptionsResponse {
  sectors: SectorOption[];
  cwps: Cwp[];
}

const props = defineProps<{
  sector: Sector | null;
}>();

const emit = defineEmits<{
  sectorCwpsUpdated: [];
  close: [];
}>();

const { token } = useAuth();
const toast = useToast();

const schema = z.object({
  sectorId: z.coerce.number().int().positive("Sector is required"),
  cwps: z.array(
    z.object({
      cwpId: z.coerce.number().int().positive("CWP is required"),
    }),
  ),
});

type Schema = z.output<typeof schema>;

const open = ref(false);
const loading = ref(false);
const optionsLoading = ref(false);
const options = ref<OptionsResponse>({
  sectors: [],
  cwps: [],
});

const state = reactive<Schema>({
  sectorId: 0,
  cwps: [],
});

const sectorOptions = computed(() =>
  options.value.sectors.map((sector) => ({
    label: sector.sector || `Sector ${sector.id}`,
    value: sector.id,
  })),
);

const cwpOptions = computed(() =>
  options.value.cwps.map((cwp) => ({
    label: `${cwp.cwp || `CWP ${cwp.id}`}${cwp.rating?.rating ? ` - ${cwp.rating.rating}` : ""}`,
    value: cwp.id,
  })),
);

async function loadOptions() {
  optionsLoading.value = true;

  try {
    options.value = await $fetch<OptionsResponse>(
      `${apiBaseUrl}/api/cwpSectors/options`,
      {
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to load sector and CWP options",
      color: "error",
    });
  } finally {
    optionsLoading.value = false;
  }
}

function resetForm(sector: Sector | null) {
  state.sectorId = sector?.id || 0;
  state.cwps =
    sector?.sectorCwps
      ?.map((sectorCwp) => sectorCwp.cwpId)
      .filter((cwpId): cwpId is number => Number.isInteger(cwpId))
      .map((cwpId) => ({ cwpId })) || [];
}

function addCwpRow() {
  state.cwps.push({
    cwpId: 0,
  });
}

function removeCwpRow(index: number) {
  state.cwps.splice(index, 1);
}

function getSelectedCwpCount(cwpId: number) {
  if (!cwpId) return 0;
  return state.cwps.filter((cwpRow) => cwpRow.cwpId === cwpId).length;
}

watch(
  () => props.sector,
  async (sector) => {
    if (!sector) return;

    resetForm(sector);
    await loadOptions();
    open.value = true;

    if (options.value.cwps.length === 0) {
      toast.add({
        title: "No CWP Available",
        description: "No related CWP found for your branch unit.",
        color: "warning",
      });
    }
  },
);

watch(open, (isOpen) => {
  if (isOpen) return;

  state.sectorId = 0;
  state.cwps = [];
  emit("close");
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    const cwpIds = [
      ...new Set(event.data.cwps.map((cwpRow) => cwpRow.cwpId)),
    ];

    await $fetch(
      `${apiBaseUrl}/api/cwpSectors/${props.sector?.id || event.data.sectorId}`,
      {
        method: "PUT",
        body: {
          sectorId: event.data.sectorId,
          cwpIds,
        },
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: "Sector CWP assignment has been updated",
      color: "success",
    });

    open.value = false;
    emit("sectorCwpsUpdated");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to update sector CWP assignment",
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
    :title="`Manage CWP - ${sector?.sector || ''}`"
    description="Adjust CWP assignment for sector"
    :ui="{ content: 'max-w-2xl' }"
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
          title="Delete sector CWP"
          description="Add CWP rows to assign more CWP. Remove a row and save to soft-delete that SectorCwp relation."
        />

        <UAlert
          v-if="cwpOptions.length === 0 && !optionsLoading"
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="No related CWP"
          description="Please create CWP for related branch ratings before assigning CWP to sector."
        />

        <UFormField label="Sector" name="sectorId" required>
          <USelectMenu
            v-model="state.sectorId"
            class="w-full"
            :items="sectorOptions"
            value-key="value"
            label-key="label"
            searchable
            placeholder="Select sector"
            :loading="optionsLoading"
          />
        </UFormField>

        <div class="space-y-3">
          <div
            v-for="(cwpRow, index) in state.cwps"
            :key="index"
            class="grid grid-cols-1 gap-3 rounded-lg border border-default p-3 md:grid-cols-[1fr_auto]"
          >
            <UFormField :name="`cwps.${index}.cwpId`" label="CWP" required>
              <USelectMenu
                v-model="cwpRow.cwpId"
                class="w-full"
                :items="cwpOptions"
                value-key="value"
                label-key="label"
                searchable
                placeholder="Select CWP"
                :loading="optionsLoading"
              />
              <template v-if="getSelectedCwpCount(cwpRow.cwpId) > 1" #hint>
                <span class="text-xs text-error">This CWP is selected more than once.</span>
              </template>
            </UFormField>

            <div class="flex items-end">
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="soft"
                :disabled="loading"
                @click="removeCwpRow(index)"
              />
            </div>
          </div>
        </div>

        <UButton
          label="Add CWP"
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          :disabled="loading || cwpOptions.length === 0"
          @click="addCwpRow"
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
            label="Save CWP"
            color="primary"
            type="submit"
            :loading="loading"
            :disabled="sectorOptions.length === 0"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
