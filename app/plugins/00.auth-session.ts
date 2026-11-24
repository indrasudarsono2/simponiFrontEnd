import type { AuthUser } from '~/composables/useAuth';

export default defineNuxtPlugin(async () => {
  const { authUser, setAuthFromResponse } = useAuth();
  if (authUser.value) return;
  if (import.meta.server && !useCookie('auth_token').value) return;
  const config = useRuntimeConfig();
  const requestFetch = useRequestFetch();
  try {
    const session = await requestFetch<{ success: boolean; user: AuthUser }>(
      `${String(config.public.apiBaseUrl).replace(/\/+$/, '')}/api/auth/session`,
      { credentials: 'include' },
    );
    if (session.success && session.user) {
      setAuthFromResponse({ success: true, message: '', user: session.user,
        csrfToken: useCookie<string>('csrf_token').value });
    }
  } catch {
    // An expired or absent server session must not restore cached user data.
    authUser.value = null;
  }
});
