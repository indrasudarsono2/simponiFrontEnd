<script setup lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();
const memberId = route.params.memberId as string;
const appDocId = route.query.appDocId as string;
const memberName = route.query.memberName as string;
const toast = useToast();
const loading = ref(false);

// Types
interface VerificationItem {
  no: number;
  pernyataan: string;
  isStatus: boolean;
  isKesesuaian: boolean;
  keterangan: string;
}

// Questions data - default values for status and kesesuaian is "tidak" (false)
const questions = ref<VerificationItem[]>([
  {
    no: 1,
    pernyataan: "Buku lisensi asli",
    isStatus: false,
    isKesesuaian: false,
    keterangan: "",
  },
  {
    no: 2,
    pernyataan: "Formulir permohonan penerbitan/perpanjangan rating",
    isStatus: false,
    isKesesuaian: false,
    keterangan: "",
  },
  {
    no: 3,
    pernyataan: "Sertifikat Kesehatan kelas 3",
    isStatus: false,
    isKesesuaian: false,
    keterangan: "",
  },
  {
    no: 4,
    pernyataan: "Salinan sertifikat kompetensi",
    isStatus: false,
    isKesesuaian: false,
    keterangan: "",
  },
  {
    no: 5,
    pernyataan: "Salinan sertifikat ICAO ELP",
    isStatus: false,
    isKesesuaian: false,
    keterangan: "",
  },
  {
    no: 6,
    pernyataan: "ATC personal logbook",
    isStatus: false,
    isKesesuaian: false,
    keterangan: "",
  },
  {
    no: 7,
    pernyataan: "Lain-lain",
    isStatus: false,
    isKesesuaian: false,
    keterangan: "",
  },
]);

// Check if any item has "no" value
const hasNoValues = computed(() => {
  return questions.value.some(
    (q) => q.isStatus === false || q.isKesesuaian === false,
  );
});

// Submit verification
async function submitVerification() {
  if (hasNoValues.value) {
    toast.add({
      title: "Validasi Gagal",
      description:
        "Tidak dapat submit. Semua persyaratan harus bernilai 'Ya'. Silakan periksa kembali.",
      color: "error",
    });
    return;
  }

  loading.value = true;

  try {
    // Prepare data for submission in the required format
    const submitData = questions.value.map((q) => ({
      pernyataan: q.pernyataan,
      isStatus: q.isStatus,
      isKesesuaian: q.isKesesuaian,
      keterangan: q.keterangan,
    }));

    // console.log("[VERIFICATION SUBMIT] Data:", submitData);

    // Send to API
    const response = await $fetch("/api/verification", {
      method: "POST",
      body: submitData,
    });

    toast.add({
      title: "Berhasil",
      description: "Verifikasi berhasil disimpan",
      color: "success",
    });

    // Close window after successful submit
    setTimeout(() => {
      window.close();
    }, 1500);
  } catch (error: any) {
    const errorMessage =
      error?.data?.message ||
      error?.message ||
      "Gagal menyimpan verifikasi. Silakan coba lagi.";
    toast.add({
      title: "Error",
      description: errorMessage,
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

// Close this window
function closeWindow() {
  window.close();
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="`Verifikasi - ${memberName || 'Member'}`">
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
      <div class="max-w-5xl mx-auto space-y-6">
        <!-- Info -->
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold">Form Verifikasi Dokumen</h2>
            <p class="text-sm text-muted">
              Member: {{ memberName }} | App Doc ID: {{ appDocId }}
            </p>
          </div>
          <UBadge color="info" variant="soft">
            <UIcon name="i-lucide-info" class="mr-1" />
            Application Doc terbuka di tab lain
          </UBadge>
        </div>

        <!-- Warning if has "no" values -->
        <UAlert
          v-if="hasNoValues"
          icon="i-lucide-alert-triangle"
          color="error"
          variant="soft"
          title="Validasi Diperlukan"
          description="Terdapat persyaratan dengan nilai 'Tidak'. Anda tidak dapat submit form ini."
        />

        <!-- Verification Table -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-clipboard-check" class="text-lg" />
              <span class="font-semibold">Daftar Persyaratan Verifikasi</span>
            </div>
          </template>

          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-100 border-b border-gray-200">
                <th class="p-3 text-left text-sm font-semibold w-12">NO</th>
                <th class="p-3 text-left text-sm font-semibold">Persyaratan</th>
                <th class="p-3 text-center text-sm font-semibold w-32">
                  Status
                </th>
                <th class="p-3 text-center text-sm font-semibold w-32">
                  Kesesuaian
                </th>
                <th class="p-3 text-left text-sm font-semibold">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in questions"
                :key="item.no"
                class="border-b border-gray-100 hover:bg-gray-50"
              >
                <td class="p-3 text-sm">{{ item.no }}</td>
                <td class="p-3 text-sm font-medium">{{ item.pernyataan }}</td>
                <td class="p-3 text-center">
                  <div class="flex items-center justify-center gap-2">
                    <label class="flex items-center gap-1 cursor-pointer">
                      <input
                        v-model="item.isStatus"
                        type="radio"
                        :name="`status-${item.no}`"
                        :value="true"
                        class="w-4 h-4 text-primary"
                      />
                      <span class="text-sm">Ya</span>
                    </label>
                    <label class="flex items-center gap-1 cursor-pointer">
                      <input
                        v-model="item.isStatus"
                        type="radio"
                        :name="`status-${item.no}`"
                        :value="false"
                        class="w-4 h-4 text-error"
                      />
                      <span class="text-sm">Tidak</span>
                    </label>
                  </div>
                </td>
                <td class="p-3 text-center">
                  <div class="flex items-center justify-center gap-2">
                    <label class="flex items-center gap-1 cursor-pointer">
                      <input
                        v-model="item.isKesesuaian"
                        type="radio"
                        :name="`kesesuaian-${item.no}`"
                        :value="true"
                        class="w-4 h-4 text-primary"
                      />
                      <span class="text-sm">Ya</span>
                    </label>
                    <label class="flex items-center gap-1 cursor-pointer">
                      <input
                        v-model="item.isKesesuaian"
                        type="radio"
                        :name="`kesesuaian-${item.no}`"
                        :value="false"
                        class="w-4 h-4 text-error"
                      />
                      <span class="text-sm">Tidak</span>
                    </label>
                  </div>
                </td>
                <td class="p-3">
                  <UInput
                    v-model="item.keterangan"
                    placeholder="Keterangan (opsional)"
                    size="sm"
                    class="w-full"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </UCard>

        <!-- Submit Button -->
        <div class="flex justify-end gap-3">
          <UButton
            label="Tutup"
            color="neutral"
            variant="outline"
            @click="closeWindow"
          />
          <UButton
            icon="i-lucide-check"
            label="Submit Verifikasi"
            color="success"
            :disabled="hasNoValues"
            :loading="loading"
            @click="submitVerification"
          />
        </div>

        <!-- Info Card -->
        <UCard class="bg-info/5">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-info" class="text-info mt-0.5" />
            <div class="text-sm">
              <p class="font-medium">Petunjuk:</p>
              <ul class="list-disc list-inside mt-1 space-y-1 text-muted">
                <li>
                  Application Doc telah terbuka di tab baru - silakan periksa
                  dokumen pemohon
                </li>
                <li>Isi semua kolom Status dan Kesesuaian dengan Ya/Tidak</li>
                <li>
                  Form tidak dapat disubmit jika ada persyaratan dengan nilai
                  "Tidak"
                </li>
                <li>Keterangan bersifat opsional</li>
              </ul>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
