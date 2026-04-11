// API endpoint for individual CWP operations (PUT, DELETE)
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;
  const cwpId = parseInt(event.context.params?.id || "0");

  if (!cwpId) {
    throw createError({
      statusCode: 400,
      statusMessage: "CWP ID is required",
    });
  }

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

  // GET - Fetch single CWP
  if (method === "GET") {
    const cwp = mockCwps.find((c) => c.id === cwpId);

    if (!cwp) {
      throw createError({
        statusCode: 404,
        statusMessage: "CWP not found",
      });
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return cwp;
  }

  // PUT/PATCH - Update CWP configuration
  if (method === "PUT" || method === "PATCH") {
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

    // Find CWP
    const cwpIndex = mockCwps.findIndex((c) => c.id === cwpId);

    if (cwpIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "CWP not found",
      });
    }

    // Check for duplicate CWP names within the same sector (excluding current CWP)
    const isDuplicate = mockCwps.some(
      (cwp) =>
        cwp.id !== cwpId &&
        cwp.sectorId === body.sectorId &&
        cwp.name.toLowerCase() === body.name.toLowerCase(),
    );

    if (isDuplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: "CWP with this name already exists in this sector",
      });
    }

    // Update CWP
    const existingCwp = mockCwps[cwpIndex]!;
    const updatedCwp = {
      id: existingCwp.id,
      name: body.name,
      ratingId: body.ratingId,
      ratingName: rating.name,
      sectorId: body.sectorId,
      sectorName: sector.name,
      branchId: ACC_CONTEXT.branchId,
      branchName: ACC_CONTEXT.branchName,
      branchUnitId: ACC_CONTEXT.branchUnitId,
      branchUnitName: ACC_CONTEXT.branchUnitName,
      createdAt: existingCwp.createdAt,
    };
    mockCwps[cwpIndex] = updatedCwp;

    // In production, update database here
    // await db.cwps.update(cwpId, { name: body.name, ratingId: body.ratingId, sectorId: body.sectorId })

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: mockCwps[cwpIndex],
      message: "CWP configuration updated successfully",
    };
  }

  // DELETE - Delete CWP configuration
  if (method === "DELETE") {
    // Find CWP
    const cwpIndex = mockCwps.findIndex((c) => c.id === cwpId);

    if (cwpIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "CWP not found",
      });
    }

    // In production, check for dependencies here
    // const hasUsers = await db.users.count({ cwpId })
    // if (hasUsers > 0) {
    //   throw createError({
    //     statusCode: 409,
    //     statusMessage: "Cannot delete CWP with assigned users",
    //   });
    // }

    // Delete CWP
    const deletedCwp = mockCwps[cwpIndex];
    // mockCwps.splice(cwpIndex, 1);

    // In production, delete from database here
    // await db.cwps.delete(cwpId)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: deletedCwp,
      message: "CWP configuration deleted successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
