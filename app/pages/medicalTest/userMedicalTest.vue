<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getPaginationRowModel } from "@tanstack/table-core";
import ip from "../../utils/config.json";

const { token } = useAuth();
const toast = useToast();
const UButton = resolveComponent("UButton");
const table = useTemplateRef<any>("table");

interface MedicalUser {
  nik: string;
  name: string | null;
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

const systolic = ref("");
const diastolic = ref("");
const loading = ref(false);
const searchQuery = ref("");
const columnVisibility = ref();
const rowSelection = ref({});
const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

const { data, status, refresh } = await useFetch<MedicalCheckResponse>(
  `http://${ip.ipBackEnd}/api/medicalCheck/my`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const medicalChecks = computed(() => data.value?.medicalChecks || []);
const hasPendingMedicalCheck = computed(() =>
  medicalChecks.value.some((medicalCheck) => !medicalCheck.doctor),
);

const filteredMedicalChecks = computed(() => {
  if (!searchQuery.value) return medicalChecks.value;

  const query = searchQuery.value.toLowerCase();
  return medicalChecks.value.filter((medicalCheck) => {
    return (
      formatDate(medicalCheck.createdAt).toLowerCase().includes(query) ||
      (medicalCheck.bloodPressure || "").toLowerCase().includes(query) ||
      verificationLabel(medicalCheck).toLowerCase().includes(query) ||
      (medicalCheck.doctorUser?.name || "").toLowerCase().includes(query) ||
      (medicalCheck.unNormalCondition || "").toLowerCase().includes(query)
    );
  });
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
  const [systolicValue = "-", diastolicValue = "-"] = (value || "").split("/");
  return {
    systolic: systolicValue || "-",
    diastolic: diastolicValue || "-",
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

async function submitMedicalCheck() {
  if (!systolic.value || !diastolic.value) {
    toast.add({
      title: "Error",
      description: "Please fill systolic and diastolic blood pressure",
      color: "error",
    });
    return;
  }

  if (hasPendingMedicalCheck.value) {
    toast.add({
      title: "Waiting for Verification",
      description:
        "You cannot submit another medical test before the previous one is verified by a doctor",
      color: "warning",
    });
    return;
  }

  loading.value = true;

  try {
    await $fetch(`http://${ip.ipBackEnd}/api/medicalCheck`, {
      method: "POST",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
        "Content-Type": "application/json",
      },
      body: {
        systolic: systolic.value,
        diastolic: diastolic.value,
      },
    });

    toast.add({
      title: "Success",
      description: "Medical test submitted successfully",
      color: "success",
    });

    systolic.value = "";
    diastolic.value = "";
    await refresh();
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.message ||
        "Failed to submit medical test",
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
    id: "systolic",
    header: "Systolic",
    cell: ({ row }) => {
      return h(
        "div",
        { class: "font-medium text-highlighted" },
        splitBloodPressure(row.original.bloodPressure).systolic,
      );
    },
  },
  {
    id: "diastolic",
    header: "Diastolic",
    cell: ({ row }) => {
      return h(
        "div",
        { class: "font-medium text-highlighted" },
        splitBloodPressure(row.original.bloodPressure).diastolic,
      );
    },
  },
  {
    id: "verification",
    header: "Doctor Verification",
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
    header: "Doctor Statement",
    cell: ({ row }) => {
      return h("div", { class: "text-muted whitespace-normal" }, row.original.unNormalCondition || "-");
    },
  },
]);
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Medical Test">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <form
        class="grid gap-3 rounded-lg border border-default p-4 mb-5 md:grid-cols-[1fr_1fr_auto]"
        @submit.prevent="submitMedicalCheck"
      >
        <UFormField label="Systolic" name="systolic" required>
          <UInput
            v-model="systolic"
            type="number"
            placeholder="120"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Diastolic" name="diastolic" required>
          <UInput
            v-model="diastolic"
            type="number"
            placeholder="80"
            class="w-full"
          />
        </UFormField>

        <div class="flex items-end">
          <UButton
            label="Submit"
            icon="i-lucide-heart-pulse"
            type="submit"
            :loading="loading"
            :disabled="hasPendingMedicalCheck"
            class="w-full justify-center"
          />
        </div>
      </form>

      <UAlert
        v-if="hasPendingMedicalCheck"
        class="mb-5"
        color="warning"
        variant="soft"
        icon="i-lucide-hourglass"
        title="Waiting for doctor verification"
        description="You can submit the next medical test after your previous test is verified."
      />

      <div class="flex flex-wrap items-center gap-2 mb-4">
        <UInput
          v-model="searchQuery"
          placeholder="Search medical tests..."
          class="max-w-sm"
          icon="i-lucide-search"
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
    </template>
  </UDashboardPanel>
</template>
