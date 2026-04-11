<script setup lang="ts">
import {
  DateFormatter,
  getLocalTimeZone,
  CalendarDate,
  parseDate,
} from "@internationalized/date";

const open = defineModel<boolean>("open", { default: false });

interface TokenFormData {
  token: string;
  startDate: string;
  expiredDate: string;
}

const { formData } = defineProps<{
  formData: TokenFormData;
}>();

const emit = defineEmits<{
  (e: "submit"): void;
}>();

const df = new DateFormatter("en-US", {
  dateStyle: "medium",
});

const startTime = ref("00:00");
const endTime = ref("23:59");

const extractDatePart = (value: string) => {
  if (!value) return "";
  return value.split("T")[0]?.trim() || "";
};

const extractTimePart = (value: string, fallback: string) => {
  if (!value) return fallback;
  const timeSection = value.includes("T")
    ? value.split("T")[1]
    : value.split(" ")[1];
  if (!timeSection) return fallback;
  const hhmm = timeSection.slice(0, 5);
  return /^\d{2}:\d{2}$/.test(hhmm) ? hhmm : fallback;
};

const normalizeTime = (value: string, fallback: string) => {
  return /^\d{2}:\d{2}$/.test(value) ? value : fallback;
};

const parseDateString = (value: string): CalendarDate | null => {
  const datePart = extractDatePart(value);
  if (!datePart) return null;

  try {
    return parseDate(datePart);
  } catch {
    return null;
  }
};

const formatCalendarDate = (value?: CalendarDate) => {
  if (!value) return "";
  return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
};

const formatDateTime = (
  date: CalendarDate | undefined,
  time: string,
  fallback: string,
) => {
  const datePart = formatCalendarDate(date);
  if (!datePart) return "";
  return `${datePart}T${normalizeTime(time, fallback)}:00`;
};

const dateRange = computed({
  get: () => {
    const start = parseDateString(formData.startDate);
    const end = parseDateString(formData.expiredDate);

    return {
      start: start ?? undefined,
      end: end ?? undefined,
    };
  },
  set: (newValue: { start?: CalendarDate; end?: CalendarDate }) => {
    formData.startDate = formatDateTime(newValue.start, startTime.value, "00:00");
    formData.expiredDate = formatDateTime(newValue.end, endTime.value, "23:59");
  },
});

watch(
  () => formData.startDate,
  (value) => {
    startTime.value = extractTimePart(value, "00:00");
  },
  { immediate: true },
);

watch(
  () => formData.expiredDate,
  (value) => {
    endTime.value = extractTimePart(value, "23:59");
  },
  { immediate: true },
);

watch(startTime, (value) => {
  const startDate = parseDateString(formData.startDate);
  formData.startDate = formatDateTime(startDate ?? undefined, value, "00:00");
});

watch(endTime, (value) => {
  const endDate = parseDateString(formData.expiredDate);
  formData.expiredDate = formatDateTime(endDate ?? undefined, value, "23:59");
});
</script>

<template>
  <UModal v-model:open="open" title="Edit Token">
    <template #body>
      <div class="space-y-4">
        <UFormField label="Token:">
          <UInput v-model="formData.token" placeholder="Enter token" />
        </UFormField>

        <UFormField label="Date:">
          <UPopover :content="{ align: 'start' }" :modal="true">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-calendar"
              class="w-full justify-between"
            >
              <span class="truncate">
                <template v-if="dateRange.start">
                  <template v-if="dateRange.end">
                    {{ df.format(dateRange.start.toDate(getLocalTimeZone())) }}
                    {{ startTime }}
                    -
                    {{ df.format(dateRange.end.toDate(getLocalTimeZone())) }}
                    {{ endTime }}
                  </template>
                  <template v-else>
                    {{ df.format(dateRange.start.toDate(getLocalTimeZone())) }}
                    {{ startTime }}
                  </template>
                </template>
                <template v-else> Pick a date range </template>
              </span>

              <template #trailing>
                <UIcon
                  name="i-lucide-chevron-down"
                  class="shrink-0 text-dimmed size-5"
                />
              </template>
            </UButton>

            <template #content>
              <UCalendar
                v-model="dateRange"
                class="p-2"
                :number-of-months="2"
                range
              />
              <div class="grid grid-cols-2 gap-2 p-2 pt-0">
                <UFormField label="Start Hour">
                  <UInput
                    v-model="startTime"
                    type="time"
                    :disabled="!dateRange.start"
                  />
                </UFormField>
                <UFormField label="End Hour">
                  <UInput
                    v-model="endTime"
                    type="time"
                    :disabled="!dateRange.end"
                  />
                </UFormField>
              </div>
            </template>
          </UPopover>
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          @click="open = false"
        />
        <UButton label="Update" color="primary" @click="emit('submit')" />
      </div>
    </template>
  </UModal>
</template>
