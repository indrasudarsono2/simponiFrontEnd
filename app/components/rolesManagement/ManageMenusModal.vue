<script setup lang="ts">
import ip from "../../utils/config.json";
import { MODULE_TO_ITEM, type ModuleKey } from "../../config/sidebarModules";

interface Menu {
  id: number;
  menu: string | null;
}

interface RoleMenu {
  id: number;
  menuId: number | null;
  menu: Menu | null;
}

interface Role {
  id: number;
  role: string | null;
  rolesMenu: RoleMenu[];
}

const props = defineProps<{
  role: Role | null;
}>();

const emit = defineEmits<{
  menusUpdated: [];
  close: [];
}>();

const { token } = useAuth();
const toast = useToast();

const loading = ref(false);
const optionsLoading = ref(false);
const menuOptions = ref<Menu[]>([]);
const selectedMenus = ref<{ value: number; label: string; key: string }[]>([]);

const isOpen = computed({
  get: () => props.role !== null,
  set: (value) => {
    if (!value) emit("close");
  },
});

const formattedMenuOptions = computed(() =>
  menuOptions.value.map((menu) => {
    const menuKey = menu.menu || "";
    return {
      value: menu.id,
      label: getMenuLabel(menuKey),
      key: menuKey,
    };
  }),
);

const selectedMenuIds = computed(() =>
  selectedMenus.value.map((menu) => menu.value),
);

const selectedMenuSummary = computed(() =>
  selectedMenus.value
    .map((menu) => ({
      key: menu.key,
      label: menu.label,
    }))
    .sort((first, second) => first.label.localeCompare(second.label)),
);

function getMenuLabel(menuKey: string) {
  const moduleItem = MODULE_TO_ITEM[menuKey as ModuleKey];
  return moduleItem?.label || menuKey || "-";
}

async function loadMenuOptions() {
  optionsLoading.value = true;

  try {
    menuOptions.value = await $fetch<Menu[]>(
      `http://${ip.ipBackEnd}/api/rolesManagement/menus`,
      {
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to load menus",
      color: "error",
    });
  } finally {
    optionsLoading.value = false;
  }
}

function hydrateSelectedMenus(role: Role | null) {
  const activeMenuIds = new Set(
    role?.rolesMenu
      ?.map((roleMenu) => roleMenu.menuId)
      .filter((menuId): menuId is number => Number.isInteger(menuId)) || [],
  );

  selectedMenus.value = formattedMenuOptions.value.filter((menu) =>
    activeMenuIds.has(menu.value),
  );
}

watch(
  () => props.role,
  async (role) => {
    if (!role) {
      selectedMenus.value = [];
      return;
    }

    await loadMenuOptions();
    hydrateSelectedMenus(role);
  },
);

async function onSubmit() {
  if (!props.role) return;

  if (selectedMenuIds.value.length === 0) {
    toast.add({
      title: "Error",
      description: "Please select at least one menu",
      color: "error",
    });
    return;
  }

  loading.value = true;

  try {
    await $fetch(
      `http://${ip.ipBackEnd}/api/rolesManagement/${props.role.id}/menus`,
      {
        method: "PUT",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
        body: {
          menuIds: selectedMenuIds.value,
        },
      },
    );

    toast.add({
      title: "Success",
      description: `Menus for ${props.role.role || "role"} have been updated`,
      color: "success",
    });

    emit("menusUpdated");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to update role menus",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="`Manage Menus - ${role?.role || ''}`"
    description="Choose which sidebar menus are available for this role"
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <div
          v-if="role"
          class="rounded-lg border border-default bg-elevated/40 p-4"
        >
          <p class="text-xs uppercase text-muted">Selected Role</p>
          <p class="text-base font-semibold text-highlighted">
            {{ role.role || "-" }}
          </p>
        </div>

        <UFormField label="Menus" name="menus" required>
          <USelectMenu
            v-model="selectedMenus"
            class="w-full"
            :items="formattedMenuOptions"
            multiple
            searchable
            placeholder="Select menus"
            :loading="optionsLoading"
          />
        </UFormField>

        <div
          class="rounded-lg border border-primary/30 bg-primary/5 p-4"
        >
          <p class="mb-2 text-sm font-medium text-highlighted">
            Summary Menus
          </p>
          <div
            v-if="selectedMenuSummary.length"
            class="flex flex-wrap gap-2"
          >
            <UBadge
              v-for="menu in selectedMenuSummary"
              :key="menu.key"
              color="primary"
              variant="soft"
            >
              {{ menu.label }}
            </UBadge>
          </div>
          <p v-else class="text-sm text-muted">No menus selected</p>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="emit('close')"
          />
          <UButton
            label="Save Menus"
            color="primary"
            type="submit"
            :loading="loading"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
