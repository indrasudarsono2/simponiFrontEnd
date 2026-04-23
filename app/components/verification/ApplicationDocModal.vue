<script setup lang="ts">
import ip from "../../utils/config.json";

interface Props {
  isOpen: boolean;
  applicationDoc: any;
  userData: any;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "close"): void;
}>();

function formatDate(dateString: string): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function close() {
  emit("close");
}

function resolveFileUrl(filePath?: string | null): string | null {
  if (!filePath) return null;
  if (/^https?:\/\//i.test(filePath)) return filePath;
  return `http://${ip.ipBackEnd}${filePath}`;
}

function getFileExtension(filePath?: string | null): string {
  if (!filePath) return "";
  const cleanPath = filePath.split("?")[0] ?? "";
  const ext = cleanPath.split(".").pop();
  return (ext || "").toLowerCase();
}

function isImageFile(filePath?: string | null): boolean {
  const ext = getFileExtension(filePath);
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);
}

function isPdfFile(filePath?: string | null): boolean {
  return getFileExtension(filePath) === "pdf";
}

const attachmentFiles = computed(() => [
  {
    key: "ielp",
    label: "File IELP",
    path: props.applicationDoc?.ielp?.file || null,
  },
  {
    key: "medex",
    label: "File MEDEX",
    path: props.applicationDoc?.medex?.file || null,
  },
  {
    key: "logbook",
    label: "File Logbook",
    path: props.applicationDoc?.logbook?.file || null,
  },
  {
    key: "license",
    label: "File License",
    path: props.applicationDoc?.license?.file || null,
  },
]);

const ojtDisplayName = computed(() => {
  return (
    props.applicationDoc?.ojtUser?.name ||
    props.applicationDoc?.ojtName ||
    props.applicationDoc?.ojtiName ||
    "-"
  );
});

const ojtDisplayLicenseId = computed(() => {
  return (
    props.applicationDoc?.ojtUser?.licenseUserId ||
    props.applicationDoc?.ojtLicenseId ||
    props.applicationDoc?.ojtId ||
    "-"
  );
});

const genderDisplay = computed(() => {
  const directGender =
    props.applicationDoc?.gender?.gender ||
    props.applicationDoc?.user?.gender?.gender ||
    props.userData?.gender?.gender;
  if (directGender) return directGender;

  const genderId =
    props.applicationDoc?.user?.genderId ??
    props.applicationDoc?.genderId ??
    props.userData?.genderId;

  if (String(genderId) === "1") return "Laki-laki";
  if (String(genderId) === "2") return "Perempuan";
  return "-";
});
</script>

<template>
  <div
    v-if="isOpen"
    class="bg-white rounded-lg shadow-xl w-full max-h-[90vh] flex flex-col overflow-hidden"
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200">
      <h3 class="text-lg font-semibold">
        Form Permohonan - {{ applicationDoc?.number || "-" }}
      </h3>
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
      <div v-if="applicationDoc && userData" class="max-w-5xl mx-auto p-4">
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
                A.
                {{ applicationDoc.eventUser?.event?.remarkDoc?.remark || "-" }}
              </td>
            </tr>
            <tr>
              <td width="150" class="border border-black p-2 font-bold">
                B. Nama ATS Unit
              </td>
              <td colspan="7" class="border border-black p-2 uppercase">
                {{ applicationDoc.atsName || "-" }}
              </td>
            </tr>
            <tr>
              <td width="150" class="border border-black p-2 font-bold">
                C. Alamat Kantor
              </td>
              <td colspan="7" class="border border-black p-2 uppercase">
                {{ applicationDoc.address || "-" }}
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
                  v-for="rating in applicationDoc.appRatings"
                  :key="rating.id"
                  class="mb-1"
                >
                  - {{ rating.rating?.rating || "-" }} ({{
                    rating.controlHour || "-"
                  }}
                  jam)
                </div>
                <div v-if="!applicationDoc.appRatings?.length">-</div>
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
                <span class="uppercase">{{ userData.name || "-" }}</span>
              </td>
              <td
                colspan="2"
                class="border border-black p-2 align-top"
                width="150"
              >
                <span class="font-bold">2.</span> Nomor Lisensi<br />
                {{ userData.licenseUserId || "-" }}
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
                {{ genderDisplay }}
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
                  applicationDoc.confirmRating ? "ya" : "tidak"
                }}</span>
              </td>
              <td
                colspan="3"
                rowspan="2"
                class="border border-black p-2 align-top"
              >
                <span class="font-bold">9b.</span> Jika Ya, alasan pengajuan
                rating?<br />
                <div class="uppercase">
                  {{ applicationDoc.reason || "-" }}
                </div>
              </td>
              <td class="border border-black p-2 align-top">
                <span class="font-bold">9c.</span> Jenis rating<br />
                <div
                  v-for="(r, i) in applicationDoc.rating
                    ? JSON.parse(applicationDoc.rating)
                    : []"
                  :key="i"
                >
                  - {{ r }}
                </div>
                <div v-if="!applicationDoc.rating">-</div>
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">9d.</span> Lokasi rating<br />
                {{ applicationDoc.location || "-" }}
              </td>
            </tr>
            <tr>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">9e.</span> Masa berlaku rating:<br />
                {{ formatDate(applicationDoc.dateForExpired) }}
              </td>
            </tr>
            <!-- Row 4: 10a-10c -->
            <tr>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">10a.</span> Apakah anda memiliki
                sertifikat kesehatan Minimal level 3?<br />
                <span class="uppercase">{{
                  applicationDoc.medex?.isConfirmed ? "ya" : "tidak"
                }}</span>
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">10b.</span> Tanggal dikeluarkan<br />
                {{ formatDate(applicationDoc.medex?.released) }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">10c.</span> Nama penguji<br />
                {{ applicationDoc.medex?.examiner || "-" }}
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
                  applicationDoc.ielp?.isConfirmed ? "ya" : "tidak"
                }}</span>
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">11b.</span> Nama Rater<br />
                {{ applicationDoc.ielp?.rater || "-" }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">11c.</span> Lembaga Pelatihan<br />
                {{ applicationDoc.ielp?.institution || "-" }}
              </td>
            </tr>
            <tr>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">11d.</span> Tanggal dikeluarkan<br />
                {{ formatDate(applicationDoc.ielp?.released) }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">11e.</span> Level<br />
                {{ applicationDoc.ielp?.level || "-" }}
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
                  applicationDoc.confirmOjt ? "ya" : "tidak"
                }}</span
                ><br />
                <span class="text-xs italic"
                  >*Hanya untuk penerbitan rating</span
                >
              </td>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">12b.</span> Nomor surat<br />
                {{ applicationDoc.letterNumber || "-" }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">12c.</span> Tanggal berakhir<br />
                {{ formatDate(applicationDoc.letterDate) }}
              </td>
            </tr>
            <tr>
              <td colspan="5" class="border border-black p-2 align-top">
                <span class="font-bold">12d.</span> Jumlah Jam Pemanduan<br />
                {{ applicationDoc.controlHour || "-" }}
              </td>
            </tr>
            <tr>
              <td colspan="2" class="border border-black p-2 align-top">
                <span class="font-bold">12e.</span> Nama OJTI<br />
                {{ ojtDisplayName }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">12f.</span> Nomor Lisensi<br />
                {{ ojtDisplayLicenseId }}
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
                  applicationDoc.isDrugs ? "ya" : "tidak"
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
            <tr v-for="comp in userData.competences || []" :key="comp.id">
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
                {{ applicationDoc.isFailed ? "ya" : "tidak" }}
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
                .................... ,
                {{
                  new Date()
                    .toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                    .replace(/\//g, "-")
                }}
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
                {{ userData.name || "-" }}
              </td>
            </tr>

            <!-- VI. VERIFICATION STATUS (if verified) -->
            <tr v-if="applicationDoc.verifications">
              <td
                colspan="8"
                class="border border-black p-2 font-bold bg-green-100"
              >
                VI. STATUS VERIFIKASI
              </td>
            </tr>
            <tr v-if="applicationDoc.verifications">
              <td colspan="4" class="border border-black p-2">
                <span class="font-bold">Diverifikasi oleh:</span><br />
                {{ applicationDoc.verifications.verifiedBy }}
              </td>
              <td colspan="4" class="border border-black p-2">
                <span class="font-bold">Tanggal Verifikasi:</span><br />
                {{ formatDate(applicationDoc.verifications.verifiedAt) }}
              </td>
            </tr>
            <tr v-if="applicationDoc.verifications?.notes">
              <td colspan="8" class="border border-black p-2">
                <span class="font-bold">Catatan:</span><br />
                {{ applicationDoc.verifications.notes }}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="mt-6">
          <h4 class="text-base font-semibold mb-3">Lampiran Dokumen</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="item in attachmentFiles"
              :key="item.key"
              class="border border-gray-200 rounded-lg p-3"
            >
              <div class="font-medium text-sm mb-2">{{ item.label }}</div>
              <div v-if="item.path" class="space-y-2">
                <img
                  v-if="isImageFile(item.path)"
                  :src="resolveFileUrl(item.path) || ''"
                  :alt="item.label"
                  class="w-full max-h-72 object-contain border rounded bg-gray-50"
                />
                <iframe
                  v-else-if="isPdfFile(item.path)"
                  :src="resolveFileUrl(item.path) || ''"
                  class="w-full h-72 border rounded bg-white"
                  :title="item.label"
                />
                <div v-else class="text-sm text-gray-600">
                  Preview tidak tersedia untuk tipe file ini.
                </div>
                <a
                  :href="resolveFileUrl(item.path) || '#'"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center text-primary text-sm hover:underline"
                >
                  Buka file
                </a>
              </div>
              <div v-else class="text-sm text-gray-500">
                File tidak tersedia
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else class="flex flex-col items-center justify-center py-12">
        <UIcon name="i-lucide-file-x" class="text-4xl text-muted mb-4" />
        <p class="text-muted">Dokumen tidak ditemukan</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex justify-end gap-2 p-4 border-t border-gray-200">
      <UButton label="Tutup" color="neutral" variant="outline" @click="close" />
    </div>
  </div>
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
