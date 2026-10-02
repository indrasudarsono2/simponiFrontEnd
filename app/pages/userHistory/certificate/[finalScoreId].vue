<script setup lang="ts">
import { renderSVG } from 'uqr'

definePageMeta({ layout: false })

interface Certificate {
  certificateNumber: string
  publicId: string
  issuedAt: string
  name: string
  rating: string
  eventName: string
  startDate: string | null
  finishDate: string | null
  branch: string
  branchUnit: string
}

const route = useRoute()
const requestUrl = useRequestURL()
const config = useRuntimeConfig()
const apiBaseUrl = useApiBaseUrl()
const { token } = useAuth()
const { data: certificate, status, error } = await useFetch<Certificate>(
  `${apiBaseUrl}/api/scoreUser/certificate/${route.params.finalScoreId}`,
  {
    credentials: 'include',
    headers: { Authorization: token.value ? `Bearer ${token.value}` : '' },
  },
)

const date = (value: string | null | undefined) => value
  ? new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(value))
  : '—'

const unit = computed(() =>
  [certificate.value?.branch, certificate.value?.branchUnit].filter(Boolean).join(' / ') || '—',
)
const participantFontSize = computed(() =>
  `${Math.min(5.1, 93 / Math.max(certificate.value?.name?.length || 1, 1))}cqw`,
)
const verificationUrl = computed(() => {
  if (!certificate.value?.publicId) return ''
  const currentOrigin = import.meta.client ? window.location.origin : requestUrl.origin
  const origin = import.meta.env.PROD && config.public.siteUrl
    ? String(config.public.siteUrl)
    : currentOrigin
  return new URL(`/certificate/verify/${certificate.value.publicId}`, origin).href
})
const qrImage = computed(() => verificationUrl.value
  ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderSVG(verificationUrl.value, { ecc: 'M', border: 3 }))}`
  : '')
const localQr = computed(() => /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/i.test(verificationUrl.value))

function printCertificate() {
  if (import.meta.client) window.print()
}
</script>

<template>
  <main class="certificate-page">
    <div class="toolbar">
      <NuxtLink to="/userHistory/scorRecap" class="back-link">← Score Recap</NuxtLink>
      <button v-if="certificate" type="button" class="print-button" @click="printCertificate">
        Print / Save as PDF
      </button>
    </div>

    <p v-if="status === 'pending'" class="message">Loading certificate…</p>
    <p v-else-if="error || !certificate" class="message error">
      This certificate is unavailable. It can only be opened by its owner after the rating is successfully completed.
    </p>

    <section v-else class="certificate" aria-label="Performance check certificate">
      <img src="/certificate.png" alt="PERFORMA certificate artwork" class="artwork">
      <div class="field participant" :style="{ fontSize: participantFontSize }">{{ certificate.name }}</div>
      <div class="field rating">{{ certificate.rating }}</div>
      <div class="field event-name">{{ certificate.eventName }}</div>
      <div class="field event-period">{{ date(certificate.startDate) }} – {{ date(certificate.finishDate) }}</div>
      <div class="field branch-unit">{{ unit }}</div>
      <div class="field certificate-number">{{ certificate.certificateNumber }}</div>
      <div class="field issued-date">{{ date(certificate.issuedAt) }} UTC</div>
      <img v-if="qrImage" class="verification-qr" :src="qrImage" :alt="`QR verification for certificate ${certificate.certificateNumber}`">
    </section>
    <p v-if="certificate" class="print-hint">For best results, print in A4 landscape with margins set to none and background graphics enabled.</p>
    <p v-if="verificationUrl" class="print-hint"><a :href="verificationUrl" target="_blank" rel="noopener noreferrer">Open QR verification page</a></p>
    <p v-if="localQr" class="print-hint">This QR uses localhost. Open the certificate through an address other devices can reach before printing it for external verification.</p>
  </main>
</template>

<style scoped>
.certificate-page { min-height: 100vh; padding: 20px; background: #e9eeeb; color: #103e35; }
.toolbar { max-width: 1120px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: space-between; }
.back-link { color: #155b43; text-decoration: underline; }
.print-button { border: 0; border-radius: 7px; padding: 10px 16px; background: #146044; color: white; cursor: pointer; }
.message { max-width: 1120px; margin: 32px auto; text-align: center; }
.error { color: #b02e2e; }
.certificate { position: relative; width: min(100%, 1120px); aspect-ratio: 1491 / 1055; margin: auto; container-type: inline-size; background: white; box-shadow: 0 8px 32px #123c3033; overflow: hidden; font-family: Georgia, 'Times New Roman', serif; }
.artwork { width: 100%; height: 100%; display: block; }
.field { position: absolute; overflow: hidden; white-space: nowrap; color: #0b4035; background: #fff; }
.participant { left: 16%; top: 40.3%; width: 68%; height: 8.8%; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 5.1cqw; font-weight: 700; text-transform: uppercase; }
.rating { left: 43%; top: 60.6%; width: 14%; height: 7.5%; display: flex; align-items: center; justify-content: center; background: #f7faf6; font-size: 5.2cqw; font-weight: 700; }
.event-name { left: 22.5%; top: 72.4%; width: 26%; height: 3.3%; font-size: 1.35cqw; display: flex; align-items: center; }
.event-period { left: 22.5%; top: 76.2%; width: 27%; height: 3.4%; font-size: 1.22cqw; display: flex; align-items: center; }
.branch-unit { left: 22.5%; top: 80.2%; width: 27%; height: 3.3%; font-size: 1.35cqw; display: flex; align-items: center; }
.certificate-number { left: 67%; top: 72.4%; width: 15%; height: 3.3%; font-size: 1.25cqw; display: flex; align-items: center; }
.issued-date { left: 67%; top: 76.2%; width: 15%; height: 3.4%; font-size: 1.2cqw; display: flex; align-items: center; }
.verification-qr { position: absolute; left: 83%; top: 75%; width: 9.2%; height: 12.5%; display: block; background: #fff; object-fit: contain; }
.print-hint { text-align: center; color: #506a61; font-size: 13px; margin: 16px auto; }
.print-hint a { color: #146044; text-decoration: underline; }
@page { size: A4 landscape; margin: 0; }
@media print {
  .certificate-page { padding: 0; background: #fff; min-height: auto; }
  .toolbar, .print-hint { display: none; }
  .certificate { width: 297mm; height: 210mm; margin: 0; box-shadow: none; break-inside: avoid; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}
</style>
