<script setup lang="ts">
// Props
const props = defineProps<{
  modelValue: boolean;
  applicationDoc: any | null;
  userData: any | null;
}>();

// Emits
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

// Close modal function
function closeModal() {
  emit("update:modelValue", false);
}

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
    props.applicationDoc?.appRatings?.map((r: any) => r.rating.rating) || []
  );
});
</script>

<template>
  <UModal
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :ui="{ content: 'max-w-6xl' }"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h3 class="text-lg font-semibold">
          Form Permohonan - {{ applicationDoc?.number || "-" }}
        </h3>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="closeModal"
        />
      </div>
    </template>

    <template #body>
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
                  - {{ rating.rating.rating }} ({{ rating.controlHour }} jam)
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
                <div class="uppercase">{{ applicationDoc.reason || "-" }}</div>
              </td>
              <td class="border border-black p-2 align-top">
                <span class="font-bold">9c.</span> Jenis rating<br />
                <div v-for="(r, i) in ratingsList" :key="i">- {{ r }}</div>
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
                {{ applicationDoc.ojtNik || "-" }}
              </td>
              <td colspan="3" class="border border-black p-2 align-top">
                <span class="font-bold">12f.</span> Nomor Lisensi<br />
                {{ applicationDoc.ojtNik || "-" }}
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
      </div>

      <!-- Error State -->
      <div v-else class="flex flex-col items-center justify-center py-12">
        <UIcon name="i-lucide-file-x" class="text-4xl text-muted mb-4" />
        <p class="text-muted">Dokumen tidak ditemukan</p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Tutup"
          color="neutral"
          variant="outline"
          @click="closeModal"
        />
      </div>
    </template>
  </UModal>
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
