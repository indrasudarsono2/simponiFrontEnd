// server/api/multipleChoice/group.ts
import multipleChoiceData from "~/utils/multipleChoice.json";
import multipleChoiceGroupData from "~/utils/multipleChoiceGroup.json";

export default defineEventHandler(async (event) => {
  const method = event.method;

  // GET - Fetch all multiple choice questions with their group assignments
  if (method === "GET") {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Group assignments by multiple choice ID
    const multipleChoiceMap = new Map();

    // First, initialize all multiple choice questions from multipleChoice.json
    multipleChoiceData.forEach((mc: any) => {
      multipleChoiceMap.set(Number(mc.id), {
        id: Number(mc.id),
        question: mc.question,
        a: mc.a,
        b: mc.b,
        c: mc.c,
        d: mc.d,
        image: mc.image,
        key: mc.key,
        groups: [],
      });
    });

    // Then, add group assignments from multipleChoiceGroup.json
    multipleChoiceGroupData.forEach((assignment: any) => {
      const mcId = Number(assignment.multipleChoice.id);

      if (!multipleChoiceMap.has(mcId)) {
        // If multiple choice doesn't exist in multipleChoice.json, create it
        multipleChoiceMap.set(mcId, {
          id: mcId,
          question: assignment.multipleChoice.question,
          a: assignment.multipleChoice.a,
          b: assignment.multipleChoice.b,
          c: assignment.multipleChoice.c,
          d: assignment.multipleChoice.d,
          image: assignment.multipleChoice.image,
          key: assignment.multipleChoice.key,
          groups: [],
        });
      }

      // Add this assignment to the multiple choice's groups
      const mc = multipleChoiceMap.get(mcId);

      // Check if this questionGroup already exists for this multiple choice
      const existingGroup = mc.groups.find(
        (g: any) =>
          g.questionGroupId === Number(assignment.questionGroup.id) &&
          g.rating === assignment.questionGroup.rating.rating,
      );

      if (existingGroup) {
        // Add sector to existing group
        if (!existingGroup.sectors.includes(assignment.sector.sector)) {
          existingGroup.sectors.push(assignment.sector.sector);
        }
      } else {
        // Create new group entry
        mc.groups.push({
          multipleChoiceId: mcId,
          questionGroupId: Number(assignment.questionGroup.id),
          questionGroup: assignment.questionGroup.group,
          rating: assignment.questionGroup.rating.rating,
          sectors: [assignment.sector.sector],
        });
      }
    });

    // Convert map to array
    const multipleChoiceWithGroups = Array.from(multipleChoiceMap.values());

    return multipleChoiceWithGroups;
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
