import { createError } from "h3";
import ip from "../../../../app/utils/config.json";

export default defineEventHandler(async (event) => {
  try {
    const nik = getRouterParam(event, "nik");

    if (!nik) {
      throw createError({
        statusCode: 400,
        statusMessage: "NIK is required",
      });
    }

    const body = await readBody(event);

    // Forward to backend
    const response = await $fetch(
      `http://${ip.ipBackEnd}/api/userBranch/${nik}/sector`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          sectorId: body.sectorId,
        },
      },
    );

    return response;
  } catch (error: any) {
    console.error("UserBranch sector PUT API error:", error);
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage:
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to update user sector",
      data: error?.data,
    });
  }
});
