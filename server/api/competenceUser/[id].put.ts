import { defineEventHandler, readMultipartFormData, createError } from "h3";
import ip from "../../../app/utils/config.json";

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  const authHeader = getHeader(event, "authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized - Token required",
    });
  }

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "License ID is required",
    });
  }

  const body = await readMultipartFormData(event);

  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: "No form data received",
    });
  }

  const formData = new FormData();

  for (const part of body) {
    if (!part.name) continue;

    if (part.filename && part.data) {
      const blob = new Blob([Uint8Array.from(part.data)], {
        type: part.type || "application/octet-stream",
      });
      formData.append(part.name, blob, part.filename);
    } else if (part.data) {
      formData.append(part.name, part.data.toString("utf-8"));
    }
  }

  try {
    const response = await $fetch(
      `http://${ip.ipBackEnd}/api/competenceUser/${id}`,
      {
        method: "PUT",
        body: formData,
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      },
    );

    return response;
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || "Failed to update license",
      data: error?.data,
    });
  }
});
