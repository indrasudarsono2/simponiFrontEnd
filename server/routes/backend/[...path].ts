import {
  getCookie,
  getMethod,
  getRequestURL,
  getRouterParam,
  proxyRequest,
} from "h3";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const apiOrigin = String(config.apiOrigin || "").replace(/\/+$/, "");
  const requestPath = getRouterParam(event, "path") || "";

  if (!apiOrigin.startsWith("http://") && !apiOrigin.startsWith("https://")) {
    throw createError({
      statusCode: 500,
      statusMessage: "Backend API origin is not configured.",
    });
  }

  const method = getMethod(event).toUpperCase();
  const authToken = getCookie(event, "auth_token");
  const csrfToken = getCookie(event, "csrf_token");

  // Preserve the session when a trusted internal request uses bearer auth.
  // proxyRequest also forwards the SSO state/verifier cookies to the backend.
  if (authToken && !event.node.req.headers.authorization) {
    event.node.req.headers.authorization = `Bearer ${authToken}`;
  }

  if (!SAFE_METHODS.has(method) && csrfToken) {
    event.node.req.headers["x-csrf-token"] = csrfToken;
  }

  const requestUrl = getRequestURL(event);
  const target = `${apiOrigin}/${requestPath}${requestUrl.search}`;
  // OAuth redirects must reach the browser together with Set-Cookie. Following
  // them inside the server would lose the browser's SSO state and callback flow.
  return proxyRequest(event, target, { fetchOptions: { redirect: "manual" } });
});
