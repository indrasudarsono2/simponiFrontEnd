import { createError } from "h3";
import ip from "../../app/utils/config.json";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // Validate required fields
    if (
      !body.professionInBranchId ||
      !body.userNikList ||
      body.userNikList.length === 0
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "professionInBranchId and userNikList are required",
      });
    }

    // Forward to backend
    const response = await $fetch(`http://${ip.ipBackEnd}/api/userBranch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        professionInBranchId: body.professionInBranchId,
        userNikList: body.userNikList,
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
        "Failed to assign users to profession",
      data: error?.data,
    });
  }
});
