import { getDashboardRoute } from "~/utils/dashboardRoute";
import { isPathAllowedForModules } from "~/config/sidebarModules";

export default defineNuxtRouteMiddleware((to) => {
  const publicRoutes = new Set(["/login", "/forgot-password", "/reset-password", "/auth/complete"]);
  // This page restores frontend state from the backend-verified SSO cookie.
  // It must be reachable before the UI has an auth_user cookie.
  if (to.path === "/auth/complete") return;
  if (/^\/certificate\/verify\/[0-9a-f-]{36}$/i.test(to.path)) return;

  const { isAuthenticated, getRoleNames, getAllModules } = useAuth();

  if (to.path === "/login" && isAuthenticated.value) {
    return navigateTo(getDashboardRoute(getRoleNames()));
  }

  if (!publicRoutes.has(to.path) && !isAuthenticated.value) {
    return navigateTo("/login");
  }

  if (
    isAuthenticated.value &&
    !publicRoutes.has(to.path) &&
    !isPathAllowedForModules(to.path, getAllModules(), getRoleNames())
  ) {
    return navigateTo(getDashboardRoute(getRoleNames()), { replace: true });
  }
});
