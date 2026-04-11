// server/api/perpanjangan.ts
import adminMindMap from "~/utils/adminMindMap.json";

interface MemberData {
  nik: string;
  licenseUserId: string;
  dateOfBirth: string;
  placeOfBirth: string;
  personalAddress: string;
  nationality: string;
  phoneNumber: string;
  gender: { id: string; gender: string };
  email: string;
  name: string;
}

interface GroupMember {
  id: string;
  member: string | MemberData;
  verification?: {
    id: string;
    applicationDoc: {
      id: string;
      number: string;
    };
    verificationData: string;
    isValid: boolean;
  };
}

interface PerpanjanganItem {
  id: string;
  event: string;
  start: string;
  finish: string;
  checkerGroup: string[];
  groupMember: GroupMember[];
  sector?: string;
  session?: string;
  branchUnit?: string;
  branch?: string;
  region?: string;
}

export default defineEventHandler(async (event) => {
  const perpanjanganEvents: PerpanjanganItem[] = [];

  // Traverse the mind map structure
  (adminMindMap as any[]).forEach((region, regionIdx) => {
    region.branch.forEach((branch: any, branchIdx: number) => {
      branch.branchUnit.forEach((branchUnit: any, unitIdx: number) => {
        // Check if branchUnit has sessions
        if (branchUnit.session) {
          branchUnit.session.forEach((session: any, sessionIdx: number) => {
            session.event.forEach((evt: any, eventIdx: number) => {
              // Check if event has remarkDoc with PERPANJANGAN
              if (evt.remarkDoc?.remark === "PERPANJANGAN") {
                if (evt.group) {
                  // Filter groups where pic is INDRA SUDARSONO
                  const indraGroups = evt.group.filter(
                    (g: any) => g.pic === "INDRA SUDARSONO",
                  );

                  // For each group with INDRA as PIC, create a row
                  indraGroups.forEach((group: any) => {
                    perpanjanganEvents.push({
                      id: `${evt.id}-${group.id}`,
                      event: evt.event,
                      start: evt.start,
                      finish: evt.finish,
                      checkerGroup:
                        group.checkerGroup?.map((cg: any) => cg.checker) || [],
                      groupMember:
                        group.groupMember?.map((gm: any) => ({
                          id: gm.id,
                          member: gm.member,
                          verification: gm.verification,
                        })) || [],
                      sector: evt.sector?.sector,
                      session: session.session,
                      branchUnit: branchUnit.unit,
                      branch: branch.branch,
                      region: region.region,
                    });
                  });
                } else {
                }
              }
            });
          });
        }
      });
    });
  });

  return perpanjanganEvents;
});
