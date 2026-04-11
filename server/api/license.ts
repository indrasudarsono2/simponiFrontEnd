import { defineEventHandler, readBody } from "h3";
import licenseData from "../../app/utils/license.json";

// In-memory storage (replace with database in production)
let licenses = [...licenseData];

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  // GET - Retrieve all licenses
  if (method === "GET") {
    // Add latestUpdate field if not present
    const licensesWithDate = licenses.map((license: any) => ({
      ...license,
      latestUpdate: license.latestUpdate || new Date().toISOString(),
    }));
    return licensesWithDate;
  }

  // POST - Create new license
  if (method === "POST") {
    try {
      const body = await readBody(event);
      // Handle FormData or JSON
      const note = body.note || "";
      const file = body.file || null;

      const newLicense = {
        id: String(Date.now()),
        user: {
          id: "3458",
          name: "INDRA",
        },
        note: note,
        path: file
          ? `/public/license/${file.name || "new_license.pdf"}`
          : "/public/license/default.pdf",
        latestUpdate: new Date().toISOString(),
      };

      licenses.push(newLicense);
      // console.log(licenses);
      return {
        success: true,
        message: "License created successfully",
        data: newLicense,
      };
    } catch (error) {
      throw createError({
        statusCode: 400,
        statusMessage: "Failed to create license",
      });
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
