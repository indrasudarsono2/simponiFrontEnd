// Dynamic API endpoint for individual region operations
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;
  const regionId = parseInt(event.context.params?.id || "0");

  // Mock data storage (in production, this would be a database)
  // Based on adminMindMap.json - only 2 regions
  const mockRegions = [
    { id: 1, region: "WEST REGION", createdAt: "2024-01-15T10:00:00Z" },
    { id: 2, region: "EAST REGION", createdAt: "2024-01-16T10:00:00Z" },
  ];

  if (!regionId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Region ID is required",
    });
  }

  // GET - Fetch single region
  if (method === "GET") {
    const region = mockRegions.find((r) => r.id === regionId);

    if (!region) {
      throw createError({
        statusCode: 404,
        statusMessage: "Region not found",
      });
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return region;
  }

  // PUT/PATCH - Update region
  if (method === "PUT" || method === "PATCH") {
    const body = await readBody(event);

    // Validate input
    if (!body.region || body.region.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "Region name must be at least 2 characters",
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

    // Check for duplicate names (excluding current region)
    const isDuplicate = mockRegions.some(
      (region) =>
        region.id !== regionId &&
        region.region.toLowerCase() === body.region.toLowerCase(),
    );

    if (isDuplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: "Region with this name already exists",
      });
    }

    // Update region
    const currentRegion = mockRegions[regionIndex];
    if (!currentRegion) {
      throw createError({
        statusCode: 404,
        statusMessage: "Region not found",
      });
    }

    const updatedRegion = {
      id: currentRegion.id,
      region: body.region,
      createdAt: currentRegion.createdAt,
    };
    mockRegions[regionIndex] = updatedRegion;

    // In production, update database here
    // await db.regions.update(regionId, { name: body.name })

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: mockRegions[regionIndex],
      message: "Region updated successfully",
    };
  }

  // DELETE - Delete region
  if (method === "DELETE") {
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
