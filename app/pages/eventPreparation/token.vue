<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import ip from "../../utils/config.json";
import TokenCreateModal from "~/components/eventPreparation/TokenCreateModal.vue";
import TokenEditModal from "~/components/eventPreparation/TokenEditModal.vue";

interface Token {
  id?: number;
  branchUnitId?: number;
  token: string;
  startDate: string | null;
  expiredDate: string | null;
}

const { token } = useAuth();
const toast = useToast();

// Table columns
const columns: TableColumn<Token>[] = [
  {
    id: "no",
    header: "No",
    cell: () => "-",
  },
  {
    accessorKey: "token",
    header: "Token",
    cell: ({ row }) => h("span", { class: "font-mono" }, row.original.token),
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    cell: ({ row }) => formatDate(row.original.startDate),
  },
  {
    accessorKey: "expiredDate",
    header: "Expired Date",
    cell: ({ row }) => formatDate(row.original.expiredDate),
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) => {
      return h("div", { class: "flex gap-2" }, [
        h(resolveComponent("UButton"), {
          icon: "i-lucide-pencil",
          color: "primary",
          variant: "soft",
          size: "sm",
          onClick: () => openEditModal(row.original),
        }),
      ]);
    },
  },
];

// State
const tokens = ref<Token[]>([]);
const isLoading = ref(false);
const isCreateModalOpen = ref(false);
const isEditModalOpen = ref(false);
const selectedToken = ref<Token | null>(null);

// Form state
const formData = ref({
  token: "",
  startDate: "",
  expiredDate: "",
});

// Fetch tokens
async function fetchTokens() {
  isLoading.value = true;
  try {
    const response = await $fetch<Token[] | Token | null>(
      `http://${ip.ipBackEnd}/api/token`,
      {
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    if (Array.isArray(response)) {
      tokens.value = response;
    } else if (response) {
      tokens.value = [response];
    } else {
      tokens.value = [];
    }
  } catch (error) {
    toast.add({
      title: "Error",
      description: "Failed to fetch tokens",
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
}

// Open create modal
function openCreateModal() {
  formData.value = {
    token: "",
    startDate: "",
    expiredDate: "",
  };
  isCreateModalOpen.value = true;
}

// Open edit modal
function openEditModal(tokenItem: Token) {
  selectedToken.value = tokenItem;
  formData.value = {
    token: tokenItem.token,
    startDate: tokenItem.startDate
      ? formatDateForInput(tokenItem.startDate)
      : "",
    expiredDate: tokenItem.expiredDate
      ? formatDateForInput(tokenItem.expiredDate)
      : "",
  };
  isEditModalOpen.value = true;
}

// Format date for display in UTC
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";

  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(dateStr);
  const normalized = hasTimezone ? dateStr : `${dateStr.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "-";

  const datePart = date.toLocaleDateString("id-ID", {
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

  return `${datePart} ${timePart} UTC`;
}

// Format date for input (YYYY-MM-DDTHH:mm)
function formatDateForInput(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

// Create token (API to be provided)
async function createToken() {
  if (
    !formData.value.token ||
    !formData.value.startDate ||
    !formData.value.expiredDate
  ) {
    toast.add({
      title: "Validation Error",
      description: "Token, start date, and expired date are required",
      color: "error",
    });
    return;
  }

  try {
    await $fetch(`http://${ip.ipBackEnd}/api/token`, {
      method: "POST",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
      body: {
        token: formData.value.token,
        startDate: formData.value.startDate,
        expiredDate: formData.value.expiredDate,
      },
    });

    toast.add({
      title: "Success",
      description: "Token created successfully",
      color: "success",
    });

    isCreateModalOpen.value = false;
    formData.value = {
      token: "",
      startDate: "",
      expiredDate: "",
    };
    await fetchTokens();
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error?.data?.message || "Failed to create token",
      color: "error",
    });
  }
}

async function updateToken() {
  if (!selectedToken.value?.id) {
    toast.add({
      title: "Error",
      description: "Token ID is missing",
      color: "error",
    });
    return;
  }

  if (
    !formData.value.token ||
    !formData.value.startDate ||
    !formData.value.expiredDate
  ) {
    toast.add({
      title: "Validation Error",
      description: "Token, start date, and expired date are required",
      color: "error",
    });
    return;
  }

  try {
    await $fetch(`http://${ip.ipBackEnd}/api/token/${selectedToken.value.id}`, {
      method: "PUT",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
      body: {
        token: formData.value.token,
        startDate: formData.value.startDate,
        expiredDate: formData.value.expiredDate,
      },
    });

    toast.add({
      title: "Success",
      description: "Token updated successfully",
      color: "success",
    });

    isEditModalOpen.value = false;
    selectedToken.value = null;
    await fetchTokens();
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error?.data?.message || "Failed to update token",
      color: "error",
    });
  }
}

// Fetch on mount
onMounted(() => {
  fetchTokens();
});
</script>

<template>
  <UDashboardPanel id="token">
    <template #header>
      <UDashboardNavbar title="Token Management">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            v-if="tokens.length === 0"
            icon="i-lucide-plus"
            label="Create Token"
            color="primary"
            @click="openCreateModal"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex justify-center py-8">
          <UIcon name="i-lucide-loader-2" class="size-8 animate-spin" />
        </div>

        <!-- Table -->
        <UTable v-else :columns="columns" :data="tokens" class="w-full">
          <template #empty>
            <div class="text-center py-8 text-gray-500">No tokens found</div>
          </template>
        </UTable>
      </div>
    </template>
  </UDashboardPanel>

  <TokenCreateModal
    v-model:open="isCreateModalOpen"
    :form-data="formData"
    @submit="createToken"
  />

  <TokenEditModal
    v-model:open="isEditModalOpen"
    :form-data="formData"
    @submit="updateToken"
  />
</template>
