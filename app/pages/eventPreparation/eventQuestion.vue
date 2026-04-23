<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import ip from "../../utils/config.json";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

interface RawEventQuestion {
  event: {
    id: number;
    event: string;
  };
  kindOfQuestion: {
    id: number;
    question: string;
  };
  quantity: number;
  persentage: number;
  minutes: number;
}

// Define EventQuestion interface based on new API response
interface EventQuestion {
  id: number;
  eventId: number;
  eventName: string;
  sectorId: number | null;
  sector: string;
  kindOfQuestionId: number;
  kindOfQuestion: string;
  quantity: number;
  persentage: number;
  minutes: number;
}

interface EventQuestionAssignment {
  eventId: number;
  kindOfQuestionId: number;
}

interface Event {
  id: number;
  event: string;
  sectorId: number;
}

interface Session {
  id: number;
  session: string;
  events: Event[];
}

interface Branch {
  branch: string;
}

interface BranchUnit {
  id: number;
  unit: string;
  branch: Branch;
  sessions: Session[];
}

interface KindOfQuestion {
  id: number;
  question: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface GroupsApiResponse {
  allAtribute: BranchUnit;
  evenQuestion: RawEventQuestion[];
  kindOfQuestion: KindOfQuestion[];
}

const toast = useToast();
const table = useTemplateRef<any>("table");

// State for modals
const selectedEventQuestion = ref<EventQuestion | null>(null);
const eventQuestionToUpdate = ref<EventQuestion | null>(null);
const eventQuestionToDelete = ref<EventQuestion | null>(null);

// Search filter
const searchQuery = ref("");

// Filter dropdowns
const selectedEventFilter = ref<number | null>(null);
const selectedKindFilter = ref<number | null>(null);

// Fetch data from the groups API
const { data: apiResponse, status: apiStatus } =
  await useFetch<GroupsApiResponse>(
    `http://${ip.ipBackEnd}/api/eventQuestions`,
    {
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    },
  );

// Extract branch and branch unit info
const currentBranch = computed(() => ({
  name: apiResponse.value?.allAtribute?.branch?.branch || "",
}));

const currentBranchUnit = computed(() => ({
  name: apiResponse.value?.allAtribute?.unit || "",
}));

// Extract events from sessions for the filter dropdown
const events = computed(() => {
  const sessions = apiResponse.value?.allAtribute?.sessions || [];
  const allEvents: { id: number; name: string; sectorId?: number }[] = [];

  sessions.forEach((session) => {
    session.events?.forEach((event) => {
      allEvents.push({
        id: event.id,
        name: event.event,
        sectorId: event.sectorId,
      });
    });
  });

  return allEvents;
});

// Use kindOfQuestion from the API response
const kindOfQuestions = computed(() => {
  return apiResponse.value?.kindOfQuestion || [];
});
// Transform raw event questions to table format
const eventQuestionsData = computed((): EventQuestion[] => {
  const rawData = apiResponse.value?.evenQuestion || [];

  return rawData.map((item, index) => ({
    id: index + 1, // Generate ID since API doesn't provide one
    eventId: item.event?.id ?? 0,
    eventName: item.event?.event ?? "-",
    sectorId: null, // Will be populated from selected event
    sector: "-",
    kindOfQuestionId: item.kindOfQuestion?.id ?? 0,
    kindOfQuestion: item.kindOfQuestion?.question ?? "-",
    quantity: item.quantity ?? 0,
    persentage: item.persentage ?? 0,
    minutes: item.minutes ?? 0,
  }));
});

const eventQuestionAssignments = computed<EventQuestionAssignment[]>(() => {
  return eventQuestionsData.value.map((item) => ({
    eventId: item.eventId,
    kindOfQuestionId: item.kindOfQuestionId,
  }));
});

// Table state - only use columnFilters for search (text filter)
const columnFilters = ref([
  {
    id: "eventName",
    value: "",
  },
]);

// Watch search query and update columnFilters
watch(searchQuery, (newValue) => {
  columnFilters.value = [
    {
      id: "eventName",
      value: newValue,
    },
  ];
});

const columnVisibility = ref();
const rowSelection = ref({});

// Pagination state
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

// Computed filtered data based on dropdown selections
const filteredData = computed(() => {
  const data = eventQuestionsData.value;
  if (!data || data.length === 0) return [];

  return data.filter((item) => {
    // Filter by event
    if (
      selectedEventFilter.value !== null &&
      selectedEventFilter.value !== undefined
    ) {
      if (item.eventId !== selectedEventFilter.value) return false;
    }

    // Filter by kind of question
    if (
      selectedKindFilter.value !== null &&
      selectedKindFilter.value !== undefined
    ) {
      if (item.kindOfQuestionId !== selectedKindFilter.value) return false;
    }

    return true;
  });
});

// Refresh function
const refresh = () => {
  // Re-fetch the data
  window.location.reload();
};

// Loading status
const status = computed(() => apiStatus.value);

// Action handlers

function handleEdit(eventQuestion: EventQuestion) {
  eventQuestionToUpdate.value = eventQuestion;
}

function handleDelete(eventQuestion: EventQuestion) {
  eventQuestionToDelete.value = eventQuestion;
}

function handleModalClose() {
  eventQuestionToUpdate.value = null;
  eventQuestionToDelete.value = null;
}

function handleEventQuestionAdded() {
  refresh();
}

function handleEventQuestionUpdated() {
  refresh();
  handleModalClose();
}

function handleEventQuestionDeleted() {
  refresh();
  handleModalClose();
}

// Helper function to format percentage
function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

// Table columns definition
const columns = computed((): TableColumn<EventQuestion>[] => [
  {
    id: "no",
    header: "NO",
    cell: ({ row }): number => {
      const pageIndex: number =
        table.value?.tableApi?.getState().pagination.pageIndex || 0;
      const pageSize: number =
        table.value?.tableApi?.getState().pagination.pageSize || 10;
      return pageIndex * pageSize + row.index + 1;
    },
  },
  {
    accessorKey: "eventName",

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
        row.original.eventName,
      );
    },
  },
  {
    accessorKey: "kindOfQuestion",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Kind of Question",
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
        row.original.kindOfQuestion,
      );
    },
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Quantity",
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
      return h("div", { class: "text-center" }, row.original.quantity);
    },
  },
  {
    accessorKey: "persentage",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Percentage",
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
        { class: "text-center" },
        formatPercentage(row.original.persentage),
      );
    },
  },
  {
    accessorKey: "minutes",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Minutes",
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
      return h("div", { class: "text-center" }, `${row.original.minutes} min`);
    },
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) => {
      return h("div", { class: "flex items-center gap-2" }, [
        h(resolveComponent("UButton"), {
          icon: "i-lucide-pencil",
          color: "primary",
          variant: "soft",
          size: "sm",
          onClick: () => handleEdit(row.original),
        }),
        h(resolveComponent("UButton"), {
          icon: "i-lucide-trash-2",
          color: "error",
          variant: "soft",
          size: "sm",
          onClick: () => handleDelete(row.original),
        }),
      ]);
    },
  },
]);
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Event Question Management">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mb-4 p-3 bg-elevated/50 rounded-lg border border-default">
        <div class="flex items-center gap-4 text-sm">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-building-2" class="text-muted" />
            <span class="text-muted">Branch:</span>
            <span class="font-medium">{{ currentBranch.name }}</span>
          </div>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-square-chart-gantt" class="text-muted" />
            <span class="text-muted">Branch Unit:</span>
            <span class="font-medium">{{ currentBranchUnit.name }}</span>
          </div>
        </div>
      </div>
      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <UInput
          v-model="searchQuery"
          placeholder="Filter events..."
          class="max-w-sm"
          icon="i-lucide-search"
        />
        <USelect
          v-model="selectedEventFilter"
          :items="[
            { label: 'All Events', value: null },
            ...(events?.map((e) => ({ label: e.name, value: e.id })) || []),
          ]"
          placeholder="Filter by Event"
          class="w-48"
        />
        <USelect
          v-model="selectedKindFilter"
          :items="[
            { label: 'All Types', value: null },
            ...(kindOfQuestions?.map((k) => ({
              label: k.question,
              value: k.id,
            })) || []),
          ]"
          placeholder="Filter by Kind"
          class="w-48"
        />

        <EventQuestionAddModal
          :events="events"
          :kind-of-questions="kindOfQuestions"
          :event-questions="eventQuestionAssignments"
          @event-question-added="handleEventQuestionAdded"
        />
        <UButton
          label="Refresh"
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          @click="refresh"
        />
      </div>

      <UTable
        v-if="filteredData && filteredData.length > 0"
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        v-model:pagination="pagination"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel(),
        }"
        class="shrink-0"
        :data="filteredData"
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

      <!-- Empty State -->
      <div
        v-else-if="!status || status === 'success'"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <UIcon name="i-lucide-inbox" class="text-4xl text-muted mb-4" />
        <p class="text-muted">No event questions available</p>
      </div>

      <div
        v-if="filteredData && filteredData.length > 0"
        class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto"
      >
        <div class="text-sm text-muted">
          Showing {{ pagination.pageIndex * pagination.pageSize + 1 }} to
          {{
            Math.min(
              (pagination.pageIndex + 1) * pagination.pageSize,
              table?.tableApi?.getFilteredRowModel().rows.length || 0,
            )
          }}
          of
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} event
          questions
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
      <EventQuestionUpdateModal
        :event-question="eventQuestionToUpdate"
        :events="events"
        :kind-of-questions="kindOfQuestions"
        @event-question-updated="handleEventQuestionUpdated"
        @close="handleModalClose"
      />

      <!-- Delete Modal -->
      <EventQuestionDeleteModal
        :event-question="eventQuestionToDelete"
        @event-question-deleted="handleEventQuestionDeleted"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
