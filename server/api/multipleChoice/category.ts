// Mock API endpoint for multiple choice question groups
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;

  // Mock data storage (in production, this would be a database)
  // Based on rating.json - only MULTIPLE CHOICE question groups
  const mockQuestionGroups = [
    {
      id: 3,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 4,
      ratingName: "ACP",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "STRUKTUR RUANG UDARA",
      quantity: 4,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 4,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 4,
      ratingName: "ACP",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "SOP, LOCA DAN INFO",
      quantity: 16,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 5,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 4,
      ratingName: "ACP",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "FAS NAV PNB",
      quantity: 6,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 6,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 4,
      ratingName: "ACP",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "FAS PEMANDUAN LLP",
      quantity: 4,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 7,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 4,
      ratingName: "ACP",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "TERRAIN, PROMINENT LANMARK",
      quantity: 4,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 8,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 4,
      ratingName: "ACP",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "KARAKTERISTIK LLP",
      quantity: 3,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 9,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 4,
      ratingName: "ACP",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "CUACA",
      quantity: 3,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 10,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 4,
      ratingName: "ACP",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "RENCANA GAWAT DARURAT DAN SAR",
      quantity: 5,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 13,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 5,
      ratingName: "ACS",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "STRUKTUR RUANG UDARA",
      quantity: 4,
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 14,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 5,
      ratingName: "ACS",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "SOP, LOCA DAN INFO",
      quantity: 16,
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 15,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 5,
      ratingName: "ACS",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "FAS NAV PNB",
      quantity: 6,
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 16,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 5,
      ratingName: "ACS",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "FAS PEMANDUAN LLP",
      quantity: 4,
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 17,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 5,
      ratingName: "ACS",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "TERRAIN, PROMINENT LANMARK",
      quantity: 4,
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 18,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 5,
      ratingName: "ACS",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "KARAKTERISTIK LLP",
      quantity: 3,
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 19,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 5,
      ratingName: "ACS",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "CUACA",
      quantity: 3,
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 20,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 5,
      ratingName: "ACS",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "RENCANA GAWAT DARURAT DAN SAR",
      quantity: 5,
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 21,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 5,
      ratingName: "ACS",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "SYSTEM ATS SURVEILLANCE",
      quantity: 4,
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 22,
      sectorId: 1,
      sectorName: "WEST",
      ratingId: 5,
      ratingName: "ACS",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "ATS SURVEILLANCE PROCEDURE",
      quantity: 7,
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 23,
      sectorId: 2,
      sectorName: "EAST",
      ratingId: 5,
      ratingName: "ACS",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "KARAKTERISTIK LLP",
      quantity: 8,
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 24,
      sectorId: 2,
      sectorName: "EAST",
      ratingId: 5,
      ratingName: "ACS",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "CUACA",
      quantity: 3,
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 25,
      sectorId: 2,
      sectorName: "EAST",
      ratingId: 5,
      ratingName: "ACS",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "RENCANA GAWAT DARURAT DAN SAR",
      quantity: 5,
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 26,
      sectorId: 2,
      sectorName: "EAST",
      ratingId: 5,
      ratingName: "ACS",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "SYSTEM ATS SURVEILLANCE",
      quantity: 4,
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 27,
      sectorId: 2,
      sectorName: "EAST",
      ratingId: 5,
      ratingName: "ACS",
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
      group: "ATS SURVEILLANCE PROCEDURE",
      quantity: 7,
      createdAt: "2024-01-16T10:00:00Z",
    },
  ];

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
    if (!body.group || body.group.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "Group name must be at least 2 characters",
      });
    }

    if (!body.quantity || body.quantity < 1) {
      throw createError({
        statusCode: 400,
        statusMessage: "Quantity must be at least 1",
      });
    }

    // Check for duplicate groups in same sector and rating
    const isDuplicate = mockQuestionGroups.some(
      (qg) =>
        qg.group.toLowerCase() === body.group.toLowerCase() &&
        qg.sectorId === body.sectorId &&
        qg.ratingId === body.ratingId,
    );

    if (isDuplicate) {
      throw createError({
        statusCode: 409,
        statusMessage:
          "Question group with this name already exists in the selected sector and rating",
      });
    }

    // Get sector and rating names
    const sectorName =
      body.sectorId === 1
        ? "WEST"
        : body.sectorId === 2
          ? "EAST"
          : body.sectorId === 3
            ? "NORTH"
            : body.sectorId === 4
              ? "NORTH WEST"
              : body.sectorId === 5
                ? "NORTH EAST"
                : "UNKNOWN";

    const ratingName =
      body.ratingId === 4 ? "ACP" : body.ratingId === 5 ? "ACS" : "UNKNOWN";

    // Create new question group
    const newQuestionGroup = {
      id: Math.max(...mockQuestionGroups.map((qg) => qg.id)) + 1,
      sectorId: body.sectorId,
      sectorName: sectorName,
      ratingId: body.ratingId,
      ratingName: ratingName,
      kindOfQuestionId: 2,
      kindOfQuestion: "MULTIPLE CHOICE",
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
