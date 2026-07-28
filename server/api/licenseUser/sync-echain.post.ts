import { createError } from "h3";
import ip from "../../../app/utils/config.json";

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, "authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized - Token required",
      });
    }

    const response = await $fetch(
      `http://${ip.ipBackEnd}/api/licenseUser/sync-echain`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response;
  } catch (error: any) {
    console.error("License e-chain sync error:", error);
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to sync license data from e-chain",
      data: error?.data,
    });
  }
});

