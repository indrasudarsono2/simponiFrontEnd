// ~/config/sidebarModules.ts
import type { NavigationMenuItem } from "@nuxt/ui";

export type ModuleKey =
  | "dashboard"
  | "dashboardOperational"
  | "userManagement"
  | "userManagementBranch"
  | "userManagementBranchUnit"
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
  | "ratingCheckerAdmin"
  | "applicationDoc"
  | "medicalTest"
  | "mandatoryQuestion";

export const MODULE_TO_ITEM: Record<ModuleKey, NavigationMenuItem> = {
  dashboard: { label: "Dashboard", icon: "i-lucide-home", to: "/" },
  dashboardOperational: {
    label: "Dashboard",
    icon: "i-lucide-home",
    to: "/dashboard/dashboardOperational",
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
    ],
  },

  userManagementBranch: {
    label: "User Management",
    icon: "i-lucide-users",
    to: "/userManagement",
    type: "trigger",
    defaultOpen: true,
    children: [{ label: "User List", to: "/userManagement/userBranch" }],
  },

  userManagementBranchUnit: {
    label: "User Management",
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
    to: "/cwpManagement/cwp",
  },

  //////////////////////////////////////////////////////////////////////BRANCH UNIT ADMIN
  ratingCheckerAdmin: {
    label: "Rating",
    icon: "i-lucide-star",
    to: "/ratingCheckerAdmin/ratingCheckerAdmin",
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
    label: "history",
    icon: "i-lucide-history",
    to: "/checkerHistory/history",
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
    to: "/settings",
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
    to: "/settingss",
  },
};
