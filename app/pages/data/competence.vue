<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface CompetenceItem {
  id?: number;
  released?: string | null;
  institution?: string | null;
  file?: string | null;
  rating?: {
    id?: number;
    rating?: string | null;
  } | null;
}

interface CompetenceApiItem {
  nik?: string | null;
  name?: string | null;
  competences?: CompetenceItem[] | null;
}

interface CompetenceRow {
  id: string;
  no: number;
  showNo: boolean;
  noRowSpan: number;
  nik: string;
  showNik: boolean;
  nikRowSpan: number;
  name: string;
  showName: boolean;
  nameRowSpan: number;
  competenceRating: string;
  released: string;
  institution: string;
  file: string | null;
}

const { token } = useAuth();
const toast = useToast();

const searchQuery = ref("");
const isFileModalOpen = ref(false);
const selectedFilePath = ref<string | null>(null);

const { data, status, error, refresh } = await useFetch<CompetenceApiItem[]>(
  `${apiBaseUrl}/api/dataCheckerCompetence`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
    default: () => [],
  },
);

function formatDate(dateString?: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function resolveFileUrl(filePath?: string | null): string | null {
  if (!filePath) return null;
  if (/^https?:\/\//i.test(filePath)) return filePath;
  return `${apiBaseUrl}${filePath}`;
}

function getFileExtension(filePath?: string | null): string {
  if (!filePath) return "";
  const cleanPath = filePath.split("?")[0] ?? "";
  return (cleanPath.split(".").pop() || "").toLowerCase();
}

function isImageFile(filePath?: string | null): boolean {
  const ext = getFileExtension(filePath);
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);
}

function isPdfFile(filePath?: string | null): boolean {
  return getFileExtension(filePath) === "pdf";
}

function openFileModal(filePath: string | null) {
  if (!filePath) return;
  selectedFilePath.value = filePath;
  isFileModalOpen.value = true;
}

function closeFileModal() {
  isFileModalOpen.value = false;
  selectedFilePath.value = null;
}

const filteredData = computed(() => {
  const payload = data.value || [];
  const keyword = searchQuery.value.trim().toLowerCase();
  if (!keyword) return payload;

  return payload.filter((item) => {
    const nik = (item.nik || "").toLowerCase();
    const name = (item.name || "").toLowerCase();
    return nik.includes(keyword) || name.includes(keyword);
  });
});

const rows = computed<CompetenceRow[]>(() => {
  const payload = filteredData.value;
  const result: CompetenceRow[] = [];

  payload.forEach((item, index) => {
    const nik = item.nik || "-";
    const name = item.name || "-";
    const competences = item.competences || [];
    const safeCompetences =
      competences.length > 0
        ? competences
        : [
            {
              id: undefined,
              released: null,
              institution: null,
              file: null,
              rating: { rating: "-" },
            },
          ];

    const rowSpan = Math.max(1, safeCompetences.length);

    safeCompetences.forEach((competence, competenceIndex) => {
      result.push({
        id: `${nik}-${competence.id || competenceIndex}`,
        no: index + 1,
        showNo: competenceIndex === 0,
        noRowSpan: rowSpan,
        nik,
        showNik: competenceIndex === 0,
        nikRowSpan: rowSpan,
        name,
        showName: competenceIndex === 0,
        nameRowSpan: rowSpan,
        competenceRating: competence.rating?.rating || "-",
        released: formatDate(competence.released),
        institution: competence.institution || "-",
        file: competence.file || null,
      });
    });
  });

  return result;
});

const errorMessage = computed(() => {
  if (!error.value) return "";
  const err = error.value as { data?: { message?: string }; message?: string };
  return err.data?.message || err.message || "Failed to load competence data.";
});

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function handlePrintPdf() {
  const printRows = rows.value;

  const tableRowsHtml = printRows
    .map((row) => {
      const noCell = row.showNo
        ? `<td rowspan="${row.noRowSpan}">${row.no}</td>`
        : "";
      const nikCell = row.showNik
        ? `<td rowspan="${row.nikRowSpan}">${escapeHtml(row.nik)}</td>`
        : "";
      const nameCell = row.showName
        ? `<td rowspan="${row.nameRowSpan}">${escapeHtml(row.name)}</td>`
        : "";

      return `
        <tr>
          ${noCell}
          ${nikCell}
          ${nameCell}
          <td>${escapeHtml(row.competenceRating)}</td>
          <td>${escapeHtml(row.released)}</td>
          <td>${escapeHtml(row.institution)}</td>
        </tr>
      `;
    })
    .join("");

  const printWindow = window.open("", "_blank", "width=1100,height=750");
  if (!printWindow) {
    toast.add({
      title: "Error",
      description: "Unable to open print window.",
      color: "error",
    });
    return;
  }

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Competence Data</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
          h2 { margin: 0 0 12px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
          th { background: #f3f4f6; text-align: center; }
          td { vertical-align: middle; }
          td:nth-child(1), td:nth-child(2), td:nth-child(4), td:nth-child(5) { text-align: center; }
          @page { size: A4 landscape; margin: 12mm; }
        </style>
      </head>
      <body>
        <h2>Competence Data</h2>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>NIK</th>
              <th>Name</th>
              <th>Competence Rating</th>
              <th>Released</th>
              <th>Institution</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml || '<tr><td colspan="6" style="text-align:center;">No data</td></tr>'}
          </tbody>
        </table>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Competence Data">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <UInput
            v-model="searchQuery"
            placeholder="Filter by NIK or Name"
            icon="i-lucide-search"
            class="w-full md:max-w-sm"
          />

          <div class="flex items-center gap-2">
            <UButton
              label="Refresh"
              color="neutral"
              variant="outline"
              icon="i-lucide-refresh-cw"
              @click="() => refresh()"
            />
            <UButton
              label="Print PDF"
              color="primary"
              variant="solid"
              icon="i-lucide-printer"
              @click="handlePrintPdf"
            />
          </div>
        </div>

        <div
          v-if="status === 'pending'"
          class="flex items-center gap-2 text-muted py-4"
        >
          <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
          Loading competence data...
        </div>

        <div
          v-else-if="error"
          class="rounded-lg border border-error/30 bg-error/5 p-4 space-y-2"
        >
          <p class="font-medium text-error">{{ errorMessage }}</p>
          <UButton
            label="Retry"
            color="error"
            variant="outline"
            icon="i-lucide-refresh-cw"
            @click="() => refresh()"
          />
        </div>

        <div v-else class="overflow-x-auto rounded-lg border">
          <table class="min-w-full text-sm border-collapse border border-default">
            <thead class="bg-muted/40">
              <tr>
                <th class="px-3 py-2 text-center font-medium border border-default">No</th>
                <th class="px-3 py-2 text-center font-medium border border-default">NIK</th>
                <th class="px-3 py-2 text-center font-medium border border-default">Name</th>
                <th class="px-3 py-2 text-center font-medium border border-default">Competence Rating</th>
                <th class="px-3 py-2 text-center font-medium border border-default">Released</th>
                <th class="px-3 py-2 text-center font-medium border border-default">Institution</th>
                <th class="px-3 py-2 text-center font-medium border border-default">File</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id">
                <td
                  v-if="row.showNo"
                  class="px-3 py-2 border border-default text-center align-middle"
                  :rowspan="row.noRowSpan"
                >
                  {{ row.no }}
                </td>
                <td
                  v-if="row.showNik"
                  class="px-3 py-2 border border-default text-center align-middle"
                  :rowspan="row.nikRowSpan"
                >
                  {{ row.nik }}
                </td>
                <td
                  v-if="row.showName"
                  class="px-3 py-2 border border-default align-middle"
                  :rowspan="row.nameRowSpan"
                >
                  {{ row.name }}
                </td>
                <td class="px-3 py-2 border border-default text-center">
                  {{ row.competenceRating }}
                </td>
                <td class="px-3 py-2 border border-default text-center">
                  {{ row.released }}
                </td>
                <td class="px-3 py-2 border border-default">
                  {{ row.institution }}
                </td>
                <td class="px-3 py-2 border border-default text-center">
                  <UButton
                    v-if="row.file"
                    icon="i-lucide-eye"
                    color="primary"
                    variant="soft"
                    size="xs"
                    @click="openFileModal(row.file)"
                  />
                </td>
              </tr>

              <tr v-if="rows.length === 0">
                <td class="px-3 py-3 text-muted border border-default text-center" colspan="7">
                  No competence data available.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <UModal
          :open="isFileModalOpen"
          title="Competence File"
          :ui="{ content: 'max-w-4xl w-full h-full' }"
          @update:open="(value) => (!value ? closeFileModal() : null)"
        >
          <template #body>
            <div style="height: 70vh">
              <div
                v-if="isImageFile(selectedFilePath)"
                class="flex h-full items-center justify-center rounded-lg border border-default bg-muted/20 p-2"
              >
                <img
                  :src="resolveFileUrl(selectedFilePath) || ''"
                  alt="Competence file"
                  class="h-full w-full rounded object-contain"
                />
              </div>

              <div
                v-else-if="isPdfFile(selectedFilePath)"
                class="h-full rounded-lg border border-default overflow-hidden"
              >
                <iframe
                  :src="resolveFileUrl(selectedFilePath) || ''"
                  style="height: 100%; width: 100%"
                  title="Competence file"
                />
              </div>

              <div
                v-else
                class="rounded-lg border border-default bg-muted/20 p-4 text-sm text-muted"
              >
                Preview is not available for this file type.
              </div>
            </div>
          </template>
          <template #footer>
            <div class="flex items-center justify-end gap-2 w-full">
              <a
                :href="resolveFileUrl(selectedFilePath) || '#'"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-primary hover:underline"
              >
                Open file in new tab
              </a>
              <UButton
                label="Close"
                color="neutral"
                variant="soft"
                @click="closeFileModal"
              />
            </div>
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>
