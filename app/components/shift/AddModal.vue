<script setup lang="ts">
import ip from "../../utils/config.json";

interface ShiftDetailForm {
  start: string;
  end: string;
  isControl: boolean;
}

const { token } = useAuth();
const toast = useToast();

const open = ref(false);
const loading = ref(false);
const shift = ref("");
const details = ref<ShiftDetailForm[]>([
  {
    start: "",
    end: "",
    isControl: true,
  },
]);

const emit = defineEmits<{
  shiftAdded: [];
}>();

function getDurationInMinutes(start?: string, end?: string) {
  if (!start || !end) return 0;

  const [startHour = 0, startMinute = 0] = start.split(":").map(Number);
  const [endHour = 0, endMinute = 0] = end.split(":").map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  const duration = endMinutes - startMinutes;

  return duration >= 0 ? duration : duration + 24 * 60;
}

function addDetail() {
  details.value.push({
    start: "",
    end: "",
    isControl: true,
  });
}

function removeDetail(index: number) {
  if (details.value.length === 1) return;
  details.value.splice(index, 1);
}

function resetForm() {
  shift.value = "";
  details.value = [
    {
      start: "",
      end: "",
      isControl: true,
    },
  ];
}

function getValidationError() {
  if (!shift.value.trim()) return "Shift name is required.";

  for (const [index, detail] of details.value.entries()) {
    const rowNumber = index + 1;
    const duration = getDurationInMinutes(detail.start, detail.end);

    if (!detail.start || !detail.end) {
      return `Detail ${rowNumber}: start and end are required.`;
    }

    if (detail.isControl && duration > 120) {
      return `Detail ${rowNumber}: on duty duration maximum is 120 minutes.`;
    }

    if (!detail.isControl && duration < 45) {
      return `Detail ${rowNumber}: rest duration minimum is 45 minutes.`;
    }
  }

  return "";
}

async function onSubmit() {
  const validationError = getValidationError();

  if (validationError) {
    toast.add({
      title: "Invalid Shift",
      description: validationError,
      color: "error",
    });
    return;
  }

  loading.value = true;

  try {
    await $fetch(`http://${ip.ipBackEnd}/api/shifts`, {
      method: "POST",
      body: {
        shift: shift.value,
        shifts: details.value,
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Shift "${shift.value.toUpperCase()}" has been created`,
      color: "success",
    });

    resetForm();
    open.value = false;
    emit("shiftAdded");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to create shift",
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
    title="Add Operation Shift"
    description="Create one shift name with one or more shift details"
    :ui="{ content: 'max-w-4xl' }"
  >
    <UButton label="Add Shift" icon="i-lucide-plus" color="primary" />

    <template #body>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <UFormField label="Shift Name" required>
          <UInput
            v-model="shift"
            class="w-full"
            placeholder="e.g., MORNING SHIFT"
          />
        </UFormField>

        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-info"
          title="Duration Rules"
          description="On duty/isControl maximum duration is 120 minutes. Rest minimum duration is 45 minutes. Overnight time ranges are supported."
        />

        <div class="space-y-3">
          <div
            v-for="(detail, index) in details"
            :key="index"
            class="rounded-lg border border-default p-3"
          >
            <div class="mb-3 flex items-center justify-between gap-2">
              <h3 class="font-medium text-highlighted">
                Detail {{ index + 1 }}
              </h3>
              <UButton
                v-if="details.length > 1"
                icon="i-lucide-trash-2"
                color="error"
                variant="soft"
                size="sm"
                @click="removeDetail(index)"
              />
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
              <UFormField label="Start" required>
                <UInput v-model="detail.start" class="w-full" type="time" />
              </UFormField>

              <UFormField label="End" required>
                <UInput v-model="detail.end" class="w-full" type="time" />
              </UFormField>

              <UFormField label="isControl">
                <UCheckbox v-model="detail.isControl" label="On duty" />
              </UFormField>

              <UFormField label="Duration">
                <UInput
                  :model-value="`${getDurationInMinutes(detail.start, detail.end)} minutes`"
                  class="w-full"
                  disabled
                />
              </UFormField>
            </div>
          </div>
        </div>

        <UButton
          label="Add Detail"
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          type="button"
          @click="addDetail"
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
            label="Create Shift"
            color="primary"
            type="submit"
            :loading="loading"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
