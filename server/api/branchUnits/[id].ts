// API endpoint for individual branch unit operations (PUT, DELETE)
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;
  const branchUnitId = parseInt(event.context.params?.id || "0");

  if (!branchUnitId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Branch Unit ID is required",
    });
  }

  // Mock data storage (in production, this would be a database)
  // Based on adminMindMap.json structure
  const mockBranchUnits = [
    {
      id: 1,
      name: "ACC",
      branchId: 1,
      branchName: "JAKARTA",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 2,
      name: "APP",
      branchId: 1,
      branchName: "JAKARTA",
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 3,
      name: "APPTMA",
      branchId: 2,
      branchName: "MEDAN",
      createdAt: "2024-01-17T10:00:00Z",
    },
    {
      id: 4,
      name: "ACO",
      branchId: 2,
      branchName: "MEDAN",
      createdAt: "2024-01-18T10:00:00Z",
    },
    {
      id: 5,
      name: "APPTMA",
      branchId: 3,
      branchName: "SURABAYA",
      createdAt: "2024-01-19T10:00:00Z",
    },
    {
      id: 6,
      name: "AIS",
      branchId: 3,
      branchName: "SURABAYA",
      createdAt: "2024-01-20T10:00:00Z",
    },
    {
      id: 7,
      name: "ACC",
      branchId: 4,
      branchName: "UJUNG PANDANG",
      createdAt: "2024-01-21T10:00:00Z",
    },
    {
      id: 8,
      name: "APP",
      branchId: 4,
      branchName: "UJUNG PANDANG",
      createdAt: "2024-01-22T10:00:00Z",
    },
  ];

  // Mock branches data for reference
  const mockBranches = [
    { id: 1, name: "JAKARTA", regionId: 1 },
    { id: 2, name: "MEDAN", regionId: 1 },
    { id: 3, name: "SURABAYA", regionId: 2 },
    { id: 4, name: "UJUNG PANDANG", regionId: 2 },
  ];

  // GET - Fetch single branch unit
  if (method === "GET") {
    const branchUnit = mockBranchUnits.find((u) => u.id === branchUnitId);

    if (!branchUnit) {
      throw createError({
        statusCode: 404,
        statusMessage: "Branch Unit not found",
      });
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return branchUnit;
  }

  // PUT/PATCH - Update branch unit
  if (method === "PUT" || method === "PATCH") {
    const body = await readBody(event);

    // Validate input
    if (!body.name || body.name.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "Branch Unit name must be at least 2 characters",
      });
    }

    if (!body.branchId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Branch is required",
      });
    }

    // Check if branch exists
    const branch = mockBranches.find((b) => b.id === body.branchId);
    if (!branch) {
      throw createError({
        statusCode: 404,
        statusMessage: "Branch not found",
      });
    }

    // Find branch unit
    const branchUnitIndex = mockBranchUnits.findIndex(
      (u) => u.id === branchUnitId,
    );

    if (branchUnitIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Branch Unit not found",
      });
    }

    // Check for duplicate names within the same branch (excluding current branch unit)
    const isDuplicate = mockBranchUnits.some(
      (unit) =>
        unit.id !== branchUnitId &&
        unit.branchId === body.branchId &&
        unit.name.toLowerCase() === body.name.toLowerCase(),
    );

    if (isDuplicate) {
      throw createError({
        statusCode: 409,
        statusMessage:
          "Branch Unit with this name already exists in this branch",
      });
    }

    // Update branch unit
    const existingUnit = mockBranchUnits[branchUnitIndex]!;
    const updatedBranchUnit = {
      id: existingUnit.id,
      name: body.name,
      branchId: body.branchId,
      branchName: branch.name,
      createdAt: existingUnit.createdAt,
    };
    mockBranchUnits[branchUnitIndex] = updatedBranchUnit;

    // In production, update database here
    // await db.branchUnits.update(branchUnitId, { name: body.name, branchId: body.branchId })

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: mockBranchUnits[branchUnitIndex],
      message: "Branch Unit updated successfully",
    };
  }

  // DELETE - Delete branch unit
  if (method === "DELETE") {
    // Find branch unit
    const branchUnitIndex = mockBranchUnits.findIndex(
      (u) => u.id === branchUnitId,
    );

    if (branchUnitIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Branch Unit not found",
      });
    }

    // In production, check for dependencies here
    // const hasSectors = await db.sectors.count({ branchUnitId })
    // if (hasSectors > 0) {
    //   throw createError({
    //     statusCode: 409,
    //     statusMessage: "Cannot delete branch unit with existing sectors",
    //   });
    // }

    // Delete branch unit
    const deletedBranchUnit = mockBranchUnits[branchUnitIndex];
    // mockBranchUnits.splice(branchUnitIndex, 1);

    // In production, delete from database here
    // await db.branchUnits.delete(branchUnitId)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: deletedBranchUnit,
      message: "Branch Unit deleted successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
