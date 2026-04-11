// server/api/ielp.ts
import ielpData from "~/utils/ielp.json";

export default defineEventHandler(async (event) => {
  const method = event.method;

  if (method === "GET") {
    // Return all IELP data
    return ielpData.map((item: any) => ({
      id: parseInt(item.id),
      name: item.userId?.name || "Unknown",
      released: item.released,
      expired: item.expired,
      rater: item.rater,
      institution: item.institution,
      level: item.level,
      isConfirm: item.isConfirm,
    }));
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
