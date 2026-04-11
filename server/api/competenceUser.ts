import { readMultipartFormData, createError } from "h3";
import ip from "../../app/utils/config.json";

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  try {
    // GET - Retrieve competence data
    if (method === "GET") {
      const response = await $fetch(
        `http://${ip.ipBackEnd}/api/competenceUser`,
        {
          method: "GET",
        },
      );
      return response;
    }

    // POST - Create new competence
    if (method === "POST") {
      const formData = await readMultipartFormData(event);
      if (!formData) {
        throw createError({
          statusCode: 400,
          statusMessage: "No form data received",
        });
      }

      const backendFormData = new FormData();

      for (const field of formData) {
        if (field.name === "file" && field.data) {
          const blob = new Blob([field.data], {
            type: field.type || "application/octet-stream",
          });
          const file = new File([blob], field.filename || "file", {
            type: field.type || "application/octet-stream",
          });
          backendFormData.append("file", file, field.filename || "file");
        } else if (field.name && field.data) {
          backendFormData.append(field.name, field.data.toString());
        }
      }

      const response = await $fetch(
        `http://${ip.ipBackEnd}/api/competenceUser`,
        {
          method: "POST",
          body: backendFormData,
        },
      );

      return response;
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  } catch (error: any) {
    console.error("Competence API error:", error);
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage:
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to process Competence request",
      data: error?.data,
    });
  }
});
