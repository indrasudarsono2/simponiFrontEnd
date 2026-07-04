<script setup lang="ts">
import ip from "../utils/config.json";
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const { token } = useAuth();
const toast = useToast();

interface ProfileResponse {
  nik: string;
  licenseUserId: string;
  professionInBranch: {
    id: number;
    profession: {
      id: number;
      profession: string;
      description: string;
      createdAt: string;
      updatedAt: string;
      deletedAt: string | null;
    };
  };
  sector: {
    id: number;
    sector: string;
  };
  branch: {
    id: number;
    branch: string;
  };
  branchUnit: {
    id: number;
    unit: string;
  };
  name: string;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  personalAddress: string | null;
  nationality: string | null;
  phoneNumber: string | null;
  gender: {
    id: number;
    gender: string;
  };
  email: string | null;
}

const { data, status, error, refresh } = await useFetch<ProfileResponse>(
  `http://${ip.ipBackEnd}/api/profile`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const profile = computed(() => data.value);

function formatValue(value: string | number | null | undefined) {
  return value ?? "-";
}

function formatDateForInput(value: string | null | undefined): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function formatDateOfBirth(value: string | null | undefined): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

// ─── Update Modal State ─────────────────────────────────────────────────
const showUpdateModal = ref(false);
const updateMode = ref<"manual" | "sync">("manual");
const isUpdating = ref(false);
const isSyncing = ref(false);

// ─── Form Schema & State ──────────────────────────────────────────────────
const updateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  licenseUserId: z.string().min(1, "License User ID is required"),
  genderId: z.string().min(1, "Gender is required"),
  dateOfBirth: z.string().min(1, "Date of Birth is required"),
  placeOfBirth: z.string().min(1, "Place of Birth is required"),
  personalAddress: z.string().min(1, "Personal Address is required"),
  nationality: z.string().min(1, "Nationality is required"),
  phoneNumber: z.string().min(1, "Phone Number is required"),
  email: z.string().email("Invalid email").nullable().optional(),
});

type UpdateSchema = z.output<typeof updateSchema>;

const genderOptions = [
  { value: "1", label: "LAKI-LAKI" },
  { value: "2", label: "PEREMPUAN" },
];

const formState = reactive<Partial<UpdateSchema>>({
  name: "",
  licenseUserId: "",
  genderId: "",
  dateOfBirth: "",
  placeOfBirth: "",
  personalAddress: "",
  nationality: "",
  phoneNumber: "",
  email: null,
});

// ─── Open Modal & Prefill ─────────────────────────────────────────────────
function openUpdateModal() {
  if (profile.value) {
    formState.name = profile.value.name;
    formState.licenseUserId = profile.value.licenseUserId;
    formState.genderId = String(profile.value.gender?.id || "");
    formState.dateOfBirth = formatDateForInput(profile.value.dateOfBirth);
    formState.placeOfBirth = profile.value.placeOfBirth ?? "";
    formState.personalAddress = profile.value.personalAddress ?? "";
    formState.nationality = profile.value.nationality ?? "";
    formState.phoneNumber = profile.value.phoneNumber ?? "";
    formState.email = profile.value.email;
  }
  updateMode.value = "manual";
  showUpdateModal.value = true;
}

// ─── Manual Update Submit ─────────────────────────────────────────────────
async function onManualSubmit(event: FormSubmitEvent<UpdateSchema>) {
  isUpdating.value = true;
  try {
    await $fetch(`http://${ip.ipBackEnd}/api/profile/${profile.value?.nik}`, {
      method: "PUT",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
        "Content-Type": "application/json",
      },
      body: {
        name: event.data.name,
        licenseUserId: event.data.licenseUserId,
        genderId: event.data.genderId,
        dateOfBirth: event.data.dateOfBirth,
        placeOfBirth: event.data.placeOfBirth,
        personalAddress: event.data.personalAddress,
        nationality: event.data.nationality,
        phoneNumber: event.data.phoneNumber,
        email: event.data.email,
      },
    });

    toast.add({
      title: "Profile Updated",
      description: "Your profile has been successfully updated.",
      color: "success",
    });

    showUpdateModal.value = false;
    await refresh();
  } catch (err: any) {
    toast.add({
      title: "Update Failed",
      description: err?.message || "Failed to update profile.",
      color: "error",
    });
  } finally {
    isUpdating.value = false;
  }
}

// ─── Sync from External System (Dummy) ────────────────────────────────────
async function syncFromExternalSystem() {
  isSyncing.value = true;
  try {
    // Simulate API call to external system
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Dummy data from external system
    const dummyExternalData = {
      name: "INDRA SUDARSONO",
      dateOfBirth: "1992-11-04",
      placeOfBirth: "JAKARTA",
      personalAddress: "Jl. Sudirman No. 123, Jakarta",
      nationality: "INDONESIA",
      phoneNumber: "081234567890",
      email: "synced@example.com",
    };

    // Prefill form with synced data
    formState.name = dummyExternalData.name;
    formState.dateOfBirth = dummyExternalData.dateOfBirth;
    formState.placeOfBirth = dummyExternalData.placeOfBirth;
    formState.personalAddress = dummyExternalData.personalAddress;
    formState.nationality = dummyExternalData.nationality;
    formState.phoneNumber = dummyExternalData.phoneNumber;
    formState.email = dummyExternalData.email;

    // Switch to manual mode to review/edit before saving
    updateMode.value = "manual";

    toast.add({
      title: "Data Synced",
      description:
        "External data loaded. Review and save to update your profile.",
      color: "success",
    });
  } catch (err: any) {
    toast.add({
      title: "Sync Failed",
      description: err?.message || "Failed to sync from external system.",
      color: "error",
    });
  } finally {
    isSyncing.value = false;
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Profile">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Update Profile Button -->
      <div v-if="profile" class="mb-4">
        <UButton
          label="Update Profile"
          color="primary"
          icon="i-lucide-user-cog"
          @click="openUpdateModal"
        />
      </div>

      <!-- Loading State -->
      <div v-if="status === 'pending'" class="space-y-4">
        <USkeleton class="h-6 w-48" />
        <USkeleton class="h-24 w-full" />
        <USkeleton class="h-24 w-full" />
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="rounded-lg border border-error/30 bg-error/10 p-4 space-y-3"
      >
        <p class="font-medium text-error">Failed to load profile data.</p>
        <p class="text-sm text-muted">
          {{ (error as any)?.message || "Unknown error occurred" }}
        </p>
        <UButton
          label="Retry"
          color="error"
          variant="soft"
          icon="i-lucide-refresh-cw"
          @click="() => refresh()"
        />
      </div>

      <!-- Profile Content -->
      <div v-else-if="profile" class="space-y-6">
        <UCard>
          <template #header>
            <h3 class="font-semibold text-base">Basic Information</h3>
          </template>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-muted">NIK:</span>
              {{ formatValue(profile.nik) }}
            </div>
            <div>
              <span class="text-muted">License User ID:</span>
              {{ formatValue(profile.licenseUserId) }}
            </div>
            <div>
              <span class="text-muted">Name:</span>
              {{ formatValue(profile.name) }}
            </div>
            <div>
              <span class="text-muted">Gender:</span>
              {{ formatValue(profile.gender?.gender) }}
            </div>
            <div>
              <span class="text-muted">Date of Birth:</span>
              {{ formatDateOfBirth(profile.dateOfBirth) }}
            </div>
            <div>
              <span class="text-muted">Place of Birth:</span>
              {{ formatValue(profile.placeOfBirth) }}
            </div>
            <div>
              <span class="text-muted">Nationality:</span>
              {{ formatValue(profile.nationality) }}
            </div>
            <div>
              <span class="text-muted">Phone Number:</span>
              {{ formatValue(profile.phoneNumber) }}
            </div>
            <div class="md:col-span-2">
              <span class="text-muted">Email:</span>
              {{ formatValue(profile.email) }}
            </div>
            <div class="md:col-span-2">
              <span class="text-muted">Personal Address:</span>
              {{ formatValue(profile.personalAddress) }}
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-semibold text-base">Organization Information</h3>
          </template>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-muted">Profession:</span>
              {{
                formatValue(profile.professionInBranch?.profession?.profession)
              }}
            </div>
            <div>
              <span class="text-muted">Profession Description:</span>
              {{
                formatValue(profile.professionInBranch?.profession?.description)
              }}
            </div>
            <div>
              <span class="text-muted">Sector:</span>
              {{ formatValue(profile.sector?.sector) }}
            </div>
            <div>
              <span class="text-muted">Branch:</span>
              {{ formatValue(profile.branch?.branch) }}
            </div>
            <div>
              <span class="text-muted">Branch Unit:</span>
              {{ formatValue(profile.branchUnit?.unit) }}
            </div>
          </div>
        </UCard>
      </div>

      <!-- Update Modal -->
      <UModal v-model:open="showUpdateModal" title="Update Profile">
        <template #body>
          <div class="space-y-4">
            <!-- Mode Selection -->
            <div class="flex gap-2 mb-4">
              <UButton
                label="Manual Update"
                :color="updateMode === 'manual' ? 'primary' : 'neutral'"
                :variant="updateMode === 'manual' ? 'solid' : 'soft'"
                @click="updateMode = 'manual'"
              />
              <UButton
                label="Sync from External"
                :color="updateMode === 'sync' ? 'primary' : 'neutral'"
                :variant="updateMode === 'sync' ? 'solid' : 'soft'"
                @click="updateMode = 'sync'"
              />
            </div>

            <!-- Sync Mode -->
            <div v-if="updateMode === 'sync'" class="text-center py-6">
              <p class="text-muted mb-4">
                Sync your profile data from an external system.
              </p>
              <UButton
                label="Sync Data"
                color="primary"
                icon="i-lucide-refresh-cw"
                :loading="isSyncing"
                @click="syncFromExternalSystem"
              />
            </div>

            <!-- Manual Update Form -->
            <UForm
              v-else
              :schema="updateSchema"
              :state="formState"
              @submit="onManualSubmit"
            >
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UFormField label="Name" name="name" required>
                  <UInput v-model="formState.name" class="w-full" />
                </UFormField>

                <UFormField
                  label="License User ID"
                  name="licenseUserId"
                  required
                >
                  <UInput v-model="formState.licenseUserId" class="w-full" />
                </UFormField>

                <UFormField label="Gender" name="genderId" required>
                  <USelect
                    v-model="formState.genderId"
                    :items="genderOptions"
                    value-key="value"
                    label-key="label"
                    placeholder="Select gender"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Date of Birth" name="dateOfBirth" required>
                  <UInput
                    v-model="formState.dateOfBirth"
                    type="date"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Place of Birth" name="placeOfBirth" required>
                  <UInput v-model="formState.placeOfBirth" class="w-full" />
                </UFormField>

                <UFormField label="Nationality" name="nationality" required>
                  <UInput v-model="formState.nationality" class="w-full" />
                </UFormField>

                <UFormField label="Phone Number" name="phoneNumber" required>
                  <UInput v-model="formState.phoneNumber" class="w-full" />
                </UFormField>

                <UFormField label="Email" name="email">
                  <UInput
                    v-model="formState.email"
                    type="email"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  label="Personal Address"
                  name="personalAddress"
                  class="md:col-span-2"
                  required
                >
                  <UTextarea
                    v-model="formState.personalAddress"
                    class="w-full"
                    :rows="3"
                  />
                </UFormField>
              </div>

              <div class="flex justify-end gap-2 mt-6">
                <UButton
                  label="Cancel"
                  color="neutral"
                  variant="soft"
                  @click="showUpdateModal = false"
                />
                <UButton
                  label="Save Changes"
                  color="primary"
                  type="submit"
                  :loading="isUpdating"
                />
              </div>
            </UForm>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
