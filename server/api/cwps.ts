// Mock API endpoint for CWP (Control Working Position) configurations
// TODO: Replace this with actual database integration
// This API is designed for Branch Unit Admin role (ACC branch unit only)

export default defineEventHandler(async (event) => {
  const method = event.method;

  // Mock data storage (in production, this would be a database)
  // Based on adminMindMap.json structure - ACC branch unit CWP configurations only
  const mockCwps = [
    // WEST sector CWP
    {
      id: 1,
      name: "UMDN",
      ratingId: 5,
      ratingName: "ACS",
      sectorId: 1,
      sectorName: "WEST",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 2,
      name: "UPLB",
      ratingId: 5,
      ratingName: "ACS",
      sectorId: 1,
      sectorName: "WEST",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 3,
      name: "UMDNA",
      ratingId: 4,
      ratingName: "ACP",
      sectorId: 1,
      sectorName: "WEST",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-17T10:00:00Z",
    },
    // EAST sector CWP
    {
      id: 4,
      name: "UTPN",
      ratingId: 5,
      ratingName: "ACS",
      sectorId: 2,
      sectorName: "EAST",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-18T10:00:00Z",
    },
    {
      id: 5,
      name: "USMG",
      ratingId: 5,
      ratingName: "ACS",
      sectorId: 2,
      sectorName: "EAST",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-19T10:00:00Z",
    },
    {
      id: 6,
      name: "UJOGA",
      ratingId: 4,
      ratingName: "ACP",
      sectorId: 2,
      sectorName: "EAST",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-20T10:00:00Z",
    },
    // NORTH sector CWP
    {
      id: 7,
      name: "UNTA",
      ratingId: 5,
      ratingName: "ACS",
      sectorId: 3,
      sectorName: "NORTH",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-21T10:00:00Z",
    },
    {
      id: 8,
      name: "TPG",
      ratingId: 5,
      ratingName: "ACS",
      sectorId: 3,
      sectorName: "NORTH",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-22T10:00:00Z",
    },
    {
      id: 9,
      name: "UNTAA",
      ratingId: 4,
      ratingName: "ACP",
      sectorId: 3,
      sectorName: "NORTH",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-23T10:00:00Z",
    },
  ];

  // Mock ratings data for reference
  const mockRatings = [
    { id: 1, name: "TWR" },
    { id: 2, name: "APP" },
    { id: 3, name: "APS" },
    { id: 4, name: "ACP" },
    { id: 5, name: "ACS" },
    { id: 6, name: "ACO" },
    { id: 7, name: "KARTOGRAFI" },
  ];

  // Mock sectors data for reference (ACC branch unit only)
  const mockSectors = [
    { id: 1, name: "WEST", branchId: 1, branchUnitId: 1 },
    { id: 2, name: "EAST", branchId: 1, branchUnitId: 1 },
    { id: 3, name: "NORTH", branchId: 1, branchUnitId: 1 },
    { id: 4, name: "NORTH WEST", branchId: 1, branchUnitId: 1 },
    { id: 5, name: "NORTH EAST", branchId: 1, branchUnitId: 1 },
  ];

  // Fixed context for ACC Branch Unit Admin
  const ACC_CONTEXT = {
    branchId: 1,
    branchName: "JAKARTA",
    branchUnitId: 1,
    branchUnitName: "ACC",
  };

  // GET - Fetch all CWP configurations for ACC branch unit
  if (method === "GET") {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return mockCwps;
  }

  // POST - Create new CWP configuration (always for ACC branch unit)
  if (method === "POST") {
    const body = await readBody(event);

    // Validate input
    if (!body.name || body.name.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "CWP name must be at least 2 characters",
      });
    }

    if (!body.ratingId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Rating is required",
      });
    }

    if (!body.sectorId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Sector is required",
      });
    }

    // Check if rating exists
    const rating = mockRatings.find((r) => r.id === body.ratingId);
    if (!rating) {
      throw createError({
        statusCode: 404,
        statusMessage: "Rating not found",
      });
    }

    // Check if sector exists and belongs to ACC
    const sector = mockSectors.find(
      (s) =>
        s.id === body.sectorId && s.branchUnitId === ACC_CONTEXT.branchUnitId,
    );
    if (!sector) {
      throw createError({
        statusCode: 404,
        statusMessage: "Sector not found in ACC branch unit",
      });
    }

    // Check for duplicate CWP names within the same sector
    const isDuplicate = mockCwps.some(
      (cwp) =>
        cwp.sectorId === body.sectorId &&
        cwp.name.toLowerCase() === body.name.toLowerCase(),
    );

    if (isDuplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: "CWP with this name already exists in this sector",
      });
    }

    // Create new CWP configuration (always for ACC)
    const newCwp = {
      id: Math.max(...mockCwps.map((c) => c.id), 0) + 1,
      name: body.name,
      ratingId: body.ratingId,
      ratingName: rating.name,
      sectorId: body.sectorId,
      sectorName: sector.name,
      branchId: ACC_CONTEXT.branchId,
      branchName: ACC_CONTEXT.branchName,
      branchUnitId: ACC_CONTEXT.branchUnitId,
      branchUnitName: ACC_CONTEXT.branchUnitName,
      createdAt: new Date().toISOString(),
    };

    // In production, save to database here
    // await db.cwps.create(newCwp)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: newCwp,
      message: "CWP configuration created successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
