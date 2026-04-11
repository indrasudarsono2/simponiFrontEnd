// server/api/multipleChoice/question-groups.ts
import ratingData from "~/utils/rating.json";

export default defineEventHandler(async (event) => {
  const method = event.method;

  if (method === "GET") {
    // Extract all unique question groups for Multiple Choice
    const questionGroups = new Map();

    ratingData.forEach((rating: any) => {
      if (rating.questionGroup && Array.isArray(rating.questionGroup)) {
        rating.questionGroup.forEach((qg: any) => {
          // Only include Multiple Choice question groups
          if (
            qg.kindOfQuestion &&
            qg.kindOfQuestion.question === "MULTIPLE CHOICE"
          ) {
            const key = qg.id;
            if (!questionGroups.has(key)) {
              questionGroups.set(key, {
                id: parseInt(qg.id),
                group: qg.group,
                ratingId: parseInt(rating.rating.id),
                rating: rating.rating.rating,
                sectorId: parseInt(rating.sector.id),
                sector: rating.sector.sector,
                kindOfQuestionId: parseInt(qg.kindOfQuestion.id),
                kindOfQuestion: qg.kindOfQuestion.question,
              });
            }
          }
        });
      }
    });

    // Convert map to array and sort by id
    const groups = Array.from(questionGroups.values()).sort(
      (a, b) => a.id - b.id,
    );

    return groups;
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
