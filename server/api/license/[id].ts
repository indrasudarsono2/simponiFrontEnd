import { defineEventHandler, readBody, getRouterParam } from "h3";
import licenseData from "../../../app/utils/license.json";

// In-memory storage (replace with database in production)
let licenses = [...licenseData];

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "License ID is required",
    });
  }

  const licenseIndex = licenses.findIndex((l: any) => l.id === id);

  if (licenseIndex === -1) {
    throw createError({
      statusCode: 404,
      statusMessage: "License not found",
    });
  }

  const existingLicense = licenses[licenseIndex] as any;

  // PUT - Update license
  if (method === "PUT") {
    try {
      const body = await readBody(event);

      // Handle FormData or JSON
      const note = body.note || existingLicense.note;
      const file = body.file || null;

      const updatedLicense = {
        ...existingLicense,
        note: note,
        path: file
          ? `/public/license/${file.name || "updated_license.pdf"}`
          : existingLicense.path,
        latestUpdate: new Date().toISOString(),
      };

      licenses[licenseIndex] = updatedLicense;

      return {
        success: true,
        message: "License updated successfully",
        data: updatedLicense,
      };
    } catch (error) {
      throw createError({
        statusCode: 400,
        statusMessage: "Failed to update license",
      });
    }
  }

  // DELETE - Delete license
  if (method === "DELETE") {
    try {
      const deletedLicense = licenses[licenseIndex];
      licenses = licenses.filter((l: any) => l.id !== id);

      return {
        success: true,
        message: "License deleted successfully",
        data: deletedLicense,
      };
    } catch (error) {
      throw createError({
        statusCode: 400,
        statusMessage: "Failed to delete license",
      });
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
