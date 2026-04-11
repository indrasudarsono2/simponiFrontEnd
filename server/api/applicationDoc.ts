import userData from "~/utils/user.json";
import eventUserData from "~/utils/eventUser.json";

// Get INDRA SUDARSONO user
const getIndraUser = () => {
  const user = userData.find((u) => u.nik === "10011528") as any;
  if (user) {
    if (!user.applicationDoc) {
      user.applicationDoc = [];
    }
  }
  return user;
};

// Generate application number
const generateAppNumber = (
  remark: string,
  licenseUserId: string,
  count: number,
) => {
  const year = new Date().getFullYear();
  return `${year}/${remark}/ACC/${licenseUserId}-${count + 1}`;
};

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const user = getIndraUser();

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  // GET - Retrieve applicationDoc data
  if (method === "GET") {
    const query = getQuery(event);
    const { id } = query;

    // If ID is provided, return single document
    if (id) {
      const doc = user.applicationDoc?.find((d: any) => d.id === id);
      if (!doc) {
        throw createError({
          statusCode: 404,
          statusMessage: "Application document not found",
        });
      }
      return doc;
    }

    // Otherwise return all documents
    return user.applicationDoc || [];
  }

  // POST - Create new applicationDoc
  if (method === "POST") {
    const body = await readBody(event);
    // console.log(body);
    // Find the eventUser
    const eventUser = eventUserData.find(
      (eu: any) => eu.id === body.eventUserId,
    );

    // Find the license
    const license = user.license?.find((l: any) => l.id === body.licenseId);

    // Find the logbook
    const logbook = user.logbook?.find((lb: any) => lb.id === body.logbookId);

    // Get latest medex
    const latestMedex = user.medex?.length
      ? user.medex[user.medex.length - 1]
      : null;

    // Get latest ielp
    const latestIelp = user.ielp?.length
      ? user.ielp[user.ielp.length - 1]
      : null;

    // Generate remark from eventUser
    const remark = eventUser?.event?.remarkDoc?.remark || "PERMOHONAN";

    const newDoc = {
      id: Date.now().toString(),
      number: generateAppNumber(
        remark,
        user.licenseUserId || "3458",
        user.applicationDoc.length,
      ),
      eventUser: eventUser || null,
      statusId: { id: "1", status: "REGISTERRED" },
      medex: latestMedex,
      ielp: latestIelp,
      briefingDate: body.briefingDate || "",
      // Part 1
      atsName: body.atsName,
      address: body.address,
      appRating: body.appRating || [],
      // Part 2
      userName: user.name,
      licenseUserId: user.licenseUserId,
      dateOfBirth: user.dateOfBirth,
      placeOfBirth: user.placeOfBirth,
      personalAddress: user.personalAddress,
      nationality: user.nationality,
      phoneNumber: user.phoneNumber,
      genderId: user.gender,
      isConfirmRating: body.isConfirmRating || false,
      reason: body.reason || "",
      rating: body.rating || "",
      location: body.location || "",
      dateForExp: body.dateForExp || "",
      confirmOjt: body.confirmOjt || false,
      letterNumber: body.letterNumber || "",
      letterDate: body.letterDate || "",
      controlHour: body.controlHour || "",
      ojtId: body.ojtId || "",
      ojtName: body.ojtName || "",
      isDrugs: body.isDrugs || false,
      // Part 4
      isFailed: body.isFailed || false,
      // Documents
      license: license || null,
      logBook: logbook || null,
    };

    user.applicationDoc.push(newDoc);
    return newDoc;
  }

  // DELETE - Delete applicationDoc
  if (method === "DELETE") {
    const query = getQuery(event);
    const { id } = query;

    if (!id) {
      throw createError({ statusCode: 400, statusMessage: "ID is required" });
    }

    const docIndex = user.applicationDoc.findIndex((d: any) => d.id === id);

    if (docIndex === -1) {
      throw createError({
        statusCode: 404,
        statusMessage: "Application document not found",
      });
    }

    const deleted = user.applicationDoc.splice(docIndex, 1)[0];
    return deleted;
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
});
