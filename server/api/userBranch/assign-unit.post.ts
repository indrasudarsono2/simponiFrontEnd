import { createError } from "h3";
import ip from "../../../app/utils/config.json";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // Validate required fields
    if (
      !body.branchUnitId ||
      !body.userNikList ||
      !Array.isArray(body.userNikList)
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing required fields: branchUnitId and userNikList",
      });
    }

    // Get token from request headers
    const authHeader = getHeader(event, "authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized - Token required",
      });
    }

    // Forward to backend API
    const response = await $fetch(
      `http://${ip.ipBackEnd}/api/userBranch/assign-unit`,
      {
        method: "POST",
        body: {
          branchUnitId: body.branchUnitId,
          userNikList: body.userNikList,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response;
  } catch (error: any) {
    console.error("Assign branch unit API error:", error);
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage:
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to assign branch unit to users",
      data: error?.data,
    });
  }
});
