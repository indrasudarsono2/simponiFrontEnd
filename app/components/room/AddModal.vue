<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import {
  CalendarDate,
  DateFormatter,
  getLocalTimeZone,
  parseDate,
} from "@internationalized/date";

interface RatingItem {
  rating?: {
    rating?: string;
  } | null;
}

interface EventUserItem {
  id: number;
  userNik?: string;
  name?: string;
  user?: {
    name?: string;
  } | null;
  applicationDocs?:
    | {
        userNik?: string;
        name?: string;
        user?: {
          name?: string;
        } | null;
        appRatings?: RatingItem[];
      }
    | {
        userNik?: string;
        name?: string;
        user?: {
          name?: string;
        } | null;
        appRatings?: RatingItem[];
      }[]
    | null;
  applicationDoc?:
    | {
        userNik?: string;
        name?: string;
        user?: {
          name?: string;
        } | null;
        appRatings?: RatingItem[];
      }
    | {
        userNik?: string;
        name?: string;
        user?: {
          name?: string;
        } | null;
        appRatings?: RatingItem[];
      }[]
    | null;
}

interface EventItem {
  id: number;
  event: string;
  eventUsers?: EventUserItem[];
}

const props = defineProps<{
  events: EventItem[];
  eventUserOptions?: { label: string; value: number }[];
}>();

const emit = defineEmits<{
  roomAdded: [];
}>();

const { token } = useAuth();
const toast = useToast();

const open = ref(false);
const loading = ref(false);

const formState = reactive({
  name: "",
  eventUsersId: [] as number[],
  startDate: "",
  finishDate: "",
  file: undefined as File | undefined,
});

const df = new DateFormatter("en-US", { dateStyle: "medium" });
const startTime = ref("00:00");
const endTime = ref("23:59");

const eventUserOptions = computed(() => {
  if (props.eventUserOptions) {
    return props.eventUserOptions.map((item) => ({
      id: item.value,
      name: item.label,
      label: item.label,
      value: item.value,
    }));
  }

  const options: { id: number; name: string; label: string; value: number }[] =
    [];
  const seen = new Set<number>();

  const events = Array.isArray(props.events) ? props.events : [];
  events.forEach((eventItem) => {
    const eventUsers = Array.isArray(eventItem.eventUsers)
      ? eventItem.eventUsers
      : [];
    eventUsers.forEach((eventUser) => {
      const appDoc = Array.isArray(eventUser.applicationDocs)
        ? eventUser.applicationDocs[0] || {}
        : eventUser.applicationDocs || {};
      const fallbackDoc = Array.isArray(eventUser.applicationDoc)
        ? eventUser.applicationDoc[0] || {}
        : eventUser.applicationDoc || {};
      const activeDoc = Object.keys(appDoc).length ? appDoc : fallbackDoc;
      const rawRatings = activeDoc.appRatings || [];
      const name =
        eventUser.user?.name ||
        activeDoc.name ||
        activeDoc.user?.name ||
        eventUser.userNik ||
        activeDoc.userNik ||
        "User";
      const ratings = rawRatings
        .map((item: any) => {
          if (typeof item === "string") return item;
          return item?.rating?.rating || item?.rating || "";
        })
        .filter(Boolean)
        .join(", ");

      const eventUserId = Number(eventUser.id);
      if (!eventUserId || seen.has(eventUserId)) return;
      seen.add(eventUserId);

      options.push({
        id: eventUserId,
        name: `${name} [${ratings || "-"}]`,
        label: `${name} [${ratings || "-"}]`,
        value: eventUserId,
      });
    });
  });

  return options;
});

const selectedUserLabels = computed(() => {
  const selected = new Set(formState.eventUsersId);
  return eventUserOptions.value
    .filter((item) => selected.has(item.value))
    .map((item) => item.label);
});

const parseDateString = (value: string): CalendarDate | null => {
  if (!value) return null;
  try {
    return parseDate(value.split("T")[0] || value);
  } catch {
    return null;
  }
};

const formatCalendarDate = (value?: CalendarDate) => {
  if (!value) return "";
  return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
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
  get: () => ({
    start: parseDateString(formState.startDate) ?? undefined,
    end: parseDateString(formState.finishDate) ?? undefined,
  }),
  set: (value: { start?: CalendarDate; end?: CalendarDate }) => {
    formState.startDate = formatDateTime(value.start, startTime.value, "00:00");
    formState.finishDate = formatDateTime(value.end, endTime.value, "23:59");
  },
});

watch(
  () => formState.startDate,
  (value) => {
    startTime.value = extractTimePart(value, "00:00");
  },
  { immediate: true },
);

watch(
  () => formState.finishDate,
  (value) => {
    endTime.value = extractTimePart(value, "23:59");
  },
  { immediate: true },
);

watch(startTime, (value) => {
  const startDate = parseDateString(formState.startDate);
  formState.startDate = formatDateTime(startDate ?? undefined, value, "00:00");
});

watch(endTime, (value) => {
  const endDate = parseDateString(formState.finishDate);
  formState.finishDate = formatDateTime(endDate ?? undefined, value, "23:59");
});

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  formState.file = target.files?.[0];
}

function resetForm() {
  formState.name = "";
  formState.eventUsersId = [];
  formState.startDate = "";
  formState.finishDate = "";
  formState.file = undefined;
  startTime.value = "00:00";
  endTime.value = "23:59";
}

const isDateRangeValid = computed(() => {
  if (!formState.startDate || !formState.finishDate) return false;
  const start = new Date(formState.startDate).getTime();
  const finish = new Date(formState.finishDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(finish)) return false;
  return start <= finish;
});

const isFormValid = computed(() => {
  return (
    !!formState.name.trim() &&
    formState.eventUsersId.length > 0 &&
    !!formState.startDate &&
    !!formState.finishDate &&
    isDateRangeValid.value &&
    !!formState.file
  );
});

async function onSubmit() {
  if (!formState.name.trim()) {
    toast.add({
      title: "Validation Error",
      description: "Name is required",
      color: "error",
    });
    return;
  }

  if (!formState.eventUsersId.length) {
    toast.add({
      title: "Validation Error",
      description: "At least one event user is required",
      color: "error",
    });
    return;
  }

  if (!formState.startDate || !formState.finishDate) {
    toast.add({
      title: "Validation Error",
      description: "Start date and finish date are required",
      color: "error",
    });
    return;
  }

  if (!isDateRangeValid.value) {
    toast.add({
      title: "Validation Error",
      description: "Finish date must be greater than or equal to start date",
      color: "error",
    });
    return;
  }

  if (!formState.file) {
    toast.add({
      title: "Validation Error",
      description: "File is required",
      color: "error",
    });
    return;
  }

  try {
    loading.value = true;

    const commonHeaders = {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    };

    const payload = new FormData();
    payload.append("name", formState.name.trim());
    formState.eventUsersId.forEach((id) => {
      payload.append("eventUsersId[]", String(id));
    });
    payload.append("startDate", formState.startDate);
    payload.append("finishDate", formState.finishDate);
    payload.append("file", formState.file);

    await $fetch(`${apiBaseUrl}/api/room`, {
      method: "POST",
      headers: commonHeaders,
      body: payload,
    });

    toast.add({
      title: "Success",
      description: "Room has been created successfully",
      color: "success",
    });

    resetForm();
    open.value = false;
    emit("roomAdded");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error?.data?.message || "Failed to create room",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Add Room">
    <UButton label="Add Room" icon="i-lucide-plus" color="primary" />

    <template #body>
      <div class="space-y-4">
        <UFormField label="Name" required>
          <UInput
            v-model="formState.name"
            placeholder="Enter room name"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Assign User" required>
          <USelect
            v-model="formState.eventUsersId"
            :items="eventUserOptions"
            label-key="label"
            value-key="value"
            placeholder="Select event user(s)"
            class="w-full"
            multiple
          />
          <p
            v-if="eventUserOptions.length === 0"
            class="text-xs text-warning mt-1"
          >
            No event users found from API response (events:
            {{ props.events.length }}).
          </p>
        </UFormField>

        <UFormField label="Date Range" required>
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
                <template v-else>Pick a date range</template>
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

        <UFormField label="File" required>
          <input
            type="file"
            class="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
            @change="onFileChange"
          />
        </UFormField>

        <div class="rounded-lg border border-default bg-elevated/40 p-3 space-y-2">
          <p class="text-sm font-semibold text-highlighted">Summary</p>
          <div class="text-xs space-y-1 text-muted">
            <p>
              <span class="font-medium">Name:</span>
              {{ formState.name || "-" }}
            </p>
            <p>
              <span class="font-medium">Assign User:</span>
            </p>
            <ul
              v-if="selectedUserLabels.length"
              class="list-disc list-inside pl-2 space-y-0.5"
            >
              <li v-for="(label, idx) in selectedUserLabels" :key="idx">
                {{ label }}
              </li>
            </ul>
            <p v-else>-</p>
            <p>
              <span class="font-medium">Start:</span>
              {{ formState.startDate || "-" }}
            </p>
            <p>
              <span class="font-medium">Finish:</span>
              {{ formState.finishDate || "-" }}
            </p>
            <p>
              <span class="font-medium">File:</span>
              {{ formState.file?.name || "No file selected" }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          :disabled="loading"
          @click="open = false"
        />
        <UButton
          label="Create"
          color="primary"
          :loading="loading"
          :disabled="loading || !isFormValid"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
