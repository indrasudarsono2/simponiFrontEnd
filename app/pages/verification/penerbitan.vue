<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";

const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");

// Types
interface MemberData {
  nik: string;
  licenseUserId: string;
  dateOfBirth: string;
  placeOfBirth: string;
  personalAddress: string;
  nationality: string;
  phoneNumber: string;
  gender: { id: string; gender: string };
  email: string;
  name: string;
}

interface GroupMember {
  id: string;
  member: string | MemberData;
  verification?: {
    id: string;
    applicationDoc: {
      id: string;
      number: string;
    };
    verificationData: string;
    isValid: boolean;
  };
}

interface PenerbitanItem {
  id: string;
  event: string;
  start: string;
  finish: string;
  checkerGroup: string[];
  groupMember: GroupMember[];
  sector?: string;
  session?: string;
  branchUnit?: string;
  branch?: string;
  region?: string;
}

const toast = useToast();
const table = useTemplateRef("table");

// Table state
const columnFilters = ref([
  {
    id: "event",
    value: "",
  },
]);
const columnVisibility = ref();
const rowSelection = ref({});
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

// Fetch penerbitan data
const { data, status, refresh } = await useFetch<PenerbitanItem[]>(
  "/api/penerbitan",
  {
    lazy: true,
    default: () => [],
  },
);

// Helper to get member name (handles both string and object)
function getMemberName(member: string | MemberData): string {
  if (typeof member === "string") {
    return member;
  }
  return member.name || "Unknown";
}

// Helper to get member ID for verification (use nik if object)
function getMemberId(member: GroupMember): string {
  if (typeof member.member === "object" && member.member !== null) {
    return (member.member as MemberData).nik || member.id;
  }
  return member.id;
}

// Action handlers
function handleView(member: GroupMember) {
  if (member.verification?.applicationDoc?.id) {
    const url = `/verification/view/${member.verification.applicationDoc.id}`;
    window.open(url, "_blank");
  } else {
    toast.add({
      title: "Dokumen Tidak Tersedia",
      description: "Member ini belum memiliki application document.",
      color: "warning",
    });
  }
}

function handleVerify(member: GroupMember) {
  const memberId = getMemberId(member);
  const appDocId = member.verification?.applicationDoc?.id || "";
  const memberName = getMemberName(member.member);
  const url = `/verification/verify/${memberId}?appDocId=${appDocId}&memberName=${encodeURIComponent(memberName)}`;
  window.open(url, "_blank");
}

// Table columns definition
const columns: TableColumn<PenerbitanItem>[] = [
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
    accessorKey: "start",
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
    cell: ({ row }) => formatDate(row.original.start),
  },
  {
    accessorKey: "finish",
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
    cell: ({ row }) => formatDate(row.original.finish),
  },
  {
    id: "checkerGroup",
    header: "Checker Group",
    cell: ({ row }) => {
      const checkers = row.original.checkerGroup || [];
      return h(
        "ul",
        { class: "list-disc list-inside text-sm" },
        checkers.map((checker: string) => h("li", { key: checker }, checker)),
      );
    },
  },
  {
    id: "groupMember",
    header: "Group Member",
    cell: ({ row }) => {
      const members = row.original.groupMember || [];
      return h(
        "ul",
        { class: "list-disc list-inside text-sm space-y-2" },
        members.map((gm: GroupMember) => {
          const name = getMemberName(gm.member);
          const hasDoc = !!gm.verification?.applicationDoc;
          return h(
            "li",
            { key: gm.id, class: "flex items-center gap-2 flex-wrap" },
            [
              h("span", { class: "font-medium" }, name),
              hasDoc
                ? h(UBadge, {
                    color: "success",
                    variant: "soft",
                    size: "xs",
                    label: "Doc",
                  })
                : null,
              h(
                UButton,
                {
                  color: hasDoc ? "info" : "neutral",
                  variant: "soft",
                  size: "xs",
                  icon: "i-lucide-eye",
                  disabled: !hasDoc,
                  onClick: () => handleView(gm),
                },
                () => "Lihat",
              ),
              h(
                UButton,
                {
                  color: hasDoc ? "success" : "neutral",
                  variant: "soft",
                  size: "xs",
                  icon: "i-lucide-check-circle",
                  disabled: !hasDoc,
                  onClick: () => handleVerify(gm),
                },
                () => "Verifikasi",
              ),
            ],
          );
        }),
      );
    },
  },
];

// Helper to format date
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Verifikasi Penerbitan">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4">
        <!-- Search and Actions -->
        <div class="flex items-center gap-2">
          <UInput
            :model-value="columnFilters[0]?.value || ''"
            placeholder="Cari event..."
            icon="i-lucide-search"
            class="w-64"
            @update:model-value="
              (val: string) => {
                if (columnFilters[0]) {
                  columnFilters[0].value = val;
                }
              }
            "
          />

          <UButton
            label="Refresh"
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            @click="refresh"
          />
        </div>

        <!-- Table -->
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
          :data="data"
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

        <!-- Pagination -->
        <div
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
            {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} events
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
      </div>
    </template>
  </UDashboardPanel>
</template>
