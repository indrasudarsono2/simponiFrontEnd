import { createError } from "h3";
import ip from "../../../app/utils/config.json";

export default defineEventHandler(async (event) => {
  try {
    const nik = getRouterParam(event, "nik");

    if (!nik) {
      throw createError({
        statusCode: 400,
        statusMessage: "NIK is required",
      });
    }

    // Forward to backend
    const response = await $fetch(
      `http://${ip.ipBackEnd}/api/userBranch/${nik}`,
      {
        method: "DELETE",
      },
    );

    return response;
  } catch (error: any) {
    console.error("UserBranch DELETE API error:", error);
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage:
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to remove user profession assignment",
      data: error?.data,
    });
  }
});
