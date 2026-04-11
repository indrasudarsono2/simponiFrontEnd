<script setup lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();
const appDocId = route.params.appDocId as string;

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
  atsName?: string;
  address?: string;
  appRating?: AppRating[];
  rating?: string;
  location?: string;
  dateForExp?: string;
  controlHour?: string;
  briefingDate?: string;
  isConfirmRating?: boolean;
  reason?: string;
  isDrugs?: boolean;
  isFailed?: boolean;
  confirmOjt?: boolean;
  ojtId?: string;
  letterNumber?: string;
  letterDate?: string;
  license?: {
    id: string;
    user: { id: string; name: string };
    note: string;
    path: string;
  }[];
  logBook?: {
    id: string;
    user: { id: string; name: string };
    note: string;
    path: string;
  }[];

  userName?: string;
  licenseUserId?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  personalAddress?: string;
  nationality?: string;
  phoneNumber?: string;
  genderId?: { id: string; gender: string };
  medex?: {
    isConfirm?: boolean;
    released: string;
    expired: string;
    examiner: string;
  }[];
  ielp?: {
    isConfirm?: boolean;
    released: string;
    rater: string;
    institution: string;
    level: string;
  }[];

  competence?: {
    id: string;
    competenceItem: { id: string; competence: string }[];
    institution: string;
    released: string;
  }[];
}

// Fetch application doc data from verification API
const { data: appDoc, status } = await useFetch<ApplicationDoc | null>(
  `/api/verification-app-doc/${appDocId}`,
  {
    lazy: true,
    default: () => null,
  },
);

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
  return appDoc.value?.appRating?.map((r) => r.rating.rating) || [];
});

// Get latest medex (most recent by released date)
const latestMedex = computed(() => {
  if (!appDoc.value?.medex?.length) return null;
  return appDoc.value.medex.sort(
    (a, b) => new Date(b.released).getTime() - new Date(a.released).getTime(),
  )[0];
});

// Get latest ielp (most recent by released date)
const latestIelp = computed(() => {
  if (!appDoc.value?.ielp?.length) return null;
  return appDoc.value.ielp.sort(
    (a, b) => new Date(b.released).getTime() - new Date(a.released).getTime(),
  )[0];
});

// Close window - use router if window.close() doesn't work
function closeWindow() {
  try {
    window.close();
  } catch (e) {
    // Fallback: navigate back
    navigateTo("/verification/perpanjangan");
  }
}
</script>

<template>
  <UDashboardPanel v-if="appDoc">
    <template #header>
      <UDashboardNavbar :title="`Form Permohonan - ${appDoc.number}`">
        <template #leading>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            @click="closeWindow"
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
                A. PERPANJANGAN
              </td>
            </tr>
            <tr>
              <td width="150" class="border border-black p-2 font-bold">
                B. Nama ATS Unit
              </td>
              <td colspan="7" class="border border-black p-2 uppercase">
                {{ appDoc.atsName || "-" }}
              </td>
            </tr>
            <tr>
              <td width="150" class="border border-black p-2 font-bold">
                C. Alamat Kantor
              </td>
              <td colspan="7" class="border border-black p-2 uppercase">
                {{ appDoc.address || "-" }}
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
                  v-for="rating in appDoc.appRating"
                  :key="rating.id"
                  class="mb-1"
                >
                  - {{ rating.rating.rating }} ({{ rating.controlHour }} jam)
                </div>
                <div v-if="!appDoc.appRating?.length">-</div>
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
                <span class="uppercase">{{ appDoc.userName || "-" }}</span>
              </td>
              <td
                colspan="2"
                class="border border-black p-2 align-top"
                width="150"
              >
                <span class="font-bold">2.</span> Nomor Lisensi<br />
                {{ appDoc.licenseUserId || "-" }}
              </td>
              <td
                colspan="2"
                class="border border-black p-2 align-top"
                width="150"
              >
                <span class="font-bold">3.</span> Tanggal Lahir<br />
                {{ formatDate(appDoc.dateOfBirth) }}
              </td>
              <td
                colspan="2"
                class="border border-black p-2 align-top"
                width="150"
              >
                <span class="font-bold">4.</span> Tempat Lahir<br />
                {{ appDoc.placeOfBirth || "-" }}
              </td>
            </tr>
            <!-- Row 2: 5-8 -->
            <tr>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">5.</span> Alamat:<br />
                {{ appDoc.personalAddress || "-" }}
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">6.</span> Kebangsaan<br />
                {{ appDoc.nationality || "-" }}
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">7.</span> No. Telepon<br />
                <span class="uppercase">{{ appDoc.phoneNumber || "-" }}</span>
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">8.</span> Jenis Kelamin<br />
                {{ appDoc.genderId?.gender || "-" }}
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
                  appDoc.isConfirmRating ? "ya" : "tidak"
                }}</span>
              </td>
              <td
                colspan="3"
                rowspan="2"
                class="border border-black p-2 align-top"
              >
                <span class="font-bold">9b.</span> Jika Ya, alasan pengajuan
                rating?<br />
                <div class="uppercase">{{ appDoc.reason || "-" }}</div>
              </td>
              <td class="border border-black p-2 align-top">
                <span class="font-bold">9c.</span> Jenis rating<br />
                <div v-for="(r, i) in ratingsList" :key="i">- {{ r }}</div>
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">9d.</span> Lokasi rating<br />
                {{ appDoc.location || "-" }}
              </td>
            </tr>
            <tr>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">9e.</span> Masa berlaku rating:<br />
                {{ formatDate(appDoc.dateForExp) }}
              </td>
            </tr>
            <!-- Row 4: 10a-10c -->
            <tr>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">10a.</span> Apakah anda memiliki
                sertifikat kesehatan Minimal level 3?<br />
                <span class="uppercase">{{
                  latestMedex?.isConfirm ? "ya" : "tidak"
                }}</span>
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">10b.</span> Tanggal dikeluarkan<br />
                {{ formatDate(latestMedex?.released) }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">10c.</span> Nama penguji<br />
                {{ latestMedex?.examiner || "-" }}
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
                  latestIelp?.isConfirm ? "ya" : "tidak"
                }}</span>
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">11b.</span> Nama Rater<br />
                {{ latestIelp?.rater || "-" }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">11c.</span> Lembaga Pelatihan<br />
                {{ latestIelp?.institution || "-" }}
              </td>
            </tr>
            <tr>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">11d.</span> Tanggal dikeluarkan<br />
                {{ formatDate(latestIelp?.released) }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">11e.</span> Level<br />
                {{ latestIelp?.level || "-" }}
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
                  appDoc.confirmOjt ? "ya" : "tidak"
                }}</span
                ><br />
                <span class="text-xs italic"
                  >*Hanya untuk penerbitan rating</span
                >
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">12b.</span> Nomor surat<br />
                {{ appDoc.letterNumber || "" }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">12c.</span> Tanggal berakhir<br />
                {{ formatDate(appDoc.letterDate) }}
              </td>
            </tr>
            <tr>
              <td colspan="5" class="border border-black p-2 align-top">
                <span class="font-bold">12d.</span> Jumlah Jam Pemanduan<br />
                {{ appDoc.controlHour || "" }}
              </td>
            </tr>
            <tr>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">12e.</span> Nama OJTI<br />
                {{ appDoc.ojtId || "" }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">12f.</span> Nomor Lisensi<br />
                {{ appDoc.ojtId || "" }}
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
                  appDoc.isDrugs ? "ya" : "tidak"
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
            <tr v-for="comp in appDoc.competence" :key="comp.id">
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
                {{ appDoc.isFailed ? "ya" : "tidak" }}
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
                {{ appDoc.userName }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Close Button -->
        <div class="mt-6 flex justify-start">
          <UButton
            icon="i-lucide-x"
            label="Tutup"
            color="neutral"
            variant="outline"
            @click="closeWindow"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Loading State -->
  <UDashboardPanel v-else-if="status === 'pending'">
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
          label="Tutup"
          color="primary"
          @click="closeWindow"
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
