// ~/config/sidebarModules.ts
import type { NavigationMenuItem } from "@nuxt/ui";

export type ModuleKey =
  | "dashboard"
  | "dashboardGeneralAdmin"
  | "dashboardBranchAdmin"
  | "dashboardBranchUnitAdmin"
  | "dashboardOperational"
  | "dashboardChecker"
  | "dashboardCheckerAdmin"
  | "userManagement"
  | "userManagementBranch"
  | "userManagementBranchUnit"
  | "userManagementChecker"
  | "branchManagement"
  | "systemSettings"
  | "branchReports"
  | "ratingManagement"
  | "professionManagement"
  | "professionInBranch"
  | "rolesManagement"
  | "sectorManagement"
  | "cwpManagement"
  /////////////////////ADMIN
  | "branchUnitManagement"
  ////////////////////BRANCH ADMIN
  | "escalation"
  | "eventPreparation"
  | "ratingSummary"
  | "room"
  | "multipleChoiceQuestion"
  | "essayChoiceQuestion"
  | "checkerStatistic"
  | "score"
  | "data"
  | "verification"
  | "performanceCheck"
  | "practicalExam"
  | "dailyBriefing"
  | "dutyBriefing"
  | "dutyReport"
  | "notam"
  | "opsMonitor"
  | "document"
  | "examination"
  | "userHistory"
  | "history"
  | "credentialVerification"
  | "ratingCheckerAdmin"
  | "applicationDoc"
  | "medicalTest"
  | "mandatoryQuestion"
  ///////////////////////////////////////////////
  | "briefing"
  | "dashboardSupervisor"
  //////////////////////////
  | "dashboardDoctor"
  | "monitorMedicalTest"
  | "logbookUser"
  | "logbookBranchUnit"
  | "logbookGeneralAdmin"
  | "pfcScore"
  | "shiftManagement";

export const MODULE_TO_ITEM: Record<ModuleKey, NavigationMenuItem> = {
  dashboard: { label: "Dashboard", icon: "i-lucide-home", to: "/" },
  dashboardGeneralAdmin: {
    label: "Dashboard General Admin",
    icon: "i-lucide-home",
    to: "/dashboard/dashboardGeneralAdmin",
  },
  dashboardBranchAdmin: {
    label: "Dashboard Branch Admin",
    icon: "i-lucide-home",
    to: "/dashboard/dashboardBranchAdmin",
  },

  dashboardBranchUnitAdmin: {
    label: "Dashboard Branch Unit Admin",
    icon: "i-lucide-home",
    to: "/dashboard/dashboardBranchUnitAdmin",
  },
  dashboardOperational: {
    label: "Dashboard Operational",
    icon: "i-lucide-home",
    to: "/dashboard/dashboardOperational",
  },
  dashboardChecker: {
    label: "Dashboard Checker",
    icon: "i-lucide-home",
    to: "/dashboard/dashboardChecker",
  },
  dashboardCheckerAdmin: {
    label: "Dashboard Checker Admin",
    icon: "i-lucide-home",
    to: "/dashboard/dashboardCheckerAdmin",
  },
  room: {
    label: "Room",
    icon: "i-lucide-warehouse",
    to: "/room/room",
  },
  branchManagement: {
    label: "Branch Management",
    icon: "i-lucide-split",
    to: "/branchManagement",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "Region", to: "/branchManagement/region" },
      { label: "Branch", to: "/branchManagement/branch" },
    ],
  },
  branchReports: {
    label: "Branch Reports",
    icon: "i-lucide-file-text",
    to: "/reports/branch",
  },
  rolesManagement: {
    label: "Roles Management",
    icon: "i-lucide-user-cog",
    to: "/rolesManagement",
  },
  ratingManagement: {
    label: "Rating Management",
    icon: "i-lucide-circle-star",
    to: "/ratingManagement/rating",
  },
  professionManagement: {
    label: "Profession Management",
    icon: "i-lucide-book-user",
    to: "/professionManagement/profession",
  },
  professionInBranch: {
    label: "Profession Management",
    icon: "i-lucide-book-user",
    to: "/professionInBranch/profession",
  },
  systemSettings: {
    label: "System Settings",
    icon: "i-lucide-settings",
    to: "/settings",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "General", to: "/settings" },
      { label: "Members", to: "/settings/members" },
    ],
  },
  userManagement: {
    label: "User Management",
    icon: "i-lucide-users",
    to: "/userManagement",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "User List", to: "/userManagement/userGeneral" },
      { label: "User Role", to: "/userManagement/userRoleGeneral" }, ////buat mindahin user
      { label: "User Login", to: "/userManagement/userLogin" },
    ],
  },

  userManagementChecker: {
    label: "User Management Checker",
    icon: "i-lucide-users",
    to: "/userManagement",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "User List", to: "/userManagement/userChecker" },
      // { label: "User Role", to: "/userManagement/userCheckerRole" }, ////buat mindahin user
    ],
  },

  userManagementBranch: {
    label: "User Management Branch",
    icon: "i-lucide-users",
    to: "/userManagement",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "User List", to: "/userManagement/userBranch" },
      { label: "User Role", to: "/userManagement/userRoleBranch" },
    ],
  },

  userManagementBranchUnit: {
    label: "User Management Branch Unit",
    icon: "i-lucide-users",
    to: "/userManagement",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "User List", to: "/userManagement/userBranchUnit" },
      { label: "User Role", to: "/userManagement/userRoleBranchUnit" }, ////buat mindahin user
      { label: "User Checker", to: "/userManagement/userCheckerGeneral" },
    ],
  },

  mandatoryQuestion: {
    label: "Mandatory Question",
    icon: "i-lucide-message-square-warning",
    to: "/mandatoryQuestion",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "Mandatory Items", to: "/mandatoryQuestion/mandatory" },
      { label: "Mandatory Rating", to: "/mandatoryQuestion/mandatoryRating" },
      { label: "MATS Questions", to: "/mandatoryQuestion/mats" },
      { label: "MATS Analysis", to: "/mandatoryQuestion/matsAnalysis" },
    ],
  },
  ///////////////////////////////////////////////GENERAL ADMIN////////////////////////////////////////////////////
  branchUnitManagement: {
    label: "Branch Unit Management",
    icon: "i-lucide-square-chart-gantt",
    to: "/branchUnitManagement/branchUnit",
  },

  ///////////////////////////////////////////////////////////////////BRANCH ADMIN
  sectorManagement: {
    label: "Sector Management",
    icon: "i-lucide-spline-pointer",
    to: "/sectorManagement/sector",
  },

  cwpManagement: {
    label: "CWP Management",
    icon: "i-lucide-laptop",
    to: "/cwpManagement",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "CWP", to: "/cwpManagement/cwp" },
      { label: "CWP Sector", to: "/cwpManagement/sector" },
      { label: "CWP Frequency", to: "/cwpManagement/frequency" },
      { label: "CWP Supervisor", to: "/cwpManagement/supervisor" },
    ],
  },

  escalation: {
    label: "Escalation",
    icon: "i-lucide-radio",
    to: "/escalation",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "Escalation Level", to: "/escalation/level" },
      { label: "Escalation Actor", to: "/escalation/actor" }, //includes event question
    ],
  },

  //////////////////////////////////////////////////////////////////////BRANCH UNIT ADMIN
  ratingCheckerAdmin: {
    label: "Rating",
    icon: "i-lucide-star",
    to: "/ratingCheckerAdmin/ratingCheckerAdmin",
  },

  shiftManagement: {
    label: "Shift Management",
    icon: "i-lucide-calendar-clock",
    to: "/shiftManagement",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "Operation Shift", to: "/shiftManagement/operation" }, //includes event question
    ],
  },

  eventPreparation: {
    label: "Event Preparation",
    icon: "i-lucide-calendar-sync",
    to: "/eventPreparation",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "Manage Session", to: "/eventPreparation/session" },
      { label: "Creating Event", to: "/eventPreparation/event" }, //includes event question
      { label: "Defining Checker", to: "/eventPreparation/definingChecker" },
      { label: "Event Question", to: "/eventPreparation/eventQuestion" },
      { label: "Token", to: "/eventPreparation/token" },
    ],
  },

  multipleChoiceQuestion: {
    label: "Multiple Choice Preparation",
    icon: "i-lucide-list-checks",
    to: "/multipleChoiceQuestion",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "Question Category", to: "/multipleChoice/category" },
      { label: "Question", to: "/multipleChoice/question" },
      { label: "Question Group", to: "/multipleChoice/group" },
    ],
  },

  ratingSummary: {
    label: "Rating Summary",
    icon: "i-lucide-radar",
    to: "/ratingSummary/rating",
  },

  checkerStatistic: {
    label: "Statistic",
    icon: "i-lucide-calendar-sync",
    to: "/checkerStatistic",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "Member", to: "/checkerStatistic/member" },
      { label: "Question", to: "/checkerStatistic/question" },
    ],
  },

  essayChoiceQuestion: {
    label: "Essay Preparation",
    icon: "i-lucide-pen-line",
    to: "/essayChoiceQuestion",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "Essay Category", to: "/essay/category" },
      { label: "Essay", to: "/essay/essay" },
      { label: "Essay Group", to: "/essay/group" },
    ],
  },

  data: {
    label: "Data",
    icon: "i-lucide-database-backup",
    to: "/data",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "IELP", to: "/data/ielp" },
      { label: "MEDEX", to: "/data/medex" },
      { label: "Competence", to: "/data/competence" },
    ],
  },
  // verification: {
  //   label: "Verification",
  //   icon: "i-lucide-brick-wall-shield",
  //   to: "/verification",
  //   type: "trigger",
  //   defaultOpen: true,
  //   children: [
  //     { label: "PENERBITAN", to: "/verification/penerbitan" },
  //     { label: "PERPANJANGAN", to: "/verification/perpanjangan" },
  //     { label: "PERPANJANGAN", to: "/verification/verification" },
  //   ],
  // },
  verification: {
    label: "Verification",
    icon: "i-lucide-brick-wall-shield",
    to: "/verification/verification",
  },
  performanceCheck: {
    label: "Performance Check",
    icon: "i-lucide-notepad-text",
    to: "/performanceCheck/correctionEssay",
  },
  practicalExam: {
    label: "Practical Exam",
    icon: "i-lucide-school",
    to: "/practicalExam/practical",
  },
  // history: {
  //   label: "History",
  //   icon: "i-lucide-history",
  //   to: "/history",
  //   type: "trigger",
  //   defaultOpen: true,
  //   children: [{ label: "History", to: "/settings" }],
  // },
  history: {
    label: "History",
    icon: "i-lucide-history",
    to: "/checkerHistory/history",
  },
  credentialVerification: {
    label: "IELP / MEDEX Verification",
    icon: "i-lucide-badge-check",
    to: "/checkerHistory/credentialVerification",
  },
  dailyBriefing: {
    label: "Daily Briefing",
    icon: "i-lucide-messages-square",
    to: "/dailyBriefing",
  },
  notam: {
    label: "NOTAM",
    icon: "i-lucide-newspaper",
    to: "/settings",
  },
  opsMonitor: {
    label: "Monitor Operational",
    icon: "i-lucide-activity",
    to: "/opsMonitor",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "Equipment", to: "/settings" },
      { label: "Personil", to: "/settings/members" },
    ],
  },
  dutyBriefing: {
    label: "Duty Briefing",
    icon: "i-lucide-screen-share",
    to: "/settings",
  },

  dutyReport: {
    label: "Duty Report",
    icon: "i-lucide-notebook-pen",
    to: "/dutyReport",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "Supervisor Assignment", to: "/dutyReport/dutyReport" },
      { label: "Position Log", to: "/dutyReport/positionLog" },
      { label: "Frequency Status", to: "/dutyReport/frequencyStatus" },
      { label: "Recap", to: "/dutyReport/recap" },
    ],
  },
  document: {
    label: "Document",
    icon: "i-lucide-book",
    to: "/document",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "License", to: "/document/license" },
      { label: "Logbook", to: "/document/logbook" },
      { label: "IELP", to: "/document/ielpUser" },
      { label: "Medex", to: "/document/medexUser" },
      { label: "Competence", to: "/document/competenceUser" },
    ],
  },
  applicationDoc: {
    label: "Application Document",
    icon: "i-lucide-file-user",
    to: "/applicationDoc",
  },
  examination: {
    label: "Examination",
    icon: "i-lucide-book-open-check",
    to: "/examination/examination",
  },
  userHistory: {
    label: "Score History",
    icon: "i-lucide-file-clock",
    to: "/userHistory",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "Score Recap", to: "/userHistory/scorRecap" },
      { label: "Practical Exam", to: "/userHistory/practicalExam" },
    ],
  },

  score: {
    label: "Score",
    icon: "i-lucide-star",
    to: "/settings",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "Score", to: "/checkerScore/scoreRecap" },
      { label: "Practical Exam", to: "/checkerScore/practicalExam" },
    ],
  },

  medicalTest: {
    label: "Medical Test",
    icon: "i-lucide-heart-pulse",
    to: "/medicalTest/userMedicalTest",
  },

  logbookUser: {
    label: "User Logbook",
    icon: "i-lucide-book",
    to: "/logbookUser/logbookUser",
  },

  logbookBranchUnit: {
    label: "Logbook Branch Unit",
    icon: "i-lucide-book",
    to: "/logbookBranchUnit",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "Daily Logbook", to: "/logbookBranchUnit/dailyLogbook" },
      { label: "Personal Logbook", to: "/logbookBranchUnit/personalLogbook" },
      { label: "On Going Issue", to: "/logbookBranchUnit/onGoingIssues" },
      { label: "LHD Reports", to: "/logbookBranchUnit/lhdReports" },
    ],
  },

  logbookGeneralAdmin: {
    label: "Logbook General Admin",
    icon: "i-lucide-book",
    to: "/logbookGeneralAdmin",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "Daily Logbook", to: "/logbookGeneralAdmin/dailyLogbook" },
      { label: "Personal Logbook", to: "/logbookGeneralAdmin/personalLogbook" },
      { label: "On Going Issue", to: "/logbookGeneralAdmin/onGoingIssues" },
      { label: "LHD Reports", to: "/logbookGeneralAdmin/lhdReports" },
    ],
  },

  ////////////////////////////////////////////////SUPERVISOR

  briefing: {
    label: "Briefing",
    icon: "i-lucide-users",
    to: "/briefing/briefing",
  },

  dashboardSupervisor: {
    label: "Dashboard Supervisor",
    icon: "i-lucide-home",
    to: "/dashboard/dashboardSupervisor",
  },

  ////////////////////////DOCTOR
  dashboardDoctor: {
    label: "Dashboard Doctor",
    icon: "i-lucide-users",
    to: "/dashboard/dashboardDoctor",
  },

  monitorMedicalTest: {
    label: "Monitor Medical Test",
    icon: "i-lucide-book",
    to: "i-lucide-home",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "Verification", to: "/doctor/monitorMedicalTest" },
      { label: "History", to: "/doctor/medicalTestHistory" },
    ],
  },

  pfcScore: {
    label: "Perf Check Score",
    icon: "i-lucide-notepad-text",
    to: "/pfcScore",
    type: "trigger",
    defaultOpen: true,
    children: [
      { label: "Score Recap", to: "/pfcScore/scoreRecap" },
      { label: "Individual Score", to: "/pfcScore/individual" },
      { label: "Checker", to: "/pfcScore/checker" },
    ],
  },
};

const AUTHENTICATED_UTILITY_ROUTES = ["/", "/profile", "/file/view"];

const ROLE_ADDITIONAL_ROUTES: Record<string, string[]> = {
  OPERATIONAL: ["/examination/essay", "/examination/multipleChoice"],
};

function normalizePath(path: string): string {
  const normalized = path.split(/[?#]/, 1)[0]?.replace(/\/+$/, "") || "/";
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function getItemRoutes(item: NavigationMenuItem): string[] {
  const routes: string[] = [];
  const to = typeof item.to === "string" ? normalizePath(item.to) : null;

  if (to?.startsWith("/")) routes.push(to);

  if (Array.isArray(item.children)) {
    for (const child of item.children) routes.push(...getItemRoutes(child));
  }

  return routes;
}

/**
 * Checks frontend route access against the same menu assignments used to build
 * the sidebar. Backend authorization remains authoritative for API requests;
 * this prevents users from bypassing menu access by typing a URL directly.
 */
export function isPathAllowedForModules(
  path: string,
  assignedModules: string[],
  assignedRoles: string[] = [],
): boolean {
  const requestedPath = normalizePath(path);

  if (AUTHENTICATED_UTILITY_ROUTES.some((route) => requestedPath === route)) {
    return true;
  }

  const normalizedModules = new Set(
    assignedModules.map((module) => module.trim().toLowerCase()),
  );

  for (const role of assignedRoles) {
    const roleRoutes = ROLE_ADDITIONAL_ROUTES[role.trim().toUpperCase()] || [];
    if (
      roleRoutes.some(
        (route) =>
          requestedPath === route || requestedPath.startsWith(`${route}/`),
      )
    ) {
      return normalizedModules.has("examination");
    }
  }

  for (const [moduleKey, item] of Object.entries(MODULE_TO_ITEM)) {
    if (!normalizedModules.has(moduleKey.toLowerCase())) continue;

    for (const route of getItemRoutes(item)) {
      if (requestedPath === route || requestedPath.startsWith(`${route}/`)) {
        return true;
      }
    }
  }

  return false;
}
