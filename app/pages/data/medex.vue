<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import CredentialHistoryModal from "../../components/credential/CredentialHistoryModal.vue";

interface MedexItem {
  id?: number;
  expired?: string | null;
  file?: string | null;
}

interface MedexApiItem {
  nik?: string | null;
  name?: string | null;
  medex?: MedexItem[] | null;
}

interface MedexRow {
  no: number;
  nik: string;
  name: string;
  expired: string;
  expiredRaw: string | null;
  file: string | null;
  credentialId: number | null;
}

const { token } = useAuth();
const toast = useToast();

const searchQuery = ref("");
const isFileModalOpen = ref(false);
const selectedFilePath = ref<string | null>(null);
const isHistoryModalOpen = ref(false);
const selectedCredentialId = ref<number | null>(null);

const { data, status, error, refresh } = await useFetch<MedexApiItem[]>(
  `${apiBaseUrl}/api/dataCheckerMedex`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
    default: () => [],
  },
);

function getLatestMedex(medexList?: MedexItem[] | null): MedexItem | null {
  if (!medexList || medexList.length === 0) return null;
  return (
    [...medexList].sort((a, b) => {
      const aTime = a.expired ? new Date(a.expired).getTime() : -Infinity;
      const bTime = b.expired ? new Date(b.expired).getTime() : -Infinity;
      return bTime - aTime;
    })[0] || null
  );
}

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

function daysUntil(expiredDate?: string | null): number | null {
  if (!expiredDate) return null;
  const expired = new Date(expiredDate);
  if (Number.isNaN(expired.getTime())) return null;

  const now = new Date();
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiredStart = new Date(
    expired.getFullYear(),
    expired.getMonth(),
    expired.getDate(),
  );
  const diffTime = expiredStart.getTime() - nowStart.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getExpiredCellClass(expiredDate?: string | null): string {
  const days = daysUntil(expiredDate);
  if (days === null) return "";
  if (days < 30) return "bg-red-100 text-red-800";
  if (days <= 60) return "bg-orange-100 text-orange-800";
  return "";
}

function getPrintExpiredCellStyle(expiredDate?: string | null): string {
  const days = daysUntil(expiredDate);
  if (days === null) return "";
  if (days < 30) return "background:#fee2e2;color:#991b1b;";
  if (days <= 60) return "background:#ffedd5;color:#9a3412;";
  return "";
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

function openHistory(credentialId: number | null) {
  if (!credentialId) return;
  selectedCredentialId.value = credentialId;
  isHistoryModalOpen.value = true;
}

const rows = computed<MedexRow[]>(() => {
  const payload = data.value || [];

  return payload.map((item, index) => {
    const latestMedex = getLatestMedex(item.medex);

    return {
      no: index + 1,
      nik: item.nik || "-",
      name: item.name || "-",
      expired: formatDate(latestMedex?.expired || null),
      expiredRaw: latestMedex?.expired || null,
      file: latestMedex?.file || null,
      credentialId: latestMedex?.id || null,
    };
  });
});

const filteredRows = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  if (!keyword) return rows.value;

  return rows.value.filter((row) => {
    return (
      row.nik.toLowerCase().includes(keyword) ||
      row.name.toLowerCase().includes(keyword)
    );
  });
});

const errorMessage = computed(() => {
  if (!error.value) return "";
  const err = error.value as { data?: { message?: string }; message?: string };
  return err.data?.message || err.message || "Failed to load MEDEX data.";
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
  const printableRows = filteredRows.value;

  const tableRowsHtml = printableRows
    .map((row) => {
      const style = getPrintExpiredCellStyle(row.expiredRaw);
      return `
        <tr>
          <td>${row.no}</td>
          <td>${escapeHtml(row.nik)}</td>
          <td>${escapeHtml(row.name)}</td>
          <td style="${style}">${escapeHtml(row.expired)}</td>
        </tr>
      `;
    })
    .join("");

  const printWindow = window.open("", "_blank", "width=1000,height=700");
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
        <title>MEDEX Data</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
          h2 { margin: 0 0 12px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
          th { background: #f3f4f6; text-align: center; }
          td:nth-child(1), td:nth-child(2), td:nth-child(4) { text-align: center; }
          @page { size: A4 portrait; margin: 12mm; }
        </style>
      </head>
      <body>
        <h2>MEDEX Data</h2>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>NIK</th>
              <th>Name</th>
              <th>Expired Date</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml || '<tr><td colspan="4" style="text-align:center;">No data</td></tr>'}
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
      <UDashboardNavbar title="MEDEX Data">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <div
          class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        >
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
          Loading MEDEX data...
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
          <table
            class="min-w-full text-sm border-collapse border border-default"
          >
            <thead class="bg-muted/40">
              <tr>
                <th
                  class="px-3 py-2 text-center font-medium border border-default"
                >
                  No
                </th>
                <th
                  class="px-3 py-2 text-center font-medium border border-default"
                >
                  NIK
                </th>
                <th
                  class="px-3 py-2 text-center font-medium border border-default"
                >
                  Name
                </th>
                <th
                  class="px-3 py-2 text-center font-medium border border-default"
                >
                  Expired Date
                </th>
                <th
                  class="px-3 py-2 text-center font-medium border border-default"
                >
                  File
                </th>
                <th class="px-3 py-2 text-center font-medium border border-default">History</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filteredRows" :key="`${row.nik}-${row.no}`">
                <td class="px-3 py-2 border border-default text-center">
                  {{ row.no }}
                </td>
                <td class="px-3 py-2 border border-default text-center">
                  {{ row.nik }}
                </td>
                <td class="px-3 py-2 border border-default">{{ row.name }}</td>
                <td
                  class="px-3 py-2 border border-default text-center"
                  :class="getExpiredCellClass(row.expiredRaw)"
                >
                  {{ row.expired }}
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
                <td class="px-3 py-2 border border-default text-center">
                  <UButton
                    v-if="row.credentialId"
                    icon="i-lucide-history"
                    label="History"
                    color="neutral"
                    variant="soft"
                    size="xs"
                    @click="openHistory(row.credentialId)"
                  />
                  <span v-else class="text-muted">-</span>
                </td>
              </tr>

              <tr v-if="filteredRows.length === 0">
                <td
                  class="px-3 py-3 text-muted border border-default text-center"
                  colspan="6"
                >
                  No MEDEX data available.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <UModal
          :open="isFileModalOpen"
          title="MEDEX File"
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
                  alt="MEDEX file"
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
                  title="MEDEX file"
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
        <CredentialHistoryModal
          v-model:open="isHistoryModalOpen"
          credential-type="medex"
          :credential-id="selectedCredentialId"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
