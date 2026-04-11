// server/api/role-modules.get.ts
export default defineEventHandler(async () => {
  // TODO: fetch from DB here
  return [
    {
      role: "SUPER ADMIN",
      modules: [
        "dashboard",
        "branchManagement",
        "rolesManagement",
        "userManagement",
        "ratingManagement",
        "professionManagement",
      ],
    },
    {
      role: "BRANCH ADMIN",
      modules: [
        "dashboard",
        "userManagement",
        "ratingManagement",
        "sectorManagement",
        "cwpManagement",
      ],
    },
    {
      role: "BRANCH UNIT ADMIN",
      modules: [
        "dashboard",
        "rolesManagement",
        "userManagement",
        "sectorManagement",
        "cwpManagement",
        "subBranchManagement",
      ],
    },
    {
      role: "CHECKER ADMIN",
      modules: [
        "dashboard",
        "userManagement",
        "eventPreparation",
        "multipleChoiceQuestion",
        "essayChoiceQuestion",
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
        "userHistory",
      ],
    },
    { role: "DOCTOR", modules: ["dashboard", "medicalTest"] },
  ];
});
