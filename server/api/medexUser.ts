import userData from "~/utils/user.json";

// Get user with nik "3458" (INDRA)
const getIndraUser = () => {
  const user = userData.find((user) => user.licenseUserId === "3458") as any;
  if (user) {
    if (!user.medex) {
      user.medex = [];
    }
  }
  return user;
};

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const user = getIndraUser();

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  // GET - Retrieve medex data
  if (method === "GET") {
    return user.medex;
  }

  // POST - Create new medex
  if (method === "POST") {
    const body = await readBody(event);

    const newMedex = {
      id: Date.now().toString(),
      isConfirm: true,
      released: body.released,
      expired: body.expired,
      examiner: body.examiner,
      file: body.file?.name || body.file || "",
    };

    user.medex.push(newMedex);

    return newMedex;
  }

  // PUT - Update medex
  if (method === "PUT") {
    const body = await readBody(event);
    const { id, ...updateData } = body;

    const medexIndex = user.medex.findIndex((m: any) => m.id === id);

    if (medexIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Medex record not found",
      });
    }

    user.medex[medexIndex] = {
      ...user.medex[medexIndex],
      ...updateData,
      file:
        updateData.file?.name || updateData.file || user.medex[medexIndex].file,
    };

    return user.medex[medexIndex];
  }

  // DELETE - Delete medex
  if (method === "DELETE") {
    const query = getQuery(event);
    const { id } = query;

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "ID is required",
      });
    }

    const medexIndex = user.medex.findIndex((m: any) => m.id === id);

    if (medexIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Medex record not found",
      });
    }

    const deletedMedex = user.medex.splice(medexIndex, 1)[0];

    return deletedMedex;
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
