// Mock API endpoint for regions
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;

  // Mock data storage (in production, this would be a database)
  // Based on adminMindMap.json - only 2 regions
  const mockRegions = [
    { id: 1, region: "WEST REGION", createdAt: "2024-01-15T10:00:00Z" },
    { id: 2, region: "EAST REGION", createdAt: "2024-01-16T10:00:00Z" },
  ];

  // GET - Fetch all regions
  if (method === "GET") {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return mockRegions;
  }

  // POST - Create new region
  if (method === "POST") {
    const body = await readBody(event);

    // Validate input
    if (!body.region || body.region.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "Region name must be at least 2 characters",
      });
    }

    // Check for duplicate names
    const isDuplicate = mockRegions.some(
      (region) => region.region.toLowerCase() === body.region.toLowerCase(),
    );

    if (isDuplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: "Region with this name already exists",
      });
    }

    // Create new region
    const newRegion = {
      id: Math.max(...mockRegions.map((r) => r.id)) + 1,
      region: body.region,
      createdAt: new Date().toISOString(),
    };

    // In production, save to database here
    // await db.regions.create(newRegion)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: newRegion,
      message: "Region created successfully",
    };
  }

  // DELETE - Delete region
  if (method === "DELETE") {
    const regionId = parseInt(event.context.params?.id || "0");

    if (!regionId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Region ID is required",
      });
    }

    // Find region
    const regionIndex = mockRegions.findIndex((r) => r.id === regionId);

    if (regionIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Region not found",
      });
    }

    // In production, check for dependencies here
    // const hasBranches = await db.branches.count({ regionId })
    // if (hasBranches > 0) {
    //   throw createError({
    //     statusCode: 409,
    //     statusMessage: "Cannot delete region with existing branches",
    //   });
    // }

    // Delete region
    const deletedRegion = mockRegions[regionIndex];
    // mockRegions.splice(regionIndex, 1);

    // In production, delete from database here
    // await db.regions.delete(regionId)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: deletedRegion,
      message: "Region deleted successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
