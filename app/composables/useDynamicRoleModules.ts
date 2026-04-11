import type { ModuleKey } from "~/config/sidebarModules";

export type RoleModulesRow = {
  role: string;
  modules: ModuleKey[];
};

export function useDynamicRoleModules() {
  const { authUser, getRoleNames, getRoleModules, isAuthenticated } = useAuth();

  // Transform authUser roles to the format expected by sidebar
  const roleModulesData = computed<RoleModulesRow[]>(() => {
    if (!isAuthenticated.value || !authUser.value?.roles) {
      return [];
    }

    return authUser.value.roles.map((roleData) => {
      const roleName = roleData.roles.role;
      const modules = roleData.roles.rolesMenu.map(
        (rm) => rm.menu.menu,
      ) as ModuleKey[];

      return {
        role: roleName,
        modules,
      };
    });
  });

  // Available roles for dropdown
  const roleOptions = computed<string[]>(() => {
    return roleModulesData.value.map((r) => r.role);
  });

  return {
    roleModulesData,
    roleOptions,
    getRoleNames,
    getRoleModules,
  };
}
