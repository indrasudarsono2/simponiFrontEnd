import { getDashboardRoute } from "~/utils/dashboardRoute";

export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, getRoleNames } = useAuth();

  if (to.path === "/login" && isAuthenticated.value) {
    return navigateTo(getDashboardRoute(getRoleNames()));
  }

  if (to.path !== "/login" && !isAuthenticated.value) {
    return navigateTo("/login");
  }
});
