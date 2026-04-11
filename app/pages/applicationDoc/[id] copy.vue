<script setup lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();
const docId = route.params.id as string;

// Types
interface AppRating {
  id?: string;
  rating: { id: string; rating: string };
  controlHour: number;
  statusId?: { id: string; status: string };
}

interface ApplicationDoc {
  id: string;
  number: string;
  eventUser?: {
    id: string;
    event?: {
      id: string;
      event?: string;
      remarkDoc?: { id: string; remark: string };
    };
  };
  statusId?: { id: string; status: string };
  medex?: {
    id: string;
    isConfirm?: boolean;
    released: string;
    expired: string;
    examiner: string;
    institution?: string;
    file?: string;
  };
  ielp?: {
    id: string;
    isConfirm?: boolean;
    released: string;
    expired: string;
    rater: string;
    institution: string;
    level: string;
    file?: string;
  };
  briefingDate?: string;
  appRating?: AppRating[];
  atsName?: string;
  address?: string;
  isFailed?: boolean;
  isDrugs?: boolean;
  isConfirmRating?: boolean;
  reason?: string;
  location?: string;
  rating?: string;
  dateForExp?: string;
  confirmOjt?: boolean;
  ojtId?: string;
  letterNumber?: string;
  letterDate?: string;
  controlHour?: string;
  license?: {
    id: string;
    user: { id: string; name: string };
    note: string;
    path: string;
  };
  logBook?: {
    id: string;
    user: { id: string; name: string };
    note: string;
    path: string;
  };
}

interface CompetenceItem {
  id: string;
  competence: string;
}

interface Competence {
  id: string;
  competenceItem: CompetenceItem[];
  institution: string;
  released: string;
  file: string;
}

interface UserData {
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
  competence: Competence[];
  applicationDoc: ApplicationDoc[];
}

// Fetch user data
const {
  data: userData,
  status: userStatus,
  error: userError,
} = await useFetch<UserData[]>("/api/users", {
  lazy: true,
  default: () => [],
});

// Debug logging
watch(
  userData,
  (newData) => {
    console.log("[FORM VIEW] User data loaded:", newData);
    console.log("[FORM VIEW] Looking for INDRA SUDARSONO...");
    const indra = newData?.find((u) => u.name === "INDRA SUDARSONO");
    console.log("[FORM VIEW] INDRA found:", indra);
    console.log("[FORM VIEW] Looking for doc ID:", docId);
    console.log("[FORM VIEW] INDRA applicationDocs:", indra?.applicationDoc);
    const doc = indra?.applicationDoc?.find((d) => d.id === docId);
    console.log("[FORM VIEW] Current doc found:", doc);
  },
  { immediate: true },
);

// Get INDRA's data
const indraData = computed(() => {
  return userData.value?.find((u) => u.name === "INDRA SUDARSONO");
});

// Get current application doc
const currentDoc = computed(() => {
  return indraData.value?.applicationDoc?.find((d) => d.id === docId);
});

// Format date
function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Get current date for signature
const currentDate = computed(() => {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
});
</script>

<template>
  <!-- Debug Info -->
  <div v-if="userStatus === 'pending'" class="p-4 bg-info/10">
    <p>Loading user data...</p>
  </div>
  <div v-else-if="userError" class="p-4 bg-error/10">
    <p class="text-error">Error loading data: {{ userError.message }}</p>
  </div>
  <div v-else-if="!indraData" class="p-4 bg-warning/10">
    <p>INDRA SUDARSONO not found in user data</p>
    <p class="text-xs">Users loaded: {{ userData?.length || 0 }}</p>
  </div>
  <div v-else-if="!currentDoc" class="p-4 bg-warning/10">
    <p>Document with ID "{{ docId }}" not found</p>
    <p class="text-xs">
      INDRA has {{ indraData.applicationDoc?.length || 0 }} application docs
    </p>
    <p class="text-xs">
      Available IDs: {{ indraData.applicationDoc?.map((d) => d.id).join(", ") }}
    </p>
  </div>

  <UDashboardPanel v-if="currentDoc && indraData">
    <template #header>
      <UDashboardNavbar :title="`Form Permohonan - ${currentDoc.number}`">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/applicationDoc"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-4xl mx-auto space-y-8 pb-12">
        <!-- Header -->
        <div class="text-center border-b pb-4">
          <h1 class="text-xl font-bold">FORMULIR PERMOHONAN RATING</h1>
          <p class="text-sm text-muted mt-1">
            No. Dokumen: {{ currentDoc.number }}
          </p>
        </div>

        <!-- I. JENIS PERMOHONAN -->
        <section class="space-y-4">
          <h2 class="text-lg font-semibold border-b pb-2">
            I. JENIS PERMOHONAN
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm text-muted">Jenis Permohonan</label>
              <p class="font-medium">
                {{ currentDoc.eventUser?.event?.remarkDoc?.remark || "-" }}
              </p>
            </div>

            <div>
              <label class="text-sm text-muted">Nama ATS Unit</label>
              <p class="font-medium">{{ currentDoc.atsName || "-" }}</p>
            </div>

            <div class="md:col-span-2">
              <label class="text-sm text-muted">Alamat Kantor</label>
              <p class="font-medium">{{ currentDoc.address || "-" }}</p>
            </div>
          </div>

          <div>
            <label class="text-sm text-muted block mb-2"
              >Jenis Rating yang Dimohonkan</label
            >
            <div class="flex flex-wrap gap-2">
              <span
                v-for="rating in currentDoc.appRating"
                :key="rating.id"
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary"
              >
                {{ rating.rating.rating }} ({{ rating.controlHour }} jam)
              </span>
              <span v-if="!currentDoc.appRating?.length" class="text-muted"
                >-</span
              >
            </div>
          </div>
        </section>

        <!-- II. INFORMASI PEMOHON -->
        <section class="space-y-4">
          <h2 class="text-lg font-semibold border-b pb-2">
            II. INFORMASI PEMOHON
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- 1-8 Basic Info -->
            <div>
              <label class="text-sm text-muted">1. Nama</label>
              <p class="font-medium">{{ indraData.name }}</p>
            </div>

            <div>
              <label class="text-sm text-muted">2. Nomor Lisensi</label>
              <p class="font-medium">{{ indraData.licenseUserId }}</p>
            </div>

            <div>
              <label class="text-sm text-muted">3. Tanggal Lahir</label>
              <p class="font-medium">{{ formatDate(indraData.dateOfBirth) }}</p>
            </div>

            <div>
              <label class="text-sm text-muted">4. Tempat Lahir</label>
              <p class="font-medium">{{ indraData.placeOfBirth }}</p>
            </div>

            <div class="md:col-span-2">
              <label class="text-sm text-muted">5. Alamat</label>
              <p class="font-medium">{{ indraData.personalAddress }}</p>
            </div>

            <div>
              <label class="text-sm text-muted">6. Kebangsaan</label>
              <p class="font-medium">{{ indraData.nationality }}</p>
            </div>

            <div>
              <label class="text-sm text-muted">7. No. Telepon</label>
              <p class="font-medium">{{ indraData.phoneNumber }}</p>
            </div>

            <div>
              <label class="text-sm text-muted">8. Jenis Kelamin</label>
              <p class="font-medium">{{ indraData.gender?.gender }}</p>
            </div>
          </div>

          <!-- 9. Rating Sebelumnya -->
          <div class="border-t pt-4 mt-4 space-y-2">
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted"
                >9a. Apakah anda pernah memiliki rating sebelumnya?</span
              >
              <UBadge
                :color="currentDoc.isConfirmRating ? 'success' : 'neutral'"
                variant="soft"
                size="sm"
              >
                {{ currentDoc.isConfirmRating ? "Ya" : "Tidak" }}
              </UBadge>
            </div>

            <template v-if="currentDoc.isConfirmRating">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
                <div>
                  <label class="text-sm text-muted">9b. Alasan Pengajuan</label>
                  <p class="font-medium">{{ currentDoc.reason || "-" }}</p>
                </div>
                <div>
                  <label class="text-sm text-muted">9c. Jenis Rating</label>
                  <p class="font-medium">{{ currentDoc.rating || "-" }}</p>
                </div>
                <div>
                  <label class="text-sm text-muted">9d. Lokasi Rating</label>
                  <p class="font-medium">{{ currentDoc.location || "-" }}</p>
                </div>
                <div>
                  <label class="text-sm text-muted"
                    >9e. Masa Berlaku Rating</label
                  >
                  <p class="font-medium">
                    {{ formatDate(currentDoc.dateForExp) }}
                  </p>
                </div>
              </div>
            </template>
          </div>

          <!-- 10. Medex -->
          <div class="border-t pt-4 mt-4 space-y-2">
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted"
                >10a. Apakah anda memiliki sertifikat Kesehatan minimal level
                3?</span
              >
              <UBadge
                :color="currentDoc.medex?.isConfirm ? 'success' : 'neutral'"
                variant="soft"
                size="sm"
              >
                {{ currentDoc.medex?.isConfirm ? "Ya" : "Tidak" }}
              </UBadge>
            </div>

            <template v-if="currentDoc.medex?.isConfirm">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
                <div>
                  <label class="text-sm text-muted"
                    >10b. Tanggal Dikeluarkan</label
                  >
                  <p class="font-medium">
                    {{ formatDate(currentDoc.medex?.released) }}
                  </p>
                </div>
                <div>
                  <label class="text-sm text-muted">10c. Nama Penguji</label>
                  <p class="font-medium">{{ currentDoc.medex?.examiner }}</p>
                </div>
              </div>
            </template>
          </div>

          <!-- 11. IELP -->
          <div class="border-t pt-4 mt-4 space-y-2">
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted"
                >11a. Apakah anda memiliki sertifikat ICAO Language
                Proficiency?</span
              >
              <UBadge
                :color="currentDoc.ielp?.isConfirm ? 'success' : 'neutral'"
                variant="soft"
                size="sm"
              >
                {{ currentDoc.ielp?.isConfirm ? "Ya" : "Tidak" }}
              </UBadge>
            </div>

            <template v-if="currentDoc.ielp?.isConfirm">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
                <div>
                  <label class="text-sm text-muted">11b. Nama Rater</label>
                  <p class="font-medium">{{ currentDoc.ielp?.rater }}</p>
                </div>
                <div>
                  <label class="text-sm text-muted"
                    >11c. Lembaga Pelatihan</label
                  >
                  <p class="font-medium">{{ currentDoc.ielp?.institution }}</p>
                </div>
                <div>
                  <label class="text-sm text-muted"
                    >11d. Tanggal Dikeluarkan</label
                  >
                  <p class="font-medium">
                    {{ formatDate(currentDoc.ielp?.released) }}
                  </p>
                </div>
                <div>
                  <label class="text-sm text-muted">11e. Level</label>
                  <p class="font-medium">{{ currentDoc.ielp?.level }}</p>
                </div>
              </div>
            </template>
          </div>

          <!-- 12. OJT -->
          <div class="border-t pt-4 mt-4 space-y-2">
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted"
                >12a. Apakah ada Surat Rekomendasi OJTI?</span
              >
              <UBadge
                :color="currentDoc.confirmOjt ? 'success' : 'neutral'"
                variant="soft"
                size="sm"
              >
                {{ currentDoc.confirmOjt ? "Ya" : "Tidak" }}
              </UBadge>
            </div>

            <template v-if="currentDoc.confirmOjt">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
                <div>
                  <label class="text-sm text-muted">12b. Nomor Surat</label>
                  <p class="font-medium">
                    {{ currentDoc.letterNumber || "-" }}
                  </p>
                </div>
                <div>
                  <label class="text-sm text-muted"
                    >12c. Tanggal Berakhir</label
                  >
                  <p class="font-medium">
                    {{ formatDate(currentDoc.letterDate) }}
                  </p>
                </div>
                <div>
                  <label class="text-sm text-muted"
                    >12d. Jumlah Jam Pemanduan</label
                  >
                  <p class="font-medium">{{ currentDoc.controlHour || "-" }}</p>
                </div>
                <div>
                  <label class="text-sm text-muted">12e. Nama OJTI</label>
                  <p class="font-medium">{{ currentDoc.ojtId || "-" }}</p>
                </div>
                <div>
                  <label class="text-sm text-muted"
                    >12f. Nomor Lisensi OJTI</label
                  >
                  <p class="font-medium">{{ currentDoc.ojtId || "-" }}</p>
                </div>
              </div>
            </template>
          </div>

          <!-- 13. Drugs -->
          <div class="border-t pt-4 mt-4">
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted"
                >13. Apakah anda terlibat pelanggaran obat-obatan
                terlarang/alkohol?</span
              >
              <UBadge
                :color="currentDoc.isDrugs ? 'error' : 'success'"
                variant="soft"
                size="sm"
              >
                {{ currentDoc.isDrugs ? "Ya" : "Tidak" }}
              </UBadge>
            </div>
          </div>
        </section>

        <!-- III. KOMPETENSI -->
        <section class="space-y-4">
          <h2 class="text-lg font-semibold border-b pb-2">
            III. JENIS SERTIFIKAT KOMPETENSI YANG DIMILIKI
          </h2>

          <div v-if="indraData.competence?.length" class="space-y-3">
            <div
              v-for="comp in indraData.competence"
              :key="comp.id"
              class="flex items-center justify-between p-3 bg-elevated/50 rounded-lg"
            >
              <div>
                <p class="font-medium">
                  {{ comp.competenceItem.map((c) => c.competence).join(", ") }}
                </p>
                <p class="text-sm text-muted">{{ comp.institution }}</p>
              </div>
              <span class="text-sm text-muted">{{
                formatDate(comp.released)
              }}</span>
            </div>
          </div>
          <p v-else class="text-muted">Tidak ada data kompetensi</p>
        </section>

        <!-- IV. GAGAL UJIAN -->
        <section class="space-y-4">
          <h2 class="text-lg font-semibold border-b pb-2">
            IV. APAKAH ANDA PERNAH GAGAL UJIAN SEBELUMNYA, DALAM KURUN WAKTU 30
            HARI?
          </h2>

          <div class="flex items-center gap-2">
            <UBadge
              :color="currentDoc.isFailed ? 'error' : 'success'"
              variant="soft"
              size="sm"
            >
              {{ currentDoc.isFailed ? "Ya" : "Tidak" }}
            </UBadge>
          </div>
        </section>

        <!-- V. PERNYATAAN -->
        <section class="space-y-6 border-t pt-6">
          <h2 class="text-lg font-semibold">
            V. PERNYATAAN VERIFIKASI PEMOHON
          </h2>

          <p class="text-sm">
            Saya menjamin bahwa apa yang saya tuliskan dalam form ini adalah
            benar
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <div>
              <p class="text-sm text-muted mb-8">Tempat dan Tanggal</p>
              <p class="font-medium">Jakarta, {{ currentDate }}</p>
            </div>

            <div class="text-center">
              <p class="text-sm text-muted mb-8">Tanda Tangan</p>
              <div class="border-b border-default w-48 mx-auto pt-12">
                <p class="font-medium">{{ indraData.name }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Back Button -->
        <div class="flex justify-start pt-6 border-t">
          <UButton
            icon="i-lucide-arrow-left"
            label="Kembali ke Daftar"
            color="neutral"
            variant="outline"
            to="/applicationDoc"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Empty State -->
  <UDashboardPanel v-else>
    <template #header>
      <UDashboardNavbar title="Dokumen Tidak Ditemukan" />
    </template>
    <template #body>
      <div class="flex flex-col items-center justify-center py-12">
        <UIcon name="i-lucide-file-x" class="text-4xl text-muted mb-4" />
        <p class="text-muted">Dokumen tidak ditemukan</p>
        <UButton
          class="mt-4"
          label="Kembali"
          color="primary"
          to="/applicationDoc"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
