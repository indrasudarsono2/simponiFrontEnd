import test from 'node:test'
import assert from 'node:assert/strict'
import { loginErrorMessage } from '../app/utils/loginError.ts'

test('rate limits show guidance instead of raw fetch errors', () => {
  const error = { statusCode: 429, message: '[POST] "/backend/api/auth/login": 429 Too Many Requests' }
  const message = loginErrorMessage(error)
  assert.match(message, /Too many sign-in attempts/)
  assert.match(message, /wait a few minutes/)
  assert.doesNotMatch(message, /backend|POST|429/)
  assert.match(loginErrorMessage({ response: { status: 429, headers: new Headers({ 'Retry-After': '90' }) } }), /2 minute/)
})
test('authentication, connectivity and server errors are safe and actionable', () => {
  assert.match(loginErrorMessage({ status: 401 }), /e-NIK and password/)
  assert.match(loginErrorMessage({ response: { status: 403 } }), /administrator/)
  assert.match(loginErrorMessage({ statusCode: 503, data: { message: 'private database error' } }), /temporarily unavailable/)
  assert.match(loginErrorMessage(new Error('Failed to fetch')), /Cannot connect/)
  assert.match(loginErrorMessage(null), /Unable to sign in/)
  assert.doesNotMatch(loginErrorMessage({ statusCode: 400, data: { message: '<script>private</script>' } }), /script|private/)
})
