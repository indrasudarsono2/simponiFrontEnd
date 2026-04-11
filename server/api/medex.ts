// server/api/medex.ts
import medexData from "~/utils/medex.json";

export default defineEventHandler(async (event) => {
  const method = event.method;

  if (method === "GET") {
    // Return all MEDEX data
    return medexData.map((item: any) => ({
      id: parseInt(item.id),
      name: item.userId?.name || "Unknown",
      released: item.released,
      expired: item.expired,
      examiner: item.examiner,
      institution: item.institution,
      isConfirm: item.isConfirm,
    }));
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
