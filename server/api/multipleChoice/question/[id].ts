// Mock API endpoint for individual multiple choice question operations
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;
  const id = parseInt(getRouterParam(event, "id") || "0");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid question ID",
    });
  }

  // Mock data storage (in production, this would be a database)
  const mockQuestions = [
    {
      id: 1,
      question:
        "Which is the adjacent unit of Upper Natuna ACC on Natuna vertically?",
      a: "Matak CTR",
      b: "Tanjung Pinang North TMA",
      c: "Natuna CTR",
      d: "Tanjung Pinang South TMA",
      image: "",
      key: "B",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 2,
      question:
        "Which is the adjacent unit of Upper Tanjungpinang horizontally to the east?",
      a: "Singapore Sector 5",
      b: "Singapore Sector 4",
      c: "Kuching ACC Sector 1",
      d: "A and C correct",
      image: "",
      key: "C",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 3,
      question:
        "Which adjacent unit is not the adjacent unit of Upper Tanjungpinang horizontally to the west?",
      a: "Singapore Sector 1",
      b: "Singapore Sector 6",
      c: "Singapore Sector 4",
      d: "Kuching ACC Sector 1",
      image: "",
      key: "D",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 4,
      question:
        "Which is the adjacent unit of Upper Tanjungpinang horizontally to the south?",
      a: "Ujung Pandang",
      b: "Upper Pangkalpinang",
      c: "Singapore Sector 4",
      d: "A and B correct",
      image: "",
      key: "D",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 5,
      question:
        "Which is the adjacent unit of Upper Tanjungpinang horizontally to the north?",
      a: "Singapore Sector 4",
      b: "Kuching ACC Sector 1",
      c: "Upper Natuna",
      d: "Singapore Sector 6",
      image: "",
      key: "C",
      createdAt: "2024-01-15T10:00:00Z",
    },
  ];

  // Find the question
  const questionIndex = mockQuestions.findIndex((q) => q.id === id);

  if (questionIndex === -1) {
    throw createError({
      statusCode: 404,
      statusMessage: "Question not found",
    });
  }

  // GET - Fetch single question
  if (method === "GET") {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return mockQuestions[questionIndex];
  }

  // PUT - Update question
  if (method === "PUT") {
    const body = await readBody(event);

    // Validate input
    if (!body.question || body.question.trim().length < 5) {
      throw createError({
        statusCode: 400,
        statusMessage: "Question must be at least 5 characters",
      });
    }

    if (!body.a || !body.b || !body.c || !body.d) {
      throw createError({
        statusCode: 400,
        statusMessage: "All options (A, B, C, D) are required",
      });
    }

    if (!body.key || !["A", "B", "C", "D"].includes(body.key)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Valid answer key (A, B, C, or D) is required",
      });
    }

    // Update question
    const updatedQuestion = {
      ...mockQuestions[questionIndex],
      question: body.question,
      a: body.a,
      b: body.b,
      c: body.c,
      d: body.d,
      key: body.key,
      image: body.image || "",
    };

    // In production, update in database here
    // await db.questions.update(id, updatedQuestion)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: updatedQuestion,
      message: "Question updated successfully",
    };
  }

  // DELETE - Delete question
  if (method === "DELETE") {
    // In production, delete from database here
    // await db.questions.delete(id)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      message: "Question deleted successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
