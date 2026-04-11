// server/api/event-question/[id].ts
import adminMindMapData from "~/utils/adminMindMap.json";

export default defineEventHandler(async (event) => {
  const method = event.method;
  const id = getRouterParam(event, "id");

  if (method === "GET") {
    // Find specific event question
    let foundEventQuestion: any = null;

    adminMindMapData.forEach((region: any) => {
      if (region.branch && Array.isArray(region.branch)) {
        region.branch.forEach((branch: any) => {
          if (
            branch.branch === "JAKARTA" &&
            branch.branchUnit &&
            Array.isArray(branch.branchUnit)
          ) {
            branch.branchUnit.forEach((branchUnit: any) => {
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
                        const eq = evt.eventQuestion.find(
                          (q: any) => q.id === id,
                        );
                        if (eq) {
                          foundEventQuestion = {
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
                          };
                        }
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

    if (!foundEventQuestion) {
      throw createError({
        statusCode: 404,
        statusMessage: "Event question not found",
      });
    }

    return foundEventQuestion;
  }

  if (method === "POST") {
    // Create new event question
    const body = await readBody(event);

    // Validate required fields
    if (
      !body.eventId ||
      !body.kindOfQuestionId ||
      body.quantity === undefined ||
      body.persentage === undefined ||
      body.minutes === undefined
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Missing required fields: eventId, kindOfQuestionId, quantity, persentage, minutes",
      });
    }

    // In a real database, this would insert a new record
    // For now, return the created data with a new ID
    const newEventQuestion = {
      id: Date.now(), // Generate temporary ID
      eventId: parseInt(body.eventId),
      eventName: body.eventName || "Unknown Event",
      sectorId: body.sectorId ? parseInt(body.sectorId) : null,
      sector: body.sector || "",
      kindOfQuestionId: parseInt(body.kindOfQuestionId),
      kindOfQuestion: body.kindOfQuestion || "",
      quantity: parseInt(body.quantity),
      persentage: parseFloat(body.persentage),
      minutes: parseInt(body.minutes),
    };

    return {
      success: true,
      message: "Event question created successfully",
      data: newEventQuestion,
    };
  }

  if (method === "PUT") {
    // Update existing event question
    const body = await readBody(event);

    if (
      !body.eventId ||
      !body.kindOfQuestionId ||
      body.quantity === undefined ||
      body.persentage === undefined ||
      body.minutes === undefined
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Missing required fields: eventId, kindOfQuestionId, quantity, persentage, minutes",
      });
    }

    // In a real database, this would update the record
    const updatedEventQuestion = {
      id: parseInt(id || "0"),
      eventId: parseInt(body.eventId),
      eventName: body.eventName || "Unknown Event",
      sectorId: body.sectorId ? parseInt(body.sectorId) : null,
      sector: body.sector || "",
      kindOfQuestionId: parseInt(body.kindOfQuestionId),
      kindOfQuestion: body.kindOfQuestion || "",
      quantity: parseInt(body.quantity),
      persentage: parseFloat(body.persentage),
      minutes: parseInt(body.minutes),
    };

    return {
      success: true,
      message: "Event question updated successfully",
      data: updatedEventQuestion,
    };
  }

  if (method === "DELETE") {
    // In a real database, this would delete the record
    return {
      success: true,
      message: "Event question deleted successfully",
    };
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
