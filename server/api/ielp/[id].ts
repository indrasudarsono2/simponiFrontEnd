import { defineEventHandler, readBody, getRouterParam } from "h3";
import userData from "../../../app/utils/user.json";

// Get INDRA's IELP data (user with nik "3458")
const indraUser = userData.find((u: any) => u.nik === "3458");
let ielpRecords = indraUser?.ielp || [];

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "IELP ID is required",
    });
  }

  const ielpIndex = ielpRecords.findIndex((i: any) => i.id === id);

  if (ielpIndex === -1) {
    throw createError({
      statusCode: 404,
      statusMessage: "IELP record not found",
    });
  }

  const existingIELP = ielpRecords[ielpIndex] as any;

  // PUT - Update IELP record
  if (method === "PUT") {
    try {
      const body = await readBody(event);

      const updatedIELP = {
        ...existingIELP,
        institution: body.institution || existingIELP.institution,
        level: body.level || existingIELP.level,
        released: body.released || existingIELP.released,
        expired: body.expired || existingIELP.expired,
        rater: body.rater || existingIELP.rater,
      };

      ielpRecords[ielpIndex] = updatedIELP;

      return {
        success: true,
        message: "IELP record updated successfully",
        data: updatedIELP,
      };
    } catch (error) {
      throw createError({
        statusCode: 400,
        statusMessage: "Failed to update IELP record",
      });
    }
  }

  // DELETE - Delete IELP record
  if (method === "DELETE") {
    try {
      const deletedIELP = ielpRecords[ielpIndex];
      ielpRecords = ielpRecords.filter((i: any) => i.id !== id);

      return {
        success: true,
        message: "IELP record deleted successfully",
        data: deletedIELP,
      };
    } catch (error) {
      throw createError({
        statusCode: 400,
        statusMessage: "Failed to delete IELP record",
      });
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
