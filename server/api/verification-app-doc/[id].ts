// server/api/verification-app-doc/[id].ts
import adminMindMap from "~/utils/adminMindMap.json";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  // Traverse the mind map to find the application doc
  for (const region of adminMindMap as any[]) {
    for (const branch of region.branch || []) {
      for (const branchUnit of branch.branchUnit || []) {
        for (const session of branchUnit.session || []) {
          for (const evt of session.event || []) {
            for (const group of evt.group || []) {
              for (const gm of group.groupMember || []) {
                // Check if this member has verification with matching application doc ID
                if (
                  gm.verification?.applicationDoc?.id === id &&
                  typeof gm.member === "object" &&
                  gm.member !== null
                ) {
                  const memberData = gm.member;
                  const appDoc = gm.verification.applicationDoc;

                  // Return combined data with new arrays
                  return {
                    ...appDoc,
                    userName: memberData.name,
                    licenseUserId: memberData.licenseUserId,
                    dateOfBirth: memberData.dateOfBirth,
                    placeOfBirth: memberData.placeOfBirth,
                    personalAddress: memberData.personalAddress,
                    nationality: memberData.nationality,
                    phoneNumber: memberData.phoneNumber,
                    genderId: memberData.gender,
                    email: memberData.email,
                    nik: memberData.nik,
                    // Include new data arrays
                    license: memberData.license || [],
                    logbook: memberData.logbook || [],
                    ielp: memberData.ielp || [],
                    medex: memberData.medex || [],
                    competence: memberData.competence || [],
                  };
                }
              }
            }
          }
        }
      }
    }
  }

  // Return null if not found
  return null;
});
