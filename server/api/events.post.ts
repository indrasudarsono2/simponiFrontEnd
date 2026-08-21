import { getCookie, getHeader, readFormData } from "h3";

export default defineEventHandler(async (event) => {
  try {
    // Parse FormData from the request
    const formData = await readFormData(event);
    const authToken = getCookie(event, "auth_token");
    const csrfCookie = getCookie(event, "csrf_token");
    const csrfHeader = getHeader(event, "x-csrf-token");

    if (!authToken) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized - Session required",
      });
    }
    // Validate required fields
    const eventName = formData.get("eventName") as string;
    const sectorId = formData.get("sectorId") as string;
    const sessionId = formData.get("sessionId") as string;
    const remarkDocId = formData.get("remarkDocId") as string;

    if (!eventName || !sectorId || !sessionId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing required fields",
      });
    }

    // Get backend IP from config
    const { ipBackEnd } = useRuntimeConfig();

    // Forward the original FormData directly to backend using native fetch
    const cookieHeader = [
      `auth_token=${encodeURIComponent(authToken)}`,
      csrfCookie
        ? `csrf_token=${encodeURIComponent(csrfCookie)}`
        : null,
    ]
      .filter(Boolean)
      .join("; ");

    const response = await fetch(`http://${ipBackEnd}/api/events`, {
      method: "POST",
      body: formData, // Pass FormData directly - fetch will set correct Content-Type with boundary
      headers: {
        Cookie: cookieHeader,
        ...(csrfHeader ? { "X-CSRF-Token": csrfHeader } : {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw createError({
        statusCode: response.status,
        statusMessage: errorText || "Backend error",
      });
    }

    return await response.json();
  } catch (error: any) {
    console.error("Error creating event:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Failed to create event",
    });
  }
});
