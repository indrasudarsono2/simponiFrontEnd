// Mock API endpoint for branch units
// TODO: Replace this with actual database integration
// This API is designed for Branch Admin role (JAKARTA branch only)

export default defineEventHandler(async (event) => {
  const method = event.method;

  // Mock data storage (in production, this would be a database)
  // Based on adminMindMap.json structure - JAKARTA branch units only
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
  ];

  // Fixed branch for JAKARTA (Branch Admin context)
  const JAKARTA_BRANCH = { id: 1, name: "JAKARTA", regionId: 1 };

  // GET - Fetch all branch units for JAKARTA branch
  if (method === "GET") {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return mockBranchUnits;
  }

  // POST - Create new branch unit (always for JAKARTA branch)
  if (method === "POST") {
    const body = await readBody(event);

    // Validate input
    if (!body.name || body.name.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "Branch Unit name must be at least 2 characters",
      });
    }

    // Check for duplicate names within JAKARTA branch
    const isDuplicate = mockBranchUnits.some(
      (unit) => unit.name.toLowerCase() === body.name.toLowerCase(),
    );

    if (isDuplicate) {
      throw createError({
        statusCode: 409,
        statusMessage:
          "Branch Unit with this name already exists in JAKARTA branch",
      });
    }

    // Create new branch unit (always for JAKARTA)
    const newBranchUnit = {
      id: Math.max(...mockBranchUnits.map((u) => u.id), 0) + 1,
      name: body.name,
      branchId: JAKARTA_BRANCH.id,
      branchName: JAKARTA_BRANCH.name,
      createdAt: new Date().toISOString(),
    };

    // In production, save to database here
    // await db.branchUnits.create(newBranchUnit)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: newBranchUnit,
      message: "Branch Unit created successfully",
    };
  }

  // PUT/PATCH - Update branch unit (always for JAKARTA branch)
  if (method === "PUT" || method === "PATCH") {
    const body = await readBody(event);
    const branchUnitId = parseInt(event.context.params?.id || "0");

    if (!branchUnitId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Branch Unit ID is required",
      });
    }

    // Validate input
    if (!body.name || body.name.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "Branch Unit name must be at least 2 characters",
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

    // Check for duplicate names (excluding current branch unit)
    const isDuplicate = mockBranchUnits.some(
      (unit) =>
        unit.id !== branchUnitId &&
        unit.name.toLowerCase() === body.name.toLowerCase(),
    );

    if (isDuplicate) {
      throw createError({
        statusCode: 409,
        statusMessage:
          "Branch Unit with this name already exists in JAKARTA branch",
      });
    }

    // Update branch unit
    const existingUnit = mockBranchUnits[branchUnitIndex]!;
    const updatedBranchUnit = {
      id: existingUnit.id,
      name: body.name,
      branchId: JAKARTA_BRANCH.id,
      branchName: JAKARTA_BRANCH.name,
      createdAt: existingUnit.createdAt,
    };
    mockBranchUnits[branchUnitIndex] = updatedBranchUnit;

    // In production, update database here
    // await db.branchUnits.update(branchUnitId, { name: body.name })

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
    const branchUnitId = parseInt(event.context.params?.id || "0");

    if (!branchUnitId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Branch Unit ID is required",
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
