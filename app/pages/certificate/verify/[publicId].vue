<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow, noarchive' }] })

interface Verification {
  status: 'VALID' | 'REVOKED'
  certificateNumber: string
  issuedAt?: string
  revokedAt?: string | null
  name?: string
  rating?: string
  eventName?: string
  startDate?: string | null
  finishDate?: string | null
  branch?: string
  branchUnit?: string
  theory?: { finalScore: number | null }
  practical?: Array<{ kind: string; score: number | null; passed: boolean }>
}

const route = useRoute()
const apiBaseUrl = useApiBaseUrl()
const { data, status, error } = await useFetch<Verification>(
  `${apiBaseUrl}/api/certificates/verify/${route.params.publicId}`,
  { credentials: 'omit' },
)
const date = (value?: string | null) => value
  ? new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(value))
  : '—'
const score = (value?: number | null) => value == null ? '—' : `${value}%`
</script>

<template>
  <main class="verify-page">
    <article class="verify-card">
      <p class="brand">PERFORMA</p>
      <h1>Certificate Verification</h1>
      <p v-if="status === 'pending'">Checking certificate…</p>
      <p v-else-if="error || !data" class="notice invalid">Certificate not found. Check that the QR code or link is complete.</p>
      <template v-else>
        <p :class="['notice', data.status === 'VALID' ? 'valid' : 'invalid']">
          {{ data.status === 'VALID' ? 'Valid certificate' : 'Certificate revoked or no longer valid' }}
        </p>
        <dl class="details">
          <dt>Certificate number</dt><dd>{{ data.certificateNumber }}</dd>
          <template v-if="data.status === 'VALID'">
            <dt>Participant</dt><dd>{{ data.name }}</dd>
            <dt>Rating</dt><dd>{{ data.rating }}</dd>
            <dt>Event</dt><dd>{{ data.eventName }}</dd>
            <dt>Event period</dt><dd>{{ date(data.startDate) }} – {{ date(data.finishDate) }}</dd>
            <dt>Branch / unit</dt><dd>{{ [data.branch, data.branchUnit].filter(Boolean).join(' / ') }}</dd>
            <dt>Issued</dt><dd>{{ date(data.issuedAt) }} UTC</dd>
            <dt>Theory final score</dt><dd>{{ score(data.theory?.finalScore) }}</dd>
            <template v-for="(item, index) in data.practical || []" :key="index">
              <dt>{{ item.kind }} practical score</dt>
              <dd>{{ score(item.score) }} · {{ item.passed ? 'Passed' : 'Not passed' }}</dd>
            </template>
          </template>
          <template v-else-if="data.revokedAt">
            <dt>Revoked</dt><dd>{{ date(data.revokedAt) }} UTC</dd>
          </template>
        </dl>
      </template>
      <p class="note">This page verifies the PERFORMA performance-check result. It is not an air traffic services licence or rating endorsement.</p>
    </article>
  </main>
</template>

<style scoped>
.verify-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #eef4ef; color: #143b33; font-family: Arial, sans-serif; }
.verify-card { width: min(100%, 650px); background: white; border: 1px solid #cadecf; border-top: 7px solid #176347; border-radius: 12px; box-shadow: 0 12px 32px #174b3320; padding: 32px; }
.brand { color: #145c43; font-size: 22px; font-weight: 800; letter-spacing: .06em; margin: 0 0 8px; }
h1 { font-size: 26px; margin: 0 0 24px; }
.notice { padding: 12px 16px; border-radius: 8px; font-weight: 700; }
.valid { color: #10663d; background: #e5f6eb; }
.invalid { color: #9f2727; background: #fdecec; }
.details { display: grid; grid-template-columns: minmax(150px, 1fr) 2fr; gap: 12px 20px; margin: 26px 0; }
dt { color: #5a7265; }
dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
.note { margin-bottom: 0; color: #607268; font-size: 13px; line-height: 1.5; }
@media (max-width: 500px) { .verify-card { padding: 22px; } .details { grid-template-columns: 1fr; gap: 4px; } dd { margin-bottom: 12px; } }
</style>
