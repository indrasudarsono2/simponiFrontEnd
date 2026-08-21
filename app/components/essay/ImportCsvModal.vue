<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

const { token } = useAuth();
const toast = useToast();

const emit = defineEmits<{
  essayImported: [];
}>();

const open = ref(false);
const loading = ref(false);
const selectedFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const templateRows = [
  ["essayId", "question", "answer", "value"],
  [
    "",
    "<p>Explain the standard phraseology for requesting taxi clearance.</p>",
    "<p>The answer should include aircraft callsign, position, destination, and requested taxi instruction.</p>",
    "5",
  ],
  [
    "",
    "<p>Mention three actions required when radio communication failure occurs.</p>",
    "<ol><li>Maintain last assigned clearance.</li><li>Squawk appropriate code.</li><li>Follow published procedure.</li></ol>",
    "10",
  ],
];

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadTemplate() {
  const csv = templateRows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "essay-question-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0] || null;

  if (!file) {
    selectedFile.value = null;
    return;
  }

  const isCsv =
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel" ||
    file.name.toLowerCase().endsWith(".csv");

  if (!isCsv) {
    toast.add({
      title: "Invalid File",
      description: "Please select a CSV file.",
      color: "error",
    });
    selectedFile.value = null;
    if (fileInput.value) fileInput.value.value = "";
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    toast.add({
      title: "File Too Large",
      description: "CSV file size must be less than 2MB.",
      color: "error",
    });
    selectedFile.value = null;
    if (fileInput.value) fileInput.value.value = "";
    return;
  }

  selectedFile.value = file;
}

function resetForm() {
  selectedFile.value = null;
  if (fileInput.value) fileInput.value.value = "";
}

async function onSubmit() {
  if (!selectedFile.value) {
    toast.add({
      title: "CSV Required",
      description: "Please choose a CSV file to import.",
      color: "error",
    });
    return;
  }

  loading.value = true;

  try {
    const formData = new FormData();
    formData.append("csv", selectedFile.value);

    const response = await $fetch<{
      imported: number;
      created: number;
      updated: number;
      versioned: number;
    }>(
      `${apiBaseUrl}/api/essays/import-csv`,
      {
        method: "POST",
        body: formData,
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: `${response.imported || 0} essay questions processed. Created: ${response.created || 0}, Updated: ${response.updated || 0}, Versioned: ${response.versioned || 0}.`,
      color: "success",
    });

    resetForm();
    open.value = false;
    emit("essayImported");
  } catch (error: any) {
    const errors = error?.data?.errors;
    toast.add({
      title: "Import Failed",
      description:
        Array.isArray(errors) && errors.length
          ? errors.slice(0, 3).join(" ")
          : error?.data?.message ||
            error?.data?.statusMessage ||
            error?.message ||
            "Failed to import CSV.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Import Essay Questions"
    description="Upload CSV data to create or update multiple essay questions"
    :ui="{ content: 'max-w-2xl' }"
  >
    <UButton
      label="Import CSV"
      icon="i-lucide-upload"
      color="neutral"
      variant="outline"
    />

    <template #body>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-info"
          title="CSV format"
          description="Use these headers exactly: essayId, question, answer, value. Keep essayId to update an existing question. Leave essayId empty to add a new question."
        />

        <div class="rounded-lg border border-default p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-medium text-highlighted">CSV Template</p>
              <p class="text-xs text-muted">
                Download this file, fill your questions, then upload it here. Do not delete essayId when updating.
              </p>
            </div>
            <UButton
              label="Download Template"
              icon="i-lucide-download"
              color="primary"
              variant="soft"
              type="button"
              @click="downloadTemplate"
            />
          </div>

          <div class="overflow-x-auto rounded border border-default">
            <table class="min-w-full text-xs">
              <thead class="bg-elevated/50">
                <tr>
                  <th class="border-b border-default px-3 py-2 text-left">
                    essayId
                  </th>
                  <th class="border-b border-default px-3 py-2 text-left">
                    question
                  </th>
                  <th class="border-b border-default px-3 py-2 text-left">
                    answer
                  </th>
                  <th class="border-b border-default px-3 py-2 text-left">
                    value
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="px-3 py-2">Leave empty for new question</td>
                  <td class="px-3 py-2">Essay question text or HTML</td>
                  <td class="px-3 py-2">Correct answer text or HTML</td>
                  <td class="px-3 py-2">5</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <UFormField label="CSV File" name="csv" required>
          <input
            ref="fileInput"
            type="file"
            accept=".csv,text/csv"
            class="block w-full cursor-pointer text-sm text-muted file:mr-4 file:rounded file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
            @change="handleFileChange"
          />
          <template #hint>
            <span class="text-xs text-muted">Maximum file size: 2MB.</span>
          </template>
        </UFormField>

        <div
          v-if="selectedFile"
          class="rounded border border-default bg-elevated/40 p-3 text-sm"
        >
          Selected file:
          <span class="font-medium text-highlighted">{{ selectedFile.name }}</span>
        </div>

        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Update note"
          description="If essayId exists and has no answer history, it will be updated. If essayId already has answers/results, the system creates a new active version and keeps the old essay for history. Empty essayId creates a new question."
        />

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            label="Import Questions"
            color="primary"
            type="submit"
            :loading="loading"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
