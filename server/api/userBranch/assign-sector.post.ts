import { createError } from "h3";
import ip from "../../../app/utils/config.json";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // Validate required fields
    if (!body.sectorId) {
      throw createError({
        statusCode: 400,
        statusMessage: "sectorId is required",
      });
    }

    if (
      !body.userNikList ||
      !Array.isArray(body.userNikList) ||
      body.userNikList.length === 0
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "userNikList is required and must be a non-empty array",
      });
    }

    // Forward to backend
    const response = await $fetch(
      `http://${ip.ipBackEnd}/api/userBranch/assign-sector`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          sectorId: body.sectorId,
          userNikList: body.userNikList,
        },
      },
    );

    return response;
  } catch (error: any) {
    console.error("UserBranch assign-sector API error:", error);
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage:
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to assign users to sector",
      data: error?.data,
    });
  }
});
