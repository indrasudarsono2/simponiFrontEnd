// server/api/role-modules.get.ts
export default defineEventHandler(async () => {
  // TODO: fetch from DB here
  return [
    {
      role: "GENERAL ADMIN",
      modules: [
        "dashboard",
        "branchManagement", //membuat region dan menempatkan branch ada di region mana
        "rolesManagement", //mengkonfigurasi semuanya
        "professionManagement", //konfigurasi profesi apasaja yang ada di branch
        "ratingManagement", //konfigurasi rating apa aja yang ada
        "userManagement",
      ],
    },
    {
      role: "BRANCH ADMIN", ///lebih mengatur di branch itu ada unit ada branch unit apa aja, gak terlalu spesifik
      modules: ["dashboard", "branchUnitManagement"],
    },
    {
      role: "BRANCH UNIT ADMIN",
      modules: [
        "dashboard",
        "rolesManagement", //menentukan siapa saja yang bisa jadi checker aja
        "sectorManagement", //membuat sector dengan mencocokkan dengan branchunit
        "cwpManagement", //Konfigurasi dengan rating dan cwp serta sector
      ],
    },
    {
      role: "CHECKER ADMIN",
      modules: [
        "dashboard",
        "userManagement", //konfigurasi user ada di subBranch mana dan profession apa
        "ratingCheckerAdmin",
        "essayChoiceQuestion",
        "multipleChoiceQuestion",
        "eventPreparation",
        "score",
        "data",
        "history",
      ],
    },
    {
      role: "CHECKER",
      modules: [
        "dashboard",
        "verification",
        "performanceCheck",
        "practicalExam",
      ],
    },
    {
      role: "INMC",
      modules: ["dashboard", "dailyBriefing", "NOTAM", "opsMonitor"],
    },
    { role: "MANOPS", modules: ["dashboard", "dutyBriefing", "dutyReport"] },
    {
      role: "OPERATIONAL",
      modules: [
        "dashboard",
        "document",
        "applicationDoc",
        "examination",
        "medicalTest",
        "userHistory",
      ],
    },
    { role: "DOCTOR", modules: ["dashboard", "medicalTest"] },
  ];
});
