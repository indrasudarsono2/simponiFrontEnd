import type { ModuleKey } from "~/config/sidebarModules";

export type RoleModulesRow = {
  role: string;
  modules: ModuleKey[];
};

export function useRoleModules() {
  return useFetch<RoleModulesRow[]>("/api/role-modules", {
    default: () => [], // IMPORTANT: data.value will never be undefined
  });
}
