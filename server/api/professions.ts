// Mock API endpoint for professions
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;

  // Mock data storage (in production, this would be a database)
  const mockProfessions = [
    { id: 1, name: "ATC", description: "Air Traffic Controller" },
    { id: 2, name: "ACO", description: "Aeronautical Communication Officer" },
    { id: 3, name: "AIS", description: "Aeronautical Information Services" },
  ];

  // GET - Fetch all professions
  if (method === "GET") {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return mockProfessions;
  }

  if (method === "POST") {
    const body = await readBody(event);

    // Validate input
    if (!body.name || body.name.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "Profession name must be at least 2 characters",
      });
    }

    // Check for duplicate names
    const isDuplicate = mockProfessions.some(
      (profession) => profession.name.toLowerCase() === body.name.toLowerCase(),
    );

    if (isDuplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: "Profession with this name already exists",
      });
    }

    // Create new profession
    const newProfession = {
      id: Math.max(...mockProfessions.map((r) => r.id)) + 1,
      name: body.name,
      createdAt: new Date().toISOString(),
    };

    // In production, save to database here
    // await db.professions.create(newProfession)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: newProfession,
      message: "Profession created successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
