<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import type { TableColumn } from "@nuxt/ui";
import {
  CalendarDate,
  DateFormatter,
  getLocalTimeZone,
  parseDate,
} from "@internationalized/date";

interface Profession {
  profession: string;
}

interface ProfessionInBranch {
  id: number;
  profession: Profession | null;
}

interface ContentOfBriefing {
  id: number;
  contentOfBriefing: string | null;
  file: string | null;
}

interface Briefing {
  id: number;
  kindOfBriefingId: number | null;
  branchId: number | null;
  speaker: string | null;
  speakerUser?: {
    name: string | null;
  } | null;
  isAll: boolean | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  contentOfBriefings?: ContentOfBriefing[];
  briefingDestinations?: {
    id: number;
    professionInBranch: ProfessionInBranch | null;
  }[];
}

const { token } = useAuth();
const toast = useToast();
const UButton = resolveComponent("UButton");

const df = new DateFormatter("en-US", { dateStyle: "medium" });
const loading = ref(false);
const briefings = ref<Briefing[]>([]);
const searched = ref(false);

const openAddModal = ref(false);
const openEditModal = ref(false);
const openDeleteModal = ref(false);
const openFileModal = ref(false);

const briefingToEdit = ref<Briefing | null>(null);
const briefingToDelete = ref<Briefing | null>(null);
const selectedFileUrl = ref("");
const selectedFileName = ref("");

const state = reactive({
  start: "",
  finish: "",
});

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

const formatDateTime = (value?: CalendarDate, time = "00:00") => {
  const date = formatCalendarDate(value);
  return date ? `${date}T${time}:00` : "";
};

const dateRange = computed({
  get: () => ({
    start: parseDateString(state.start) ?? undefined,
    end: parseDateString(state.finish) ?? undefined,
  }),
  set: (value: { start?: CalendarDate; end?: CalendarDate }) => {
    state.start = formatDateTime(value.start, "00:00");
    state.finish = formatDateTime(value.end, "23:59");
  },
});

const canSubmit = computed(() => Boolean(state.start && state.finish));

const selectedDateLabel = computed(() => {
  if (!dateRange.value.start) return "Pick a date range";

  const start = df.format(dateRange.value.start.toDate(getLocalTimeZone()));
  if (!dateRange.value.end) return start;

  const end = df.format(dateRange.value.end.toDate(getLocalTimeZone()));
  return `${start} - ${end}`;
});

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const extractBriefingHtml = (contents?: ContentOfBriefing[]) => {
  if (!contents?.length) return "-";

  const mergedContent = contents
    .map((item) => (item.contentOfBriefing || "").trim())
    .filter(Boolean)
    .join("");

  return mergedContent || "-";
};

const extractDestinationLabels = (
  destinations?: Briefing["briefingDestinations"],
) => {
  if (!destinations?.length) return [];

  return destinations
    .map((item) => item.professionInBranch?.profession?.profession)
    .filter((value): value is string => Boolean(value));
};

const getBriefingFilePath = (contents?: ContentOfBriefing[]) => {
  return contents?.find((item) => item.file)?.file || "";
};

const getBriefingFileName = (contents?: ContentOfBriefing[]) => {
  const filePath = getBriefingFilePath(contents);
  return filePath ? filePath.split("/").pop() || filePath : "-";
};

function openFilePreview(contents?: ContentOfBriefing[]) {
  const filePath = getBriefingFilePath(contents);
  if (!filePath) return;

  selectedFileUrl.value = filePath;
  selectedFileName.value = getBriefingFileName(contents);
  openFileModal.value = true;
}

function handleEdit(briefing: Briefing) {
  briefingToEdit.value = briefing;
  openEditModal.value = true;
}

function handleDelete(briefing: Briefing) {
  briefingToDelete.value = briefing;
  openDeleteModal.value = true;
}

const columns: TableColumn<Briefing>[] = [
  {
    id: "no",
    header: "NO",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "speaker",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Speaker",
        icon: isSorted
          ? isSorted === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : "i-lucide-arrow-down-wide-narrow"
          : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(isSorted === "asc"),
      });
    },
    cell: ({ row }) =>
      h(
        "div",
        { class: "font-medium text-highlighted" },
        row.original.speakerUser?.name || row.original.speaker || "-",
      ),
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) =>
      h("div", { class: "text-sm text-muted" }, formatDate(row.original.createdAt)),
  },
  {
    id: "contents",
    header: "Contents",
    cell: ({ row }) => {
      const html = extractBriefingHtml(row.original.contentOfBriefings);

      return h("div", {
        class:
          "max-w-xl text-sm text-muted whitespace-normal [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1",
        innerHTML: html,
      });
    },
  },
  {
    id: "file",
    header: "File",
    cell: ({ row }) => {
      const filePath = getBriefingFilePath(row.original.contentOfBriefings);
      const fileName = getBriefingFileName(row.original.contentOfBriefings);

      if (!filePath) {
        return h("div", { class: "text-sm text-muted" }, "-");
      }

      return h(UButton, {
        label: fileName,
        icon: "i-lucide-paperclip",
        color: "neutral",
        variant: "ghost",
        size: "sm",
        class: "max-w-[220px]",
        onClick: () => openFilePreview(row.original.contentOfBriefings),
      });
    },
  },
  {
    id: "destinations",
    header: "Destinations",
    cell: ({ row }) => {
      const labels = extractDestinationLabels(row.original.briefingDestinations);

      return h(
        "div",
        { class: "max-w-xs text-sm text-muted whitespace-normal" },
        labels.length > 0 ? labels.join(", ") : "-",
      );
    },
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-2" }, [
        h(UButton, {
          label: "Edit",
          icon: "i-lucide-pencil",
          color: "primary",
          variant: "soft",
          size: "sm",
          onClick: () => handleEdit(row.original),
        }),
        h(UButton, {
          label: "Delete",
          icon: "i-lucide-trash-2",
          color: "error",
          variant: "soft",
          size: "sm",
          onClick: () => handleDelete(row.original),
        }),
      ]),
  },
];

async function getBriefings(showSuccessToast = true) {
  if (!canSubmit.value) {
    toast.add({
      title: "Date range required",
      description: "Please select both start date and finish date.",
      color: "warning",
    });
    return;
  }

  loading.value = true;

  try {
    const response = await $fetch<Briefing[]>(
      `${apiBaseUrl}/api/briefings`,
      {
        method: "POST",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
        body: {
          start: state.start,
          finish: state.finish,
        },
      },
    );

    briefings.value = response;
    searched.value = true;

    if (showSuccessToast) {
      toast.add({
        title: "Success",
        description: "Briefing data has been loaded.",
        color: "success",
      });
    }
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to load briefing data.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

async function handleSaved() {
  if (canSubmit.value) {
    await getBriefings(false);
  }
}

async function handleDeleted() {
  briefingToDelete.value = null;
  if (canSubmit.value) {
    await getBriefings(false);
  }
}
</script>

<template>
  <UDashboardPanel id="briefing">
    <template #header>
      <UDashboardNavbar title="Briefing">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <BriefingFilePreviewModal
        v-model:open="openFileModal"
        :file-name="selectedFileName"
        :file-url="selectedFileUrl"
      />

      <BriefingDeleteModal
        v-model:open="openDeleteModal"
        :briefing="briefingToDelete"
        @deleted="handleDeleted"
      />

      <UCard class="mb-4">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-calendar-search" class="size-5 text-primary" />
            <div>
              <h2 class="font-semibold text-highlighted">Select Briefing Data</h2>
              <p class="text-sm text-muted">
                Choose start date and finish date to load briefing data.
              </p>
            </div>
          </div>
        </template>

        <div class="flex flex-col gap-4 md:flex-row md:items-end">
          <UFormField label="Date Range" required class="w-full md:max-w-md">
            <UPopover :content="{ align: 'start' }" :modal="true">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-calendar"
                class="w-full justify-between"
              >
                <span class="truncate">{{ selectedDateLabel }}</span>

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
              </template>
            </UPopover>
          </UFormField>

          <UButton
            label="Load Briefings"
            icon="i-lucide-search"
            :loading="loading"
            :disabled="!canSubmit"
            @click="getBriefings"
          />

          <UButton
            label="Add Briefing"
            icon="i-lucide-plus"
            color="primary"
            @click="openAddModal = true"
          />

          <BriefingFormModal
            v-model:open="openAddModal"
            mode="add"
            @saved="handleSaved"
          />

          <BriefingFormModal
            v-model:open="openEditModal"
            mode="edit"
            :briefing="briefingToEdit"
            @saved="handleSaved"
          />
        </div>
      </UCard>

      <UTable
        :data="briefings"
        :columns="columns"
        :loading="loading"
        class="shrink-0"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
          separator: 'h-0',
        }"
      />

      <div
        v-if="searched && !loading && briefings.length === 0"
        class="mt-4 rounded-lg border border-default bg-elevated/40 p-4 text-sm text-muted"
      >
        No briefing data found for the selected date range.
      </div>
    </template>
  </UDashboardPanel>
</template>
