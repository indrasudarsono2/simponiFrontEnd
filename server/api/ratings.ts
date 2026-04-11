// Mock API endpoint for ratings
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;

  // Mock data storage (in production, this would be a database)
  const mockRatings = [
    { id: 1, name: "TWR", description: "Tower Control Rating" },
    { id: 2, name: "APP", description: "Approach Control Rating" },
    { id: 3, name: "APS", description: "Approach Surveillance Rating" },
    { id: 4, name: "ACP", description: "Area Control Procedural Rating" },
    { id: 5, name: "ACS", description: "Area Control Surveillance Rating" },
    { id: 6, name: "ACO", description: "Aerodrome Control Rating" },
    { id: 7, name: "KARTOGRAFI", description: "Kartografi Rating" },
  ];

  // GET - Fetch all ratings
  if (method === "GET") {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return mockRatings;
  }

  if (method === "POST") {
    const body = await readBody(event);

    // Validate input
    if (!body.name || body.name.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "Rating name must be at least 2 characters",
      });
    }

    // Check for duplicate names
    const isDuplicate = mockRatings.some(
      (rating) => rating.name.toLowerCase() === body.name.toLowerCase(),
    );

    if (isDuplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: "Rating with this name already exists",
      });
    }

    // Create new rating
    const newRating = {
      id: Math.max(...mockRatings.map((r) => r.id)) + 1,
      name: body.name,
      createdAt: new Date().toISOString(),
    };

    // In production, save to database here
    // await db.ratings.create(newRating)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: newRating,
      message: "Rating created successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
