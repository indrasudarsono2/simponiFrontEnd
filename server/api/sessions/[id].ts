// Mock API endpoint for individual session operations
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;
  const sessionId = parseInt(event.context.params?.id || "0");

  if (!sessionId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Session ID is required",
    });
  }

  // Mock data storage (in production, this would be a database)
  const mockSessions = [
    {
      id: 1,
      name: "2026 Semester 1",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 2,
      name: "2026 Semester 2",
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-16T10:00:00Z",
    },
  ];

  // PUT/PATCH - Update session
  if (method === "PUT" || method === "PATCH") {
    const body = await readBody(event);

    // Validate input
    if (!body.name || body.name.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "Session name must be at least 2 characters",
      });
    }

    // Find session
    const sessionIndex = mockSessions.findIndex((s) => s.id === sessionId);

    if (sessionIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Session not found",
      });
    }

    // Check for duplicate names within the same branch and branch unit (excluding current session)
    const isDuplicate = mockSessions.some(
      (session) =>
        session.id !== sessionId &&
        session.branchId === body.branchId &&
        session.branchUnitId === body.branchUnitId &&
        session.name.toLowerCase() === body.name.toLowerCase(),
    );

    if (isDuplicate) {
      throw createError({
        statusCode: 409,
        statusMessage:
          "Session with this name already exists in this branch unit",
      });
    }

    // Get the existing session (sessionIndex is guaranteed to be valid after the check above)
    const existingSession = mockSessions[sessionIndex]!;

    // Update session
    const updatedSession = {
      id: existingSession.id,
      name: body.name,
      branchId: existingSession.branchId,
      branchName: existingSession.branchName,
      branchUnitId: existingSession.branchUnitId,
      branchUnitName: existingSession.branchUnitName,
      createdAt: existingSession.createdAt,
    };
    mockSessions[sessionIndex] = updatedSession;

    // In production, update database here
    // await db.sessions.update(sessionId, { name: body.name })

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: updatedSession,
      message: "Session updated successfully",
    };
  }

  // DELETE - Delete session
  if (method === "DELETE") {
    // Find session
    const sessionIndex = mockSessions.findIndex((s) => s.id === sessionId);

    if (sessionIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Session not found",
      });
    }

    // In production, check for dependencies here
    // const hasEvents = await db.events.count({ sessionId })
    // if (hasEvents > 0) {
    //   throw createError({
    //     statusCode: 409,
    //     statusMessage: "Cannot delete session with existing events",
    //   });
    // }

    // Delete session
    const deletedSession = mockSessions[sessionIndex];
    // mockSessions.splice(sessionIndex, 1);

    // In production, delete from database here
    // await db.sessions.delete(sessionId)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: deletedSession,
      message: "Session deleted successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
