import { readMultipartFormData } from "h3";
import ip from "../../app/utils/config.json";

export default defineEventHandler(async (event) => {
  try {
    // Parse multipart form data
    const formData = await readMultipartFormData(event);
    const authHeader = getHeader(event, "authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized - Token required",
      });
    }
    if (!formData) {
      throw createError({
        statusCode: 400,
        statusMessage: "No form data received",
      });
    }

    // Create new FormData to forward to backend
    const backendFormData = new FormData();

    // Process each field
    for (const field of formData) {
      if (field.name === "file" && field.data) {
        // Create File from buffer for file upload
        const blob = new Blob([field.data], {
          type: field.type || "application/octet-stream",
        });
        const file = new File([blob], field.filename || "file", {
          type: field.type || "application/octet-stream",
        });
        backendFormData.append("file", file, field.filename || "file");
      } else if (field.name && field.data) {
        // Regular text field
        backendFormData.append(field.name, field.data.toString());
      }

      // Also log the field for debugging
      console.log(
        `Field: ${field.name}, Filename: ${field.filename}, Type: ${field.type}`,
      );
    }

    // Log what we're sending to backend for debugging
    console.log("Forwarding to backend with fields:");
    for (const [key, value] of backendFormData.entries()) {
      console.log(`  ${key}: ${value instanceof File ? value.name : value}`);
    }

    // Forward to backend
    const response = await $fetch(`http://${ip.ipBackEnd}/api/logbookUser`, {
      method: "POST",
      body: backendFormData,
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    });

    return response;
  } catch (error: any) {
    console.error("License creation error:", error);
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage:
        error?.data?.message || error?.message || "Failed to create license",
    });
  }
});
