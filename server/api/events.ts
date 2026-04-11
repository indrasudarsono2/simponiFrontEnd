// Mock API endpoint for events
// TODO: Replace this with actual database integration

export default defineEventHandler(async (event) => {
  const method = event.method;

  // Mock data storage (in production, this would be a database)
  // Events for JAKARTA - ACC with sector information
  const mockEvents = [
    {
      id: 1,
      eventName: "Performance Check 1",
      sectorId: 1,
      sectorName: "WEST",
      sessionId: 1,
      sessionName: "2026 Semester 1",
      startDate: "2026-06-01",
      finishDate: "2026-06-30",
      forExpDate: "2026-12-31",
      remarkDoc: "PENERBITAN",
      briefingFile: "/public/briefing.pdf",
      passingGrade: 75,
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: 2,
      eventName: "Performance Check 2",
      sectorId: 1,
      sectorName: "WEST",
      sessionId: 1,
      sessionName: "2026 Semester 1",
      startDate: "2026-06-01",
      finishDate: "2026-06-30",
      forExpDate: "2026-12-31",
      remarkDoc: "PERPANJANGAN",
      briefingFile: "/public/briefing.pdf",
      passingGrade: 75,
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-16T10:00:00Z",
    },
    {
      id: 3,
      eventName: "Performance Check 1",
      sectorId: 1,
      sectorName: "WEST",
      sessionId: 2,
      sessionName: "2026 Semester 2",
      startDate: "2026-12-01",
      finishDate: "2026-12-30",
      forExpDate: "2027-06-30",
      remarkDoc: "PENERBITAN",
      briefingFile: "/public/briefing.pdf",
      passingGrade: 75,
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-17T10:00:00Z",
    },
    {
      id: 4,
      eventName: "Performance Check 2",
      sectorId: 1,
      sectorName: "WEST",
      sessionId: 2,
      sessionName: "2026 Semester 2",
      startDate: "2026-12-01",
      finishDate: "2026-12-30",
      forExpDate: "2027-06-30",
      remarkDoc: "PERPANJANGAN",
      briefingFile: "/public/briefing.pdf",
      passingGrade: 75,
      branchId: 1,
      branchName: "JAKARTA",
      branchUnitId: 1,
      branchUnitName: "ACC",
      createdAt: "2024-01-18T10:00:00Z",
    },
  ];

  // GET - Fetch all events
  if (method === "GET") {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return mockEvents;
  }

  // POST - Create new event
  if (method === "POST") {
    // const body = await readBody(event);
    const formData = await readFormData(event);
    const eventName = formData.get("eventName")?.toString() ?? "";
    const sectorId = Number(formData.get("sectorId"));
    const sessionId = Number(formData.get("sessionId"));
    const startDate = formData.get("startDate")?.toString();
    const finishDate = formData.get("finishDate")?.toString();
    const forExpDate = formData.get("forExpDate")?.toString();
    const remarkDoc = formData.get("remarkDoc")?.toString();
    const passingGrade = Number(formData.get("passingGrade"));
    const branchId = Number(formData.get("branchId"));
    const branchUnitId = Number(formData.get("branchUnitId"));
    const briefingFile = formData.get("briefingFile"); // File | null

    // Validate input
    if (eventName.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "Event name must be at least 2 characters",
      });
    }

    if (!sectorId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Sector is required",
      });
    }

    if (!sessionId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Session is required",
      });
    }

    if (!startDate || !finishDate || !forExpDate) {
      throw createError({
        statusCode: 400,
        statusMessage: "All dates are required",
      });
    }

    if (!remarkDoc) {
      throw createError({
        statusCode: 400,
        statusMessage: "Remark is required",
      });
    }

    if (passingGrade === undefined || passingGrade === null) {
      throw createError({
        statusCode: 400,
        statusMessage: "Passing grade is required",
      });
    }

    if (passingGrade < 0 || passingGrade > 100) {
      throw createError({
        statusCode: 400,
        statusMessage: "Passing grade must be between 0 and 100",
      });
    }

    // Get session name from mock sessions
    const mockSessions = [
      { id: 1, name: "2026 Semester 1" },
      { id: 2, name: "2026 Semester 2" },
    ];
    const session = mockSessions.find((s) => s.id === sessionId);
    if (!session) {
      throw createError({
        statusCode: 404,
        statusMessage: "Session not found",
      });
    }

    // Get sector name from mock sectors
    const mockSectors = [
      { id: 1, name: "WEST" },
      { id: 2, name: "EAST" },
      { id: 3, name: "NORTH" },
      { id: 4, name: "NORTH WEST" },
      { id: 5, name: "NORTH EAST" },
    ];
    const sector = mockSectors.find((s) => s.id === sectorId);
    if (!sector) {
      throw createError({
        statusCode: 404,
        statusMessage: "Sector not found",
      });
    }

    // Create new event
    const newEvent = {
      id: Math.max(...mockEvents.map((e) => e.id)) + 1,
      eventName: eventName,
      sectorId: sectorId,
      sectorName: sector.name,
      sessionId: sessionId,
      sessionName: session.name,
      startDate: startDate,
      finishDate: finishDate,
      forExpDate: forExpDate,
      remarkDoc: remarkDoc,
      briefingFile: briefingFile ? "/public/briefing.pdf" : "", // Mock file path
      passingGrade: passingGrade,
      branchId: branchId,
      branchName: "JAKARTA",
      branchUnitId: branchUnitId,
      branchUnitName: "ACC",
      createdAt: new Date().toISOString(),
    };

    // In production, save to database here
    // await db.events.create(newEvent)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      data: newEvent,
      message: "Event created successfully",
    };
  }

  // Method not allowed
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
