// Mock API endpoint for multiple choice questions
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;

  // Mock data storage (in production, this would be a database)
  // Based on multipleChoice.json
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
    {
      id: 6,
      question: "Which is the adjacent unit of Upper Tanjungpinang vertically?",
      a: "Tanjung Pinang North TMA",
      b: "Tanjung Pinang South TMA",
      c: "Kuching ACC Sector 1",
      d: "A and B correct",
      image: "",
      key: "D",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 7,
      question:
        "Which ATS unit that has responsibility providing ATS for aircraft on route L644 segment LIGVU - OMLIV at FL130?",
      a: "Tanjung Pinang South TMA",
      b: "Jakarta ACC",
      c: "Jakarta FIC Jakarta Sector",
      d: "Tanjung Pinang North TMA",
      image: "",
      key: "D",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 8,
      question: "Which one of this route published as unidirectional route?",
      a: "M646",
      b: "M767",
      c: "G580",
      d: "M761",
      image: "",
      key: "B",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 9,
      question:
        "Which one of this route are not published as unidirectional route?",
      a: "L625",
      b: "L644",
      c: "N875",
      d: "N884",
      image: "",
      key: "C",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 10,
      question:
        "Which one of these TCP are between Jakarta ACC and Singapore ACC on route L625?",
      a: "NIXEB and RILRI",
      b: "UXED and GULGU",
      c: "UXED and GUTUP",
      d: "VERIN and GULGU",
      image: "",
      key: "C",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 11,
      question:
        "Which one of these TCP are between Jakarta ACC and Singapore ACC on route M758?",
      a: "ELGOR and GUTUP",
      b: "ELGOR and GULGU",
      c: "UPVUN and GULGU",
      d: "UPVUN and GUTUP",
      image: "",
      key: "B",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 12,
      question:
        "Which one of these TCP are between Jakarta ACC and Singapore ACC on route M767?",
      a: "UKLIS and VENUN",
      b: "OSERU and ATETI",
      c: "UKLIS and UXEDA",
      d: "UKLIS and NIXEB",
      image: "",
      key: "D",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 13,
      question:
        "Which one of this TCP is between Jakarta ACC and Singapore ACC on route M646?",
      a: "TOMAN",
      b: "KAMIN",
      c: "VENUN",
      d: "B and C correct",
      image: "",
      key: "C",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 14,
      question:
        "Which one of this TCP is between Jakarta ACC and Singapore ACC on route G580?",
      a: "TOMAN",
      b: "DODSO",
      c: "ATETI",
      d: "AGOBA",
      image: "",
      key: "B",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 15,
      question:
        "Which one of these TCP are between Jakarta ACC and Kuching ACC?",
      a: "ATETI, KAMIN, AGOBA",
      b: "ATETI, OSERU, AGOBA",
      c: "ARUPA, ATETI, AGOBA",
      d: "KAMIN, SABIP, AGOBA",
      image: "",
      key: "A",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 16,
      question:
        "Waypoint OTLAL and INVUB are the TCI between Upper Tanjungpinang with...",
      a: "Singapore Sector 4",
      b: "Kuching ACC Sector 1",
      c: "Singapore Sector 1",
      d: "Singapore Sector 2",
      image: "",
      key: "A",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 17,
      question:
        "Which one of this TCI between Jakarta ACC and Singapore ACC on route G579 at FL400?",
      a: "ANITO",
      b: "OLNUB",
      c: "PARDI",
      d: "ENVUM",
      image: "",
      key: "C",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 18,
      question:
        "Which one of this TCI is between Jakarta ACC and Singapore ACC at route B338 at FL390?",
      a: "OLNUB",
      b: "PARDI",
      c: "ENVUM",
      d: "ANITO",
      image: "",
      key: "D",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 19,
      question:
        "TCP between Jakarta ACC and Singapore ACC on route G579 at FL400 is ......",
      a: "ANITO",
      b: "OLNUB",
      c: "PARDI",
      d: "ENVUM",
      image: "",
      key: "B",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 20,
      question:
        "TCP between Jakarta ACC and Singapore ACC on route B338 at FL390 is ......",
      a: "OLNUB",
      b: "PARDI",
      c: "ENVUM",
      d: "ANITO",
      image: "",
      key: "C",
      createdAt: "2024-01-15T10:00:00Z",
    },
  ];

  // GET - Fetch all questions
  if (method === "GET") {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return mockQuestions;
  }

  // POST - Create new question
  if (method === "POST") {
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

    // Create new question
    const newQuestion = {
      id: Math.max(...mockQuestions.map((q) => q.id)) + 1,
      question: body.question,
      a: body.a,
      b: body.b,
      c: body.c,
      d: body.d,
      key: body.key,
      image: body.image || "",
      createdAt: new Date().toISOString(),
    };

    // In production, save to database here
    // await db.questions.create(newQuestion)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: newQuestion,
      message: "Question created successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
