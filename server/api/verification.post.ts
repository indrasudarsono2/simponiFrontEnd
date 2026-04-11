export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // Validate the request body
  if (!Array.isArray(body)) {
    throw createError({
      statusCode: 400,
      message: "Invalid data format. Expected an array.",
    });
  }

  // Validate each item in the array
  for (const item of body) {
    if (
      !item.pernyataan ||
      typeof item.isStatus !== "boolean" ||
      typeof item.isKesesuaian !== "boolean"
    ) {
      throw createError({
        statusCode: 400,
        message:
          "Invalid data format. Each item must have pernyataan, isStatus, and isKesesuaian.",
      });
    }
  }

  // TODO: Save to database
  // For now, just log and return success
  console.log("[VERIFICATION API] Received data:", body);

  return {
    success: true,
    message: "Verification data saved successfully",
    data: body,
    savedAt: new Date().toISOString(),
  };
});
