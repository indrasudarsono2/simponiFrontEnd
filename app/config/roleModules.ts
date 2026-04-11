// ~/config/roleModules.ts
export type Role =
  | "superAdmin"
  | "branchAdmin"
  | "branchUnitAdmin"
  | "checkerAdmin"
  | "checker"
  | "inmc"
  | "manops"
  | "supervisor"
  | "operational"
  | "doctor";

export type ModuleKey =
  | "dashboard"
  | "userManagement"
  | "systemSettings"
  | "branchReports"
  | "unitReports"
  | "checkReports"
  | "inmcReports"
  | "operationsManagement"
  | "teamOverview"
  | "taskList"
  | "patientRecords";

export const ROLE_MODULES: Record<Role, ModuleKey[]> = {
  superAdmin: ["dashboard", "userManagement", "systemSettings"],
  branchAdmin: ["dashboard", "branchReports"],
  branchUnitAdmin: ["dashboard", "unitReports"],
  checkerAdmin: ["dashboard", "checkReports"],
  checker: ["dashboard", "checkReports"],
  inmc: ["dashboard", "inmcReports"],
  manops: ["dashboard", "operationsManagement"],
  supervisor: ["dashboard", "teamOverview"],
  operational: ["dashboard", "taskList"],
  doctor: ["dashboard", "patientRecords"],
};
