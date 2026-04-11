// Dynamic API endpoint for individual profession operations
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;
  const professionId = parseInt(event.context.params?.id || "0");
  console.log(method);
  // Mock data storage (in production, this would be a database)
  // Based on adminMindMap.json - only 2 professions
  const mockProfessions = [
    { id: 1, name: "ATC", description: "Air Traffic Controller" },
    { id: 2, name: "ACO", description: "Aeronautical Communication Officer" },
    { id: 3, name: "AIS", description: "Aeronautical Information Services" },
  ];

  if (!professionId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Profession ID is required",
    });
  }

  // GET - Fetch single profession
  if (method === "GET") {
    const profession = mockProfessions.find((r) => r.id === professionId);

    if (!profession) {
      throw createError({
        statusCode: 404,
        statusMessage: "Profession not found",
      });
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return profession;
  }

  // PUT/PATCH - Update profession
  if (method === "PUT" || method === "PATCH") {
    const body = await readBody(event);

    // Validate input
    if (!body.name || body.name.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "Profession name must be at least 2 characters",
      });
    }

    // Find profession
    const professionIndex = mockProfessions.findIndex(
      (r) => r.id === professionId,
    );

    if (professionIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Profession not found",
      });
    }

    // Check for duplicate names (excluding current profession)
    const isDuplicate = mockProfessions.some(
      (profession) =>
        profession.id !== professionId &&
        profession.name.toLowerCase() === body.name.toLowerCase(),
    );

    if (isDuplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: "Profession with this name already exists",
      });
    }

    // Update profession
    const currentProfession = mockProfessions[professionIndex];
    if (!currentProfession) {
      throw createError({
        statusCode: 404,
        statusMessage: "Profession not found",
      });
    }

    const updatedProfession = {
      id: currentProfession.id,
      name: body.name,
      description: currentProfession.description,
    };
    mockProfessions[professionIndex] = updatedProfession;

    // In production, update database here
    // await db.professions.update(professionId, { name: body.name })

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: mockProfessions[professionIndex],
      message: "Profession updated successfully",
    };
  }

  // DELETE - Delete profession
  if (method === "DELETE") {
    // Find profession
    const professionIndex = mockProfessions.findIndex(
      (r) => r.id === professionId,
    );

    if (professionIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Profession not found",
      });
    }

    // In production, check for dependencies here
    // const hasBranches = await db.branches.count({ professionId })
    // if (hasBranches > 0) {
    //   throw createError({
    //     statusCode: 409,
    //     statusMessage: "Cannot delete profession with existing branches",
    //   });
    // }

    // Delete profession
    const deletedProfession = mockProfessions[professionIndex];
    // mockProfessions.splice(professionIndex, 1);

    // In production, delete from database here
    // await db.professions.delete(professionId)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: deletedProfession,
      message: "Profession deleted successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
