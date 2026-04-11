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

  const mainLinks: NavigationMenuItem[] = (found?.modules ?? ["dashboard"])
    .filter((m): m is ModuleKey => m in MODULE_TO_ITEM) // drop unknown module keys safely
    .map((m) => MODULE_TO_ITEM[m]);

  return [mainLinks, bottomLinks];
}
