// ~/composables/sidebarLinks.ts
import type { NavigationMenuItem } from "@nuxt/ui";
import { MODULE_TO_ITEM, type ModuleKey } from "~/config/sidebarModules";

type RoleModulesRow = { role: string; modules: string[] };

const bottomLinks: NavigationMenuItem[] = [
  {
    label: "Help & Support",
    icon: "i-lucide-info",
    to: "https://example.com",
    target: "_blank",
  },
];

export function getSidebarLinksFromBackend(
  config: RoleModulesRow[],
  role: string,
): [NavigationMenuItem[], NavigationMenuItem[]] {
  const found = config.find((r) => r.role === role);

  const validModules = (found?.modules ?? ["dashboard"]).filter(
    (module): module is ModuleKey => module in MODULE_TO_ITEM,
  );
  const orderedModules = validModules.filter((module) => module.startsWith("dashboard"))
    .concat(validModules.filter((module) => !module.startsWith("dashboard")));
  const mainLinks = orderedModules.map((module) => MODULE_TO_ITEM[module]);

  return [mainLinks, bottomLinks];
}
