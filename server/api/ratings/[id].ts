// Dynamic API endpoint for individual rating operations
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;
  const ratingId = parseInt(event.context.params?.id || "0");
  console.log(method);
  // Mock data storage (in production, this would be a database)
  // Based on adminMindMap.json - only 2 ratings
  const mockRatings = [
    { id: 1, name: "TWR", description: "Tower Control Rating" },
    { id: 2, name: "APP", description: "Approach Control Rating" },
    { id: 3, name: "APS", description: "Approach Surveillance Rating" },
    { id: 4, name: "ACP", description: "Area Control Procedural Rating" },
    { id: 5, name: "ACS", description: "Area Control Surveillance Rating" },
    { id: 6, name: "ACO", description: "Aerodrome Control Rating" },
    { id: 7, name: "KARTOGRAFI", description: "Kartografi Rating" },
  ];

  if (!ratingId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Rating ID is required",
    });
  }

  // GET - Fetch single rating
  if (method === "GET") {
    const rating = mockRatings.find((r) => r.id === ratingId);

    if (!rating) {
      throw createError({
        statusCode: 404,
        statusMessage: "Rating not found",
      });
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return rating;
  }

  // PUT/PATCH - Update rating
  if (method === "PUT" || method === "PATCH") {
    const body = await readBody(event);

    // Validate input
    if (!body.name || body.name.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "Rating name must be at least 2 characters",
      });
    }

    // Find rating
    const ratingIndex = mockRatings.findIndex((r) => r.id === ratingId);

    if (ratingIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Rating not found",
      });
    }

    // Check for duplicate names (excluding current rating)
    const isDuplicate = mockRatings.some(
      (rating) =>
        rating.id !== ratingId &&
        rating.name.toLowerCase() === body.name.toLowerCase(),
    );

    if (isDuplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: "Rating with this name already exists",
      });
    }

    // Update rating
    const currentRating = mockRatings[ratingIndex];
    if (!currentRating) {
      throw createError({
        statusCode: 404,
        statusMessage: "Rating not found",
      });
    }

    const updatedRating = {
      id: currentRating.id,
      name: body.name,
      description: currentRating.description,
    };
    mockRatings[ratingIndex] = updatedRating;

    // In production, update database here
    // await db.ratings.update(ratingId, { name: body.name })

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: mockRatings[ratingIndex],
      message: "Rating updated successfully",
    };
  }

  // DELETE - Delete rating
  if (method === "DELETE") {
    // Find rating
    const ratingIndex = mockRatings.findIndex((r) => r.id === ratingId);

    if (ratingIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Rating not found",
      });
    }

    // In production, check for dependencies here
    // const hasBranches = await db.branches.count({ ratingId })
    // if (hasBranches > 0) {
    //   throw createError({
    //     statusCode: 409,
    //     statusMessage: "Cannot delete rating with existing branches",
    //   });
    // }

    // Delete rating
    const deletedRating = mockRatings[ratingIndex];
    // mockRatings.splice(ratingIndex, 1);

    // In production, delete from database here
    // await db.ratings.delete(ratingId)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: deletedRating,
      message: "Rating deleted successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
