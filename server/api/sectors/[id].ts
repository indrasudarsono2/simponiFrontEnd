// API endpoint for individual sector operations (PUT, DELETE)
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;
  const sectorId = parseInt(event.context.params?.id || "0");

  if (!sectorId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Sector ID is required",
    });
  }

  // Mock data storage (in production, this would be a database)
  // Based on adminMindMap.json structure - ACC branch unit sectors only
  const mockSectors = [
    {
      id: 1,
      name: "WEST",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 2,
      name: "EAST",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 3,
      name: "NORTH",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-17T10:00:00Z",
    },
    {
      id: 4,
      name: "NORTH WEST",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-18T10:00:00Z",
    },
    {
      id: 5,
      name: "NORTH EAST",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-19T10:00:00Z",
    },
  ];

  // Fixed context for ACC Branch Unit Admin
  const ACC_CONTEXT = {
    branchId: 1,
    branchName: "JAKARTA",
    branchUnitId: 1,
    branchUnitName: "ACC",
  };

  // GET - Fetch single sector
  if (method === "GET") {
    const sector = mockSectors.find((s) => s.id === sectorId);

    if (!sector) {
      throw createError({
        statusCode: 404,
        statusMessage: "Sector not found",
      });
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return sector;
  }

  // PUT/PATCH - Update sector
  if (method === "PUT" || method === "PATCH") {
    const body = await readBody(event);

    // Validate input
    if (!body.name || body.name.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "Sector name must be at least 2 characters",
      });
    }

    // Find sector
    const sectorIndex = mockSectors.findIndex((s) => s.id === sectorId);

    if (sectorIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Sector not found",
      });
    }

    // Check for duplicate names (excluding current sector)
    const isDuplicate = mockSectors.some(
      (sector) =>
        sector.id !== sectorId &&
        sector.name.toLowerCase() === body.name.toLowerCase(),
    );

    if (isDuplicate) {
      throw createError({
        statusCode: 409,
        statusMessage:
          "Sector with this name already exists in ACC branch unit",
      });
    }

    // Update sector
    const existingSector = mockSectors[sectorIndex]!;
    const updatedSector = {
      id: existingSector.id,
      name: body.name,
      branchId: ACC_CONTEXT.branchId,
      branchName: ACC_CONTEXT.branchName,
      branchUnitId: ACC_CONTEXT.branchUnitId,
      branchUnitName: ACC_CONTEXT.branchUnitName,
      createdAt: existingSector.createdAt,
    };
    mockSectors[sectorIndex] = updatedSector;

    // In production, update database here
    // await db.sectors.update(sectorId, { name: body.name })

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: mockSectors[sectorIndex],
      message: "Sector updated successfully",
    };
  }

  // DELETE - Delete sector
  if (method === "DELETE") {
    // Find sector
    const sectorIndex = mockSectors.findIndex((s) => s.id === sectorId);

    if (sectorIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Sector not found",
      });
    }

    // In production, check for dependencies here
    // const hasCwps = await db.sectorCwps.count({ sectorId })
    // if (hasCwps > 0) {
    //   throw createError({
    //     statusCode: 409,
    //     statusMessage: "Cannot delete sector with existing CWP configurations",
    //   });
    // }

    // Delete sector
    const deletedSector = mockSectors[sectorIndex];
    // mockSectors.splice(sectorIndex, 1);

    // In production, delete from database here
    // await db.sectors.delete(sectorId)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: deletedSector,
      message: "Sector deleted successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
