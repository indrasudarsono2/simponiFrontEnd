<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import ip from "../../utils/config.json";
const { token } = useAuth();
const UButton = resolveComponent("UButton");

// Define MultipleChoice interface based on multipleChoice.json structure
interface MultipleChoice {
  id: number;
  branchUnitId?: number;
  question: string;
  a: string;
  b: string;
  c: string;
  d: string;
  image: string;
  key: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: null | string;
}

interface ApiResponse {
  multipleChoice: MultipleChoice[];
  sector: {
    id: number;
    sector: string;
    subBranchUnitRatings: { id: number }[];
    branchUnit: {
      unit: string;
      branch: {
        branch: string;
      };
    };
  }[];
}

const toast = useToast();
const table = useTemplateRef("table");
const isImagePreviewOpen = ref(false);
const previewImageSrc = ref("");

// State for modals
const selectedQuestion = ref<MultipleChoice | null>(null);
const questionToUpdate = ref<MultipleChoice | null>(null);
const questionToDelete = ref<MultipleChoice | null>(null);

// Table state
const columnFilters = ref([
  {
    id: "question",
    value: "",
  },
]);
const columnVisibility = ref();
const rowSelection = ref({});

// Fetch multiple choice questions data
const { data, status, refresh } = await useFetch<ApiResponse>(
  `http://${ip.ipBackEnd}/api/multipleChoices`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Context derived from API response
const currentBranch = computed(
  () => data.value?.sector?.[0]?.branchUnit?.branch?.branch || "-",
);
const currentBranchUnit = computed(
  () => data.value?.sector?.[0]?.branchUnit?.unit || "-",
);

// Action handlers
function handleEdit(item: MultipleChoice) {
  questionToUpdate.value = item;
}

function handleDelete(item: MultipleChoice) {
  questionToDelete.value = item;
}

// Truncate long text for display
function truncateText(text: string, maxLength: number = 100) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

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

function downloadMultipleChoiceCsv() {
  const questions = data.value?.multipleChoice || [];
  const rows = [
    ["multipleChoiceId", "question", "a", "b", "c", "d", "key"],
    ...questions.map((question) => [
      question.id,
      question.question || "",
      question.a || "",
      question.b || "",
      question.c || "",
      question.d || "",
      question.key || "",
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
  link.download = `multiple-choice-questions-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Table columns definition
const columns: TableColumn<MultipleChoice>[] = [
  {
    id: "no",
    header: "NO",
    cell: ({ row }) => {
      const pageIndex =
        table.value?.tableApi?.getState().pagination.pageIndex || 0;
      const pageSize =
        table.value?.tableApi?.getState().pagination.pageSize || 10;
      // Get rows on current page and find relative index using original data id
      const pageRows =
        table.value?.tableApi?.getPaginationRowModel().rows || [];
      const relativeIndex = pageRows.findIndex(
        (r) => r.original.id === row.original.id,
      );
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
        label: "Multiple Choice Question",
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
          "font-medium text-highlighted max-w-md whitespace-normal break-words py-2",
        innerHTML: truncateHtml(row.original.question, 150),
      });
    },
  },
  {
    accessorKey: "a",
    header: "A",
    cell: ({ row }) => {
      return h("div", {
        class: "text-sm max-w-xs whitespace-normal break-words py-2",
        innerHTML: truncateHtml(row.original.a, 50),
      });
    },
  },
  {
    accessorKey: "b",
    header: "B",
    cell: ({ row }) => {
      return h("div", {
        class: "text-sm max-w-xs whitespace-normal break-words py-2",
        innerHTML: truncateHtml(row.original.b, 50),
      });
    },
  },
  {
    accessorKey: "c",
    header: "C",
    cell: ({ row }) => {
      return h("div", {
        class: "text-sm max-w-xs whitespace-normal break-words py-2",
        innerHTML: truncateHtml(row.original.c, 50),
      });
    },
  },
  {
    accessorKey: "d",
    header: "D",
    cell: ({ row }) => {
      return h("div", {
        class: "text-sm max-w-xs whitespace-normal break-words py-2",
        innerHTML: truncateHtml(row.original.d, 50),
      });
    },
  },
  {
    accessorKey: "key",
    header: "Key",
    cell: ({ row }) => {
      return h("div", {
        class: "text-sm max-w-xs whitespace-normal break-words py-2",
        innerHTML: truncateHtml(row.original.key),
      });
    },
  },
  {
    accessorKey: "image",
    header: "Image",
    cell: ({ row }) => {
      if (hasImage(row.original.image)) {
        return h("div", { class: "py-2" }, [
          h(
            "button",
            {
              type: "button",
              class:
                "rounded focus:outline-none focus:ring-2 focus:ring-primary/60",
              onClick: () => openImagePreview(row.original.image),
            },
            [
              h("img", {
                src: resolveImageUrl(row.original.image),
                alt: "Question image",
                class:
                  "h-16 w-24 rounded border border-default object-cover bg-muted/20 cursor-zoom-in",
                loading: "lazy",
              }),
            ],
          ),
        ]);
      }
      return h("span", { class: "text-xs text-muted" }, "No image");
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
const pageSizeStorageKey = "multiple-choice-question-page-size";

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
function handleQuestionAdded() {
  refresh();
  toast.add({
    title: "Success",
    description: "Question list has been refreshed",
    color: "success",
  });
}

function handleQuestionUpdated() {
  questionToUpdate.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Question list has been refreshed",
    color: "success",
  });
}

function handleQuestionDeleted() {
  questionToDelete.value = null;
  refresh();
  toast.add({
    title: "Success",
    description: "Question list has been refreshed",
    color: "success",
  });
}

function handleModalClose() {
  questionToUpdate.value = null;
  questionToDelete.value = null;
}
</script>

<template>
  <UDashboardPanel id="multiple-choice-question">
    <template #header>
      <UDashboardNavbar title="Multiple Choice Questions">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <MultipleChoiceImportCsvModal
              @question-imported="handleQuestionAdded"
            />
            <MultipleChoiceAddModal @question-added="handleQuestionAdded" />
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
            :disabled="!(data?.multipleChoice?.length)"
            @click="downloadMultipleChoiceCsv"
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
        :data="data?.multipleChoice || []"
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
      />

      <div
        class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto"
      >
        <div class="text-sm text-muted">
          Showing {{ pagination.pageIndex * pagination.pageSize + 1 }} to
          {{
            Math.min(
              (pagination.pageIndex + 1) * pagination.pageSize,
              data?.multipleChoice?.length || 0,
            )
          }}
          of
          {{ data?.multipleChoice?.length || 0 }} questions
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
      <MultipleChoiceUpdateModal
        :question="questionToUpdate"
        @question-updated="handleQuestionUpdated"
        @close="handleModalClose"
      />

      <!-- Delete Modal -->
      <MultipleChoiceDeleteModal
        :question="questionToDelete"
        @question-deleted="handleQuestionDeleted"
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
              alt="Question image preview"
              class="max-h-[75vh] w-auto rounded border border-default"
            />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
