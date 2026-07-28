const ROLE_DASHBOARD_ROUTES: Record<string, string> = {
  "GENERAL ADMIN": "/dashboard/dashboardGeneralAdmin",
  "BRANCH ADMIN": "/dashboard/dashboardBranchAdmin",
  "BRANCH UNIT ADMIN": "/dashboard/dashboardBranchUnitAdmin",
  "CHECKER ADMIN": "/dashboard/dashboardCheckerAdmin",
  CHECKER: "/dashboard/dashboardChecker",
  OPERATIONAL: "/dashboard/dashboardOperational",
  SUPERVISOR: "/dashboard/dashboardSupervisor",
  DOCTOR: "/dashboard/dashboardDoctor",
};

export function getDashboardRoute(roleNames: string[]): string {
  for (const roleName of roleNames) {
    const route = ROLE_DASHBOARD_ROUTES[roleName.trim().toUpperCase()];
    if (route) return route;
  }

  return "/profile";
}
