<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import ip from "../../utils/config.json";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

// Define Essay interface based on essay.json structure
interface Essay {
  id: number;
  branchUnitId: number;
  question: string;
  answer: string;
  image?: string | null;
  value: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: null | string;
}

interface ApiResponse {
  branchUnit: {
    unit: string;
    branch: {
      branch: string;
    };
  };
  essay: Essay[];
}

const toast = useToast();
const table = useTemplateRef("table");
const isImagePreviewOpen = ref(false);
const previewImageSrc = ref("");

// State for modals
const selectedEssay = ref<Essay | null>(null);
const essayToUpdate = ref<Essay | null>(null);
const essayToDelete = ref<Essay | null>(null);

// Table state
const columnFilters = ref([
  {
    id: "question",
    value: "",
  },
]);
const columnVisibility = ref();
const rowSelection = ref({});

// Fetch essays data
const { data, status, refresh } = await useFetch<ApiResponse>(
  `http://${ip.ipBackEnd}/api/essays`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Context derived from API response
const currentBranch = computed(
  () => data.value?.branchUnit?.branch?.branch || "-",
);
const currentBranchUnit = computed(() => data.value?.branchUnit?.unit || "-");

// Action handlers
function handleEdit(item: Essay) {
  essayToUpdate.value = item;
}

function handleDelete(item: Essay) {
  essayToDelete.value = item;
}

// Truncate long text for display (preserves HTML)
function truncateHtml(html: string, maxLength: number = 100) {
  if (html.length <= maxLength) return html;
  return html.substring(0, maxLength) + "...";
}

function hasImage(imagePath?: string | null): boolean {
  return typeof imagePath === "string" && imagePath.trim() !== "";
}

function resolveImageUrl(imagePath?: string | null): string {
  const trimmed = (imagePath || "").trim();
  if (!trimmed) return "";
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  if (/^(data|blob):/i.test(trimmed)) return trimmed;
  return `http://${ip.ipBackEnd}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

function openImagePreview(imagePath?: string | null) {
  if (!hasImage(imagePath)) return;
  previewImageSrc.value = resolveImageUrl(imagePath);
  isImagePreviewOpen.value = true;
}

function escapeCsvCell(value: string | number | null | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadEssayCsv() {
  const essays = data.value?.essay || [];
  const rows = [
    ["essayId", "question", "answer", "value"],
    ...essays.map((essay) => [
      essay.id,
      essay.question || "",
      essay.answer || "",
      essay.value || "",
    ]),
  ];
  const csv = rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `essay-questions-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Table columns definition
const columns: TableColumn<Essay>[] = [
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
    accessorKey: "question",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Essay Question",
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
      return h("div", {
        class:
          "w-full font-medium text-highlighted whitespace-normal break-words py-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1",
        innerHTML: truncateHtml(row.original.question, 500),
      });
    },
  },
  {
    accessorKey: "answer",
    header: "Answer",
    cell: ({ row }) => {
      return h("div", {
        class:
          "w-full text-muted text-sm whitespace-normal break-words py-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1",
        innerHTML: truncateHtml(row.original.answer, 500),
      });
    },
  },
  {
    accessorKey: "image",
    header: "Image",
  },
  {
    accessorKey: "value",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Score",
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
        { class: "text-center font-semibold text-primary" },
        row.original.value.toString(),
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
      (table.value?.tableApi
        ?.getColumn("question")
        ?.getFilterValue() as string) || ""
    );
  },
  set: (value: string) => {
    table.value?.tableApi
      ?.getColumn("question")
      ?.setFilterValue(value || undefined);
  },
});

// Pagination state
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

const pageSizeOptions = [
  { label: "10 / page", value: 10 },
  { label: "20 / page", value: 20 },
  { label: "50 / page", value: 50 },
  { label: "100 / page", value: 100 },
];
const pageSizeStorageKey = "essay-question-page-size";

function sanitizePageSize(value: unknown): number {
  const next = Number(value);
  const allowed = pageSizeOptions.map((item) => item.value);
  return allowed.includes(next) ? next : 10;
}

const selectedPageSize = computed({
  get: () => pagination.value.pageSize,
  set: (value: number) => {
    const next = sanitizePageSize(value);
    pagination.value.pageSize = next;
    pagination.value.pageIndex = 0;
    table.value?.tableApi?.setPageSize(next);
    table.value?.tableApi?.setPageIndex(0);
  },
});

onMounted(() => {
  const saved = sanitizePageSize(localStorage.getItem(pageSizeStorageKey));
  selectedPageSize.value = saved;
});

watch(
  () => pagination.value.pageSize,
  (size) => {
    if (!import.meta.client) return;
    localStorage.setItem(pageSizeStorageKey, String(sanitizePageSize(size)));
  },
);

// Handle modal events
function handleEssayAdded() {
  refresh();
  toast.add({
    title: "Success",
    description: "Essay list has been refreshed",
    color: "success",
  });
}

function handleEssayUpdated() {
  essayToUpdate.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Essay list has been refreshed",
    color: "success",
  });
}

function handleEssayDeleted() {
  essayToDelete.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Essay list has been refreshed",
    color: "success",
  });
}

function handleModalClose() {
  essayToUpdate.value = null;
  essayToDelete.value = null;
}
</script>

<template>
  <UDashboardPanel id="essay-essay">
    <template #header>
      <UDashboardNavbar title="Essay Questions">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <EssayImportCsvModal @essay-imported="handleEssayAdded" />
            <EssayAddModal @essay-added="handleEssayAdded" />
          </div>
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
            <span class="font-medium">{{ currentBranch }}</span>
          </div>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-square-chart-gantt" class="text-muted" />
            <span class="text-muted">Branch Unit:</span>
            <span class="font-medium">{{ currentBranchUnit }}</span>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-4">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Search questions..."
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <USelect
            v-model="selectedPageSize"
            :items="pageSizeOptions"
            label-key="label"
            value-key="value"
            class="w-28"
          />
          <UButton
            label="Refresh"
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            @click="refresh"
          />
          <UButton
            label="Download CSV"
            color="neutral"
            variant="outline"
            icon="i-lucide-download"
            :disabled="!(data?.essay?.length)"
            @click="downloadEssayCsv"
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
        :data="data?.essay || []"
        :columns="columns"
        :loading="status === 'pending'"
        :ui="{
          base: 'table-auto border-collapse border border-default',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b',
          th: 'border border-default px-3 py-2',
          td: 'border border-default align-top px-3 py-2',
          separator: 'h-0',
        }"
      >
        <template #image-cell="{ row }">
          <div class="py-2">
            <template v-if="hasImage(row.original.image)">
              <button
                type="button"
                class="rounded focus:outline-none focus:ring-2 focus:ring-primary/60"
                @click="openImagePreview(row.original.image)"
              >
                <img
                  :src="resolveImageUrl(row.original.image)"
                  alt="Essay image"
                  class="h-16 w-24 rounded border border-default object-cover bg-muted/20 cursor-zoom-in"
                  loading="lazy"
                />
              </button>
            </template>
            <span v-else class="text-xs text-muted">No image</span>
          </div>
        </template>
      </UTable>

      <div
        class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto"
      >
        <div class="text-sm text-muted">
          Showing {{ pagination.pageIndex * pagination.pageSize + 1 }} to
          {{
            Math.min(
              (pagination.pageIndex + 1) * pagination.pageSize,
              data?.essay?.length || 0,
            )
          }}
          of
          {{ data?.essay?.length || 0 }} essays
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
      <EssayUpdateModal
        :essay="essayToUpdate"
        @essay-updated="handleEssayUpdated"
        @close="handleModalClose"
      />

      <!-- Delete Modal -->
      <EssayDeleteModal
        :essay="essayToDelete"
        @essay-deleted="handleEssayDeleted"
        @close="handleModalClose"
      />

      <UModal
        v-model:open="isImagePreviewOpen"
        title="Image Preview"
        :ui="{ content: 'max-w-4xl' }"
      >
        <template #body>
          <div class="flex items-center justify-center">
            <img
              :src="previewImageSrc"
              alt="Essay image preview"
              class="max-h-[75vh] w-auto rounded border border-default"
            />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
