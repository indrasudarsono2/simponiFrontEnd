// server/api/essay/group.ts
import essayData from "~/utils/essay.json";
import essayGroupData from "~/utils/essayGroup.json";

export default defineEventHandler(async (event) => {
  const method = event.method;

  // GET - Fetch all essays with their group assignments
  if (method === "GET") {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Group assignments by essay ID
    const essayMap = new Map();

    // First, initialize all essays from essay.json
    essayData.forEach((essay: any) => {
      essayMap.set(Number(essay.id), {
        id: Number(essay.id),
        question: essay.question,
        answer: essay.answer,
        image: essay.image,
        value: essay.value,
        groups: [],
      });
    });

    // Then, add group assignments from essayGroup.json
    essayGroupData.forEach((assignment: any) => {
      const essayId = Number(assignment.essay.id);

      if (!essayMap.has(essayId)) {
        // If essay doesn't exist in essay.json, create it
        essayMap.set(essayId, {
          id: essayId,
          question: assignment.essay.question,
          answer: assignment.essay.answer,
          image: assignment.essay.image,
          value: assignment.essay.value,
          groups: [],
        });
      }

      // Add this assignment to the essay's groups
      const essay = essayMap.get(essayId);

      // Check if this questionGroup already exists for this essay
      const existingGroup = essay.groups.find(
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
        essay.groups.push({
          essayId: essayId,
          questionGroupId: Number(assignment.questionGroup.id),
          questionGroup: assignment.questionGroup.group,
          rating: assignment.questionGroup.rating.rating,
          sectors: [assignment.sector.sector],
        });
      }
    });

    // Convert map to array
    const essaysWithGroups = Array.from(essayMap.values());

    return essaysWithGroups;
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
