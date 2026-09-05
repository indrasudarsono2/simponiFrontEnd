<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";

const { token } = useAuth();
const toast = useToast();
const UButton = resolveComponent("UButton");
const table = useTemplateRef<any>("table");

interface MedicalUser {
  nik: string;
  name: string | null;
  branchId?: number | null;
  branch?: {
    id: number;
    branch: string | null;
  } | null;
  branchUnit?: {
    id: number;
    unit: string | null;
  } | null;
  professionInBranch?: {
    id: number;
    profession?: {
      id: number;
      profession: string | null;
    } | null;
  } | null;
}

interface MedicalCheck {
  id: number;
  doctor: string | null;
  employee: string | null;
  bloodPressure: string | null;
  unNormalCondition: string | null;
  isFit: boolean | null;
  createdAt: string;
  updatedAt: string;
  doctorUser: MedicalUser | null;
  employeeUser: MedicalUser | null;
}

interface MedicalCheckResponse {
  medicalChecks: MedicalCheck[];
}

const searchQuery = ref("");
const selectedStatus = ref("all");
const columnVisibility = ref();
const rowSelection = ref({});
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

const medicalCheckToVerify = ref<MedicalCheck | null>(null);
const selectedVerification = ref<{ value: boolean; label: string }>();
const unNormalCondition = ref("");
const loading = ref(false);

const verificationOptions = [
  { value: true, label: "Fit" },
  { value: false, label: "Unfit" },
];

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "fit", label: "Fit" },
  { value: "unfit", label: "Unfit" },
];

const { data, status, refresh } = await useFetch<MedicalCheckResponse>(
  `${apiBaseUrl}/api/medicalCheck/monitor`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const medicalChecks = computed(() => data.value?.medicalChecks || []);

const filteredMedicalChecks = computed(() => {
  let result = medicalChecks.value;

  if (selectedStatus.value !== "all") {
    result = result.filter((medicalCheck) => {
      if (selectedStatus.value === "pending") return !medicalCheck.doctor;
      if (selectedStatus.value === "fit") {
        return Boolean(medicalCheck.doctor) && medicalCheck.isFit === true;
      }
      if (selectedStatus.value === "unfit") {
        return Boolean(medicalCheck.doctor) && medicalCheck.isFit === false;
      }
      return true;
    });
  }

  if (!searchQuery.value) return result;

  const query = searchQuery.value.toLowerCase();
  return result.filter((medicalCheck) => {
    return (
      formatDate(medicalCheck.createdAt).toLowerCase().includes(query) ||
      (medicalCheck.employeeUser?.name || "").toLowerCase().includes(query) ||
      (medicalCheck.employee || "").toLowerCase().includes(query) ||
      (medicalCheck.bloodPressure || "").toLowerCase().includes(query) ||
      verificationLabel(medicalCheck).toLowerCase().includes(query) ||
      (medicalCheck.doctorUser?.name || "").toLowerCase().includes(query) ||
      (medicalCheck.unNormalCondition || "").toLowerCase().includes(query)
    );
  });
});

const isVerifyOpen = computed({
  get: () => medicalCheckToVerify.value !== null,
  set: (value) => {
    if (!value) closeVerifyModal();
  },
});

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function splitBloodPressure(value: string | null) {
  const [systolic = "-", diastolic = "-"] = (value || "").split("/");
  return {
    systolic: systolic || "-",
    diastolic: diastolic || "-",
  };
}

function verificationLabel(medicalCheck: MedicalCheck) {
  if (!medicalCheck.doctor) return "Pending";
  return medicalCheck.isFit ? "Fit" : "Unfit";
}

function verificationColor(medicalCheck: MedicalCheck) {
  if (!medicalCheck.doctor) return "warning";
  return medicalCheck.isFit ? "success" : "error";
}

function openVerifyModal(medicalCheck: MedicalCheck) {
  medicalCheckToVerify.value = medicalCheck;
  selectedVerification.value =
    medicalCheck.doctor && typeof medicalCheck.isFit === "boolean"
      ? verificationOptions.find((option) => option.value === medicalCheck.isFit) ||
        undefined
      : undefined;
  unNormalCondition.value = medicalCheck.unNormalCondition || "";
}

function closeVerifyModal() {
  medicalCheckToVerify.value = null;
  selectedVerification.value = undefined;
  unNormalCondition.value = "";
}

async function submitVerification() {
  if (!medicalCheckToVerify.value || !selectedVerification.value) {
    toast.add({
      title: "Error",
      description: "Please select verification result",
      color: "error",
    });
    return;
  }

  loading.value = true;

  try {
    await $fetch(
      `${apiBaseUrl}/api/medicalCheck/${medicalCheckToVerify.value.id}/verify`,
      {
        method: "PUT",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
          "Content-Type": "application/json",
        },
        body: {
          isFit: selectedVerification.value.value,
          unNormalCondition: unNormalCondition.value,
        },
      },
    );

    toast.add({
      title: "Success",
      description: "Medical test verified successfully",
      color: "success",
    });

    closeVerifyModal();
    await refresh();
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.message ||
        "Failed to verify medical test",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

const columns = computed((): TableColumn<MedicalCheck>[] => [
  {
    id: "no",
    header: "NO",
    cell: ({ row }): number => row.index + 1,
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => {
      return h("div", { class: "text-muted" }, formatDate(row.original.createdAt));
    },
  },
  {
    id: "employee",
    header: "User",
    cell: ({ row }) => {
      return h("div", { class: "space-y-1" }, [
        h(
          "div",
          { class: "font-medium text-highlighted" },
          row.original.employeeUser?.name || "-",
        ),
        h("div", { class: "text-xs text-muted" }, row.original.employee || "-"),
      ]);
    },
  },
  {
    id: "unit",
    header: "Branch Unit",
    cell: ({ row }) => {
      return h("div", { class: "text-muted" }, row.original.employeeUser?.branchUnit?.unit || "-");
    },
  },
  {
    id: "profession",
    header: "Profession",
    cell: ({ row }) => {
      return h(
        "div",
        { class: "text-muted" },
        row.original.employeeUser?.professionInBranch?.profession?.profession || "-",
      );
    },
  },
  {
    id: "bloodPressure",
    header: "Blood Pressure",
    cell: ({ row }) => {
      const pressure = splitBloodPressure(row.original.bloodPressure);
      return h("div", { class: "font-medium text-highlighted" }, `${pressure.systolic}/${pressure.diastolic}`);
    },
  },
  {
    id: "verification",
    header: "Verification",
    cell: ({ row }) => {
      return h(
        resolveComponent("UBadge"),
        {
          color: verificationColor(row.original),
          variant: "soft",
        },
        () => verificationLabel(row.original),
      );
    },
  },
  {
    id: "doctor",
    header: "Doctor",
    cell: ({ row }) => {
      return h("div", { class: "text-muted" }, row.original.doctorUser?.name || "-");
    },
  },
  {
    accessorKey: "unNormalCondition",
    header: "Statement",
    cell: ({ row }) => {
      return h("div", { class: "text-muted whitespace-normal" }, row.original.unNormalCondition || "-");
    },
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) => {
      return h(resolveComponent("UButton"), {
        color: "primary",
        variant: "soft",
        icon: "i-lucide-stethoscope",
        size: "xs",
        label: row.original.doctor ? "Update" : "Verify",
        onClick: () => openVerifyModal(row.original),
      });
    },
  },
]);
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Monitor Medical Test">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <UInput
          v-model="searchQuery"
          placeholder="Search medical tests..."
          class="max-w-sm"
          icon="i-lucide-search"
        />

        <USelectMenu
          v-model="selectedStatus"
          :items="statusOptions"
          value-key="value"
          label-key="label"
          class="w-44"
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
        v-if="filteredMedicalChecks.length > 0"
        ref="table"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        v-model:pagination="pagination"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel(),
        }"
        class="shrink-0"
        :data="filteredMedicalChecks"
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
        v-else-if="!status || status === 'success'"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <UIcon name="i-lucide-inbox" class="text-4xl text-muted mb-4" />
        <p class="text-muted">No medical test available</p>
      </div>

      <div
        v-if="filteredMedicalChecks.length > 0"
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
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} tests
        </div>

        <UPagination
          :default-page="
            (table?.tableApi?.getState().pagination.pageIndex || 0) + 1
          "
          :items-per-page="table?.tableApi?.getState().pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length"
          @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
        />
      </div>

      <UModal v-model:open="isVerifyOpen" title="Verify Medical Test">
        <template #body>
          <form class="space-y-4" @submit.prevent="submitVerification">
            <div
              v-if="medicalCheckToVerify"
              class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2"
            >
              <div class="flex justify-between gap-4">
                <span class="text-sm text-gray-500">User:</span>
                <span class="text-sm font-medium text-right">{{
                  medicalCheckToVerify.employeeUser?.name || "-"
                }}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-sm text-gray-500">Blood Pressure:</span>
                <span class="text-sm font-medium">{{
                  medicalCheckToVerify.bloodPressure || "-"
                }}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-sm text-gray-500">Date:</span>
                <span class="text-sm font-medium text-right">{{
                  formatDate(medicalCheckToVerify.createdAt)
                }}</span>
              </div>
            </div>

            <UFormField label="Verification Result" name="isFit" required>
              <USelectMenu
                v-model="selectedVerification"
                :items="verificationOptions"
                placeholder="Select result"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Doctor Statement" name="unNormalCondition">
              <UTextarea
                v-model="unNormalCondition"
                placeholder="Diagnosis for unfit condition, or note such as cold syndrome"
                class="w-full"
                :rows="4"
              />
            </UFormField>

            <div class="flex justify-end gap-2 pt-4">
              <UButton
                label="Cancel"
                color="neutral"
                variant="subtle"
                :disabled="loading"
                @click="closeVerifyModal"
              />
              <UButton
                label="Save Verification"
                color="primary"
                type="submit"
                :loading="loading"
              />
            </div>
          </form>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
