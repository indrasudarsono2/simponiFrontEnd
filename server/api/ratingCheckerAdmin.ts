// Mock API endpoint for rating checker admin
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;

  // Mock data storage (in production, this would be a database)
  // Based on rating.json for JAKARTA - ACC
  const mockRatingCheckers = [
    {
      id: 1,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 4,
      ratingName: "ACP",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 2,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 5,
      ratingName: "ACS",
      createdAt: "2024-01-16T10:00:00Z",
    },
  ];

  // Available sectors for ACC (from adminMindMap.json)
  const mockSectors = [
    { id: 1, name: "WEST" },
    { id: 2, name: "EAST" },
    { id: 3, name: "NORTH" },
    { id: 4, name: "NORTH WEST" },
    { id: 5, name: "NORTH EAST" },
  ];

  // Available ratings (from adminMindMap.json)
  const mockRatings = [
    { id: 1, name: "TWR" },
    { id: 2, name: "APP" },
    { id: 3, name: "APS" },
    { id: 4, name: "ACP" },
    { id: 5, name: "ACS" },
  ];

  // GET - Fetch all rating checkers
  if (method === "GET") {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return mockRatingCheckers;
  }

  // POST - Create new rating checker
  if (method === "POST") {
    const body = await readBody(event);

    // Validate input
    if (!body.sectorId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Sector is required",
      });
    }

    if (!body.ratingId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Rating is required",
      });
    }

    // Get sector info
    const sectorItem = mockSectors.find((s) => s.id === body.sectorId);
    if (!sectorItem) {
      throw createError({
        statusCode: 404,
        statusMessage: "Sector not found",
      });
    }

    // Get rating info
    const ratingItem = mockRatings.find((r) => r.id === body.ratingId);
    if (!ratingItem) {
      throw createError({
        statusCode: 404,
        statusMessage: "Rating not found",
      });
    }

    // Check for duplicate
    const isDuplicate = mockRatingCheckers.some(
      (rc) => rc.sectorId === body.sectorId && rc.ratingId === body.ratingId,
    );

    if (isDuplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: "This rating is already assigned to this sector",
      });
    }

    // Create new rating checker
    const newRatingChecker = {
      id: Math.max(...mockRatingCheckers.map((r) => r.id)) + 1,
      sectorId: body.sectorId,
      sectorName: sectorItem.name,
      ratingId: body.ratingId,
      ratingName: ratingItem.name,
      createdAt: new Date().toISOString(),
    };

    // In production, save to database here
    // await db.ratingCheckers.create(newRatingChecker)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: newRatingChecker,
      message: "Rating created successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
