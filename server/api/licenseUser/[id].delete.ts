import { defineEventHandler, createError } from "h3";
import ip from "../../../app/utils/config.json";

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "License ID is required",
    });
  }

  try {
    const response = await $fetch(
      `http://${ip.ipBackEnd}/api/licenseUser/${id}`,
      {
        method: "DELETE",
      },
    );

    return response;
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || "Failed to delete license",
      data: error?.data,
    });
  }
});
