import { defineEventHandler, readBody } from "h3";
import logbookData from "../../app/utils/logbook.json";

// In-memory storage (replace with database in production)
let logbooks = [...logbookData];

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  // GET - Retrieve all logbooks
  if (method === "GET") {
    // Add latestUpdate field if not present
    const logbooksWithDate = logbooks.map((logbook: any) => ({
      ...logbook,
      latestUpdate: logbook.latestUpdate || new Date().toISOString(),
    }));

    return logbooksWithDate;
  }

  // POST - Create new logbook
  if (method === "POST") {
    try {
      const body = await readBody(event);

      const { note, dateRange, file } = body;

      let filename: string;

      // If date range is provided, generate filename from dates
      if (dateRange?.start && dateRange?.end) {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        filename = `logbook_${start.getFullYear()}_${start.getMonth() + 1}_${start.getDate()}_to_${end.getFullYear()}_${end.getMonth() + 1}_${end.getDate()}.pdf`;
      } else if (file?.name) {
        // If file is uploaded, use the original filename
        filename = file.name;
      } else {
        // Default filename
        filename = `logbook_${Date.now()}.pdf`;
      }

      const newLogbook = {
        id: String(Date.now()),
        user: {
          id: "3458",
          name: "INDRA",
        },
        note: note,
        path: `/public/logbook/${filename}`,
        latestUpdate: new Date().toISOString(),
      };

      logbooks.push(newLogbook);

      return {
        success: true,
        message: "Logbook created successfully",
        data: newLogbook,
      };
    } catch (error) {
      throw createError({
        statusCode: 400,
        statusMessage: "Failed to create logbook",
      });
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
