// server/api/event-question/kind-of-questions.ts
export default defineEventHandler(async (event) => {
  const method = event.method;

  if (method === "GET") {
    // Return available kind of questions
    // These are typically: Essay, Multiple Choice, etc.
    const kindOfQuestions = [
      { id: 1, name: "Essay" },
      { id: 2, name: "Multiple Choice" },
      { id: 3, name: "Practical" },
      { id: 4, name: "Oral" },
    ];

    return kindOfQuestions;
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
