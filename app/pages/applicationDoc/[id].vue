<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import { useRoute } from "vue-router";
import { useApplicationDocStore } from "../../stores/applicationDoc";
const { token } = useAuth();

const route = useRoute();
const docId = route.params.id as string;

// Types
interface AppRating {
  id?: number;
  rating: { id: number; rating: string };
  controlHour: string;
  statusId?: number;
}

interface Verification {
  id: number;
  applicationDocId: number;
  verifiedBy: string;
  verifiedAt: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface ApplicationDoc {
  id: number;
  number: string;
  eventUser?: {
    id: number;
    eventId: number;
    userNik: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    event?: {
      id: number;
      sessionId: number;
      sectorId: number;
      remarkDocId: number;
      event: string;
      formFillingDate: string;
      startDate: string;
      finishDate: string;
      forExpiredDate: string;
      briefingFile: string;
      passingGrade: number;
      isPractical: boolean;
      isSimulator: boolean;
      createdAt: string;
      updatedAt: string;
      deletedAt: string | null;
      remarkDoc?: {
        id: number;
        remark: string;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
      };
    };
  };
  status?: {
    id: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  medex?: {
    id: number;
    isConfirmed: boolean;
    source: "ECHAIN" | "MANUAL" | "LEGACY";
    verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
    verifiedByNik?: string | null;
    verifiedAt?: string | null;
    institution: string;
    userNik: string;
    released: string;
    expired: string | null;
    examiner: string;
    file: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  ielp?: {
    id: number;
    isConfirmed: boolean;
    source: "ECHAIN" | "MANUAL" | "LEGACY";
    verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
    verifiedByNik?: string | null;
    verifiedAt?: string | null;
    userNik: string;
    released: string;
    expired: string | null;
    rater: string;
    institution: string;
    level: string;
    file: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  briefingDate?: string | null;
  appRatings?: AppRating[];
  atsName?: string;
  address?: string;
  isFailed?: boolean;
  isDrugs?: boolean;
  confirmRating?: boolean;
  reason?: string;
  location?: string;
  rating?: string;
  dateForExpired?: string;
  confirmOjt?: boolean;
  ojtNik?: string | null;
  letterNumber?: string | null;
  letterDate?: string | null;
  controlHour?: string | null;
  license?: {
    id: number;
    userNik: string;
    note: string;
    file: string;
    expiredDate: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  logbookUser?: {
    id: number;
    userNik: string;
    note: string;
    file: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  verifications?: Verification | null;
}

interface CompetenceItem {
  id: number;
  userId: string;
  ratingId: number;
  institution: string;
  released: string;
  file: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface UserData {
  nik: string;
  licenseUserId: string;
  professionInBranchId: number;
  sectorId: number;
  branchId: number;
  branchUnitId: number;
  name: string;
  password: string;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  personalAddress: string | null;
  nationality: string | null;
  phoneNumber: string | null;
  genderId: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  ielp: any[];
  medex: any[];
  logbookUsers: any[];
  license: any[];
  competences: CompetenceItem[];
}

interface ApiResponse {
  event: any[];
  applicationDoc: ApplicationDoc[];
  user: UserData | null;
  rating: any[];
  ratingReal: any[];
}

// Store
const store = useApplicationDocStore();

// Check if we have data in store
const hasStoreData = computed(() => store.isDataAvailable);

// Get current application doc from store first
const currentDoc = computed(() => {
  // Try to get from store first
  const fromStore = store.getApplicationDocById(parseInt(docId));
  if (fromStore) return fromStore;
  return null;
});

// Get user data from store
const userData = computed(() => {
  return store.user;
});

// Fetch data only if not in store or stale
const shouldFetch = computed(() => {
  return !hasStoreData.value || store.isStale;
});

const {
  data: apiResponse,
  status: dataStatus,
  error: dataError,
} = await useFetch<ApiResponse>(
  `${apiBaseUrl}/api/applicationDocument`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
    // Only fetch server-side if no store data
    server: shouldFetch.value,
    default: () => undefined as unknown as ApiResponse,
  },
);

// Save to store when fetched
watch(
  apiResponse,
  (newValue) => {
    if (newValue) {
      store.setApiResponse(newValue);
    }
  },
  { immediate: true },
);

// Format date to DD-MM-YYYY
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Get current date for signature
const currentDate = computed(() => {
  return formatDate(new Date().toISOString());
});

// Get ratings list for display
const ratingsList = computed(() => {
  return (
    currentDoc.value?.appRatings?.map((r: AppRating) => r.rating.rating) || []
  );
});
</script>

<template>
  <UDashboardPanel v-if="currentDoc && userData">
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
      <div class="max-w-4xl mx-auto p-4">
        <!-- Official Form Table -->
        <table class="w-full border-collapse border border-black text-xs">
          <!-- Header with Logo -->
          <tbody>
            <tr>
              <th width="120" class="border border-black p-2 text-center">
                <img
                  src="https://proton.iatca-jakarta.or.id/kemenhub.png"
                  alt="logo"
                  class="w-16 mx-auto"
                />
              </th>
              <th width="580" colspan="7" class="border border-black p-2">
                <div class="text-center">
                  <div class="font-bold text-sm">KEMENTERIAN PERHUBUNGAN</div>
                  <div class="font-bold text-sm">
                    DIREKTORAT JENDERAL PERHUBUNGAN UDARA
                  </div>
                  <div class="font-bold text-sm">
                    DIREKTORAT NAVIGASI PENERBANGAN
                  </div>
                  <div class="text-xs mt-1">
                    Gedung Karya, Lantai 23. Jl. Medan Merdeka Barat No.8
                    Jakarta 10130-Indonesia
                  </div>
                  <div class="text-xs">
                    Telpon: (62-21)350 6451, 3506553 Fax: (62-21)350 6663
                  </div>
                </div>
              </th>
            </tr>

            <!-- I. JENIS PERMOHONAN -->
            <tr>
              <td
                colspan="8"
                class="border border-black p-2 font-bold bg-gray-100"
              >
                I. JENIS PERMOHONAN
              </td>
            </tr>
            <tr>
              <td
                colspan="8"
                class="border border-black p-2 uppercase font-bold"
              >
                A. {{ currentDoc.eventUser?.event?.remarkDoc?.remark || "-" }}
              </td>
            </tr>
            <tr>
              <td width="150" class="border border-black p-2 font-bold">
                B. Nama ATS Unit
              </td>
              <td colspan="7" class="border border-black p-2 uppercase">
                {{ currentDoc.atsName || "-" }}
              </td>
            </tr>
            <tr>
              <td width="150" class="border border-black p-2 font-bold">
                C. Alamat Kantor
              </td>
              <td colspan="7" class="border border-black p-2 uppercase">
                {{ currentDoc.address || "-" }}
              </td>
            </tr>
            <tr>
              <td
                width="150"
                class="border border-black p-2 font-bold align-top"
              >
                D. Jenis Rating yang dimohonkan
              </td>
              <td colspan="7" class="border border-black p-2">
                <div
                  v-for="rating in currentDoc.appRatings"
                  :key="rating.id"
                  class="mb-1"
                >
                  - {{ rating.rating.rating }} ({{ rating.controlHour }} jam)
                </div>
                <div v-if="!currentDoc.appRatings?.length">-</div>
              </td>
            </tr>

            <!-- II. INFORMASI PEMOHON -->
            <tr>
              <td
                colspan="8"
                class="border border-black p-2 font-bold bg-gray-100"
              >
                II. INFORMASI PEMOHON
              </td>
            </tr>
            <!-- Row 1: 1-4 -->
            <tr>
              <td
                colspan="2"
                class="border border-black p-2 align-top"
                width="250"
              >
                <span class="font-bold">1.</span> Nama:<br />
                <span class="uppercase">{{ userData.name }}</span>
              </td>
              <td
                colspan="2"
                class="border border-black p-2 align-top"
                width="150"
              >
                <span class="font-bold">2.</span> Nomor Lisensi<br />
                {{ userData.licenseUserId }}
              </td>
              <td
                colspan="2"
                class="border border-black p-2 align-top"
                width="150"
              >
                <span class="font-bold">3.</span> Tanggal Lahir<br />
                {{ formatDate(userData.dateOfBirth) }}
              </td>
              <td
                colspan="2"
                class="border border-black p-2 align-top"
                width="150"
              >
                <span class="font-bold">4.</span> Tempat Lahir<br />
                {{ userData.placeOfBirth || "-" }}
              </td>
            </tr>
            <!-- Row 2: 5-8 -->
            <tr>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">5.</span> Alamat:<br />
                {{ userData.personalAddress || "-" }}
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">6.</span> Kebangsaan<br />
                {{ userData.nationality || "-" }}
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">7.</span> No. Telepon<br />
                <span class="uppercase">{{ userData.phoneNumber || "-" }}</span>
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">8.</span> Jenis Kelamin<br />
                {{
                  userData.genderId === "1"
                    ? "Laki-laki"
                    : userData.genderId === "2"
                      ? "Perempuan"
                      : "-"
                }}
              </td>
            </tr>
            <!-- Row 3: 9a-9e -->
            <tr>
              <td
                colspan="2"
                rowspan="2"
                class="border border-black p-2 align-top"
              >
                <span class="font-bold">9a.</span> Apakah anda pernah memiliki
                rating sebelumnya?<br />
                <span class="uppercase">{{
                  currentDoc.confirmRating ? "ya" : "tidak"
                }}</span>
              </td>
              <td
                colspan="3"
                rowspan="2"
                class="border border-black p-2 align-top"
              >
                <span class="font-bold">9b.</span> Jika Ya, alasan pengajuan
                rating?<br />
                <div class="uppercase">{{ currentDoc.reason || "-" }}</div>
              </td>
              <td class="border border-black p-2 align-top">
                <span class="font-bold">9c.</span> Jenis rating<br />
                <div v-for="(r, i) in ratingsList" :key="i">- {{ r }}</div>
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">9d.</span> Lokasi rating<br />
                {{ currentDoc.location || "-" }}
              </td>
            </tr>
            <tr>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">9e.</span> Masa berlaku rating:<br />
                {{ formatDate(currentDoc.dateForExpired) }}
              </td>
            </tr>
            <!-- Row 4: 10a-10c -->
            <tr>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">10a.</span> Apakah anda memiliki
                sertifikat kesehatan Minimal level 3?<br />
                <span class="uppercase">{{
                  currentDoc.medex?.isConfirmed ? "ya" : "tidak"
                }}</span>
                <div class="mt-1 text-xs">
                  Source: {{ currentDoc.medex?.source || "-" }}<br />
                  <template v-if="currentDoc.medex?.source === 'MANUAL'">
                    Verified by: {{ currentDoc.medex?.verifiedByNik || "-" }} · {{ formatDate(currentDoc.medex?.verifiedAt) }}
                  </template>
                </div>
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">10b.</span> Tanggal dikeluarkan<br />
                {{ formatDate(currentDoc.medex?.released) }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">10c.</span> Nama penguji<br />
                {{ currentDoc.medex?.examiner || "-" }}
              </td>
            </tr>
            <!-- Row 5: 11a-11e -->
            <tr>
              <td
                colspan="3"
                rowspan="2"
                class="border border-black p-2 align-top"
              >
                <span class="font-bold">11a.</span> Apakah anda memiliki
                sertifikat ICAO Language Proficiency?<br />
                <span class="uppercase">{{
                  currentDoc.ielp?.isConfirmed ? "ya" : "tidak"
                }}</span>
                <div class="mt-1 text-xs">
                  Source: {{ currentDoc.ielp?.source || "-" }}<br />
                  <template v-if="currentDoc.ielp?.source === 'MANUAL'">
                    Verified by: {{ currentDoc.ielp?.verifiedByNik || "-" }} · {{ formatDate(currentDoc.ielp?.verifiedAt) }}
                  </template>
                </div>
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">11b.</span> Nama Rater<br />
                {{ currentDoc.ielp?.rater || "-" }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">11c.</span> Lembaga Pelatihan<br />
                {{ currentDoc.ielp?.institution || "-" }}
              </td>
            </tr>
            <tr>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">11d.</span> Tanggal dikeluarkan<br />
                {{ formatDate(currentDoc.ielp?.released) }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">11e.</span> Level<br />
                {{ currentDoc.ielp?.level || "-" }}
              </td>
            </tr>
            <!-- Row 6: 12a-12f -->
            <tr>
              <td
                colspan="3"
                rowspan="3"
                class="border border-black p-2 align-top"
              >
                <span class="font-bold">12a.</span> Apakah ada Surat Rekomendasi
                OJTI<br />
                <span class="uppercase">{{
                  currentDoc.confirmOjt ? "ya" : "tidak"
                }}</span
                ><br />
                <span class="text-xs italic"
                  >*Hanya untuk penerbitan rating</span
                >
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">12b.</span> Nomor surat<br />
                {{ currentDoc.letterNumber || "-" }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">12c.</span> Tanggal berakhir<br />
                {{ formatDate(currentDoc.letterDate) }}
              </td>
            </tr>
            <tr>
              <td colspan="5" class="border border-black p-2 align-top">
                <span class="font-bold">12d.</span> Jumlah Jam Pemanduan<br />
                {{ currentDoc.controlHour || "-" }}
              </td>
            </tr>
            <tr>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">12e.</span> Nama OJTI<br />
                {{ currentDoc.ojtNik || "-" }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">12f.</span> Nomor Lisensi<br />
                {{ currentDoc.ojtNik || "-" }}
              </td>
            </tr>
            <!-- Row 7: 13 -->
            <tr>
              <td colspan="8" class="border border-black p-2 align-top">
                <span class="font-bold">13.</span> Apakah anda terlibat
                pelanggaran yang disebabkan oleh penggunaan obat-obatan
                terlarang, marijuana dan obat anti depresi atau obat stimulant
                atau pengoperasian kendaraan bermotor dengan pengaruh
                alkhohol?<br />
                <span class="uppercase">{{
                  currentDoc.isDrugs ? "ya" : "tidak"
                }}</span>
              </td>
            </tr>

            <!-- III. KOMPETENSI -->
            <tr>
              <td
                colspan="8"
                class="border border-black p-2 font-bold bg-gray-100"
              >
                III. JENIS SERTIFIKAT KOMPETENSI YANG DIMILIKI
              </td>
            </tr>
            <tr class="bg-gray-50">
              <td
                colspan="3"
                class="border border-black p-2 font-bold text-center"
              >
                Jenis Sertifikat Kompetensi
              </td>
              <td
                colspan="3"
                class="border border-black p-2 font-bold text-center"
              >
                Lembaga Pelatihan
              </td>
              <td
                colspan="2"
                class="border border-black p-2 font-bold text-center"
              >
                Tanggal dikeluarkan
              </td>
            </tr>
            <tr v-for="comp in userData.competences" :key="comp.id">
              <td colspan="3" class="border border-black p-2">
                - {{ comp.institution }}
              </td>
              <td colspan="3" class="border border-black p-2 text-center">
                {{ comp.institution }}
              </td>
              <td colspan="2" class="border border-black p-2 text-center">
                {{ formatDate(comp.released) }}
              </td>
            </tr>
            <tr v-if="!userData.competences?.length">
              <td
                colspan="8"
                class="border border-black p-2 text-center text-muted"
              >
                Tidak ada data kompetensi
              </td>
            </tr>

            <!-- IV. GAGAL UJIAN -->
            <tr>
              <td
                colspan="8"
                class="border border-black p-2 font-bold bg-gray-100"
              >
                IV. APAKAH ANDA PERNAH GAGAL UJIAN SEBELUMNYA, DALAM KURUN WAKTU
                30 HARI?
              </td>
            </tr>
            <tr>
              <td colspan="8" class="border border-black p-2 uppercase">
                {{ currentDoc.isFailed ? "ya" : "tidak" }}
              </td>
            </tr>

            <!-- V. PERNYATAAN -->
            <tr>
              <td
                colspan="3"
                rowspan="3"
                class="border border-black p-2 align-top font-bold"
              >
                V. PERNYATAAN VERIFIKASI PEMOHON<br />
                Saya menjamin bahwa apa yang saya tuliskan dalam form ini adalah
                benar
              </td>
              <td
                colspan="2"
                class="border border-black p-2 text-center align-top"
              >
                Tempat dan Tanggal
              </td>
              <td
                colspan="3"
                class="border border-black p-2 text-center align-top"
              >
                Tanda Tangan
              </td>
            </tr>
            <tr>
              <td
                colspan="2"
                rowspan="2"
                class="border border-black p-2 text-center align-bottom"
              >
                .................... , {{ currentDate }}
              </td>
              <td
                colspan="3"
                class="border border-black p-2 text-center"
                style="border-bottom: 0"
              >
                &nbsp;
              </td>
            </tr>
            <tr>
              <td
                colspan="3"
                class="border border-black p-2 text-center align-top"
                style="border-top: 0"
              >
                {{ userData.name }}
              </td>
            </tr>

            <!-- VI. VERIFICATION STATUS (if verified) -->
            <tr v-if="currentDoc.verifications">
              <td
                colspan="8"
                class="border border-black p-2 font-bold bg-green-100"
              >
                VI. STATUS VERIFIKASI
              </td>
            </tr>
            <tr v-if="currentDoc.verifications">
              <td colspan="4" class="border border-black p-2">
                <span class="font-bold">Diverifikasi oleh:</span><br />
                {{ currentDoc.verifications.verifiedBy }}
              </td>
              <td colspan="4" class="border border-black p-2">
                <span class="font-bold">Tanggal Verifikasi:</span><br />
                {{ formatDate(currentDoc.verifications.verifiedAt) }}
              </td>
            </tr>
            <tr v-if="currentDoc.verifications?.notes">
              <td colspan="8" class="border border-black p-2">
                <span class="font-bold">Catatan:</span><br />
                {{ currentDoc.verifications.notes }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Back Button -->
        <div class="mt-6 flex justify-start">
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

  <!-- Loading State -->
  <UDashboardPanel v-else-if="dataStatus === 'pending'">
    <template #header>
      <UDashboardNavbar title="Memuat Data..." />
    </template>
    <template #body>
      <div class="flex flex-col items-center justify-center py-12">
        <UIcon
          name="i-lucide-loader-2"
          class="text-4xl text-muted mb-4 animate-spin"
        />
        <p class="text-muted">Memuat data formulir...</p>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Error State -->
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

<style scoped>
table {
  border-collapse: collapse;
}
td,
th {
  border: 1px solid black;
}
</style>
