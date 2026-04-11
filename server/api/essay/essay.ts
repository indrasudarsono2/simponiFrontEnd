// Mock API endpoint for essay questions
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;

  // Mock data storage (in production, this would be a database)
  // Based on essay.json for JAKARTA - ACC
  const mockEssays = [
    {
      id: 1,
      question:
        "Accoording TLI ( Temporary Local Instruction ) Jakarta ACC and MEDAN APP , when Jakarta ACC shall transfer surveillance identification to Medan East TMA within surveillance coverage accepting unit …",
      answer:
        "Jakarta ACC shall transfer surveillance identification to Medan East TMA within surveillance coverage accepting unit before 300 nm until 150 nm of DES VOR",
      image: "",
      value: 4,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 2,
      question:
        "Accoording TLI ( Temporary Local Instruction ) Jakarta ACC and MEDAN APP, when Jakarta ACC shall transfer surveillance identification to Medan West TMA within surveillance coverage accepting unit ..",
      answer:
        "Jakarta ACC shall transfer surveillance identification to Medan west TMA within surveillance coverage accepting unit before 200 nm until 100 nm of BAC VOR.",
      image: "",
      value: 4,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 3,
      question:
        "According TLI JKT ACC- MDN APP, Exemption transfer surveillance identification and using Approval request for aircraft Inbound Outbound WIMM & WITT from/ to West & North , mention the routes ?",
      answer: "P574, M300, N563, P756, L762",
      image: "",
      value: 3,
      createdAt: "2024-01-15T10:00:00Z",
    },
  ];

  // GET - Fetch all essays
  if (method === "GET") {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return mockEssays;
  }

  // POST - Create new essay
  if (method === "POST") {
    const body = await readBody(event);

    // Validate input
    if (!body.question || body.question.trim().length < 10) {
      throw createError({
        statusCode: 400,
        statusMessage: "Question must be at least 10 characters",
      });
    }

    if (!body.answer || body.answer.trim().length < 5) {
      throw createError({
        statusCode: 400,
        statusMessage: "Answer must be at least 5 characters",
      });
    }

    if (!body.value || body.value < 0.1) {
      throw createError({
        statusCode: 400,
        statusMessage: "Score must be at least 0.1",
      });
    }

    // Create new essay
    const newEssay = {
      id: Math.max(...mockEssays.map((e) => e.id)) + 1,
      question: body.question,
      answer: body.answer,
      image: body.image || "",
      value: body.value,
      createdAt: new Date().toISOString(),
    };

    // In production, save to database here
    // await db.essays.create(newEssay)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: newEssay,
      message: "Essay created successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
