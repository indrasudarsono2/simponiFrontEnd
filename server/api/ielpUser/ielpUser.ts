import { defineEventHandler, readBody, getQuery } from "h3";
import userData from "../../../app/utils/user.json";

// Get INDRA's IELP data (user with nik "3458")
const indraUser = userData.find((u: any) => u.licenseUserId === "3458");
let ielpRecords = indraUser?.ielp || [];
// console.log(indraUser);
export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  // GET - Fetch INDRA's IELP records only
  if (method === "GET") {
    return ielpRecords;
  }

  // POST - Create new IELP record
  if (method === "POST") {
    try {
      const body = await readBody(event);

      const newIELP = {
        id: String(ielpRecords.length + 1),
        isConfirm: true,
        userId: { id: "3458", name: "INDRA SUDARSONO" }, // Current user
        institution: body.institution,
        level: body.level,
        released: body.released,
        expired: body.expired,
        rater: body.rater,
        file: body.file,
      };

      ielpRecords.push(newIELP);

      return {
        success: true,
        message: "IELP record created successfully",
        data: newIELP,
      };
    } catch (error) {
      throw createError({
        statusCode: 400,
        statusMessage: "Failed to create IELP record",
      });
    }
  }

  // PUT - Update IELP record
  if (method === "PUT") {
    try {
      const body = await readBody(event);
      const query = getQuery(event);
      const id = body.id || query.id;

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
    } catch (error: any) {
      throw createError({
        statusCode: error.statusCode || 400,
        statusMessage: error.statusMessage || "Failed to update IELP record",
      });
    }
  }

  // DELETE - Delete IELP record
  if (method === "DELETE") {
    try {
      const query = getQuery(event);
      const id = query.id;

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

      const deletedIELP = ielpRecords[ielpIndex];
      ielpRecords = ielpRecords.filter((i: any) => i.id !== id);

      return {
        success: true,
        message: "IELP record deleted successfully",
        data: deletedIELP,
      };
    } catch (error: any) {
      throw createError({
        statusCode: error.statusCode || 400,
        statusMessage: error.statusMessage || "Failed to delete IELP record",
      });
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
