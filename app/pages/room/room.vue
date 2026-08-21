<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import { h } from "vue";
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";

interface AppRatingItem {
  rating?: {
    rating?: string;
  } | null;
}

interface ApplicationDocItem {
  userNik?: string;
  user?: {
    name?: string;
  } | null;
  appRatings?: AppRatingItem[];
}

interface EventUserItem {
  id: number;
  applicationDocs?: ApplicationDocItem | ApplicationDocItem[] | null;
  applicationDoc?: ApplicationDocItem | ApplicationDocItem[] | null;
  attendaces?:
    | {
        id?: number;
        eventUserId?: number;
        roomId?: number;
      }
    | {
        id?: number;
        eventUserId?: number;
        roomId?: number;
      }[]
    | null;
  attendances?:
    | {
        id?: number;
        eventUserId?: number;
        roomId?: number;
      }
    | {
        id?: number;
        eventUserId?: number;
        roomId?: number;
      }[]
    | null;
}

interface EventItem {
  id: number;
  event: string;
  eventUsers?: EventUserItem[];
}

interface EventGroupItem {
  id: number;
  events?: EventItem[];
}

interface EventUserOption {
  label: string;
  value: number;
}

interface RoomItem {
  id: number;
  name: string;
  startDate?: string | null;
  finishDate?: string | null;
  file?: string | null;
  attendances?: {
    id: number;
    eventUserId?: number;
    eventUser?: {
      id: number;
      applicationDocs?: ApplicationDocItem | ApplicationDocItem[] | null;
      applicationDoc?: ApplicationDocItem | ApplicationDocItem[] | null;
    } | null;
  }[];
}

interface ExaminationResponse {
  room?: RoomItem[];
  event?: EventGroupItem[] | EventItem[] | EventGroupItem | EventItem;
  events?: EventItem[] | EventItem;
  data?: {
    room?: RoomItem[];
    event?: EventGroupItem[] | EventItem[] | EventGroupItem | EventItem;
    events?: EventItem[] | EventItem;
  };
}

const { token } = useAuth();
const toast = useToast();
const table = useTemplateRef<any>("table");
const UButton = resolveComponent("UButton");
const isUpdateModalOpen = ref(false);
const selectedRoom = ref<RoomItem | null>(null);
const isDeleteModalOpen = ref(false);
const roomToDelete = ref<RoomItem | null>(null);
const isDeleting = ref(false);

const {
  data: apiResponse,
  status,
  refresh,
} = await useFetch<ExaminationResponse>(`${apiBaseUrl}/api/room`, {
  headers: {
    Authorization: token.value ? `Bearer ${token.value}` : "",
  },
});

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeEventUsers(value: unknown): EventUserItem[] {
  return toArray(value as EventUserItem | EventUserItem[])
    .map((item) => ({
      ...item,
      id: Number((item as any)?.id),
    }))
    .filter((item) => Number.isFinite(item.id) && item.id > 0);
}

function normalizeEvents(value: unknown): EventItem[] {
  return toArray(value as EventItem | EventItem[])
    .map((item) => ({
      ...item,
      id: Number((item as any)?.id),
      event: String((item as any)?.event || "").trim(),
      eventUsers: normalizeEventUsers(
        (item as any)?.eventUsers ?? (item as any)?.eventUser,
      ),
    }))
    .filter(
      (item) => Number.isFinite(item.id) && item.id > 0 && item.event.length > 0,
    );
}

function getFirstApplicationDoc(
  docs?: ApplicationDocItem | ApplicationDocItem[] | null,
): ApplicationDocItem | null {
  if (!docs) return null;
  return Array.isArray(docs) ? docs[0] || null : docs;
}

function hasAttendanceRecord(eventUser: EventUserItem): boolean {
  const attendaces = toArray(eventUser.attendaces as any);
  const attendances = toArray(eventUser.attendances as any);
  const records = [...attendaces, ...attendances];
  return records.some((item) => {
    const roomId = Number(item?.roomId);
    const attendanceId = Number(item?.id);
    const eventUserId = Number(item?.eventUserId);
    return (
      (Number.isFinite(roomId) && roomId > 0) ||
      (Number.isFinite(attendanceId) && attendanceId > 0) ||
      (Number.isFinite(eventUserId) && eventUserId > 0)
    );
  });
}

const rooms = computed<RoomItem[]>(() => {
  return toArray(apiResponse.value?.room || apiResponse.value?.data?.room);
});

const events = computed<EventItem[]>(() => {
  const groupedFromEvent = toArray(apiResponse.value?.event).flatMap((item) => {
    const group = item as any;
    return normalizeEvents(group?.events ?? group?.event);
  });
  const groupedFromDataEvent = toArray(apiResponse.value?.data?.event).flatMap(
    (item) => {
      const group = item as any;
      return normalizeEvents(group?.events ?? group?.event);
    },
  );

  const directEvents = [
    ...normalizeEvents(apiResponse.value?.events),
    ...normalizeEvents(apiResponse.value?.data?.events),
    ...normalizeEvents(apiResponse.value?.event),
    ...normalizeEvents(apiResponse.value?.data?.event),
  ];

  const unique = new Map<number, EventItem>();
  [...groupedFromEvent, ...groupedFromDataEvent, ...directEvents].forEach(
    (item) => {
      const existing = unique.get(item.id);
      const incomingUsers = normalizeEventUsers((item as any).eventUsers);
      if (!existing) {
        unique.set(item.id, {
          id: item.id,
          event: item.event,
          eventUsers: incomingUsers,
        });
        return;
      }

      const mergedUsersMap = new Map<number, EventUserItem>();
      normalizeEventUsers(existing.eventUsers).forEach((u) => {
        mergedUsersMap.set(u.id, u);
      });
      incomingUsers.forEach((u) => {
        mergedUsersMap.set(u.id, u);
      });

      unique.set(item.id, {
        id: item.id,
        event: existing.event || item.event,
        eventUsers: Array.from(mergedUsersMap.values()),
      });
    },
  );
  return Array.from(unique.values());
});

const eventUserOptions = computed<EventUserOption[]>(() => {
  const options = new Map<number, EventUserOption>();
  const assignedIds = new Set<number>();

  rooms.value.forEach((room) => {
    toArray(room.attendances).forEach((attendance) => {
      const idFromEventUser = Number(attendance?.eventUser?.id);
      const idFromAttendance = Number(attendance?.eventUserId);
      if (Number.isFinite(idFromEventUser) && idFromEventUser > 0) {
        assignedIds.add(idFromEventUser);
      } else if (Number.isFinite(idFromAttendance) && idFromAttendance > 0) {
        assignedIds.add(idFromAttendance);
      }
    });
  });

  events.value.forEach((eventItem) => {
    normalizeEventUsers((eventItem as any).eventUsers).forEach((eventUser) => {
      const eventUserId = Number(eventUser.id);
      if (!eventUserId) return;
      if (assignedIds.has(eventUserId)) return;
      if (hasAttendanceRecord(eventUser)) {
        assignedIds.add(eventUserId);
        return;
      }

      const appDoc = getFirstApplicationDoc(eventUser.applicationDocs);
      const fallbackDoc = getFirstApplicationDoc(eventUser.applicationDoc);
      const name =
        appDoc?.user?.name ||
        fallbackDoc?.user?.name ||
        appDoc?.userNik ||
        fallbackDoc?.userNik ||
        "Unknown";
      const activeDoc = appDoc || fallbackDoc;
      const ratings = toArray(activeDoc?.appRatings)
        .map((item) => item?.rating?.rating || "")
        .filter(Boolean)
        .join(", ");

      options.set(eventUserId, {
        value: eventUserId,
        label: `${name} [${ratings || "-"}]`,
      });
    });
  });

  return Array.from(options.values());
});

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getAttendanceLabels(attendances?: RoomItem["attendances"]): string[] {
  if (!attendances || attendances.length === 0) return [];

  return attendances
    .map((attendance) => {
      const appDoc = getFirstApplicationDoc(attendance.eventUser?.applicationDocs);
      const fallbackDoc = getFirstApplicationDoc(attendance.eventUser?.applicationDoc);
      const activeDoc = appDoc || fallbackDoc;
      const name =
        activeDoc?.user?.name || activeDoc?.userNik || "Unknown";
      const ratings = toArray(activeDoc?.appRatings)
        .map((item) => item.rating?.rating)
        .filter(Boolean)
        .join(", ");

      return `${name} [${ratings || "-"}]`;
    })
    .filter(Boolean);
}

function onRoomAdded() {
  refresh();
}

function openUpdateModal(room: RoomItem) {
  selectedRoom.value = room;
  isUpdateModalOpen.value = true;
}

function onRoomUpdated() {
  isUpdateModalOpen.value = false;
  selectedRoom.value = null;
  refresh();
}

function openDeleteModal(room: RoomItem) {
  roomToDelete.value = room;
  isDeleteModalOpen.value = true;
}

async function deleteRoom() {
  if (!roomToDelete.value?.id) {
    toast.add({
      title: "Error",
      description: "Room ID is missing",
      color: "error",
    });
    return;
  }

  try {
    isDeleting.value = true;

    await $fetch(`${apiBaseUrl}/api/room/${roomToDelete.value.id}`, {
      method: "DELETE",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: "Room has been deleted successfully",
      color: "success",
    });

    isDeleteModalOpen.value = false;
    roomToDelete.value = null;
    refresh();
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error?.data?.message || "Failed to delete room",
      color: "error",
    });
  } finally {
    isDeleting.value = false;
  }
}

const columns: TableColumn<RoomItem>[] = [
  {
    id: "no",
    header: "No",
    cell: ({ row }) => {
      const pageIndex =
        table.value?.tableApi?.getState().pagination.pageIndex || 0;
      const pageSize =
        table.value?.tableApi?.getState().pagination.pageSize || 10;
      return pageIndex * pageSize + row.index + 1;
    },
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) =>
      h(
        "span",
        { class: "font-medium text-highlighted" },
        row.original.name || "-",
      ),
  },
  {
    accessorKey: "startDate",
    header: "Start date",
    cell: ({ row }) => formatDate(row.original.startDate),
  },
  {
    accessorKey: "finishDate",
    header: "Finish date",
    cell: ({ row }) => formatDate(row.original.finishDate),
  },
  {
    id: "attendance",
    header: "Attendance",
    cell: ({ row }) => {
      const labels = getAttendanceLabels(row.original.attendances);
      if (!labels.length) return h("span", { class: "text-muted" }, "-");

      return h(
        "ul",
        { class: "list-disc list-inside space-y-0.5" },
        labels.map((label, index) => h("li", { key: index }, label)),
      );
    },
  },
  {
    id: "file",
    header: "File",
    cell: ({ row }) => {
      const filePath = row.original.file;
      if (!filePath || filePath === "null") {
        return h("span", { class: "text-muted" }, "-");
      }

      const fileUrl = filePath.startsWith("/")
        ? `${apiBaseUrl}${filePath}`
        : filePath;
      const viewerUrl = `/file/view?url=${encodeURIComponent(fileUrl)}`;

      return h(UButton, {
        icon: "i-lucide-eye",
        color: "primary",
        variant: "soft",
        size: "md",
        to: viewerUrl,
      });
    },
  },
  {
    id: "action",
    header: "Action",
    cell: ({ row }) => {
      return h("div", { class: "flex items-center gap-2" }, [
        h(UButton, {
          icon: "i-lucide-pencil",
          color: "primary",
          variant: "soft",
          size: "md",
          onClick: () => openUpdateModal(row.original),
        }),
        h(UButton, {
          icon: "i-lucide-trash-2",
          color: "error",
          variant: "soft",
          size: "md",
          onClick: () => openDeleteModal(row.original),
        }),
      ]);
    },
  },
];

const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});
</script>

<template>
  <UDashboardPanel id="room-management">
    <template #header>
      <UDashboardNavbar title="Room Management">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex items-center justify-between gap-2 mb-4">
        <RoomAddModal
          :events="events"
          :event-user-options="eventUserOptions"
          @room-added="onRoomAdded"
        />
        <UButton
          label="Refresh"
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :loading="status === 'pending'"
          @click="refresh"
        />
      </div>

      <UTable
        ref="table"
        v-model:pagination="pagination"
        :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
        :data="rooms"
        :columns="columns"
        :loading="status === 'pending'"
      />

      <div
        v-if="status === 'success' && rooms.length === 0"
        class="text-sm text-muted text-center py-6"
      >
        No room data available.
      </div>

      <RoomUpdateModal
        v-model:open="isUpdateModalOpen"
        :room="selectedRoom"
        :events="events"
        :event-user-options="eventUserOptions"
        @room-updated="onRoomUpdated"
      />

      <RoomDeleteModal
        v-model:open="isDeleteModalOpen"
        :room="roomToDelete"
        :loading="isDeleting"
        @submit="deleteRoom"
      />
    </template>
  </UDashboardPanel>
</template>
