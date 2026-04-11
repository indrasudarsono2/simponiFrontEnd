import { readFormData } from "h3";

export default defineEventHandler(async (event) => {
  try {
    // Get the event ID from URL params
    const eventId = event.context.params?.id;

    if (!eventId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Event ID is required",
      });
    }

    // Parse FormData from the request (includes file)
    const formData = await readFormData(event);

    // Debug: Log what we received
    // console.log("Received FormData entries:");
    for (const [key, value] of formData.entries()) {
      // console.log(
      //   `  ${key}: ${value instanceof File ? `File(${value.name})` : value}`,
      // );
    }

    // Validate required fields
    const eventName = formData.get("eventName") as string;
    const sectorId = formData.get("sectorId") as string;
    const sessionId = formData.get("sessionId") as string;

    if (!eventName || !sectorId || !sessionId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing required fields",
      });
    }

    // Get backend IP from config
    const { ipBackEnd } = useRuntimeConfig();
    const authHeader = getHeader(event, "authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized - Token required",
      });
    }
    // console.log(`Forwarding to: http://${ipBackEnd}/api/events/${eventId}`);

    // Forward to backend using native fetch with FormData (backend now supports multipart for PUT)
    const response = await fetch(`http://${ipBackEnd}/api/events/${eventId}`, {
      method: "PUT",
      body: formData, // Pass FormData directly - fetch will set correct Content-Type with boundary
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
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
    console.error("Error updating event:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Failed to update event",
    });
  }
});
