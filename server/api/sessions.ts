// Mock API endpoint for sessions
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;

  // Mock data storage (in production, this would be a database)
  // Based on adminMindMap.json - sessions for JAKARTA - ACC
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

  // GET - Fetch all sessions
  if (method === "GET") {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return mockSessions;
  }

  // POST - Create new session
  if (method === "POST") {
    const body = await readBody(event);

    // Validate input
    if (!body.name || body.name.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "Session name must be at least 2 characters",
      });
    }

    if (!body.branchId || !body.branchUnitId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Branch and Branch Unit are required",
      });
    }

    // Check for duplicate names within the same branch and branch unit
    const isDuplicate = mockSessions.some(
      (session) =>
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

    // Create new session
    const newSession = {
      id: Math.max(...mockSessions.map((s) => s.id)) + 1,
      name: body.name,
      branchId: body.branchId,
      branchName: "JAKARTA", // In production, fetch from DB
      branchUnitId: body.branchUnitId,
      branchUnitName: "ACC", // In production, fetch from DB
      createdAt: new Date().toISOString(),
    };

    // In production, save to database here
    // await db.sessions.create(newSession)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: newSession,
      message: "Session created successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
