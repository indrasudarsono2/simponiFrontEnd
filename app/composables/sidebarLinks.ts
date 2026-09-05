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
  const dashboardModules = validModules.filter((module) =>
    module.startsWith("dashboard"),
  );
  const regularModules = validModules.filter(
    (module) => !module.startsWith("dashboard"),
  );

  const sectorIndex = regularModules.indexOf("sectorManagement");
  const ratingIndexes = ["ratingManagement", "ratingCheckerAdmin"]
    .map((module) => regularModules.indexOf(module as ModuleKey))
    .filter((index) => index >= 0);
  const firstRatingIndex = ratingIndexes.length
    ? Math.min(...ratingIndexes)
    : -1;

  if (sectorIndex >= 0 && firstRatingIndex >= 0 && sectorIndex > firstRatingIndex) {
    const [sectorModule] = regularModules.splice(sectorIndex, 1);
    if (sectorModule) regularModules.splice(firstRatingIndex, 0, sectorModule);
  }

  const orderedModules = dashboardModules.concat(regularModules);
  const mainLinks = orderedModules.map((module) => MODULE_TO_ITEM[module]);

  return [mainLinks, bottomLinks];
}
