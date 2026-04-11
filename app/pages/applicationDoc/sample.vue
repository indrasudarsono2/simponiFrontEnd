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

// Get INDRA's data
const indraData = computed(() => {
  return userData.value?.find((u) => u.name === "INDRA SUDARSONO");
});

// Get current application doc
const currentDoc = computed(() => {
  return indraData.value?.applicationDoc?.find((d) => d.id === docId);
});

// Format date to DD-MM-YYYY
function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
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
  return currentDoc.value?.appRating?.map((r) => r.rating.rating) || [];
});
</script>

<template>
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
                  v-for="rating in currentDoc.appRating"
                  :key="rating.id"
                  class="mb-1"
                >
                  - {{ rating.rating.rating }} ({{ rating.controlHour }} jam)
                </div>
                <div v-if="!currentDoc.appRating?.length">-</div>
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
                <span class="uppercase">{{ indraData.name }}</span>
              </td>
              <td
                colspan="2"
                class="border border-black p-2 align-top"
                width="150"
              >
                <span class="font-bold">2.</span> Nomor Lisensi<br />
                {{ indraData.licenseUserId }}
              </td>
              <td
                colspan="2"
                class="border border-black p-2 align-top"
                width="150"
              >
                <span class="font-bold">3.</span> Tanggal Lahir<br />
                {{ formatDate(indraData.dateOfBirth) }}
              </td>
              <td
                colspan="2"
                class="border border-black p-2 align-top"
                width="150"
              >
                <span class="font-bold">4.</span> Tempat Lahir<br />
                {{ indraData.placeOfBirth }}
              </td>
            </tr>
            <!-- Row 2: 5-8 -->
            <tr>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">5.</span> Alamat:<br />
                {{ indraData.personalAddress }}
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">6.</span> Kebangsaan<br />
                {{ indraData.nationality }}
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">7.</span> No. Telepon<br />
                <span class="uppercase">{{ indraData.phoneNumber }}</span>
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">8.</span> Jenis Kelamin<br />
                {{ indraData.gender?.gender }}
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
                  currentDoc.isConfirmRating ? "ya" : "tidak"
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
                {{ formatDate(currentDoc.dateForExp) }}
              </td>
            </tr>
            <!-- Row 4: 10a-10c -->
            <tr>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">10a.</span> Apakah anda memiliki
                sertifikat kesehatan Minimal level 3?<br />
                <span class="uppercase">{{
                  currentDoc.medex?.isConfirm ? "ya" : "tidak"
                }}</span>
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">10b.</span> Tanggal dikeluarkan<br />
                {{ formatDate(currentDoc.medex?.released) }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">10c.</span> Nama penguji<br />
                {{ currentDoc.medex?.examiner }}
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
                  currentDoc.ielp?.isConfirm ? "ya" : "tidak"
                }}</span>
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">11b.</span> Nama Rater<br />
                {{ currentDoc.ielp?.rater }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">11c.</span> Lembaga Pelatihan<br />
                {{ currentDoc.ielp?.institution }}
              </td>
            </tr>
            <tr>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">11d.</span> Tanggal dikeluarkan<br />
                {{ formatDate(currentDoc.ielp?.released) }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">11e.</span> Level<br />
                {{ currentDoc.ielp?.level }}
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
                {{ currentDoc.letterNumber || "" }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">12c.</span> Tanggal berakhir<br />
                {{ formatDate(currentDoc.letterDate) }}
              </td>
            </tr>
            <tr>
              <td colspan="5" class="border border-black p-2 align-top">
                <span class="font-bold">12d.</span> Jumlah Jam Pemanduan<br />
                {{ currentDoc.controlHour || "" }}
              </td>
            </tr>
            <tr>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">12e.</span> Nama OJTI<br />
                {{ currentDoc.ojtId || "" }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">12f.</span> Nomor Lisensi<br />
                {{ currentDoc.ojtId || "" }}
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
            <tr v-for="comp in indraData.competence" :key="comp.id">
              <td colspan="3" class="border border-black p-2">
                <div v-for="item in comp.competenceItem" :key="item.id">
                  - {{ item.competence }}
                </div>
              </td>
              <td colspan="3" class="border border-black p-2 text-center">
                {{ comp.institution }}
              </td>
              <td colspan="2" class="border border-black p-2 text-center">
                {{ formatDate(comp.released) }}
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
                {{ indraData.name }}
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
  <UDashboardPanel v-else-if="userStatus === 'pending'">
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
