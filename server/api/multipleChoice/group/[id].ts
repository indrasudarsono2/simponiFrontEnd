import multipleChoiceGroupData from "~/utils/multipleChoiceGroup.json";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const method = getMethod(event);

  if (method === "POST") {
    const body = await readBody(event);
    // console.log(body);
    // In a real app, this would create new records in the database
    // Body should contain: sectorId, multipleChoiceId, questionGroupId
    // For now, we just return success

    return {
      success: true,
      message: `Multiple choice ${id} group assignment created`,
      data: {
        id: Date.now(), // Generate a new ID
        sector: {
          id: body.sectorId,
          sector: body.sectorName || "WEST",
        },
        multipleChoice: {
          id: id,
          question: body.question || "",
          a: body.a || "",
          b: body.b || "",
          c: body.c || "",
          d: body.d || "",
          image: body.image || "",
          key: body.key || "",
        },
        questionGroup: {
          id: body.questionGroupId,
          kindOfQuestion: {
            id: "2",
            question: "MULTIPLE CHOICE",
          },
          group: body.questionGroupName || "",
          rating: {
            id: body.ratingId || "4",
            rating: body.rating || "ACP",
          },
        },
      },
    };
  }

  if (method === "GET") {
    // Get specific multiple choice with its groups
    const mcId = parseInt(id!);

    const relatedAssignments = multipleChoiceGroupData.filter(
      (item: any) => parseInt(item.multipleChoice.id) === mcId,
    );

    if (relatedAssignments.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: "Multiple choice question not found",
      });
    }

    const first = relatedAssignments[0];
    if (!first) {
      throw createError({
        statusCode: 404,
        statusMessage: "Multiple choice question not found",
      });
    }

    // Group by question group
    const groups = new Map();

    relatedAssignments.forEach((item: any) => {
      const key = `${item.questionGroup.id}-${item.questionGroup.rating.rating}`;
      if (groups.has(key)) {
        const existing = groups.get(key);
        if (!existing.sectors.includes(item.sector.sector)) {
          existing.sectors.push(item.sector.sector);
        }
      } else {
        groups.set(key, {
          multipleChoiceId: mcId,
          questionGroupId: parseInt(item.questionGroup.id),
          questionGroup: item.questionGroup.group,
          rating: item.questionGroup.rating.rating,
          sectors: [item.sector.sector],
        });
      }
    });

    return {
      id: mcId,
      question: first.multipleChoice.question,
      a: first.multipleChoice.a,
      b: first.multipleChoice.b,
      c: first.multipleChoice.c,
      d: first.multipleChoice.d,
      image: first.multipleChoice.image,
      key: first.multipleChoice.key,
      groups: Array.from(groups.values()),
    };
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
