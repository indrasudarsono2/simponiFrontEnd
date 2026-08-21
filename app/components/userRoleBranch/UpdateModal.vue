<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

defineOptions({
  name: "UserRoleBranchUpdateModal",
});

interface Role {
  id: number;
  role: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface UserRole {
  id: number;
  roles: Role;
}

interface User {
  nik: string;
  licenseUserId: string;
  name: string;
  branch: {
    id: number;
    branch: string;
  };
  userRoles: UserRole[];
}

const props = defineProps<{
  user: User | null;
  roles: Role[];
}>();

const emit = defineEmits<{
  (e: "user-updated"): void;
  (e: "close"): void;
}>();

const selectedRoles = ref<{ value: number; label: string }[]>([]);
const toast = useToast();
const loading = ref(false);
const { token } = useAuth();

const roleOptions = computed(() => {
  return props.roles.map((role) => ({
    value: role.id,
    label: role.role,
  }));
});

const selectedRolesList = computed(() => {
  if (!selectedRoles.value || selectedRoles.value.length === 0) {
    return [];
  }

  return props.roles.filter((role) =>
    selectedRoles.value.some((selectedRole) => selectedRole.value === role.id),
  );
});

const selectedRoleIds = computed(() => {
  return selectedRoles.value.map((role) => role.value);
});

watch(
  () => props.user,
  (newUser) => {
    if (newUser) {
      selectedRoles.value =
        newUser.userRoles?.map((userRole) => ({
          value: userRole.roles.id,
          label: userRole.roles.role,
        })) || [];
    } else {
      selectedRoles.value = [];
    }
  },
  { immediate: true },
);

const isOpen = computed({
  get: () => props.user !== null,
  set: (value) => {
    if (!value) emit("close");
  },
});

async function onSubmit() {
  if (!props.user) return;

  if (selectedRoles.value.length === 0) {
    toast.add({
      title: "Error",
      description: "Please select at least one role",
      color: "error",
    });
    return;
  }

  loading.value = true;

  try {
    await $fetch(`${apiBaseUrl}/api/userRoleBranch/${props.user.nik}`, {
      method: "PUT",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
        "Content-Type": "application/json",
      },
      body: {
        roleIds: selectedRoleIds.value,
      },
    });

    toast.add({
      title: "Success",
      description: "User roles updated successfully",
      color: "success",
    });

    emit("user-updated");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message || error?.message || "Failed to update user roles",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" title="Edit User Roles">
    <template #body>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <div
          v-if="user"
          class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2"
        >
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Name:</span>
            <span class="text-sm font-medium">{{ user.name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">NIK:</span>
            <span class="text-sm font-medium">{{ user.nik }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Branch:</span>
            <span class="text-sm font-medium">{{
              user.branch?.branch || "-"
            }}</span>
          </div>
        </div>

        <UFormField label="Select Roles" name="roleIds" required>
          <USelectMenu
            v-model="selectedRoles"
            :items="roleOptions"
            multiple
            placeholder="Select roles"
            class="w-full"
          />
        </UFormField>

        <div
          class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg"
        >
          <p class="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
            Selected Roles:
          </p>
          <ul
            v-if="selectedRolesList.length > 0"
            class="list-disc list-inside text-sm text-blue-700 dark:text-blue-300 m-0 p-0"
          >
            <li v-for="role in selectedRolesList" :key="role.id">
              {{ role.role }}
            </li>
          </ul>
          <p v-else class="text-sm text-blue-700 dark:text-blue-300">
            No roles selected
          </p>
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
            label="Update Roles"
            color="primary"
            type="submit"
            :loading="loading"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
