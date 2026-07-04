<script setup lang="ts">
import { h } from "vue";
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import ip from "../../utils/config.json";
import { useApplicationDocStore } from "../../stores/applicationDoc";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

/* =======================
   Types based on API response
======================= */
interface EventItem {
  id: number;
  event: string;
  remarkDoc: {
    remark: string;
  };
  startDate: string;
  finishDate: string;
  passingGrade: number;
  isPractical: boolean;
  isSimulator: boolean;
  eventUsers: {
    id: number;
    userNik: string;
    applicationDocs?: {
      id: number;
    };
  }[];
}

interface LicenseItem {
  id: number;
  userNik: string;
  note: string;
  file: string;
  expiredDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface LogbookItem {
  id: number;
  userNik: string;
  note: string;
  file: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface MedexItem {
  id: number;
  isConfirmed: boolean;
  institution: string;
  userNik: string;
  released: string;
  expired: string | null;
  examiner: string;
  file: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface IelpItem {
  id: number;
  isConfirmed: boolean;
  userNik: string;
  released: string;
  expired: string | null;
  rater: string;
  institution: string;
  level: string;
  file: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface CompetenceItem {
  id: number;
  userId: string;
  ratingId: number;
  institution: string;
  released: string;
  file: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface RatingItem {
  id: number;
  professionId: number;
  rating: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface UserData {
  nik: string;
  licenseUserId: string;
  professionInBranchId: number;
  sectorId: number;
  branchId: number;
  branchUnitId: number;
  name: string;
  password: string;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  personalAddress: string | null;
  nationality: string | null;
  phoneNumber: string | null;
  genderId: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  ielp: IelpItem[];
  medex: MedexItem[];
  logbookUsers: LogbookItem[];
  license: LicenseItem[];
  competences: CompetenceItem[];
}

interface ApiResponse {
  event: EventItem[];
  applicationDoc: ApplicationDoc[];
  user: UserData | null;
  rating: RatingItem[];
  ratingReal: RatingItem[];
}

interface AppRating {
  id?: number;
  rating: { id: number; rating: string };
  controlHour: string;
  statusId?: number;
}

interface ApplicationDoc {
  id: number;
  doc?: string | null;
  number: string;
  eventUserId?: number;
  userNik?: string;
  statusId?: number;
  medexId?: number;
  ielpId?: number;
  briefingDate?: string | null;
  confirmRating?: boolean;
  reason?: string;
  location?: string;
  rating?: string;
  dateForExpired?: string;
  confirmOjt?: boolean;
  ojtNik?: string | null;
  letterNumber?: string | null;
  letterDate?: string | null;
  controlHour?: string | null;
  atsName?: string;
  address?: string;
  isDrugs?: boolean;
  isFailed?: boolean;
  licenseId?: number;
  logbookUserId?: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  eventUser?: {
    id: number;
    eventId: number;
    userNik: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    event?: {
      id: number;
      sessionId: number;
      sectorId: number;
      remarkDocId: number;
      event: string;
      formFillingDate: string;
      startDate: string;
      finishDate: string;
      forExpiredDate: string;
      briefingFile: string;
      passingGrade: number;
      isPractical: boolean;
      isSimulator: boolean;
      createdAt: string;
      updatedAt: string;
      deletedAt: string | null;
      remarkDoc?: {
        remark: string;
      };
    };
  };
  medex?: {
    id: number;
    isConfirmed: boolean;
    institution: string;
    userNik: string;
    released: string;
    expired: string | null;
    examiner: string;
    file: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  ielp?: {
    id: number;
    isConfirmed: boolean;
    userNik: string;
    released: string;
    expired: string | null;
    rater: string;
    institution: string;
    level: string;
    file: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  status?: {
    id: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  appRatings?: AppRating[];
  verifications?: {
    id: number;
    applicationDocId: number;
    verifiedBy: string;
    verifiedAt: string;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  } | null;
}

/* =======================
   State
======================= */
const toast = useToast();
const table = useTemplateRef<any>("table");

const applicationDocToUpdate = ref<ApplicationDoc | null>(null);
const applicationDocToDelete = ref<ApplicationDoc | null>(null);

const searchQuery = ref("");
const columnFilters = ref([{ id: "number", value: "" }]);
const rowSelection = ref({});
const pagination = ref({ pageIndex: 0, pageSize: 10 });

/* =======================
   Watchers
======================= */
watch(
  searchQuery,
  useDebounceFn((value: string) => {
    columnFilters.value = [{ id: "number", value }];
  }, 300),
);

/* =======================
   Store & Data Fetch
======================= */
const store = useApplicationDocStore();

const {
  data: apiResponse,
  status,
  refresh,
} = await useFetch<ApiResponse>(
  `http://${ip.ipBackEnd}/api/applicationDocument`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Save to store when data is fetched
watch(
  apiResponse,
  (newValue) => {
    if (newValue) {
      store.setApiResponse(newValue as any);
    }
  },
  { immediate: true },
);

// Computed data for table (from store)
const data = computed(() => store.applicationDocs);

// Computed data for AddModal (from store)
const events = computed(() => store.events);
const user = computed(() => store.user);
const ratings = computed(() => store.ratings);
const ratingReal = computed(() => store.ratingReal);

/* =======================
   Actions
======================= */
function handleEdit(doc: ApplicationDoc) {
  applicationDocToUpdate.value = doc;
}

function handleDelete(doc: ApplicationDoc) {
  applicationDocToDelete.value = doc;
}

function handleModalClose() {
  applicationDocToUpdate.value = null;
  applicationDocToDelete.value = null;
}

function handleApplicationDocAdded() {
  refresh();
}

function handleApplicationDocUpdate() {
  refresh();
  handleModalClose();
  toast.add({
    title: "Success",
    description: "Application document has been refreshed",
    color: "success",
  });
}

function handleApplicationDocDeleted() {
  refresh();
  handleModalClose();
  toast.add({
    title: "Success",
    description: "Application document has been refreshed",
    color: "success",
  });
}

/* =======================
   Helpers
======================= */
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const datePart = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const timePart = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return `${datePart} ${timePart}`;
}

function isExpiredDate(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr + "T23:59:59") < new Date();
}

/* =======================
   Columns
======================= */
import type { Row, Column } from "@tanstack/table-core";

const columns = computed((): any[] => [
  {
    id: "no",
    header: "NO",
    cell: ({ row }: { row: Row<ApplicationDoc> }) => {
      const pageIndex =
        table.value?.tableApi?.getState().pagination.pageIndex || 0;
      const pageSize =
        table.value?.tableApi?.getState().pagination.pageSize || 10;
      return pageIndex * pageSize + row.index + 1;
    },
  },
  {
    accessorKey: "number",
    header: ({ column }: { column: Column<ApplicationDoc, unknown> }) =>
      h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Number",
        icon: column.getIsSorted()
          ? column.getIsSorted() === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : "i-lucide-arrow-down-wide-narrow"
          : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      }),
    cell: ({ row }: { row: Row<ApplicationDoc> }) =>
      h(
        "div",
        { class: "font-medium text-highlighted text-xs" },
        row.original.number,
      ),
  },
  {
    id: "event",
    header: "Event",
    cell: ({ row }: { row: Row<ApplicationDoc> }) => {
      const eventName = row.original.eventUser?.event?.event || "-";
      const remark = row.original.eventUser?.event?.remarkDoc?.remark;
      return h("div", { class: "space-y-1" }, [
        h("p", { class: "text-sm font-medium" }, eventName),
        remark
          ? h(
              "span",
              {
                class:
                  "text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary",
              },
              remark,
            )
          : null,
      ]);
    },
  },
  {
    id: "appRatings",
    header: "Rating",
    cell: ({ row }: { row: Row<ApplicationDoc> }) => {
      const ratings = row.original.appRatings || [];
      if (ratings.length === 0) {
        return h("span", { class: "text-muted text-sm" }, "-");
      }
      return h(
        "ul",
        { class: "list-disc list-inside text-sm space-y-0.5" },
        ratings.map((r: AppRating) =>
          h(
            "li",
            {
              class: "text-primary",
            },
            `${r.rating.rating} (${r.controlHour})`,
          ),
        ),
      );
    },
  },
  {
    id: "status",
    header: "Status",

    cell: ({ row }: { row: Row<ApplicationDoc> }) => {
      const status = row.original.status?.status;
      return h(
        "span",
        {
          class: `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            status === "REGISTERED"
              ? "bg-blue-100 text-blue-700"
              : status === "APPROVED"
                ? "bg-green-100 text-green-700"
                : status === "REJECTED"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-700"
          }`,
        },
        status || "-",
      );
    },
  },
  {
    id: "medexExpired",
    header: "Medex Expired",
    cell: ({ row }: { row: Row<ApplicationDoc> }) =>
      h(
        "div",
        {
          class: isExpiredDate(row.original.medex?.expired)
            ? "text-error text-sm"
            : "text-muted text-sm",
        },
        formatDate(row.original.medex?.expired),
      ),
  },
  {
    id: "ielpExpired",
    header: "IELP Expired",
    cell: ({ row }: { row: Row<ApplicationDoc> }) =>
      h(
        "div",
        {
          class: isExpiredDate(row.original.ielp?.expired)
            ? "text-error text-sm"
            : "text-muted text-sm",
        },
        formatDate(row.original.ielp?.expired),
      ),
  },
  {
    id: "verification",
    header: "Verification",
    cell: ({ row }: { row: Row<ApplicationDoc> }) => {
      const verification = row.original.verifications;
      if (!verification) {
        return h("span", { class: "text-muted text-sm" }, "-");
      }
      return h("div", { class: "space-y-1" }, [
        h("p", { class: "text-xs font-medium text-success" }, "Verified UTC"),
        h(
          "p",
          { class: "text-xs text-muted" },
          formatDateTime(verification.updatedAt),
        ),
      ]);
    },
  },
  {
    id: "briefingDate",
    header: "Briefing Date",
    cell: ({ row }: { row: Row<ApplicationDoc> }) =>
      h(
        "div",
        { class: "text-muted text-sm" },
        formatDate(row.original.briefingDate),
      ),
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }: { row: Row<ApplicationDoc> }) => {
      const buttons = [
        h(UButton, {
          icon: "i-lucide-file-text",
          color: "info",
          variant: "soft",
          size: "sm",
          to: `/applicationDoc/${row.original.id}`,
        }),
      ];

      // Only show update button if verification is null
      if (!row.original.verifications) {
        buttons.push(
          h(UButton, {
            icon: "i-lucide-pencil",
            color: "primary",
            variant: "soft",
            size: "sm",
            onClick: () => handleEdit(row.original),
          }),
        );
      }

      buttons.push(
        h(UButton, {
          icon: "i-lucide-trash-2",
          color: "error",
          variant: "soft",
          size: "sm",
          onClick: () => handleDelete(row.original),
        }),
      );

      return h("div", { class: "flex items-center gap-2" }, buttons);
    },
  },
]);
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Application Document">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <UInput
          v-model="searchQuery"
          placeholder="Search application number..."
          class="max-w-sm"
          icon="i-lucide-search"
        />

        <ApplicationDocAddModal
          v-if="events.length != 0"
          :events="events"
          :user="user"
          :ratings="ratings"
          :ratingReal="ratingReal"
          @applicationDoc-added="handleApplicationDocAdded"
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
        v-if="data && data.length"
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:row-selection="rowSelection"
        v-model:pagination="pagination"
        :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
        :data="data"
        :columns="columns"
        :loading="status === 'pending'"
      />

      <div
        v-else-if="status === 'success'"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <UIcon name="i-lucide-file-x" class="text-4xl text-muted mb-4" />
        <p class="text-muted font-medium">No application documents yet</p>
        <p class="text-sm text-muted mt-1">
          Click "Create Application" to create a new document
        </p>
      </div>

      <ApplicationDocUpdateModal
        :applicationDoc="applicationDocToUpdate"
        :events="events"
        :ratings="ratings"
        :ratingReal="ratingReal"
        :user="user"
        @applicationDoc-updated="handleApplicationDocUpdate"
        @close="handleModalClose"
      />

      <ApplicationDocDeleteModal
        :applicationDoc="applicationDocToDelete"
        @applicationDoc-deleted="handleApplicationDocDeleted"
        @close="handleModalClose"
      />
    </template>
  </UDashboardPanel>
</template>
