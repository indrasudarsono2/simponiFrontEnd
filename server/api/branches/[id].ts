// Dynamic API endpoint for individual branch operations
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;
  const branchId = parseInt(event.context.params?.id || "0");

  // Mock data storage (in production, this would be a database)
  // Based on adminMindMap.json - 4 branches across 2 regions
  const mockBranches = [
    {
      id: 1,
      branch: "JAKARTA",
      regionId: 1,
      region: {
        id: 1,
        region: "WEST",
        createdAt: "2026-03-01T11:00:12.000Z",
        updatedAt: "2026-03-01T11:00:12.000Z",
        deletedAt: null,
      },
      createdAt: "2026-03-01T07:28:00.333Z",
      updatedAt: "2026-03-01T07:28:00.333Z",
      deletedAt: null,
    },
    {
      id: 2,
      branch: "MEDAN",
      regionId: 1,
      region: {
        id: 1,
        region: "WEST",
        createdAt: "2026-03-01T11:00:12.000Z",
        updatedAt: "2026-03-01T11:00:12.000Z",
        deletedAt: null,
      },
      createdAt: "2026-03-01T07:28:00.333Z",
      updatedAt: "2026-03-01T07:28:00.333Z",
      deletedAt: null,
    },
    {
      id: 3,
      branch: "SURABAYA",
      regionId: 2,
      region: {
        id: 2,
        region: "EAST",
        createdAt: "2026-03-01T11:00:12.000Z",
        updatedAt: "2026-03-01T11:00:12.000Z",
        deletedAt: null,
      },
      createdAt: "2026-03-01T07:28:00.333Z",
      updatedAt: "2026-03-01T07:28:00.333Z",
      deletedAt: null,
    },
    {
      id: 4,
      branch: "UJUNG PANDANG",
      regionId: 2,
      region: {
        id: 2,
        region: "EAST",
        createdAt: "2026-03-01T11:00:12.000Z",
        updatedAt: "2026-03-01T11:00:12.000Z",
        deletedAt: null,
      },
      createdAt: "2026-03-01T07:28:00.333Z",
      updatedAt: "2026-03-01T07:28:00.333Z",
      deletedAt: null,
    },
  ];

  if (!branchId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Branch ID is required",
    });
  }

  // GET - Fetch single branch
  if (method === "GET") {
    const branch = mockBranches.find((b) => b.id === branchId);

    if (!branch) {
      throw createError({
        statusCode: 404,
        statusMessage: "Branch not found",
      });
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return branch;
  }

  // PUT/PATCH - Update branch
  if (method === "PUT" || method === "PATCH") {
    const body = await readBody(event);

    // Validate input
    if (!body.branch || body.branch.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "Branch name must be at least 2 characters",
      });
    }

    if (!body.regionId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Region is required",
      });
    }

    // Find branch
    const branchIndex = mockBranches.findIndex((b) => b.id === branchId);

    if (branchIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Branch not found",
      });
    }

    // Check for duplicate names (excluding current branch)
    const isDuplicate = mockBranches.some(
      (branch) =>
        branch.id !== branchId &&
        branch.branch.toLowerCase() === body.branch.toLowerCase(),
    );

    if (isDuplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: "Branch with this name already exists",
      });
    }

    // Update branch
    const currentBranch = mockBranches[branchIndex];
    if (!currentBranch) {
      throw createError({
        statusCode: 404,
        statusMessage: "Branch not found",
      });
    }

    const updatedBranch = {
      id: currentBranch.id,
      branch: body.branch,
      regionId: body.regionId,
      region: {
        id: body.regionId,
        region: "Unknown", // In real API, this would be fetched from regions table
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      },
      createdAt: currentBranch.createdAt,
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    mockBranches[branchIndex] = updatedBranch;

    // In production, update database here
    // await db.branches.update(branchId, { name: body.name, regionId: body.regionId })

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: mockBranches[branchIndex],
      message: "Branch updated successfully",
    };
  }

  // DELETE - Delete branch
  if (method === "DELETE") {
    // Find branch
    const branchIndex = mockBranches.findIndex((b) => b.id === branchId);

    if (branchIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Branch not found",
      });
    }

    // In production, check for dependencies here
    // const hasUnits = await db.branchUnits.count({ branchId })
    // if (hasUnits > 0) {
    //   throw createError({
    //     statusCode: 409,
    //     statusMessage: "Cannot delete branch with existing units",
    //   });
    // }

    // Delete branch
    const deletedBranch = mockBranches[branchIndex];
    // mockBranches.splice(branchIndex, 1);

    // In production, delete from database here
    // await db.branches.delete(branchId)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: deletedBranch,
      message: "Branch deleted successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
