<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface VerificationItem {
  id: number;
  item: string;
  status: boolean | null;
  kesesuaian: boolean | null;
  keterangan: string;
}

interface Props {
  isOpen: boolean;
  apiResponse: any;
  applicationDocId: number | null;
  groupMemberId?: number | null; // ID of the group member being verified (deprecated, use member instead)
  member?: any | null; // Full group member object
  inline?: boolean; // When true, modal displays inline without fixed positioning (for side-by-side layout)
}

const props = withDefaults(defineProps<Props>(), {
  inline: false,
  groupMemberId: null,
  member: null,
});
const emit = defineEmits<{
  (e: "close"): void;
  (e: "submit-success"): void;
}>();

const { token } = useAuth();
const toast = useToast();

// Local state for verification items
const verificationItems = ref<VerificationItem[]>([]);
const isSubmitting = ref(false);

// Initialize verification items from API response
watch(
  () => props.apiResponse,
  (newResponse) => {
    if (newResponse && Array.isArray(newResponse)) {
      verificationItems.value = newResponse.map((item: any, index: number) => ({
        id: item.id || index + 1,
        item: item.item || item.name || item.description || "-",
        status: null,
        kesesuaian: null,
        keterangan: "",
      }));
    } else {
      verificationItems.value = [];
    }
  },
  { immediate: true },
);

// Close modal
function close() {
  emit("close");
}

// Submit verification data
async function submitVerification() {
  if (!props.applicationDocId) {
    toast.add({
      title: "Error",
      description: "Application document ID is missing",
      color: "error",
    });
    return;
  }

  // Validate that all items have been answered
  const unansweredItems = verificationItems.value.filter(
    (item) => item.status === null || item.kesesuaian === null,
  );

  if (unansweredItems.length > 0) {
    toast.add({
      title: "Error",
      description: `Please answer all questions for ${unansweredItems.length} item(s)`,
      color: "error",
    });
    return;
  }

  // Validate that no items have false values in status or kesesuaian
  // Convert any string values to booleans for proper comparison
  const itemsWithFalseValues: { item: VerificationItem; index: number }[] = [];

  for (let i = 0; i < verificationItems.value.length; i++) {
    const item = verificationItems.value[i]!;
    // Convert to boolean if string
    const statusVal =
      typeof item.status === "string" ? item.status === "true" : item.status;
    const kesesuaianVal =
      typeof item.kesesuaian === "string"
        ? item.kesesuaian === "true"
        : item.kesesuaian;

    // Check if either is explicitly false
    if (statusVal === false || kesesuaianVal === false) {
      itemsWithFalseValues.push({ item, index: i });
    }
  }

  if (itemsWithFalseValues.length > 0) {
    // Build detailed error message using row numbers (index + 1)
    const errorDetails: string[] = [];

    for (const entry of itemsWithFalseValues) {
      // Use type assertion to avoid TypeScript errors
      const typedEntry = entry as { item: VerificationItem; index: number };
      const item = typedEntry.item;
      const index = typedEntry.index;

      const statusVal =
        typeof item.status === "string" ? item.status === "true" : item.status;
      const kesesuaianVal =
        typeof item.kesesuaian === "string"
          ? item.kesesuaian === "true"
          : item.kesesuaian;

      const issues: string[] = [];
      if (statusVal === false) issues.push("Status: Tidak");
      if (kesesuaianVal === false) issues.push("Kesesuaian: Tidak");

      // Use row number (index + 1) instead of item.id
      errorDetails.push(`No. ${index + 1} (${issues.join(", ")})`);
    }

    toast.add({
      title: "Error",
      description: `Cannot submit: ${itemsWithFalseValues.length} item(s) have "Tidak" (No) selected: ${errorDetails.join("; ")}`,
      color: "error",
    });
    return;
  }

  isSubmitting.value = true;

  try {
    const payload = {
      applicationDocId: props.applicationDocId,
      groupMemberId: props.member?.id || props.groupMemberId,
      verificationItems: verificationItems.value.map((item) => ({
        id: item.id,
        item: item.item,
        status: item.status,
        kesesuaian: item.kesesuaian,
        keterangan: item.keterangan,
      })),
    };

    const response = await $fetch(
      `${apiBaseUrl}/api/verificationPost`,
      {
        method: "POST",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
          "Content-Type": "application/json",
        },
        body: payload,
      },
    );

    toast.add({
      title: "Success",
      description: "Verification data submitted successfully",
      color: "success",
    });

    emit("submit-success");
    close();
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.message ||
        "Failed to submit verification data",
      color: "error",
    });
  } finally {
    isSubmitting.value = false;
  }
}

// Reset form
function resetForm() {
  verificationItems.value = verificationItems.value.map((item) => ({
    ...item,
    status: null,
    kesesuaian: null,
    keterangan: "",
  }));
}
</script>

<template>
  <!-- Fullscreen Modal (default) -->
  <div
    v-if="isOpen && !inline"
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
  >
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="close" />

    <!-- Modal Content -->
    <div
      class="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-4 border-b border-gray-200"
      >
        <h3 class="text-lg font-semibold">Form Verifikasi Persyaratan</h3>
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
        <div v-if="verificationItems.length === 0" class="text-center py-8">
          <UIcon name="i-lucide-inbox" class="text-4xl text-muted mb-4" />
          <p class="text-muted">No verification items available</p>
        </div>

        <div v-else>
          <table class="w-full border-collapse border border-gray-300 text-sm">
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
                :key="item.id"
                class="hover:bg-gray-50"
              >
                <td
                  class="border border-gray-300 px-3 py-2 text-center align-top"
                >
                  {{ index + 1 }}
                </td>
                <td class="border border-gray-300 px-3 py-2 align-top">
                  <div>
                    {{ item?.item }}
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
                          {{ appRating.rating?.rating || "-" }}
                        </li>
                      </template>
                    </ul>
                  </div>
                </td>
                <td
                  class="border border-gray-300 px-3 py-2 text-center align-top"
                >
                  <div class="flex flex-col gap-1">
                    <label class="flex items-center gap-1 cursor-pointer">
                      <input
                        v-model="item.status"
                        type="radio"
                        :name="'status-' + item.id"
                        :value="true"
                        class="w-4 h-4 text-primary"
                      />
                      <span class="text-xs">Ya</span>
                    </label>
                    <label class="flex items-center gap-1 cursor-pointer">
                      <input
                        v-model="item.status"
                        type="radio"
                        :name="'status-' + item.id"
                        :value="false"
                        class="w-4 h-4 text-primary"
                      />
                      <span class="text-xs">Tidak</span>
                    </label>
                  </div>
                </td>
                <td
                  class="border border-gray-300 px-3 py-2 text-center align-top"
                >
                  <div class="flex flex-col gap-1">
                    <label class="flex items-center gap-1 cursor-pointer">
                      <input
                        v-model="item.kesesuaian"
                        type="radio"
                        :name="'kesesuaian-' + item.id"
                        :value="true"
                        class="w-4 h-4 text-primary"
                      />
                      <span class="text-xs">Ya</span>
                    </label>
                    <label class="flex items-center gap-1 cursor-pointer">
                      <input
                        v-model="item.kesesuaian"
                        type="radio"
                        :name="'kesesuaian-' + item.id"
                        :value="false"
                        class="w-4 h-4 text-primary"
                      />
                      <span class="text-xs">Tidak</span>
                    </label>
                  </div>
                </td>
                <td class="border border-gray-300 px-3 py-2 align-top">
                  <UInput
                    v-model="item.keterangan"
                    placeholder="Masukkan keterangan..."
                    size="sm"
                    class="w-full"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="flex justify-between items-center p-4 border-t border-gray-200"
      >
        <div class="flex gap-2">
          <UButton
            label="Reset"
            color="neutral"
            variant="outline"
            @click="resetForm"
          />
        </div>
        <div class="flex gap-2">
          <UButton
            label="Batal"
            color="neutral"
            variant="outline"
            @click="close"
          />
          <UButton
            label="Simpan"
            color="primary"
            :loading="isSubmitting"
            :disabled="verificationItems.length === 0 || isSubmitting"
            @click="submitVerification"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Inline Modal (for side-by-side layout) -->
  <div
    v-if="isOpen && inline"
    class="bg-white rounded-lg shadow-xl w-full h-full flex flex-col"
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200">
      <h3 class="text-lg font-semibold">Form Verifikasi Persyaratan</h3>
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
      <div v-if="verificationItems.length === 0" class="text-center py-8">
        <UIcon name="i-lucide-inbox" class="text-4xl text-muted mb-4" />
        <p class="text-muted">No verification items available</p>
      </div>

      <div v-else>
        <table class="w-full border-collapse border border-gray-300 text-sm">
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
              :key="item.id"
              class="hover:bg-gray-50"
            >
              <td
                class="border border-gray-300 px-3 py-2 text-center align-top"
              >
                {{ index + 1 }}
              </td>
              <td class="border border-gray-300 px-3 py-2 align-top">
                <div>
                  {{ item?.item }}
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
                      v-for="(comp, idx) in props.member.userMember.competences"
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
                          appRating.rating?.rating || appRating.rating || "-"
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
                <div class="flex flex-col gap-1">
                  <label class="flex items-center gap-1 cursor-pointer">
                    <input
                      v-model="item.status"
                      type="radio"
                      :name="'status-' + item.id"
                      :value="true"
                      class="w-4 h-4 text-primary"
                    />
                    <span class="text-xs">Ya</span>
                  </label>
                  <label class="flex items-center gap-1 cursor-pointer">
                    <input
                      v-model="item.status"
                      type="radio"
                      :name="'status-' + item.id"
                      :value="false"
                      class="w-4 h-4 text-primary"
                    />
                    <span class="text-xs">Tidak</span>
                  </label>
                </div>
              </td>
              <td
                class="border border-gray-300 px-3 py-2 text-center align-top"
              >
                <div class="flex flex-col gap-1">
                  <label class="flex items-center gap-1 cursor-pointer">
                    <input
                      v-model="item.kesesuaian"
                      type="radio"
                      :name="'kesesuaian-' + item.id"
                      :value="true"
                      class="w-4 h-4 text-primary"
                    />
                    <span class="text-xs">Ya</span>
                  </label>
                  <label class="flex items-center gap-1 cursor-pointer">
                    <input
                      v-model="item.kesesuaian"
                      type="radio"
                      :name="'kesesuaian-' + item.id"
                      :value="false"
                      class="w-4 h-4 text-primary"
                    />
                    <span class="text-xs">Tidak</span>
                  </label>
                </div>
              </td>
              <td class="border border-gray-300 px-3 py-2 align-top">
                <UInput
                  v-model="item.keterangan"
                  placeholder="Masukkan keterangan..."
                  size="sm"
                  class="w-full"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex justify-between items-center p-4 border-t border-gray-200">
      <div class="flex gap-2">
        <UButton
          label="Reset"
          color="neutral"
          variant="outline"
          @click="resetForm"
        />
      </div>
      <div class="flex gap-2">
        <UButton
          label="Batal"
          color="neutral"
          variant="outline"
          @click="close"
        />
        <UButton
          label="Simpan"
          color="primary"
          :loading="isSubmitting"
          :disabled="verificationItems.length === 0 || isSubmitting"
          @click="submitVerification"
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
