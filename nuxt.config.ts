// https://nuxt.com/docs/api/configuration/nuxt-config
const productionSecurityHeaders = import.meta.env.PROD
  ? {
      "Content-Security-Policy": "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; object-src 'none'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
    }
  : {};

export default defineNuxtConfig({
  modules: ["@nuxt/eslint", "@nuxt/ui", "@vueuse/nuxt", "@pinia/nuxt"],

  experimental: {
    defaults: {
      // Nuxt applies the complete ofetch option set at runtime, although its
      // config type currently exposes only retry-related useFetch defaults.
      useFetch: {
        credentials: "include",
      } as any,
    },
  },

  runtimeConfig: {
    apiOrigin: "http://127.0.0.1:44441",
    ipBackEnd: "localhost:44441",
    public: {
      apiBaseUrl: "/backend",
      screenMonitoringEnabled: true,
      // Available modes: "airnav", "local", or "hybrid" (both choices).
      authProvider: "airnav",
    },
  },

  devtools: {
    enabled: import.meta.env.DEV,
  },

  css: ["~/assets/css/main.css"],

  colorMode: {
    preference: "light",
    fallback: "light",
  },

  routeRules: {
    "/**": {
      headers: productionSecurityHeaders,
    },
    "/api/**": {
      cors: true,
    },
  },

  compatibilityDate: "2024-07-11",

  eslint: {
    config: {
      stylistic: {
        commaDangle: "never",
        braceStyle: "1tbs",
      },
    },
  },
});
