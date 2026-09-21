<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import {
  CalendarDate,
  DateFormatter,
  getLocalTimeZone,
  parseDate,
} from "@internationalized/date";
const { apiFetch } = useApiFetch();
// Helper to format date for input (YYYY-MM-DD)
function formatDateForInput(dateString: string | undefined): string {
  if (!dateString) return "";
  // Handle ISO format: 2026-03-08T00:00:00.000Z -> 2026-03-08
  const index = dateString.indexOf("T");
  if (index === -1) return dateString;
  return dateString.substring(0, index) || "";
}

interface Session {
  id: number;
  name: string;
}

interface Sector {
  id: number;
  name: string;
}

interface RemarkDoc {
  id: number;
  remark: string;
}

interface Event {
  id: number;
  event: string;
  sectorId?: number;
  sectorName?: string;
  sessionId?: number;
  sessionName?: string;
  startDate: string;
  finishDate: string;
  forExpiredDate: string;
  formFillingDate: string;
  remarkDoc: {
    id?: number;
    remark: string;
  };
  briefingFile: string | null;
  recommendationFile: string | null;
  passingGrade: number;
  branchId?: number;
  branchName?: string;
  branchUnitId?: number;
  branchUnitName?: string;
  sector?: {
    sector: string;
  };
  isPractical: boolean;
  isSimulator: boolean;
}

const props = defineProps<{
  event: Event | null;
  sessions: Session[];
  sectors: Sector[];
  remarkDocs: RemarkDoc[];
}>();

const emit = defineEmits<{
  eventUpdated: [];
  close: [];
}>();

const schema = z.object({
  eventName: z.string().min(2, "Event name must be at least 2 characters"),
  sectorId: z.coerce.number().min(1, "Sector is required"),
  remarkDocId: z.coerce.number().min(1, "Remark is required"),
  formFillingDate: z.string().min(1, "Filling date is required"),
  sessionId: z.coerce.number().min(1, "Session is required"),
  startDate: z.string().min(1, "Start date is required"),
  finishDate: z.string().min(1, "Finish date is required"),
  forExpDate: z.string().min(1, "ForExpDate is required"),
  briefingFile: z.instanceof(File).optional(),
  recommendationFile: z.instanceof(File).optional(),
  passingGrade: z.coerce
    .number()
    .min(0)
    .max(100, "Passing grade must be between 0 and 100"),
  isPractical: z.boolean().default(false),
  isSimulator: z.boolean().default(false),
}).superRefine((data, ctx) => {
  const selectedRemark = props.remarkDocs.find(
    (item) => Number(item.id) === Number(data.remarkDocId),
  )?.remark;
  if (
    selectedRemark?.trim().toUpperCase() === "PENERBITAN" &&
    !(data.recommendationFile instanceof File) &&
    !props.event?.recommendationFile
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recommendationFile"],
      message: "Recommendation letter is required for PENERBITAN",
    });
  }
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  eventName: undefined,
  sectorId: undefined,
  sessionId: undefined,
  startDate: undefined,
  finishDate: undefined,
  forExpDate: undefined,
  remarkDocId: undefined,
  formFillingDate: undefined,
  briefingFile: undefined,
  recommendationFile: undefined,
  passingGrade: undefined,
  isPractical: false,
  isSimulator: false,
});

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFileName = ref("");
const currentFileUrl = ref("");
const keepExistingFile = ref(true);
const recommendationFileInput = ref<HTMLInputElement | null>(null);
const selectedRecommendationFileName = ref("");
const currentRecommendationFileUrl = ref("");
const keepExistingRecommendationFile = ref(true);
const isPenerbitan = computed(() =>
  props.remarkDocs
    .find((item) => Number(item.id) === Number(state.remarkDocId))
    ?.remark?.trim()
    .toUpperCase() === "PENERBITAN",
);
const df = new DateFormatter("en-US", { dateStyle: "medium" });
const startTime = ref("00:00");
const endTime = ref("23:59");

const parseDateString = (value?: string): CalendarDate | null => {
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

const extractTimePart = (value?: string, fallback = "00:00") => {
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
    start: parseDateString(state.startDate) ?? undefined,
    end: parseDateString(state.finishDate) ?? undefined,
  }),
  set: (value: { start?: CalendarDate; end?: CalendarDate }) => {
    state.startDate = formatDateTime(value.start, startTime.value, "00:00");
    state.finishDate = formatDateTime(value.end, endTime.value, "23:59");
  },
});

watch(
  () => state.startDate,
  (value) => {
    startTime.value = extractTimePart(value, "00:00");
  },
  { immediate: true },
);

watch(
  () => state.finishDate,
  (value) => {
    endTime.value = extractTimePart(value, "23:59");
  },
  { immediate: true },
);

watch(startTime, (value) => {
  const startDate = parseDateString(state.startDate);
  state.startDate = formatDateTime(startDate ?? undefined, value, "00:00");
});

watch(endTime, (value) => {
  const endDate = parseDateString(state.finishDate);
  state.finishDate = formatDateTime(endDate ?? undefined, value, "23:59");
});

// Watch for event prop changes to populate form
watch(
  () => props.event,
  (newEvent) => {
    if (newEvent) {
      state.eventName = newEvent.event;
      // Find sectorId by matching sector name from nested sector object
      const sectorName = newEvent.sector?.sector;
      const matchedSector = props.sectors.find((s) => s.name === sectorName);
      state.sectorId = matchedSector?.id || newEvent.sectorId;
      state.sessionId = newEvent.sessionId;

      // Keep start/finish with time support
      state.startDate = newEvent.startDate || "";
      state.finishDate = newEvent.finishDate || "";
      state.forExpDate = formatDateForInput(newEvent.forExpiredDate);
      state.formFillingDate = formatDateForInput(newEvent.formFillingDate);
      // API now returns remarkDoc with both id and remark
      state.remarkDocId = newEvent.remarkDoc?.id;

      state.passingGrade = newEvent.passingGrade;
      state.isPractical = newEvent.isPractical;
      state.isSimulator = newEvent.isSimulator;
      currentFileUrl.value = newEvent.briefingFile || "";
      selectedFileName.value = newEvent.briefingFile
        ? newEvent.briefingFile.split("/").pop() || ""
        : "";
      keepExistingFile.value = true;
      currentRecommendationFileUrl.value = newEvent.recommendationFile || "";
      selectedRecommendationFileName.value = newEvent.recommendationFile
        ? newEvent.recommendationFile.split("/").pop() || ""
        : "";
      keepExistingRecommendationFile.value = true;
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.eventName = undefined;
    state.sectorId = undefined;
    state.sessionId = undefined;
    state.startDate = undefined;
    state.finishDate = undefined;
    state.forExpDate = undefined;
    state.remarkDocId = undefined;
    state.formFillingDate = undefined;
    state.briefingFile = undefined;
    state.recommendationFile = undefined;
    state.passingGrade = undefined;
    startTime.value = "00:00";
    endTime.value = "23:59";

    selectedFileName.value = "";
    currentFileUrl.value = "";
    keepExistingFile.value = true;
    selectedRecommendationFileName.value = "";
    currentRecommendationFileUrl.value = "";
    keepExistingRecommendationFile.value = true;
    emit("close");
  }
});

function handleFileChange(evt: globalThis.Event) {
  const target = evt.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    state.briefingFile = file;
    selectedFileName.value = file.name;
    keepExistingFile.value = false;
  }
}

function triggerFileInput() {
  fileInput.value?.click();
}

function handleRecommendationFileChange(evt: globalThis.Event) {
  const target = evt.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    state.recommendationFile = file;
    selectedRecommendationFileName.value = file.name;
    keepExistingRecommendationFile.value = false;
  }
}

function triggerRecommendationFileInput() {
  recommendationFileInput.value?.click();
}

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.event) return;

  loading.value = true;

  try {
    // Create FormData for file upload
    const formData = new FormData();
    // Find session name from sessions array
    const session = props.sessions.find((s) => s.id === event.data.sessionId);
    const sessionName = session?.name || `Session ${event.data.sessionId}`;

    formData.append("eventName", event.data.eventName);
    formData.append("sectorId", String(event.data.sectorId));
    formData.append("sessionId", String(event.data.sessionId));
    formData.append("sessionName", sessionName);
    formData.append("startDate", event.data.startDate);
    formData.append("formFillingDate", event.data.formFillingDate);
    formData.append("finishDate", event.data.finishDate);
    formData.append("forExpDate", event.data.forExpDate);
    formData.append("remarkDocId", String(event.data.remarkDocId));

    formData.append("passingGrade", String(event.data.passingGrade));
    formData.append("isPractical", String(event.data.isPractical));
    formData.append("isSimulator", String(event.data.isSimulator));

    if (props.event.branchId) {
      formData.append("branchId", String(props.event.branchId));
    }
    if (props.event.branchUnitId) {
      formData.append("branchUnitId", String(props.event.branchUnitId));
    }

    formData.append("keepExistingFile", String(keepExistingFile.value));
    if (event.data.briefingFile instanceof File) {
      formData.append("briefingFile", event.data.briefingFile);
    }
    if (event.data.recommendationFile instanceof File) {
      formData.append("recommendationFile", event.data.recommendationFile);
    }

    // Call API to update event via local Nuxt API
    await apiFetch(`/api/events/${props.event.id}`, {
      method: "PUT",
      body: formData,
    });

    toast.add({
      title: "Success",
      description: `Event "${event.data.eventName}" has been updated successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("eventUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to update event. Please try again.";
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
    title="Update Event"
    description="Edit the event information"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <!-- Context Info -->
        <div class="p-3 bg-elevated/50 rounded-lg border border-default">
          <div class="text-sm space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-muted">Branch:</span>
              <span class="font-medium">{{ event?.branchName }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted">Branch Unit:</span>
              <span class="font-medium">{{ event?.branchUnitName }}</span>
            </div>
          </div>
        </div>

        <UFormField label="Sector" name="sectorId" required>
          <USelect
            v-model="state.sectorId"
            :items="sectors"
            label-key="name"
            value-key="id"
            placeholder="Select a sector"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Event Name"
          placeholder="Enter event name"
          name="eventName"
          required
        >
          <UInput
            v-model="state.eventName"
            class="w-full"
            placeholder="e.g., Event A"
          />
        </UFormField>

        <UFormField label="Session" name="sessionId" required>
          <USelect
            v-model="state.sessionId"
            :items="sessions"
            label-key="name"
            value-key="id"
            placeholder="Select a session"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Date Range (with hour)" name="startDate" required>
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

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Filling Date" name="formFillingDate" required>
            <UInput
              v-model="state.formFillingDate"
              type="date"
              class="w-full"
            />
          </UFormField>

          <UFormField label="ForExpDate" name="forExpDate" required>
            <UInput v-model="state.forExpDate" type="date" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Remark" name="remarkDocId" required>
          <USelect
            v-model="state.remarkDocId"
            :items="remarkDocs"
            label-key="remark"
            value-key="id"
            placeholder="Select remark"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Passing Grade (%)" name="passingGrade" required>
          <UInput
            v-model="state.passingGrade"
            type="number"
            min="0"
            max="100"
            class="w-full"
            placeholder="e.g., 75"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Practical" name="isPractical">
            <UCheckbox v-model="state.isPractical" label="Yes" />
          </UFormField>

          <UFormField label="Simulator" name="isSimulator">
            <UCheckbox v-model="state.isSimulator" label="Yes" />
          </UFormField>
        </div>

        <UFormField label="Briefing File" name="briefingFile">
          <div class="space-y-2">
            <input
              ref="fileInput"
              type="file"
              class="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              @change="handleFileChange"
            />
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              icon="i-lucide-upload"
              :label="selectedFileName || 'Choose New File (Optional)'"
              class="w-full justify-start"
              @click="triggerFileInput"
            />
            <p
              v-if="currentFileUrl && keepExistingFile"
              class="text-sm text-muted"
            >
              Current file:
              <a
                :href="currentFileUrl"
                target="_blank"
                class="text-primary hover:underline"
                >{{ selectedFileName }}</a
              >
            </p>
            <p
              v-else-if="selectedFileName && !keepExistingFile"
              class="text-sm text-muted"
            >
              New file: {{ selectedFileName }}
            </p>
            <p class="text-xs text-muted">
              Supported formats: PDF, DOC, DOCX, PPT, PPTX. Leave empty to keep
              existing file.
            </p>
          </div>
        </UFormField>

        <UFormField
          v-if="isPenerbitan"
          label="Recommendation Letter"
          name="recommendationFile"
          required
        >
          <div class="space-y-2">
            <input
              ref="recommendationFileInput"
              type="file"
              class="hidden"
              accept=".pdf,.doc,.docx"
              @change="handleRecommendationFileChange"
            />
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              icon="i-lucide-upload"
              :label="selectedRecommendationFileName || 'Choose Recommendation Letter'"
              class="w-full justify-start"
              @click="triggerRecommendationFileInput"
            />
            <p
              v-if="currentRecommendationFileUrl && keepExistingRecommendationFile"
              class="text-sm text-muted"
            >
              Current file:
              <a
                :href="currentRecommendationFileUrl"
                target="_blank"
                class="text-primary hover:underline"
              >{{ selectedRecommendationFileName }}</a>
            </p>
            <p
              v-else-if="selectedRecommendationFileName"
              class="text-sm text-muted"
            >
              New file: {{ selectedRecommendationFileName }}
            </p>
            <p class="text-xs text-muted">
              Supported formats: PDF, DOC, DOCX. Leave empty to keep the existing letter.
            </p>
          </div>
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
            label="Update Event"
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
