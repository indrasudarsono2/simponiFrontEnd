<script setup lang="ts">
import type {
  CommandPaletteGroup,
  CommandPaletteItem,
  NavigationMenuItem,
} from "@nuxt/ui";
import { useDynamicRoleModules } from "~/composables/useDynamicRoleModules";
import { getSidebarLinksFromBackend } from "~/composables/sidebarLinks";

const route = useRoute();
const toast = useToast();
const { isAuthenticated } = useAuth();

const open = ref(false);

// Use dynamic role modules from auth user instead of static API
const { roleModulesData, roleOptions } = useDynamicRoleModules();
const operationalGuide = useOperationalGuide();

/** Selected role - persisted across navigation */
const role = useState<string>("selectedRole", () => "");

watch(() => route.path, () => {
  if (import.meta.client && role.value === "OPERATIONAL" && operationalGuide.active.value) {
    void operationalGuide.refresh();
  }
});

/** Set default role once data arrives */
watch(
  roleModulesData,
  (list) => {
    if (!list?.length) {
      role.value = "";
      return;
    }

    if (!list.some((item) => item.role === role.value)) {
      role.value = list[0]!.role;
    }
  },
  { immediate: true },
);

/** Build sidebar links from dynamic config + selected role */
const links = computed<[NavigationMenuItem[], NavigationMenuItem[]]>(() => {
  const config = roleModulesData.value ?? [];
  const selectedRole = role.value || config[0]?.role || "";

  const [main, bottom] = getSidebarLinksFromBackend(config, selectedRole);
  const targetPath = selectedRole === "OPERATIONAL" && operationalGuide.active.value
    ? operationalGuide.nextStep.value.to.split("#", 1)[0]
    : null;

  // Patch each item so sidebar closes on select
  const patch = (items: NavigationMenuItem[]) =>
    items.map((item) => {
      const childMarked = item.children?.some((child) => child.to === targetPath);
      const children = item.children?.map((child) => ({
        ...child,
        class: child.to === targetPath ? [child.class, "operational-guide-required"] : child.class,
      }));
      const marked = item.to === targetPath || childMarked;
      return {
        ...item,
        children,
        ui: { ...item.ui, linkLabel: marked ? "font-bold text-primary" : item.ui?.linkLabel },
        onSelect: (_e: Event) => {
          open.value = false;
        },
      };
    });

  return [patch(main), patch(bottom)];
});

/** Search groups */
const groups = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() => [
  {
    id: "links",
    label: "Go to",
    items: links.value.flat().map((item) => ({
      id: String(item.label || item.to || "link"),
      label: String(item.label || "Open"),
      icon: item.icon,
      to: item.to,
    })),
  },
  {
    id: "code",
    label: "Code",
    items: [
      {
        id: "source",
        label: "View page source",
        icon: "i-simple-icons-github",
        to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${
          route.path === "/" ? "/index" : route.path
        }.vue`,
        target: "_blank",
      },
    ],
  },
]);

/** Cookie consent toast */
onMounted(() => {
  const cookie = useCookie("cookie-consent");
  if (cookie.value === "accepted") return;

  toast.add({
    title:
      "We use first-party cookies to enhance your experience on our website.",
    duration: 0,
    close: false,
    actions: [
      {
        label: "Accept",
        color: "neutral",
        variant: "outline",
        onClick: (_e: MouseEvent) => {
          cookie.value = "accepted";
        },
      },
      {
        label: "Opt out",
        color: "neutral",
        variant: "ghost",
        onClick: (_e: MouseEvent) => {
          cookie.value = "optout";
        },
      },
    ],
  });
});
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed = false }">
        <TeamsMenu
          :collapsed="collapsed ?? false"
          v-model:role="role"
          :roles="roleOptions"
          :loading="false"
        />
      </template>

      <template #default="{ collapsed }">
        <div v-if="!isAuthenticated" class="p-2 text-sm text-red-500">
          Please login to access the menu.
        </div>

        <UNavigationMenu
          v-else
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <!-- REQUIRED in Nuxt layouts -->
    <NuxtPage />

    <OperationalGuidePanel v-if="role === 'OPERATIONAL'" />
    <TrainingModeBanner v-if="role === 'OPERATIONAL'" />

    <NotificationsSlideover />
  </UDashboardGroup>
</template>

<style>
.operational-guide-required [data-slot="childLinkLabel"] {
  font-weight: 700 !important;
  color: var(--ui-primary) !important;
}
</style>
