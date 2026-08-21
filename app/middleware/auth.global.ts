import { getDashboardRoute } from "~/utils/dashboardRoute";
import { isPathAllowedForModules } from "~/config/sidebarModules";

export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, getRoleNames, getAllModules } = useAuth();

  if (to.path === "/login" && isAuthenticated.value) {
    return navigateTo(getDashboardRoute(getRoleNames()));
  }

  if (to.path !== "/login" && !isAuthenticated.value) {
    return navigateTo("/login");
  }

  if (
    isAuthenticated.value &&
    to.path !== "/login" &&
    !isPathAllowedForModules(to.path, getAllModules(), getRoleNames())
  ) {
    return navigateTo(getDashboardRoute(getRoleNames()), { replace: true });
  }
});
