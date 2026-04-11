import { defineEventHandler, readBody, getRouterParam } from "h3";
import logbookData from "../../../app/utils/logbook.json";

// In-memory storage (replace with database in production)
let logbooks = [...logbookData];

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Logbook ID is required",
    });
  }

  const logbookIndex = logbooks.findIndex((l: any) => l.id === id);

  if (logbookIndex === -1) {
    throw createError({
      statusCode: 404,
      statusMessage: "Logbook not found",
    });
  }

  const existingLogbook = logbooks[logbookIndex] as any;

  // PUT - Update logbook
  if (method === "PUT") {
    try {
      const body = await readBody(event);

      const { note, file } = body;

      // If new file is uploaded, update path
      const updatedPath = file?.name
        ? `/public/logbook/${file.name}`
        : existingLogbook.path;

      const updatedLogbook = {
        ...existingLogbook,
        note: note || existingLogbook.note,
        path: updatedPath,
        latestUpdate: new Date().toISOString(),
      };

      logbooks[logbookIndex] = updatedLogbook;

      return {
        success: true,
        message: "Logbook updated successfully",
        data: updatedLogbook,
      };
    } catch (error) {
      throw createError({
        statusCode: 400,
        statusMessage: "Failed to update logbook",
      });
    }
  }

  // DELETE - Delete logbook
  if (method === "DELETE") {
    try {
      const deletedLogbook = logbooks[logbookIndex];
      logbooks = logbooks.filter((l: any) => l.id !== id);

      return {
        success: true,
        message: "Logbook deleted successfully",
        data: deletedLogbook,
      };
    } catch (error) {
      throw createError({
        statusCode: 400,
        statusMessage: "Failed to delete logbook",
      });
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
