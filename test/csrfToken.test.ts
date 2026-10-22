import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { readCsrfToken } from '../app/utils/csrfToken.ts'

test('reads current cookie after login rotation rather than an old token', () => {
  assert.equal(readCsrfToken('auth_token=hidden; csrf_token=before'),'before')
  assert.equal(readCsrfToken('auth_token=hidden; csrf_token=after'),'after')
  assert.equal(readCsrfToken('csrf_token=a%2Bb'),'a+b')
  assert.equal(readCsrfToken('auth_token=hidden'),null)
  assert.equal(readCsrfToken('csrf_token='),null)
  assert.equal(readCsrfToken('csrf_token=%broken'),null)
  assert.equal(readCsrfToken('csrf_token=a; csrf_token=b'),null)
})
test('both examination start actions explicitly use the CSRF-aware request helper', () => {
  const source=fs.readFileSync(new URL('../app/pages/examination/examination.vue',import.meta.url),'utf8')
  assert.match(source,/await apiFetch\(\s*'\/api\/examinationEssay'/)
  assert.match(source,/await apiFetch\(\s*'\/api\/examinationMultipleChoice'/)
  assert.doesNotMatch(source,/await \$fetch<Examination(?:Essay|MultipleChoice)Response>/)
})
test('all essay and multiple-choice POST requests explicitly use the CSRF-aware helper', () => {
  for (const page of ['essay', 'multipleChoice']) {
    const source = fs.readFileSync(new URL(`../app/pages/examination/${page}.vue`, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /\$fetch[<(]/)
    assert.match(source, /apiFetch.*\/api\/preview/)
    assert.match(source, /apiFetch.*\/api\/postTime/)
    assert.match(source, /apiFetch.*\/api\/examinationDraft/)
    assert.match(source, /await apiFetch<Examination/)
    assert.doesNotMatch(source, /apiFetch[^\n]*\$\{apiBaseUrl\}/)
  }
})
test('real request helper sends matching current CSRF header and includes cookies on each mutation', async () => {
  let source = fs.readFileSync(new URL('../app/composables/useApiFetch.ts', import.meta.url), 'utf8')
  source = source.replace(/^import .*$/gm, '').replace('export const useApiFetch', 'const useApiFetch').replaceAll('import.meta.client', 'true')
  source = stripTypeScriptTypes(source)
  const requests: Array<{ url: string; options: any }> = []
  const document = { cookie: 'csrf_token=first' }
  const factory = new Function('useAuth', 'useCookie', 'useApiBaseUrl', 'readCsrfToken', 'validateUploadSize', '$fetch', 'document', source + '; return useApiFetch;')
  const useFetch = factory(() => ({ token: { value: null } }), () => ({ value: 'stale' }), () => '/backend', readCsrfToken, () => {}, async (url: string, options: any) => { requests.push({ url, options }); return { ok: true } }, document)
  const { apiFetch } = useFetch()
  await apiFetch('/api/examinationDraft', { method: 'POST', body: {} })
  document.cookie = 'csrf_token=rotated'
  await apiFetch('/api/examinationAnswer', { method: 'POST', body: {} })
  assert.equal(requests[0]!.url, '/backend/api/examinationDraft')
  assert.equal(requests[0]!.options.headers.get('X-CSRF-Token'), 'first')
  assert.equal(requests[1]!.options.headers.get('X-CSRF-Token'), 'rotated')
  assert.equal(requests[1]!.options.credentials, 'include')
})
