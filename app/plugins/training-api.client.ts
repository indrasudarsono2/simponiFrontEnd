import { handleTrainingApi } from '~/utils/trainingApi'

export default defineNuxtPlugin(() => {
  const { active } = useTrainingMode()
  const originalFetch = globalThis.fetch.bind(globalThis)
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.origin)
    if (!active.value) return originalFetch(input, init)

    if (url.pathname.startsWith('/__training_api__/api/')) {
      return handleTrainingApi(new Request(url, input instanceof Request ? input : init))
    }

    // Defense in depth for code that bypasses useApiBaseUrl. Auth/session
    // requests remain live; application data endpoints do not.
    if (/(^|\/)api\//i.test(url.pathname)
      && !/(^|\/)api\/(auth|login|logout|csrf)(\/|$)/i.test(url.pathname)) {
      return new Response(JSON.stringify({ message: 'Real API is blocked in Training Mode' }), {
        status: 403, headers: { 'Content-Type': 'application/json' }
      })
    }
    return originalFetch(input, init)
  }
})
