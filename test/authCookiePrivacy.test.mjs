import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('personal details are held in memory, not persisted in auth_user', () => {
  const auth = fs.readFileSync(new URL('../app/composables/useAuth.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(auth, /userCookie\.value\s*=\s*(?!null\b)\w+/);
  assert.doesNotMatch(auth, /\(\) => userCookie\.value/);
  assert.doesNotMatch(auth, /sessionStorage\.setItem/);
  assert.match(auth, /userCookie\.value = null/);
});
test('page refresh restores authoritative user state through the cookie-aware session endpoint', () => {
  const plugin = fs.readFileSync(new URL('../app/plugins/00.auth-session.ts', import.meta.url), 'utf8');
  assert.match(plugin, /useRequestFetch\(\)/);
  assert.match(plugin, /\/api\/auth\/session/);
  assert.match(plugin, /authUser\.value = null/);
});
