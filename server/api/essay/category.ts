// Mock API endpoint for question groups (essay category)
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;

  // Mock data storage (in production, this would be a database)
  // Based on rating.json for JAKARTA - ACC
  const mockQuestionGroups = [
    {
      id: 1,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 4,
      ratingName: "ACP",
      kindOfQuestionId: 1,
      kindOfQuestion: "ESSAY",
      group: "PENDEK",
      quantity: 2,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 2,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 4,
      ratingName: "ACP",
      kindOfQuestionId: 1,
      kindOfQuestion: "ESSAY",
      group: "PANJANG",
      quantity: 3,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 3,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 5,
      ratingName: "ACS",
      kindOfQuestionId: 1,
      kindOfQuestion: "ESSAY",
      group: "PENDEK",
      quantity: 2,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 4,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 5,
      ratingName: "ACS",
      kindOfQuestionId: 1,
      kindOfQuestion: "ESSAY",
      group: "PANJANG",
      quantity: 3,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 5,
      sectorId: 2,
      sectorName: "EAST",
      ratingId: 4,
      ratingName: "ACP",
      kindOfQuestionId: 1,
      kindOfQuestion: "ESSAY",
      group: "PENDEK",
      quantity: 2,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 6,
      sectorId: 2,
      sectorName: "EAST",
      ratingId: 4,
      ratingName: "ACP",
      kindOfQuestionId: 1,
      kindOfQuestion: "ESSAY",
      group: "PANJANG",
      quantity: 3,
      createdAt: "2024-01-15T10:00:00Z",
    },
  ];

  // Available sectors for ACC (from adminMindMap.json)
  const mockSectors = [
    { id: 1, name: "WEST" },
    { id: 2, name: "EAST" },
    { id: 3, name: "NORTH" },
    { id: 4, name: "NORTH WEST" },
    { id: 5, name: "NORTH EAST" },
  ];

  // Available ratings (ACP, ACS)
  const mockRatings = [
    { id: 4, name: "ACP" },
    { id: 5, name: "ACS" },
  ];

  // Available kind of questions (from rating.json)
  const mockKindOfQuestions = [{ id: 1, name: "ESSAY" }];

  // GET - Fetch all question groups
  if (method === "GET") {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return mockQuestionGroups;
  }

  // POST - Create new question group
  if (method === "POST") {
    const body = await readBody(event);

    // Validate input
    if (!body.sectorId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Sector is required",
      });
    }

    if (!body.ratingId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Rating is required",
      });
    }

    if (!body.kindOfQuestionId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Kind of question is required",
      });
    }

    if (!body.group || body.group.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Group name is required",
      });
    }

    if (!body.quantity || body.quantity < 1) {
      throw createError({
        statusCode: 400,
        statusMessage: "Quantity must be at least 1",
      });
    }

    // Get sector info
    const sectorItem = mockSectors.find((s) => s.id === body.sectorId);
    if (!sectorItem) {
      throw createError({
        statusCode: 404,
        statusMessage: "Sector not found",
      });
    }

    // Get rating info
    const ratingItem = mockRatings.find((r) => r.id === body.ratingId);
    if (!ratingItem) {
      throw createError({
        statusCode: 404,
        statusMessage: "Rating not found",
      });
    }

    // Get kind of question info
    const kindOfQuestionItem = mockKindOfQuestions.find(
      (k) => k.id === body.kindOfQuestionId,
    );
    if (!kindOfQuestionItem) {
      throw createError({
        statusCode: 404,
        statusMessage: "Kind of question not found",
      });
    }

    // Check for duplicate
    const isDuplicate = mockQuestionGroups.some(
      (qg) =>
        qg.sectorId === body.sectorId &&
        qg.ratingId === body.ratingId &&
        qg.kindOfQuestionId === body.kindOfQuestionId &&
        qg.group.toLowerCase() === body.group.toLowerCase(),
    );

    if (isDuplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: "This question group already exists",
      });
    }

    // Create new question group
    const newQuestionGroup = {
      id: Math.max(...mockQuestionGroups.map((q) => q.id)) + 1,
      sectorId: body.sectorId,
      sectorName: sectorItem.name,
      ratingId: body.ratingId,
      ratingName: ratingItem.name,
      kindOfQuestionId: body.kindOfQuestionId,
      kindOfQuestion: kindOfQuestionItem.name,
      group: body.group,
      quantity: body.quantity,
      createdAt: new Date().toISOString(),
    };

    // In production, save to database here
    // await db.questionGroups.create(newQuestionGroup)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: newQuestionGroup,
      message: "Question group created successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
