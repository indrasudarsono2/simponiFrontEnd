export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  // Mock data for branch units (based on adminMindMap.json)
  let branchUnits = [
    { id: 1, unit: "ACC", branch: "JAKARTA", createdAt: "2024-01-15" },
    { id: 2, unit: "APP", branch: "JAKARTA", createdAt: "2024-01-16" },
  ];

  switch (method) {
    case "GET":
      // Return all branch units
      return branchUnits;

    case "POST":
      // Create new branch unit
      const body = await readBody(event);
      const newBranchUnit = {
        id: branchUnits.length + 1,
        unit: body.unit,
        branch: body.branch || "JAKARTA",
        createdAt: new Date().toISOString().split("T")[0] || "",
      };

      branchUnits.push(newBranchUnit);
      return newBranchUnit;

    case "PUT":
      // Update branch unit
      const putBody = await readBody(event);
      const id = event.context.params?.id;
      const index = branchUnits.findIndex((u) => u.id === Number(id));
      if (index !== -1) {
        branchUnits[index] = { ...branchUnits[index], ...putBody };
        return branchUnits[index];
      }
      throw createError({ statusCode: 404, message: "Branch unit not found" });

    case "DELETE":
      // Delete branch unit
      const deleteId = event.context.params?.id;
      const deleteIndex = branchUnits.findIndex(
        (u) => u.id === Number(deleteId),
      );
      if (deleteIndex !== -1) {
        const deleted = branchUnits[deleteIndex];
        branchUnits.splice(deleteIndex, 1);
        return deleted;
      }
      throw createError({ statusCode: 404, message: "Branch unit not found" });

    default:
      throw createError({ statusCode: 405, message: "Method not allowed" });
  }
});
