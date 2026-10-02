<script setup lang="ts">
import ApplicationDocModal from '~/components/verification/ApplicationDocModal.vue'
interface LetterContent {
  number: string; classification: string; attachment: string; branchUnit?: string; branch: string; issuedAt: string
  purpose: string; applicantName: string; licenseNumber: string; placeOfBirth: string
  dateOfBirth: string | null; workAddress: string; controlHour: string; rating: string
  nationality?: string; gender?: string; workPeriod?: string; ojtiName?: string; ojtiLicenseNumber?: string
}
interface LetterDetail {
  id: number; status: string; revision: number; content: LetterContent; recipientBranchUnit: string; validatedAt: string | null
  supervisor: { nik: string; name: string | null }; permissions: { canReview: boolean; canRevise: boolean }
  actions: Array<{ id: number; action: string; actorNik: string; reason: string | null; createdAt: string; revision: number }>
  documents: { applicationDocId: number; applicationNumber: string | null; applicationDoc: any; license?: { file?: string | null } | null; logbook?: { file?: string | null } | null; medex?: { file?: string | null } | null; ielp?: { file?: string | null } | null; briefingFile?: string | null; recommendationFile?: string | null }
}
const route = useRoute()
const { apiFetch } = useApiFetch()
const toast = useToast()
const letter = ref<LetterDetail | null>(null)
const loading = ref(false)
const saving = ref(false)
const returnReason = ref('')
const formOpen = ref(false)
const id = computed(() => Number(route.params.id))
const isPenerbitan = computed(() => letter.value?.content.purpose === 'Penerbitan')
const isAerodrome = computed(() => ['TWR', 'ADC', 'AERODROME'].includes(String(letter.value?.content.rating || '').toUpperCase()))
const isApproachArea = computed(() => ['APP', 'APS', 'ACP', 'ACS'].includes(String(letter.value?.content.rating || '').toUpperCase()))
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '—'
const dateTime = (value?: string | null) => value ? `${new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC` : '—'
const submissionLabel = (version: number) => version <= 1 ? 'Initial submission' : `Revision ${version - 1}`
const actionLabel = (action: string) => action === 'ASSIGNED' ? 'Initial submission' : action.replaceAll('_', ' ').toLowerCase().replace(/^./, char => char.toUpperCase())
const fileLink = (value?: string | null) => value ? `/file/view?url=${encodeURIComponent(value)}` : null
const printLetter = () => { if (import.meta.client) window.print() }
const documentLinks = computed(() => {
  if (!letter.value) return []
  const docs = letter.value.documents
  return [
    { label: 'License', url: fileLink(docs.license?.file) },
    { label: 'Logbook', url: fileLink(docs.logbook?.file) },
    { label: 'IELP', url: fileLink(docs.ielp?.file) },
    { label: 'Medex', url: fileLink(docs.medex?.file) },
    { label: 'Briefing', url: fileLink(docs.briefingFile) },
    { label: 'Recommendation', url: fileLink(docs.recommendationFile) },
  ]
})
async function load() {
  if (!Number.isInteger(id.value) || id.value < 1) return
  loading.value = true
  try {
    letter.value = await apiFetch(`/api/proposalLetters/${id.value}`) as LetterDetail
  } catch (error) {
    toast.add({ title: 'Unable to load proposal letter', description: error instanceof Error ? error.message : 'Please try again.', color: 'error' })
  } finally { loading.value = false }
}
async function decide(decision: 'VALIDATE' | 'RETURN') {
  if (decision === 'RETURN' && returnReason.value.trim().length < 10) {
    toast.add({ title: 'Please explain the correction', description: 'Enter at least 10 characters.', color: 'warning' })
    return
  }
  if (decision === 'VALIDATE' && !window.confirm(isPenerbitan.value ? 'Approve and sign this rating letter as OJTI? Your name and time will be recorded. The checker verifies application content afterward.' : 'Confirm the supporting files are complete? This locks your letter validation and records your name and time. The checker verifies application content afterward.')) return
  saving.value = true
  try {
    await apiFetch(`/api/proposalLetters/${id.value}/decision`, { method: 'POST', body: { decision, reason: returnReason.value } })
    toast.add({ title: decision === 'VALIDATE' ? 'Letter validated' : 'Letter returned', color: 'success' })
    await load()
  } catch (error) {
    toast.add({ title: 'Decision failed', description: error instanceof Error ? error.message : 'Please try again.', color: 'error' })
  } finally { saving.value = false }
}
async function revise() {
  saving.value = true
  try {
    await apiFetch(`/api/proposalLetters/${id.value}/revise`, { method: 'PATCH' })
    toast.add({ title: 'Revised letter resubmitted', color: 'success' })
    await load()
  } catch (error) {
    toast.add({ title: 'Resubmission failed', description: error instanceof Error ? error.message : 'Please try again.', color: 'error' })
  } finally { saving.value = false }
}
onMounted(() => { void load() })
</script>

<template>
  <UDashboardPanel>
    <template #header><UDashboardNavbar title="Proposal Letter"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar></template>
    <template #body>
      <div class="mx-auto max-w-5xl space-y-5 p-4">
        <div class="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div class="flex items-center gap-3"><UButton label="Back" icon="i-lucide-arrow-left" variant="outline" @click="$router.back()" /><UBadge v-if="letter" :label="letter.status" :color="letter.status === 'VALIDATED' ? 'success' : letter.status === 'RETURNED' ? 'warning' : 'info'" /></div>
          <UButton label="Print / Save PDF" icon="i-lucide-printer" :disabled="!letter" @click="printLetter" />
        </div>
        <p v-if="loading && !letter" class="text-sm text-muted">Loading letter…</p>
        <template v-if="letter">
          <article id="proposal-letter" class="letter-page bg-white p-8 text-black shadow-sm md:p-12">
            <template v-if="isPenerbitan">
              <h1 class="letter-title">Surat Rekomendasi<br><em>On The Job Training Instructor (OJTI)</em></h1>
              <table class="letter-meta" aria-label="Identitas surat rekomendasi"><colgroup><col style="width:18%"><col style="width:3%"><col style="width:45%"><col style="width:34%"></colgroup><tbody>
                <tr><th scope="row">Nomor</th><td>:</td><td>{{ letter.content.number }}</td><td class="letter-place">{{ letter.content.branch }}, {{ date(letter.content.issuedAt) }}</td></tr>
                <tr><th scope="row">Klasifikasi</th><td>:</td><td>{{ letter.content.classification }}</td><td /></tr>
                <tr><th scope="row">Lampiran</th><td>:</td><td>{{ letter.content.attachment }}</td><td /></tr>
                <tr><th scope="row">Perihal</th><td>:</td><td colspan="2">Surat Rekomendasi Ujian Rating</td></tr>
              </tbody></table>
              <p class="letter-recipient">Yth. <em>Checker</em> {{ letter.content.branchUnit || letter.recipientBranchUnit }} {{ letter.content.branch }}</p>
              <div class="letter-body">
                <p>Dengan hormat disampaikan, Personel PLLP atas nama di bawah ini:</p>
                <table class="letter-person" aria-label="Data personel"><colgroup><col style="width:5%"><col style="width:39%"><col style="width:3%"><col style="width:53%"></colgroup><tbody>
                  <tr><td>a.</td><th scope="row">Nama Lengkap</th><td>:</td><td>{{ letter.content.applicantName || '—' }}</td></tr>
                  <tr><td>b.</td><th scope="row">Nomor Lisensi</th><td>:</td><td>{{ letter.content.licenseNumber || '—' }}</td></tr>
                  <tr><td>c.</td><th scope="row">Tempat dan Tanggal Lahir</th><td>:</td><td>{{ letter.content.placeOfBirth || '—' }}, {{ date(letter.content.dateOfBirth) }}</td></tr>
                  <tr><td>d.</td><th scope="row">Kebangsaan</th><td>:</td><td>{{ letter.content.nationality || '—' }}</td></tr>
                  <tr><td>e.</td><th scope="row">Jenis Kelamin</th><td>:</td><td>{{ letter.content.gender || '—' }}</td></tr>
                  <tr><td>f.</td><th scope="row">Alamat Unit Kerja</th><td>:</td><td>{{ letter.content.workAddress || '—' }}</td></tr>
                  <tr><td>g.</td><th scope="row">Masa Kerja</th><td>:</td><td>{{ letter.content.workPeriod || '—' }}</td></tr>
                </tbody></table>
                <p class="letter-request">Telah melaksanakan pemanduan di bawah pengawasan OJTI sebagai persyaratan untuk proses penerbitan rating <strong>{{ letter.content.rating }}</strong> di Perum LPPNPI Cabang {{ letter.content.branch }}.</p>
                <p class="letter-ojti-requirement"><template v-if="isAerodrome || isApproachArea">Untuk Rating <strong>{{ isAerodrome ? 'Aerodrome Control' : 'Approach / Area Control' }}</strong>, sekurang-kurangnya {{ isAerodrome ? '90 (sembilan puluh)' : '180 (seratus delapan puluh)' }} jam dan minimal {{ isAerodrome ? '1 (satu)' : '3 (tiga)' }} bulan.<br></template>Jam pemanduan yang tercatat: <strong>{{ letter.content.controlHour || '—' }}</strong> jam.</p>
                <p class="letter-request">Surat rekomendasi ini dibuat untuk memenuhi persyaratan administrasi penerbitan rating yang bersangkutan.</p>
                <p class="letter-closing">Demikian disampaikan, terima kasih.</p>
              </div>
              <table class="letter-signatures" aria-label="Persetujuan OJTI"><tbody><tr class="letter-signature-headings"><td /><td>On The Job Training Instructor<br>(OJTI)</td></tr><tr><td /><td><p class="letter-signature-name">{{ letter.status === 'VALIDATED' ? (letter.content.ojtiName || letter.supervisor.name || letter.supervisor.nik) : 'Menunggu persetujuan OJTI' }}</p><p v-if="letter.validatedAt" class="letter-validation">Disetujui {{ dateTime(letter.validatedAt) }} · Ref PL-{{ letter.id }}-R{{ letter.revision }}</p></td></tr></tbody></table>
            </template>
            <template v-else>
            <h1 class="letter-title">Format Surat Permohonan {{ letter.content.purpose }} Rating<br>Personel Pemandu Lalu Lintas Penerbangan</h1>
            <table class="letter-meta" aria-label="Identitas surat">
              <colgroup><col style="width: 18%"><col style="width: 3%"><col style="width: 45%"><col style="width: 34%"></colgroup>
              <tbody>
                <tr><th scope="row">Nomor</th><td>:</td><td>{{ letter.content.number }}</td><td class="letter-place">{{ letter.content.branch }}, {{ date(letter.content.issuedAt) }}</td></tr>
                <tr><th scope="row">Klasifikasi</th><td>:</td><td>{{ letter.content.classification }}</td><td /></tr>
                <tr><th scope="row">Lampiran</th><td>:</td><td>{{ letter.content.attachment }}</td><td /></tr>
                <tr><th scope="row">Perihal</th><td>:</td><td colspan="2">Permohonan {{ letter.content.purpose }} Rating Personel Pemandu Lalu Lintas Penerbangan</td></tr>
              </tbody>
            </table>
            <p class="letter-recipient">Yth. <em>Checker</em> {{ letter.content.branchUnit || letter.recipientBranchUnit }} {{ letter.content.branch }}</p>
            <div class="letter-body">
              <p>Dengan hormat, yang bertanda tangan di bawah ini:</p>
              <table class="letter-person" aria-label="Data pemohon">
                <colgroup><col style="width: 5%"><col style="width: 39%"><col style="width: 3%"><col style="width: 53%"></colgroup>
                <tbody>
                  <tr><td>a.</td><th scope="row">Nama Lengkap</th><td>:</td><td>{{ letter.content.applicantName || '—' }}</td></tr>
                  <tr><td>b.</td><th scope="row">Nomor Lisensi</th><td>:</td><td>{{ letter.content.licenseNumber || '—' }}</td></tr>
                  <tr><td>c.</td><th scope="row">Tempat dan Tanggal Lahir</th><td>:</td><td>{{ letter.content.placeOfBirth || '—' }}, {{ date(letter.content.dateOfBirth) }}</td></tr>
                  <tr><td>d.</td><th scope="row">Alamat Unit Kerja</th><td>:</td><td>{{ letter.content.workAddress || '—' }}</td></tr>
                  <tr><td>e.</td><th scope="row">Jumlah Jam Pemanduan</th><td>:</td><td>{{ letter.content.controlHour || '—' }}</td></tr>
                </tbody>
              </table>
              <p class="letter-request">Mengajukan permohonan untuk {{ letter.content.purpose.toLowerCase() }} rating <strong>{{ letter.content.rating }}</strong> di Perum LPPNPI Cabang {{ letter.content.branch }}.</p>
              <p class="letter-attachments-intro">Sebagai pertimbangan, terlampir disampaikan persyaratan administrasi:</p>
              <ol class="letter-attachments"><li>Formulir permohonan {{ letter.content.purpose.toLowerCase() }} rating;</li><li>Buku lisensi (asli) personel pemandu lalu lintas penerbangan;</li><li>Sertifikat kesehatan minimal kelas 3 (tiga) yang berlaku;</li><li>Sertifikat <em>ICAO Language Proficiency</em> minimal level 4 yang berlaku;</li><li>Fotokopi <em>ATC Personal Log Book</em>.</li></ol>
              <p class="letter-closing">Demikian disampaikan, atas perhatiannya terima kasih.</p>
            </div>
            <table class="letter-signatures" aria-label="Pemohon dan pimpinan unit kerja"><tbody>
              <tr class="letter-signature-headings"><td>Pemohon</td><td>Mengetahui (*)<br>Pimpinan Unit Kerja</td></tr>
              <tr><td><p class="letter-signature-name">{{ letter.content.applicantName }}</p></td><td><p class="letter-signature-name">{{ letter.status === 'VALIDATED' ? (letter.supervisor.name || letter.supervisor.nik) : 'Menunggu validasi' }}</p></td></tr>
              <tr><td /><td><p v-if="letter.validatedAt" class="letter-validation">Divalidasi {{ dateTime(letter.validatedAt) }} · Ref PL-{{ letter.id }}-R{{ letter.revision }}</p><p class="letter-validation">Ket. (*) jika diperlukan</p></td></tr>
            </tbody></table>
            </template>
          </article>
          <section class="space-y-4 rounded-lg border border-default p-4 print:hidden"><h2 class="font-semibold">Related documents</h2><div class="flex flex-wrap gap-2"><UButton label="Form Permohonan" variant="outline" size="sm" @click="formOpen = true" /><template v-for="doc in documentLinks" :key="doc.label"><UButton v-if="doc.url" :label="doc.label" :to="doc.url" target="_blank" variant="outline" size="sm" /><UBadge v-else :label="`${doc.label}: missing`" color="warning" variant="soft" /></template></div></section>
          <section v-if="letter.permissions.canReview" class="space-y-3 rounded-lg border border-default p-4 print:hidden"><h2 class="font-semibold">{{ isPenerbitan ? 'OJTI decision' : 'Supervisor decision' }}</h2><p class="text-sm text-muted">Review the letter and supporting files. The checker verifies the application content afterward. Returning this letter does not affect other ratings.</p><div class="flex flex-wrap gap-2"><UButton :label="isPenerbitan ? 'Approve letter' : 'Validate supporting files'" icon="i-lucide-check" :loading="saving" @click="decide('VALIDATE')" /><UInput v-model="returnReason" placeholder="Reason for return (at least 10 characters)" class="min-w-72 flex-1" /><UButton label="Return to applicant" color="warning" variant="outline" :loading="saving" @click="decide('RETURN')" /></div></section>
          <section v-if="letter.permissions.canRevise" class="space-y-3 rounded-lg border border-default p-4 print:hidden"><h2 class="font-semibold">Returned letter</h2><p class="text-sm text-muted">Read the return reason below. Correct the relevant supporting file or application details in its own menu, then resubmit this rating letter. The other rating remains unchanged.</p><div class="flex flex-wrap gap-2"><UButton label="Application Document" to="/applicationDoc" variant="outline" /><UButton label="License" to="/document/license" variant="outline" /><UButton label="Logbook" to="/document/logbook" variant="outline" /><UButton label="IELP" to="/document/ielpUser" variant="outline" /><UButton label="Medex" to="/document/medexUser" variant="outline" /></div><UButton label="Resubmit this letter" :loading="saving" @click="revise" /></section>
          <section class="rounded-lg border border-default p-4 print:hidden"><h2 class="mb-3 font-semibold">Audit history · {{ submissionLabel(letter.revision) }}</h2><div v-for="action in letter.actions" :key="action.id" class="border-t border-default py-2 text-sm"><strong>{{ actionLabel(action.action) }}</strong> · {{ dateTime(action.createdAt) }} · {{ action.actorNik }}<span v-if="action.action !== 'ASSIGNED'"> · {{ submissionLabel(action.revision) }}</span><p v-if="action.reason" class="text-muted">{{ action.reason }}</p></div></section>
          <div v-if="formOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden"><div class="absolute inset-0 bg-black/50" @click="formOpen = false" /><div class="relative h-full max-h-[90vh] w-full max-w-[95vw]"><ApplicationDocModal :is-open="true" :application-doc="letter.documents.applicationDoc" :user-data="letter.documents.applicationDoc?.user" @close="formOpen = false" /></div></div>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style>
.letter-page { width: min(100%, 210mm); margin-inline: auto; font-family: Georgia, 'Times New Roman', serif; font-size: 12px; line-height: 1.35; min-height: 265mm; overflow-wrap: anywhere; }
.letter-title { margin: 0 0 28px; text-align: center; text-transform: uppercase; font-size: 12px; font-weight: 700; }
.letter-page table { width: 100%; table-layout: fixed; border-collapse: collapse; }
.letter-page th, .letter-page td { padding: 1px 3px; vertical-align: top; text-align: left; font-weight: 400; }
.letter-meta { margin-bottom: 28px; }
.letter-place { text-align: right !important; white-space: nowrap; }
.letter-recipient { margin-bottom: 28px; }
.letter-body { margin-left: 7%; }
.letter-person { margin-top: 6px; }
.letter-request { margin-top: 26px; }
.letter-attachments-intro { margin-top: 22px; }
.letter-attachments { list-style-type: lower-alpha; padding-left: 26px; }
.letter-attachments li { padding-left: 6px; }
.letter-closing { margin-top: 30px; text-align: center; }
.letter-signatures { margin-top: 42px; }
.letter-signatures td { width: 50%; text-align: center !important; }
.letter-signature-headings { height: 78px; }
.letter-signature-headings td { vertical-align: top; }
.letter-signature-name { margin: 0 auto; width: 55%; border-bottom: 1px dashed #000; padding-bottom: 3px; }
.letter-validation { margin-top: 5px; font-size: 10px; }
.letter-ojti-requirement { margin: 26px 0; text-align: center; font-style: italic; }
@media print {
  @page { size: A4; margin: 12mm; }
  body * { visibility: hidden !important; }
  #proposal-letter, #proposal-letter * { visibility: visible !important; }
  #proposal-letter { position: absolute; top: 0; left: 0; width: 100%; min-height: 0; box-shadow: none; padding: 0; margin: 0; }
}
</style>
