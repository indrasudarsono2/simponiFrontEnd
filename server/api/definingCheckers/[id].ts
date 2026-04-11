// Mock API endpoint for individual defining checker operations
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;
  const definingCheckerId = parseInt(event.context.params?.id || "0");

  if (!definingCheckerId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Defining Checker ID is required",
    });
  }

  // Mock data storage (in production, this would be a database)
  const mockDefiningCheckers = [
    {
      id: 1,
      eventId: 1,
      eventName: "Performance Check 1",
      sectorId: 1,
      sectorName: "WEST",
      group: "PENERBITAN FENNY",
      pic: "INDRA SUDARSONO",
      checkers: ["INDRA SUDARSONO", "GYANO", "CELOSIA"],
      members: ["FENNY"],
      remarkDoc: "PENERBITAN",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 2,
      eventId: 2,
      eventName: "Performance Check 2",
      sectorId: 1,
      sectorName: "WEST",
      group: "GROUP A",
      pic: "INDRA SUDARSONO",
      checkers: ["INDRA SUDARSONO"],
      members: ["FENNY", "CELOSIA", "GYANO", "SHAIMA"],
      remarkDoc: "PERPANJANGAN",
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 3,
      eventId: 3,
      eventName: "Performance Check 3",
      sectorId: 1,
      sectorName: "WEST",
      group: "PENERBITAN FENNY",
      pic: "INDRA SUDARSONO",
      checkers: ["INDRA SUDARSONO", "GYANO", "CELOSIA"],
      members: ["FENNY"],
      remarkDoc: "PENERBITAN",
      createdAt: "2024-01-17T10:00:00Z",
    },
    {
      id: 4,
      eventId: 4,
      eventName: "Performance Check 4",
      sectorId: 1,
      sectorName: "WEST",
      group: "GROUP A",
      pic: "INDRA SUDARSONO",
      checkers: ["INDRA SUDARSONO"],
      members: ["FENNY", "CELOSIA", "GYANO", "SHAIMA"],
      remarkDoc: "PERPANJANGAN",
      createdAt: "2024-01-18T10:00:00Z",
    },
  ];

  // Available events from adminMindMap.json for JAKARTA - ACC
  const mockEvents = [
    {
      id: 1,
      name: "Performance Check 1",
      sectorId: 1,
      sectorName: "WEST",
      remarkDoc: "PENERBITAN",
      session: "2026 Semester 1",
    },
    {
      id: 2,
      name: "Performance Check 2",
      sectorId: 1,
      sectorName: "WEST",
      remarkDoc: "PERPANJANGAN",
      session: "2026 Semester 1",
    },
    {
      id: 3,
      name: "Performance Check 3",
      sectorId: 1,
      sectorName: "WEST",
      remarkDoc: "PENERBITAN",
      session: "2026 Semester 2",
    },
    {
      id: 4,
      name: "Performance Check 4",
      sectorId: 1,
      sectorName: "WEST",
      remarkDoc: "PERPANJANGAN",
      session: "2026 Semester 2",
    },
  ];

  // PUT/PATCH - Update defining checker
  if (method === "PUT" || method === "PATCH") {
    const body = await readBody(event);

    // Validate input
    if (!body.eventId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Event is required",
      });
    }

    if (!body.group || body.group.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "Group name must be at least 2 characters",
      });
    }

    if (!body.pic || body.pic.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "PIC name must be at least 2 characters",
      });
    }

    if (
      !body.checkers ||
      !Array.isArray(body.checkers) ||
      body.checkers.length === 0
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "At least one checker is required",
      });
    }

    if (
      !body.members ||
      !Array.isArray(body.members) ||
      body.members.length === 0
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "At least one member is required",
      });
    }

    // Find defining checker
    const definingCheckerIndex = mockDefiningCheckers.findIndex(
      (d) => d.id === definingCheckerId,
    );

    if (definingCheckerIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Group not found",
      });
    }

    // Get the existing defining checker
    const existingDefiningChecker = mockDefiningCheckers[definingCheckerIndex];
    if (!existingDefiningChecker) {
      throw createError({
        statusCode: 404,
        statusMessage: "Group not found",
      });
    }

    // Get event info from mock events
    const eventItem = mockEvents.find((e) => e.id === body.eventId);
    if (!eventItem) {
      throw createError({
        statusCode: 404,
        statusMessage: "Event not found",
      });
    }

    // Update defining checker
    const updatedDefiningChecker = {
      id: existingDefiningChecker.id,
      eventId: body.eventId,
      eventName: eventItem.name,
      sectorId: eventItem.sectorId,
      sectorName: eventItem.sectorName,
      group: body.group,
      pic: body.pic,
      checkers: body.checkers,
      members: body.members,
      remarkDoc: eventItem.remarkDoc,
      createdAt: existingDefiningChecker.createdAt,
    };

    mockDefiningCheckers[definingCheckerIndex] = updatedDefiningChecker;

    // In production, update database here
    // await db.definingCheckers.update(definingCheckerId, { ... })

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: updatedDefiningChecker,
      message: "Group updated successfully",
    };
  }

  // DELETE - Delete defining checker
  if (method === "DELETE") {
    // Find defining checker
    const definingCheckerIndex = mockDefiningCheckers.findIndex(
      (d) => d.id === definingCheckerId,
    );

    if (definingCheckerIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Group not found",
      });
    }

    // Get the existing defining checker
    const deletedDefiningChecker = mockDefiningCheckers[definingCheckerIndex];
    if (!deletedDefiningChecker) {
      throw createError({
        statusCode: 404,
        statusMessage: "Group not found",
      });
    }

    // In production, check for dependencies here
    // const hasRelatedData = await db.related.count({ definingCheckerId })
    // if (hasRelatedData > 0) {
    //   throw createError({
    //     statusCode: 409,
    //     statusMessage: "Cannot delete group with existing related data",
    //   });
    // }

    // Delete defining checker
    // mockDefiningCheckers.splice(definingCheckerIndex, 1);

    // In production, delete from database here
    // await db.definingCheckers.delete(definingCheckerId)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: deletedDefiningChecker,
      message: "Group deleted successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
