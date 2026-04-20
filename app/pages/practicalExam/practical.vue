<script setup lang="ts">
import ip from "../../utils/config.json";

interface KindOfPracticalItem {
  kind?: string | null;
}

interface PracticalTestItem {
  id: number;
  score?: number | null;
  file?: string | null;
  kindOfPractical?: KindOfPracticalItem | null;
}

interface AppRatingItem {
  id: number;
  rating?: {
    rating?: string | null;
  } | null;
  practicalTests?: PracticalTestItem[];
}

interface ApplicationDocItem {
  id: number;
  number?: string | null;
  user?: {
    name?: string | null;
  } | null;
  appRatings?: AppRatingItem[];
}

interface PracticalExamResponse {
  applicationDoc?: ApplicationDocItem[];
}

interface PracticalGroupRow {
  no: number;
  number: string;
  name: string;
  rating: string;
  practicalTests: PracticalTestItem[];
}

const { token } = useAuth();
const toast = useToast();
const isUpdateModalOpen = ref(false);
const selectedPracticalTest = ref<PracticalTestItem | null>(null);
const inputScore = ref<string>("");
const inputFile = ref<File | null>(null);
const fileInputKey = ref(0);
const isSubmittingUpdate = ref(false);
const isFilePreviewModalOpen = ref(false);
const previewFileUrl = ref("");
const previewFileName = ref("");
const previewFileType = ref<"image" | "pdf" | "other">("other");

const {
  data: practicalExamData,
  status,
  error,
  refresh,
} = await useFetch<PracticalExamResponse>(
  `http://${ip.ipBackEnd}/api/practicalExam`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const practicalRows = computed<PracticalGroupRow[]>(() => {
  const docs = practicalExamData.value?.applicationDoc || [];
  const rows: PracticalGroupRow[] = [];
  let no = 1;

  for (const doc of docs) {
    const ratings = doc.appRatings || [];
    for (const rating of ratings) {
      const tests =
        rating.practicalTests && rating.practicalTests.length > 0
          ? rating.practicalTests
          : [
              {
                id: -1,
                score: null,
                file: null,
                kindOfPractical: { kind: "-" },
              },
            ];

      rows.push({
        no,
        number: doc.number || "-",
        name: doc.user?.name || "-",
        rating: rating.rating?.rating || "-",
        practicalTests: tests,
      });
      no += 1;
    }
  }

  return rows;
});

function formatScore(score?: number | null): string {
  if (score == null) return "-";
  return String(score);
}

function getFileName(filePath?: string | null): string {
  if (!filePath) return "-";
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || filePath;
}

function resolveFileUrl(filePath?: string | null): string {
  const trimmed = (filePath || "").trim();
  if (!trimmed) return "";
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  if (/^(data|blob):/i.test(trimmed)) return trimmed;
  return `http://${ip.ipBackEnd}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

function getPdfPreviewUrl(url: string): string {
  if (!url) return "";
  if (url.includes("#")) return url;
  return `${url}#zoom=page-width&view=FitH`;
}

function getExtension(filePath?: string | null): string {
  if (!filePath) return "";
  const clean = filePath.split("?")[0]?.toLowerCase() || "";
  const parts = clean.split(".");
  return parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
}

function openFilePreview(filePath?: string | null) {
  if (!filePath) return;
  previewFileUrl.value = resolveFileUrl(filePath);
  previewFileName.value = getFileName(filePath);

  const ext = getExtension(filePath);
  if (ext === "pdf") {
    previewFileType.value = "pdf";
  } else if (
    [
      "png",
      "jpg",
      "jpeg",
      "svg",
      "gif",
      "bmp",
      "webp",
      "avif",
      "tif",
      "tiff",
      "jfif",
    ].includes(ext)
  ) {
    previewFileType.value = "image";
  } else {
    previewFileType.value = "other";
  }

  isFilePreviewModalOpen.value = true;
}

function closeFilePreviewModal() {
  isFilePreviewModalOpen.value = false;
  previewFileUrl.value = "";
  previewFileName.value = "";
  previewFileType.value = "other";
}

function openUpdateModal(test: PracticalTestItem) {
  if (!test?.id || test.id <= 0) return;
  selectedPracticalTest.value = test;
  inputScore.value =
    test.score == null || Number.isNaN(Number(test.score))
      ? ""
      : String(test.score);
  inputFile.value = null;
  fileInputKey.value += 1;
  isUpdateModalOpen.value = true;
}

function closeUpdateModal() {
  isUpdateModalOpen.value = false;
  selectedPracticalTest.value = null;
  inputScore.value = "";
  inputFile.value = null;
  fileInputKey.value += 1;
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0] || null;
  inputFile.value = file;
}

function isAllowedUploadFile(file: File): boolean {
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
  const isImageMime = mime.startsWith("image/");
  const isImageExtension =
    /\.(png|jpe?g|svg|gif|bmp|webp|avif|tiff?|jfif)$/i.test(name);
  return isPdf || isImageMime || isImageExtension;
}

function validateUpdateForm(): string | null {
  const score = Number(inputScore.value);
  if (
    !Number.isFinite(score) ||
    !Number.isInteger(score) ||
    score < 1 ||
    score > 100
  ) {
    return "Score must be an integer between 1 and 100.";
  }

  if (!inputFile.value) {
    return "File is required.";
  }

  if (!isAllowedUploadFile(inputFile.value)) {
    return "File must be PDF or image format (png, jpg, jpeg, svg, etc).";
  }

  return null;
}

async function submitPracticalUpdate() {
  if (isSubmittingUpdate.value) return;
  const testId = selectedPracticalTest.value?.id;
  if (!testId || testId <= 0) return;

  const validationError = validateUpdateForm();
  if (validationError) {
    toast.add({
      title: "Validation Error",
      description: validationError,
      color: "error",
    });
    return;
  }

  const formData = new FormData();
  formData.append("score", String(Number(inputScore.value)));
  if (inputFile.value) {
    formData.append("file", inputFile.value);
  }

  try {
    isSubmittingUpdate.value = true;
    await $fetch(`http://${ip.ipBackEnd}/api/practicalExam/${testId}`, {
      method: "PUT",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
      body: formData,
    });

    toast.add({
      title: "Success",
      description: "Practical exam data updated successfully.",
      color: "success",
    });

    closeUpdateModal();
    await refresh();
  } catch (err: any) {
    toast.add({
      title: "Error",
      description:
        err?.data?.message || "Failed to update practical exam data.",
      color: "error",
    });
  } finally {
    isSubmittingUpdate.value = false;
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Practical Exam">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">Practical Exam Data</h2>
              <UButton
                label="Refresh"
                icon="i-lucide-refresh-cw"
                color="primary"
                variant="soft"
                :loading="status === 'pending'"
                @click="refresh()"
              />
            </div>
          </template>

          <div
            v-if="status === 'pending'"
            class="flex items-center justify-center py-8 text-muted gap-2"
          >
            <UIcon name="i-lucide-loader-2" class="animate-spin" />
            <span>Loading practical exam data...</span>
          </div>

          <div
            v-else-if="error"
            class="rounded-lg border border-error/30 bg-error/5 p-4 space-y-2"
          >
            <p class="font-medium text-error">
              Failed to fetch practical exam data
            </p>
            <UButton
              label="Retry"
              color="error"
              variant="outline"
              icon="i-lucide-refresh-cw"
              @click="refresh()"
            />
          </div>

          <div v-else-if="practicalRows.length === 0" class="text-muted py-4">
            No practical exam data available.
          </div>

          <div v-else class="overflow-x-auto">
            <table
              class="w-full border-collapse border border-gray-200 text-sm"
            >
              <thead>
                <tr class="bg-gray-100">
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    No
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Number
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Name
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Rating
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Practical
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Score
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    File
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <template
                  v-for="row in practicalRows"
                  :key="`${row.no}-${row.number}-${row.rating}`"
                >
                  <tr class="hover:bg-gray-50">
                    <td
                      class="border border-gray-300 px-4 py-2 text-center align-top"
                      :rowspan="row.practicalTests.length"
                    >
                      {{ row.no }}
                    </td>
                    <td
                      class="border border-gray-300 px-4 py-2 align-top"
                      :rowspan="row.practicalTests.length"
                    >
                      {{ row.number }}
                    </td>
                    <td
                      class="border border-gray-300 px-4 py-2 align-top"
                      :rowspan="row.practicalTests.length"
                    >
                      {{ row.name }}
                    </td>
                    <td
                      class="border border-gray-300 px-4 py-2 align-top"
                      :rowspan="row.practicalTests.length"
                    >
                      {{ row.rating }}
                    </td>

                    <td class="border border-gray-300 px-4 py-2">
                      {{ row.practicalTests[0]?.kindOfPractical?.kind || "-" }}
                    </td>
                    <td class="border border-gray-300 px-4 py-2 text-center">
                      {{ formatScore(row.practicalTests[0]?.score) }}
                    </td>
                    <td class="border border-gray-300 px-4 py-2">
                      <div class="flex items-center justify-center">
                        <UButton
                          v-if="row.practicalTests[0]?.file"
                          label="View"
                          size="xs"
                          color="primary"
                          variant="soft"
                          icon="i-lucide-eye"
                          @click="openFilePreview(row.practicalTests[0]?.file)"
                        />
                        <span v-else class="text-muted">-</span>
                      </div>
                    </td>
                    <td class="border border-gray-300 px-4 py-2 text-center">
                      <UButton
                        v-if="(row.practicalTests[0]?.id ?? 0) > 0"
                        :label="
                          row.practicalTests[0]?.score == null
                            ? 'Input'
                            : 'Update'
                        "
                        size="xs"
                        color="primary"
                        variant="soft"
                        icon="i-lucide-square-pen"
                        @click="openUpdateModal(row.practicalTests[0]!)"
                      />
                    </td>
                  </tr>

                  <tr
                    v-for="(test, testIndex) in row.practicalTests.slice(1)"
                    :key="`${row.no}-${test.id}-${testIndex}`"
                    class="hover:bg-gray-50"
                  >
                    <td class="border border-gray-300 px-4 py-2">
                      {{ test.kindOfPractical?.kind || "-" }}
                    </td>
                    <td class="border border-gray-300 px-4 py-2 text-center">
                      {{ formatScore(test.score) }}
                    </td>
                    <td class="border border-gray-300 px-4 py-2">
                      <div class="flex items-center justify-center">
                        <UButton
                          v-if="test.file"
                          label="View"
                          size="xs"
                          color="primary"
                          variant="soft"
                          icon="i-lucide-eye"
                          @click="openFilePreview(test.file)"
                        />
                        <span v-else class="text-muted">-</span>
                      </div>
                    </td>
                    <td class="border border-gray-300 px-4 py-2 text-center">
                      <UButton
                        v-if="test.id > 0"
                        :label="test.score == null ? 'Input' : 'Update'"
                        size="xs"
                        color="primary"
                        variant="soft"
                        icon="i-lucide-square-pen"
                        @click="openUpdateModal(test)"
                      />
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <UModal
    v-model:open="isUpdateModalOpen"
    title="Update Practical Exam"
    :dismissible="!isSubmittingUpdate"
    :close="!isSubmittingUpdate"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="Practical">
          <UInput
            :model-value="selectedPracticalTest?.kindOfPractical?.kind || '-'"
            disabled
          />
        </UFormField>

        <UFormField label="Score (1-100)" required>
          <UInput
            v-model="inputScore"
            type="number"
            min="1"
            max="100"
            placeholder="Input score"
          />
        </UFormField>

        <UFormField
          label="File"
          description="Allowed: PDF, PNG, JPG, JPEG, SVG, and other image formats"
          required
        >
          <label
            :for="`practical-upload-${selectedPracticalTest?.id || 'new'}`"
            class="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-upload" class="size-4 text-primary" />
              <span class="font-medium text-primary">
                {{ inputFile ? "Change file" : "Choose file to upload" }}
              </span>
            </div>
            <span class="text-xs text-muted">PDF / Image</span>
          </label>
          <input
            :id="`practical-upload-${selectedPracticalTest?.id || 'new'}`"
            :key="fileInputKey"
            type="file"
            accept=".pdf,image/*,.svg"
            class="sr-only"
            @change="onFileChange"
          />
          <p class="text-xs text-muted mt-2">
            {{
              inputFile
                ? `Selected: ${inputFile.name}`
                : "No file selected yet."
            }}
          </p>
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          label="Cancel"
          color="neutral"
          variant="soft"
          :disabled="isSubmittingUpdate"
          @click="closeUpdateModal"
        />
        <UButton
          label="Save"
          color="primary"
          icon="i-lucide-save"
          :loading="isSubmittingUpdate"
          @click="submitPracticalUpdate"
        />
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isFilePreviewModalOpen"
    :title="previewFileName || 'File Preview'"
    :ui="{ content: 'max-w-4xl w-full h-full' }"
  >
    <template #body>
      <div style="height: 70vh">
        <div
          v-if="previewFileType === 'image'"
          class="flex h-full items-center justify-center rounded-lg border bg-muted/20 p-2"
        >
          <img
            :src="previewFileUrl"
            :alt="previewFileName || 'Preview file'"
            class="h-full w-full rounded object-contain"
          />
        </div>

        <div
          v-else-if="previewFileType === 'pdf'"
          class="h-full rounded-lg border overflow-hidden"
        >
          <iframe
            :src="getPdfPreviewUrl(previewFileUrl)"
            style="height: 100%; width: 100%"
            title="PDF Preview"
          />
        </div>

        <div
          v-else
          class="rounded-lg border bg-muted/20 p-4 text-sm text-muted"
        >
          Preview is not available for this file type.
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton
          label="Close"
          color="neutral"
          variant="soft"
          @click="closeFilePreviewModal"
        />
      </div>
    </template>
  </UModal>
</template>
