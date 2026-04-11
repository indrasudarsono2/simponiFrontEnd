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
  // {
  //   accessorKey: "key",
  //   header: ({ column }) => {
  //     const isSorted = column.getIsSorted();
  //     return h(UButton, {
  //       color: "neutral",
  //       variant: "ghost",
  //       label: "Key",
  //       icon: isSorted
  //         ? isSorted === "asc"
  //           ? "i-lucide-arrow-up-narrow-wide"
  //           : "i-lucide-arrow-down-wide-narrow"
  //         : "i-lucide-arrow-up-down",
  //       class: "-mx-2.5",
  //       // onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
  //     });
  //   },
  //   cell: ({ row }) => {
  //     return h(
  //       "div",
  //       { class: "text-center font-bold text-success" },
  //       row.original.key,
  //     );
  //   },
  // },
  // {
  //   accessorKey: "key",
  //   header: ({ column }) => {
  //     const isSorted = column.getIsSorted();
  //     return h(UButton, {
  //       color: "neutral",
  //       variant: "ghost",
  //       label: "Key",
  //       icon: isSorted
  //         ? isSorted === "asc"
  //           ? "i-lucide-arrow-up-narrow-wide"
  //           : "i-lucide-arrow-down-wide-narrow"
  //         : "i-lucide-arrow-up-down",
  //       class: "-mx-2.5",
  //     });
  //   },
  //   cell: ({ row }) => {
  //     return h(
  //       "div",
  //       { class: "text-center font-bold text-success" },
  //       row.original.key,
  //     );
  //   },
  // },
  {
    accessorKey: "image",
    header: "Image",
    cell: ({ row }) => {
      if (row.original.image && row.original.image.trim() !== "") {
        return h("div", { class: "flex items-center justify-center" }, [
          h("img", {
            src: row.original.image,
            alt: "Question image",
            class: "h-12 w-12 object-cover rounded border border-default",
            onError: (e: Event) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
            },
          }),
        ]);
      }
      return h("span", { class: "text-muted text-sm" }, "");
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
          <MultipleChoiceAddModal @question-added="handleQuestionAdded" />
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
        :data="data?.multipleChoice || []"
        :columns="columns"
        :loading="status === 'pending'"
        :ui="{
          base: 'table-auto border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default align-top',
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
    </template>
  </UDashboardPanel>
</template>
