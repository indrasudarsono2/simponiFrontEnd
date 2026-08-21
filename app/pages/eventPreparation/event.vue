<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import { format, parseISO } from "date-fns";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

// Define API response interface
interface Sector {
  id: number;
  sector: string;
}

interface Branch {
  branch: string;
}

interface BranchUnit {
  id: number;
  unit: string;
  branch: Branch;
  sectors: Sector[];
}

interface EventItem {
  id: number;
  event: string;
  sectorId?: number;
  sectorName?: string;
  sessionId?: number;
  sessionName?: string;
  startDate: string;
  finishDate: string;
  formFillingDate: string;
  forExpiredDate: string;
  remarkDoc: {
    id?: number;
    remark: string;
  };

  briefingFile: string | null;
  passingGrade: number;
  branchId?: number;
  branchName?: string;
  branchUnitId?: number;
  branchUnitName?: string;
  createdAt?: string;
  sector?: {
    sector: string;
  };
  isPractical: boolean;
  isSimulator: boolean;
}

interface SessionGroup {
  id: number;
  session: string;
  branchUnit: BranchUnit;
  events: EventItem[];
}

interface RemarkDoc {
  id: number;
  remark: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface EventsResponse {
  session: SessionGroup[];
  remarkDoc: RemarkDoc[];
}

interface SessionOption {
  id: number;
  name: string;
}

const toast = useToast();
const table = useTemplateRef("table");

// State for modals
const selectedEvent = ref<EventItem | null>(null);
const eventToUpdate = ref<EventItem | null>(null);
const eventToDelete = ref<EventItem | null>(null);
const eventToAssignUsers = ref<number | null>(null);
const eventToViewUsers = ref<number | null>(null);

// Table state
const columnFilters = ref([
  {
    id: "event",
    value: "",
  },
]);

const columnVisibility = ref();
const rowSelection = ref({});

// Filter states
const selectedSessionId = ref<number | null>(null);
const selectedSectorId = ref<number | null>(null);

// Branch info from API response (from first session group)
const branchName = computed(
  () => data.value?.session?.[0]?.branchUnit?.branch?.branch || "",
);
const branchUnitName = computed(
  () => data.value?.session?.[0]?.branchUnit?.unit || "",
);
const branchUnitId = computed(
  () => data.value?.session?.[0]?.branchUnit?.id || 0,
);

// Available sectors from API response (branchUnit.sectors) - transform to have 'name' property
const availableSectors = computed(() => {
  if (!data.value?.session || data.value.session.length === 0) return [];
  const sectors = data.value.session[0]?.branchUnit?.sectors || [];
  return sectors.map((s) => ({ id: s.id, name: s.sector }));
});

// Available sessions from API response (session array)
const availableSessions = computed<SessionOption[]>(() => {
  if (!data.value?.session || data.value.session.length === 0) return [];
  // Extract sessions from API response
  return data.value.session.map((item) => ({
    id: item.id,
    name: item.session || "",
  }));
});

// Available remark docs from API response
const availableRemarkDocs = computed(() => {
  return data.value?.remarkDoc || [];
});

// Fetch events data
const { data, status, refresh } = await useFetch<EventsResponse>(
  `${apiBaseUrl}/api/events`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Extract and flatten events from all sessions
const events = computed(() => {
  if (!data.value?.session || data.value.session.length === 0) return [];

  // Flatten events from all sessions and add session info
  const allEvents: EventItem[] = [];
  data.value.session.forEach((session) => {
    const sessionEvents =
      session.events?.map((event) => ({
        ...event,
        sessionId: session.id,
        sessionName: session.session,
        branchUnitId: session.branchUnit?.id,
        branchUnitName: session.branchUnit?.unit,
        branchName: session.branchUnit?.branch?.branch,
      })) || [];
    allEvents.push(...sessionEvents);
  });

  return allEvents;
});

// Filtered events based on selected session and sector
const filteredEvents = computed(() => {
  if (!events.value) return [];

  return events.value.filter((event) => {
    const sessionMatch =
      !selectedSessionId.value || event.sessionId === selectedSessionId.value;
    const sectorMatch =
      !selectedSectorId.value || event.sectorId === selectedSectorId.value;
    return sessionMatch && sectorMatch;
  });
});

// Action handlers
function handleEdit(event: EventItem) {
  eventToUpdate.value = event;
}

function handleDelete(event: EventItem) {
  eventToDelete.value = event;
}

function handleAssignUsers(eventId: number) {
  eventToAssignUsers.value = eventId;
}

function handleUsersAssigned() {
  eventToAssignUsers.value = null;
  toast.add({
    title: "Success",
    description: "Users have been assigned to the event",
    color: "success",
  });
}

function handleViewUsers(eventId: number) {
  eventToViewUsers.value = eventId;
}

function handleUsersViewed() {
  eventToViewUsers.value = null;
}

// Format date helper
function formatDate(dateString?: string | null): string {
  if (!dateString) return "-";
  try {
    return format(parseISO(dateString), "dd MMM yyyy");
  } catch {
    return dateString;
  }
}

// Table columns definition
const columns: TableColumn<EventItem>[] = [
  {
    id: "no",
    header: "NO",
    cell: ({ row }) => {
      const pageIndex =
        table.value?.tableApi?.getState().pagination.pageIndex || 0;
      const pageSize =
        table.value?.tableApi?.getState().pagination.pageSize || 10;
      return row.index + 1;
    },
  },
  {
    accessorKey: "sectorName",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Sector",
        icon: isSorted
          ? isSorted === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : "i-lucide-arrow-down-wide-narrow"
          : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      });
    },
    cell: ({ row }) => {
      const sectorName = row.original.sector?.sector || "-";
      return h("div", { class: "font-medium text-highlighted" }, sectorName);
    },
  },
  {
    accessorKey: "event",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Event",
        icon: isSorted
          ? isSorted === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : "i-lucide-arrow-down-wide-narrow"
          : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      });
    },
    cell: ({ row }) => {
      return h(
        "div",
        { class: "font-medium text-highlighted" },
        row.original.event,
      );
    },
  },
  {
    accessorKey: "sessionName",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Session",
        icon: isSorted
          ? isSorted === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : "i-lucide-arrow-down-wide-narrow"
          : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      });
    },
    cell: ({ row }) => {
      return h("div", { class: "text-muted" }, row.original.sessionName);
    },
  },
  {
    accessorKey: "formFillingDate",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Filling Date",
        icon: isSorted
          ? isSorted === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : "i-lucide-arrow-down-wide-narrow"
          : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      });
    },
    cell: ({ row }) => {
      return h(
        "div",
        { class: "text-muted" },
        formatDate(row.original.formFillingDate),
      );
    },
  },
  {
    accessorKey: "startDate",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Start",
        icon: isSorted
          ? isSorted === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : "i-lucide-arrow-down-wide-narrow"
          : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      });
    },
    cell: ({ row }) => {
      return h(
        "div",
        { class: "text-muted" },
        formatDate(row.original.startDate),
      );
    },
  },
  {
    accessorKey: "finishDate",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Finish",
        icon: isSorted
          ? isSorted === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : "i-lucide-arrow-down-wide-narrow"
          : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      });
    },
    cell: ({ row }) => {
      return h(
        "div",
        { class: "text-muted" },
        formatDate(row.original.finishDate),
      );
    },
  },
  {
    accessorKey: "forExpiredDate",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Exp Date",
        icon: isSorted
          ? isSorted === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : "i-lucide-arrow-down-wide-narrow"
          : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      });
    },
    cell: ({ row }) => {
      return h(
        "div",
        { class: "text-muted" },
        formatDate(row.original.forExpiredDate),
      );
    },
  },
  {
    accessorKey: "remarkDoc",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Remark Doc",
        icon: isSorted
          ? isSorted === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : "i-lucide-arrow-down-wide-narrow"
          : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      });
    },
    cell: ({ row }) => {
      return h("div", { class: "text-muted" }, row.original.remarkDoc?.remark);
    },
  },
  {
    accessorKey: "briefingFile",
    header: "Briefing File",
    cell: ({ row }) => {
      if (!row.original.briefingFile || row.original.briefingFile === "null") {
        return h("span", { class: "text-muted text-sm" }, "No file");
      }
      // Build full backend URL for the file
      const fileUrl = row.original.briefingFile.startsWith("/")
        ? `${apiBaseUrl}${row.original.briefingFile}`
        : row.original.briefingFile;
      // Link to file viewer page
      const viewerUrl = `/file/view?url=${encodeURIComponent(fileUrl)}`;
      return h(
        "a",
        {
          href: viewerUrl,
          class: "text-primary hover:underline flex items-center gap-1",
        },
        [h("i", { class: "i-lucide-file-text text-sm" }), "View File"],
      );
    },
  },
  {
    accessorKey: "passingGrade",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Passing Grade",
        icon: isSorted
          ? isSorted === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : "i-lucide-arrow-down-wide-narrow"
          : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      });
    },
    cell: ({ row }) => {
      return h(
        "div",
        { class: "font-medium text-highlighted" },
        `${row.original.passingGrade}%`,
      );
    },
  },
  {
    accessorKey: "isPractical",
    header: "Practical",
    cell: ({ row }) => {
      const UBadge = resolveComponent("UBadge");
      return h(UBadge, {
        color: row.original.isPractical ? "success" : "error",
        variant: "subtle",
        size: "lg",
        label: row.original.isPractical ? "Yes" : "No",
      });
    },
  },
  {
    accessorKey: "isSimulator",
    header: "Simulator",
    cell: ({ row }) => {
      const UBadge = resolveComponent("UBadge");
      return h(UBadge, {
        color: row.original.isSimulator ? "success" : "error",
        variant: "subtle",
        size: "lg",
        label: row.original.isSimulator ? "Yes" : "No",
      });
    },
  },
  {
    id: "actions",
    header: "Action",

    cell: ({ row }) => {
      return h("div", { class: "flex items-center justify-start gap-2" }, [
        h(UButton, {
          icon: "i-lucide-pencil",
          color: "primary",
          variant: "soft",
          size: "sm",
          onClick: () => handleEdit(row.original),
        }),
        h(UButton, {
          icon: "i-lucide-trash-2",
          color: "error",
          variant: "soft",
          size: "sm",
          onClick: () => handleDelete(row.original),
        }),
        h(UButton, {
          icon: "i-lucide-users",
          color: "info",
          variant: "soft",
          size: "sm",
          onClick: () => handleAssignUsers(row.original.id),
        }),
        h(UButton, {
          icon: "i-lucide-eye",
          color: "warning",
          variant: "soft",
          size: "sm",
          onClick: () => handleViewUsers(row.original.id),
        }),
      ]);
    },
  },
];

// Search filter
const searchQuery = computed({
  get: (): string => {
    return (
      (table.value?.tableApi?.getColumn("event")?.getFilterValue() as string) ||
      ""
    );
  },
  set: (value: string) => {
    table.value?.tableApi
      ?.getColumn("event")
      ?.setFilterValue(value || undefined);
  },
});

// Pagination state
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

// Handle modal events
function handleEventAdded() {
  refresh();
  toast.add({
    title: "Success",
    description: "Event list has been refreshed",
    color: "success",
  });
}

function handleEventUpdated() {
  eventToUpdate.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Event list has been refreshed",
    color: "success",
  });
}

function handleEventDeleted() {
  eventToDelete.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Event list has been refreshed",
    color: "success",
  });
}

function handleModalClose() {
  eventToUpdate.value = null;
  eventToDelete.value = null;
}
</script>

<template>
  <UDashboardPanel id="event-management">
    <template #header>
      <UDashboardNavbar title="Event Management">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Context Info -->
      <div class="mb-4 p-3 bg-elevated/50 rounded-lg border border-default">
        <div class="flex items-center gap-4 text-sm">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-building-2" class="text-muted" />
            <span class="text-muted">Branch:</span>
            <span class="font-medium">{{ branchName }}</span>
          </div>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-square-chart-gantt" class="text-muted" />
            <span class="text-muted">Branch Unit:</span>
            <span class="font-medium">{{ branchUnitName }}</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-4 mb-4">
        <USelect
          v-model="selectedSectorId"
          :items="[{ id: null, sector: 'All Sectors' }, ...availableSectors]"
          label-key="sector"
          value-key="id"
          placeholder="Filter by sector"
          class="max-w-xs"
          icon="i-lucide-map"
        />

        <USelect
          v-model="selectedSessionId"
          :items="[{ id: null, name: 'All Sessions' }, ...availableSessions]"
          label-key="name"
          value-key="id"
          placeholder="Filter by session"
          class="max-w-xs"
          icon="i-lucide-filter"
        />
        <EventAddModal
          :branch-id="branchUnitId"
          :branch-name="branchName"
          :branch-unit-id="branchUnitId"
          :branch-unit-name="branchUnitName"
          :sessions="availableSessions"
          :sectors="availableSectors"
          :remark-docs="availableRemarkDocs"
          @event-added="handleEventAdded"
        />
      </div>

      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-4">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search events..."
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <UButton
            label="Refresh"
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            @click="refresh"
          />
        </div>
      </div>

      <UTable
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        v-model:pagination="pagination"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel(),
        }"
        class="shrink-0"
        :data="filteredEvents"
        :columns="columns"
        :loading="status === 'pending'"
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
        class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto"
      >
        <div class="text-sm text-muted">
          Showing {{ pagination.pageIndex * pagination.pageSize + 1 }} to
          {{
            Math.min(
              (pagination.pageIndex + 1) * pagination.pageSize,
              filteredEvents.length || 0,
            )
          }}
          of
          {{ filteredEvents.length || 0 }} events
        </div>

        <div class="flex items-center gap-1.5">
          <UPagination
            :default-page="
              (table?.tableApi?.getState().pagination.pageIndex || 0) + 1
            "
            :items-per-page="table?.tableApi?.getState().pagination.pageSize"
            :total="table?.tableApi?.getFilteredRowModel().rows.length"
            @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
          />
        </div>
      </div>

      <!-- Update Modal -->
      <EventUpdateModal
        :event="eventToUpdate"
        :sessions="availableSessions"
        :sectors="availableSectors"
        :remark-docs="availableRemarkDocs"
        @event-updated="handleEventUpdated"
        @close="handleModalClose"
      />

      <EventDeleteModal
        :event="eventToDelete"
        @event-deleted="handleEventDeleted"
        @close="handleModalClose"
      />

      <!-- Assign Users Modal -->
      <EventAssignUsersModal
        :event-id="eventToAssignUsers"
        @users-assigned="handleUsersAssigned"
        @close="eventToAssignUsers = null"
      />

      <!-- View Assigned Users Modal -->
      <EventViewUsersModal
        :event-id="eventToViewUsers"
        @close="handleUsersViewed"
      />
    </template>
  </UDashboardPanel>
</template>
