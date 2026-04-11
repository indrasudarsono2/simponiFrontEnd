// server/api/event-question/events.ts
import adminMindMapData from "~/utils/adminMindMap.json";

export default defineEventHandler(async (event) => {
  const method = event.method;

  if (method === "GET") {
    // Extract all events from Jakarta ACC branch unit
    const events: any[] = [];

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
                      events.push({
                        id: parseInt(evt.id),
                        name: evt.event,
                        sectorId: evt.sector?.id
                          ? parseInt(evt.sector.id)
                          : null,
                        sector: evt.sector?.sector || "",
                        start: evt.start,
                        finish: evt.finish,
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

    return events;
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
