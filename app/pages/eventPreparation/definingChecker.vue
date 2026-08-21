<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

// Define interfaces based on new API response
interface UserRole {
  id: number;
  roles: {
    role: string;
  };
}

interface User {
  nik: string;
  name: string;
  userRoles: UserRole[];
}

interface Sector {
  id: number;
  sector: string;
  users: User[];
}

interface RemarkDoc {
  id: number;
  remark: string;
}

interface CheckerGroup {
  id: number;
  checker: string;
}

interface GroupMember {
  id: number;
  member: string;
}

interface Group {
  checkerGroups: CheckerGroup[];
  groupMembers: GroupMember[];
}

interface Event {
  id: number;
  name: string;
  event: string;
  sectorId: number;
  sectorName: string;
  session?: string;
  sector: Sector;
  remarkDoc: RemarkDoc;
  eventUsers?: { user: User }[];
  groups?: Group[];
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

interface DefiningCheckerRow {
  id: number;
  eventId: number;
  eventName: string;
  sectorId: number;
  sectorName: string;
  group: string;
  pic: string; // NIK of PIC
  picName: string; // Name of PIC for display
  checkers: string[]; // Array of NIKs
  checkerNames: string[]; // Array of checker names for display
  members: string[]; // Array of NIKs
  memberNames: string[]; // Array of member names for display
  remarkDoc: string;
  createdAt?: string;
}

interface GroupUserPic {
  name: string;
}

interface CheckerGroupItem {
  id: number;
  checker: string;
  userChecker: {
    name: string;
  };
}

interface GroupMemberItem {
  id: number;
  member: string;
  userMember: {
    name: string;
  };
}

interface GroupEvent {
  id: number;
  event: string;
  remarkDoc: {
    id: number;
    remark: string;
  };
  sector: {
    id: number;
    sector: string;
  };
}

interface DefiningCheckerGroup {
  id: number;
  group: string;
  userPic: GroupUserPic;
  checkerGroups: CheckerGroupItem[];
  groupMembers: GroupMemberItem[];
  event: GroupEvent;
}

interface GroupsResponse {
  allAtribute: BranchUnit;
  group: DefiningCheckerGroup[];
}

const toast = useToast();
const table = useTemplateRef("table");

// State for modals
const selectedDefiningChecker = ref<DefiningCheckerRow | null>(null);
const definingCheckerToUpdate = ref<DefiningCheckerRow | null>(null);
const definingCheckerToDelete = ref<DefiningCheckerRow | null>(null);

// Table state
const columnFilters = ref([
  {
    id: "group",
    value: "",
  },
]);
const columnVisibility = ref();
const rowSelection = ref({});

// Filter states
const selectedEventId = ref<number | null>(null);
const selectedSectorId = ref<number | null>(null);
const selectedRemarkDoc = ref<string | null>(null);

// Fetch defining checkers data
const { data, status, refresh } = await useFetch<GroupsResponse>(
  `${apiBaseUrl}/api/groups`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Extract branch and branch unit from allAtribute
const currentBranch = computed(() => ({
  name: data.value?.allAtribute?.branch?.branch || "",
}));

const currentBranchUnit = computed(() => ({
  name: data.value?.allAtribute?.unit || "",
}));

// Extract available events from allAtribute.sessions with full nested data
const availableEvents = computed(() => {
  const sessions = data.value?.allAtribute?.sessions || [];
  const events: Event[] = [];
  sessions.forEach((session) => {
    session.events?.forEach((event) => {
      events.push({
        id: event.id,
        name: event.event,
        event: event.event,
        sectorId: event.sector?.id ?? 0,
        sectorName: event.sector?.sector ?? "-",
        session: session.session,
        sector: event.sector,
        remarkDoc: event.remarkDoc,
        eventUsers: event.eventUsers || [],
        groups: event.groups || [],
      });
    });
  });
  return events;
});

// Helper to get users with specific role from an event
function getUsersByRole(event: Event, role: string) {
  if (!event.sector?.users) return [];
  return event.sector.users.filter((user) =>
    user.userRoles.some((ur) => ur.roles.role === role),
  );
}

// Normalize nested groups response into table row shape
const normalizedGroups = computed<DefiningCheckerRow[]>(() => {
  if (!data.value?.group) return [];

  return data.value.group.map((item) => {
    // Get PIC NIK - find the checker that matches the userPic name
    const picName = item.userPic?.name ?? "";
    const picChecker = item.checkerGroups?.find(
      (cg) => cg.userChecker?.name === picName,
    );
    const picNik =
      picChecker?.checker ?? item.checkerGroups?.[0]?.checker ?? "";

    // Get checker NIKs and names
    const checkerNiks =
      item.checkerGroups
        ?.map((cg) => cg.checker)
        .filter((nik): nik is string => Boolean(nik)) ?? [];
    const checkerNamesList =
      item.checkerGroups
        ?.map((cg) => cg.userChecker?.name)
        .filter((name): name is string => Boolean(name)) ?? [];

    // Get member NIKs and names
    const memberNiks =
      item.groupMembers
        ?.map((gm) => gm.member)
        .filter((nik): nik is string => Boolean(nik)) ?? [];
    const memberNamesList =
      item.groupMembers
        ?.map((gm) => gm.userMember?.name)
        .filter((name): name is string => Boolean(name)) ?? [];

    return {
      id: item.id, // Use actual group ID from API
      eventId: item.event?.id ?? 0,
      eventName: item.event?.event ?? "-",
      sectorId: item.event?.sector?.id ?? 0,
      sectorName: item.event?.sector?.sector ?? "-",
      group: item.group ?? "-",
      pic: picNik, // NIK for form selection
      picName: picName, // Name for display
      checkers: checkerNiks,
      checkerNames: checkerNamesList,
      members: memberNiks,
      memberNames: memberNamesList,
      remarkDoc: item.event?.remarkDoc?.remark ?? "-",
      createdAt: undefined,
    };
  });
});

// Filtered data based on selected event, sector, and remarkDoc
const filteredData = computed(() => {
  return normalizedGroups.value.filter((item) => {
    const eventMatch =
      !selectedEventId.value || item.eventId === selectedEventId.value;
    const sectorMatch =
      !selectedSectorId.value || item.sectorId === selectedSectorId.value;
    const remarkDocMatch =
      !selectedRemarkDoc.value || item.remarkDoc === selectedRemarkDoc.value;
    return eventMatch && sectorMatch && remarkDocMatch;
  });
});

// Action handlers
function handleEdit(item: DefiningCheckerRow) {
  definingCheckerToUpdate.value = item;
}

function handleDelete(item: DefiningCheckerRow) {
  definingCheckerToDelete.value = item;
}

// Render checker list as <ul><li> with names
function renderCheckerList(checkers: string[], row: DefiningCheckerRow) {
  // Get the original group data by finding the group with matching ID
  const groupData = data.value?.group?.find((g) => g.id === row.id);
  const checkerNames = checkers.map((nik) => {
    const checkerGroup = groupData?.checkerGroups?.find(
      (cg) => cg.checker === nik,
    );
    return checkerGroup?.userChecker?.name || nik;
  });

  return h(
    "ul",
    { class: "list-disc list-inside text-sm text-muted space-y-0.5" },
    checkerNames.map((name) => h("li", {}, name)),
  );
}

// Render member list as <ul><li> with names
function renderMemberList(members: string[], row: DefiningCheckerRow) {
  // Get the original group data by finding the group with matching ID
  const groupData = data.value?.group?.find((g) => g.id === row.id);
  const memberNames = members.map((nik) => {
    const memberGroup = groupData?.groupMembers?.find(
      (gm) => gm.member === nik,
    );
    return memberGroup?.userMember?.name || nik;
  });

  return h(
    "ul",
    { class: "list-disc list-inside text-sm text-muted space-y-0.5" },
    memberNames.map((name) => h("li", {}, name)),
  );
}

// Table columns definition
const columns: TableColumn<DefiningCheckerRow>[] = [
  {
    id: "no",
    header: "NO",
    cell: ({ row }) => {
      const pageIndex =
        table.value?.tableApi?.getState().pagination.pageIndex || 0;
      const pageSize =
        table.value?.tableApi?.getState().pagination.pageSize || 10;
      return pageIndex * pageSize + row.index + 1;
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
      return h(
        "div",
        { class: "font-medium text-highlighted" },
        row.original.sectorName,
      );
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
    accessorKey: "group",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Group",
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
      return h("div", { class: "text-muted" }, row.original.group);
    },
  },
  {
    accessorKey: "picName",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "PIC",
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
      return h("div", { class: "text-muted" }, row.original.picName);
    },
  },
  {
    accessorKey: "checkers",
    header: "Checker",
    cell: ({ row }) => {
      return renderCheckerList(row.original.checkers, row.original);
    },
  },
  {
    accessorKey: "members",
    header: "Member",
    cell: ({ row }) => {
      return renderMemberList(row.original.members, row.original);
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
      return h(
        "div",
        {
          class:
            row.original.remarkDoc === "PENERBITAN"
              ? "text-primary font-medium"
              : "text-warning font-medium",
        },
        row.original.remarkDoc,
      );
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
      ]);
    },
  },
];

// Search filter
const searchQuery = computed({
  get: (): string => {
    return (
      (table.value?.tableApi?.getColumn("group")?.getFilterValue() as string) ||
      ""
    );
  },
  set: (value: string) => {
    table.value?.tableApi
      ?.getColumn("group")
      ?.setFilterValue(value || undefined);
  },
});

// Pagination state
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

// Handle modal events
function handleDefiningCheckerAdded() {
  refresh();
  toast.add({
    title: "Success",
    description: "Defining Checker list has been refreshed",
    color: "success",
  });
}

function handleDefiningCheckerUpdated() {
  definingCheckerToUpdate.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Defining Checker list has been refreshed",
    color: "success",
  });
}

function handleDefiningCheckerDeleted() {
  definingCheckerToDelete.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Defining Checker list has been refreshed",
    color: "success",
  });
}

function handleModalClose() {
  definingCheckerToUpdate.value = null;
  definingCheckerToDelete.value = null;
}
</script>

<template>
  <UDashboardPanel id="defining-checker">
    <template #header>
      <UDashboardNavbar title="Defining Checker">
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
      <div class="flex flex-wrap gap-4 mb-4">
        <USelect
          v-model="selectedEventId"
          :items="[{ id: null, name: 'All Events' }, ...availableEvents]"
          label-key="name"
          value-key="id"
          placeholder="Filter by event"
          class="max-w-xs"
          icon="i-lucide-filter"
        />

        <DefiningCheckerAddModal
          :events="availableEvents"
          @defining-checker-added="handleDefiningCheckerAdded"
        />
      </div>

      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-4">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search groups..."
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

      <div
        class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto"
      >
        <div class="text-sm text-muted">
          Showing {{ pagination.pageIndex * pagination.pageSize + 1 }} to
          {{
            Math.min(
              (pagination.pageIndex + 1) * pagination.pageSize,
              filteredData.length || 0,
            )
          }}
          of
          {{ filteredData.length || 0 }} groups
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

      <DefiningCheckerUpdateModal
        :defining-checker="definingCheckerToUpdate"
        :events="availableEvents"
        @defining-checker-updated="handleDefiningCheckerUpdated"
        @close="handleModalClose"
      />

      <DefiningCheckerDeleteModal
        :defining-checker="definingCheckerToDelete"
        @defining-checker-deleted="handleDefiningCheckerDeleted"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
