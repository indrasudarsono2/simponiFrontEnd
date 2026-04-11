// Mock API endpoint for branches
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;

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

  // GET - Fetch all branches
  if (method === "GET") {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return mockBranches;
  }

  // POST - Create new branch
  if (method === "POST") {
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

    // Check for duplicate names
    const isDuplicate = mockBranches.some(
      (branch) => branch.branch.toLowerCase() === body.branch.toLowerCase(),
    );

    if (isDuplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: "Branch with this name already exists",
      });
    }

    // Create new branch
    const newBranch = {
      id: Math.max(...mockBranches.map((b) => b.id)) + 1,
      branch: body.branch,
      regionId: body.regionId,
      region: {
        id: body.regionId,
        region: "Unknown", // In real API, this would be fetched from regions table
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };

    // In production, save to database here
    // await db.branches.create(newBranch)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: newBranch,
      message: "Branch created successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
