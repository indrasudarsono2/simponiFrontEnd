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

    const body = await readBody(event);

    // Validate required fields
    if (!body.professionInBranchId) {
      throw createError({
        statusCode: 400,
        statusMessage: "professionInBranchId is required",
      });
    }

    // Forward to backend
    const response = await $fetch(
      `http://${ip.ipBackEnd}/api/userBranch/${nik}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          professionInBranchId: body.professionInBranchId,
          branchUnitId: body.branchUnitId,
        },
      },
    );

    return response;
  } catch (error: any) {
    console.error("UserBranch PUT API error:", error);
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage:
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to update user profession",
      data: error?.data,
    });
  }
});
