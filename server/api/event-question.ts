// server/api/event-question.ts
import adminMindMapData from "~/utils/adminMindMap.json";

export default defineEventHandler(async (event) => {
  const method = event.method;

  if (method === "GET") {
    // Extract all event questions from Jakarta ACC branch unit
    const eventQuestions: any[] = [];

    // Navigate through the structure: region -> branch -> branchUnit -> session -> event -> eventQuestion
    adminMindMapData.forEach((region: any) => {
      if (region.branch && Array.isArray(region.branch)) {
        region.branch.forEach((branch: any) => {
          // Focus on Jakarta branch
          if (
            branch.branch === "JAKARTA" &&
            branch.branchUnit &&
            Array.isArray(branch.branchUnit)
          ) {
            branch.branchUnit.forEach((branchUnit: any) => {
              // Focus on ACC unit
              if (
                branchUnit.unit === "ACC" &&
                branchUnit.session &&
                Array.isArray(branchUnit.session)
              ) {
                branchUnit.session.forEach((session: any) => {
                  if (session.event && Array.isArray(session.event)) {
                    session.event.forEach((evt: any) => {
                      if (
                        evt.eventQuestion &&
                        Array.isArray(evt.eventQuestion)
                      ) {
                        evt.eventQuestion.forEach((eq: any) => {
                          eventQuestions.push({
                            id: parseInt(eq.id),
                            eventId: parseInt(evt.id),
                            eventName: evt.event,
                            sectorId: eq.sector?.id
                              ? parseInt(eq.sector.id)
                              : null,
                            sector: eq.sector?.sector || "",
                            kindOfQuestionId: eq.kindOfQuestion?.id
                              ? parseInt(eq.kindOfQuestion.id)
                              : null,
                            kindOfQuestion:
                              eq.kindOfQuestion?.question ||
                              eq.kindOfQuestion?.kindOfQuestion ||
                              "",
                            quantity: parseInt(eq.quantity) || 0,
                            persentage: parseFloat(eq.persentage) || 0,
                            minutes: parseInt(eq.minutes) || 0,
                          });
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });

    return eventQuestions;
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
