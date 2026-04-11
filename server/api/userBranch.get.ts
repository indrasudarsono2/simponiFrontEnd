import { createError } from "h3";
import ip from "../../app/utils/config.json";

export default defineEventHandler(async (event) => {
  try {
    // Get token from request headers
    const authHeader = getHeader(event, "authorization");

    // Forward to backend
    const response = await $fetch(`http://${ip.ipBackEnd}/api/userBranch`, {
      method: "GET",
      headers: {
        ...(authHeader && { Authorization: authHeader }),
      },
    });

    return response;
  } catch (error: any) {
    console.error("UserBranch API error:", error);
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage:
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to fetch user branch data",
      data: error?.data,
    });
  }
});
