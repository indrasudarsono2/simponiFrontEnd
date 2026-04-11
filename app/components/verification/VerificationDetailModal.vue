<script setup lang="ts">
import ip from "../../utils/config.json";

interface VerificationDataItem {
  id: number;
  item: string;
  status: boolean;
  kesesuaian: boolean;
  keterangan: string;
}

interface Props {
  isOpen: boolean;
  member: any | null;
  verification: any | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "close"): void;
}>();

const { token } = useAuth();
const toast = useToast();

// State for API data
const loading = ref(false);
const error = ref<string | null>(null);
const apiResponse = ref<any>(null);

// Parse verification data from API response
const verificationItems = computed(() => {
  if (!apiResponse.value?.verificationData) return [];

  let data = apiResponse.value.verificationData;

  // Parse if it's a string (JSON)
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (e) {
      console.error("Failed to parse verification data:", e);
      return [];
    }
  }

  return Array.isArray(data) ? data : [];
});

// Get member info
const memberInfo = computed(() => {
  if (!props.member?.userMember) return null;
  return {
    name: props.member.userMember.name,
    nik: props.member.userMember.nik,
  };
});

// Get verification status from API response
const isValid = computed(() => {
  return apiResponse.value?.isValid ?? props.verification?.isValid ?? false;
});

// Format boolean to text
function formatBoolean(value: boolean | null | undefined): string {
  if (value === true) return "Ya";
  if (value === false) return "Tidak";
  return "-";
}

// Get status color
function getStatusColor(value: boolean | null | undefined): string {
  if (value === true) return "text-green-600 font-semibold";
  if (value === false) return "text-red-600 font-semibold";
  return "text-gray-500";
}

// Fetch verification detail from API
async function fetchVerificationDetail() {
  // Get applicationDocId and groupMemberId from props
  const applicationDocId = props.verification?.applicationDocId;
  const groupMemberId = props.member?.id || props.verification?.groupMemberId;

  if (!applicationDocId || !groupMemberId) {
    error.value = "Missing required IDs for fetching verification detail";
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const response = await $fetch(
      `http://${ip.ipBackEnd}/api/getVerificationDetail`,
      {
        method: "POST",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
          "Content-Type": "application/json",
        },
        body: {
          applicationDocId: applicationDocId,
          groupMemberId: groupMemberId,
        },
      },
    );

    apiResponse.value = response;
  } catch (err: any) {
    error.value = err?.message || "Failed to fetch verification detail";
    toast.add({
      title: "Error",
      description: error.value ?? undefined,
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

// Watch for modal open and fetch data
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      fetchVerificationDetail();
    } else {
      // Reset state when modal closes
      apiResponse.value = null;
      error.value = null;
    }
  },
  { immediate: true },
);

// Close modal
function close() {
  emit("close");
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
  >
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="close" />

    <!-- Modal Content -->
    <div
      class="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-4 border-b border-gray-200"
      >
        <div>
          <h3 class="text-lg font-semibold">Detail Verifikasi</h3>
          <p v-if="memberInfo" class="text-sm text-gray-600 mt-1">
            {{ memberInfo.name }} ({{ memberInfo.nik }})
          </p>
        </div>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="close"
        />
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-8">
          <UIcon
            name="i-lucide-loader-2"
            class="animate-spin text-4xl text-primary mr-2"
          />
          <span class="text-muted">Loading verification data...</span>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-8">
          <UIcon
            name="i-lucide-alert-circle"
            class="text-4xl text-error mb-4"
          />
          <p class="text-error">{{ error }}</p>
        </div>

        <!-- Data Content -->
        <template v-else>
          <!-- Verification Status Badge -->
          <div class="mb-4">
            <UBadge
              :color="isValid ? 'success' : 'error'"
              size="lg"
              class="text-sm"
            >
              Status: {{ isValid ? "Valid" : "Invalid" }}
            </UBadge>
          </div>

          <!-- No Data State -->
          <div v-if="verificationItems.length === 0" class="text-center py-8">
            <UIcon name="i-lucide-inbox" class="text-4xl text-muted mb-4" />
            <p class="text-muted">No verification data available</p>
          </div>

          <!-- Data Table -->
          <div v-else>
            <table
              class="w-full border-collapse border border-gray-300 text-sm"
            >
              <thead>
                <tr class="bg-gray-100">
                  <th
                    class="border border-gray-300 px-3 py-2 text-center font-semibold w-12"
                  >
                    No
                  </th>
                  <th
                    class="border border-gray-300 px-3 py-2 text-left font-semibold"
                  >
                    Persyaratan
                  </th>
                  <th
                    class="border border-gray-300 px-3 py-2 text-center font-semibold w-24"
                  >
                    Status
                  </th>
                  <th
                    class="border border-gray-300 px-3 py-2 text-center font-semibold w-24"
                  >
                    Kesesuaian
                  </th>
                  <th
                    class="border border-gray-300 px-3 py-2 text-left font-semibold w-1/3"
                  >
                    Keterangan
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in verificationItems"
                  :key="item.id || index"
                  class="hover:bg-gray-50"
                >
                  <td
                    class="border border-gray-300 px-3 py-2 text-center align-top"
                  >
                    {{ index + 1 }}
                  </td>
                  <td class="border border-gray-300 px-3 py-2 align-top">
                    <div>
                      {{ item.item || "-" }}
                    </div>
                    <!-- Show competence rating when item id === 4 -->
                    <div
                      v-if="
                        item.id === 4 &&
                        props.member?.userMember?.competences?.length > 0
                      "
                      class="mt-2 text-xs text-gray-600"
                    >
                      <div class="font-semibold text-primary">
                        Rating Kompetensi:
                      </div>
                      <ul class="list-disc list-inside ml-2">
                        <li
                          v-for="(comp, idx) in props.member.userMember
                            .competences"
                          :key="idx"
                        >
                          {{ comp.rating?.rating || "-" }}
                        </li>
                      </ul>
                    </div>
                    <!-- Show appRatings when item id === 8 -->
                    <div
                      v-if="
                        item.id === 8 &&
                        props.member?.userMember?.applicationDocs?.length > 0
                      "
                      class="mt-2 text-xs text-gray-600"
                    >
                      <div class="font-semibold text-primary">Ratings:</div>
                      <ul class="list-disc list-inside ml-2">
                        <template
                          v-for="(doc, idx) in props.member.userMember
                            .applicationDocs"
                          :key="idx"
                        >
                          <li
                            v-for="(appRating, arIdx) in doc.appRatings"
                            :key="arIdx"
                          >
                            {{
                              appRating.rating?.rating ||
                              appRating.rating ||
                              "-"
                            }}
                            : {{ appRating.controlHour || "-" }}
                          </li>
                        </template>
                      </ul>
                    </div>
                  </td>
                  <td
                    class="border border-gray-300 px-3 py-2 text-center align-top"
                  >
                    <span :class="getStatusColor(item.status)">
                      {{ formatBoolean(item.status) }}
                    </span>
                  </td>
                  <td
                    class="border border-gray-300 px-3 py-2 text-center align-top"
                  >
                    <span :class="getStatusColor(item.kesesuaian)">
                      {{ formatBoolean(item.kesesuaian) }}
                    </span>
                  </td>
                  <td class="border border-gray-300 px-3 py-2 align-top">
                    {{ item.keterangan || "-" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div class="flex justify-end p-4 border-t border-gray-200">
        <UButton
          label="Tutup"
          color="neutral"
          variant="outline"
          @click="close"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
table {
  border-collapse: collapse;
}
td,
th {
  border: 1px solid #d1d5db;
}
</style>
