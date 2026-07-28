<script setup lang="ts">
import ip from "../../utils/config.json";

interface MedicalUser {
  nik: string;
  name: string | null;
  branchUnit?: { unit: string | null } | null;
  professionInBranch?: {
    profession?: { profession: string | null } | null;
  } | null;
}

interface MedicalRevision {
  id: number;
  editedBy: string;
  reason: string;
  createdAt: string;
}

interface MedicalCheck {
  id: number;
  doctor: string | null;
  employee: string | null;
  bloodPressure: string | null;
  unNormalCondition: string | null;
  isFit: boolean | null;
  createdAt: string;
  updatedAt: string;
  doctorUser: MedicalUser | null;
  employeeUser: MedicalUser | null;
  revisions?: MedicalRevision[];
}

interface MedicalHistoryResponse {
  medicalChecks: MedicalCheck[];
}

const CONFIRMATION_PHRASE = "UPDATE MEDICAL RECORD";
const { token } = useAuth();
const toast = useToast();

const searchQuery = ref("");
const selectedRecord = ref<MedicalCheck | null>(null);
const systolic = ref("");
const diastolic = ref("");
const selectedResult = ref<{ value: boolean; label: string } | undefined>(undefined);
const doctorStatement = ref("");
const editReason = ref("");
const confirmationText = ref("");
const acknowledged = ref(false);
const saving = ref(false);

const resultOptions = [
  { value: true, label: "Fit" },
  { value: false, label: "Unfit" },
];

const { data, status, error, refresh } = await useFetch<MedicalHistoryResponse>(
  `http://${ip.ipBackEnd}/api/medicalCheck/history`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const medicalChecks = computed(() => data.value?.medicalChecks || []);
const filteredMedicalChecks = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return medicalChecks.value;
  return medicalChecks.value.filter((item) =>
    [
      item.employee,
      item.employeeUser?.name,
      item.employeeUser?.branchUnit?.unit,
      item.employeeUser?.professionInBranch?.profession?.profession,
      item.bloodPressure,
      item.doctorUser?.name,
      item.unNormalCondition,
      item.isFit ? "fit" : "unfit",
    ].some((value) => String(value || "").toLowerCase().includes(query)),
  );
});

const isEditOpen = computed({
  get: () => selectedRecord.value !== null,
  set: (value) => {
    if (!value) closeEdit();
  },
});

const canSave = computed(() =>
  Boolean(
    selectedRecord.value
      && /^\d{2,3}$/.test(systolic.value)
      && /^\d{2,3}$/.test(diastolic.value)
      && selectedResult.value
      && (selectedResult.value.value || doctorStatement.value.trim())
      && editReason.value.trim().length >= 10
      && confirmationText.value === CONFIRMATION_PHRASE
      && acknowledged.value,
  ),
);

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function openEdit(record: MedicalCheck) {
  const [currentSystolic = "", currentDiastolic = ""] =
    (record.bloodPressure || "").split("/");
  selectedRecord.value = record;
  systolic.value = currentSystolic;
  diastolic.value = currentDiastolic;
  selectedResult.value = resultOptions.find((item) => item.value === record.isFit);
  doctorStatement.value = record.unNormalCondition || "";
  editReason.value = "";
  confirmationText.value = "";
  acknowledged.value = false;
}

function closeEdit() {
  selectedRecord.value = null;
  systolic.value = "";
  diastolic.value = "";
  selectedResult.value = undefined;
  doctorStatement.value = "";
  editReason.value = "";
  confirmationText.value = "";
  acknowledged.value = false;
}

async function saveEdit() {
  if (!selectedRecord.value || !selectedResult.value || !canSave.value) return;

  try {
    saving.value = true;
    await $fetch(
      `http://${ip.ipBackEnd}/api/medicalCheck/history/${selectedRecord.value.id}`,
      {
        method: "PUT",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
        body: {
          systolic: systolic.value,
          diastolic: diastolic.value,
          isFit: selectedResult.value.value,
          unNormalCondition: doctorStatement.value,
          reason: editReason.value,
          confirmation: confirmationText.value,
          expectedUpdatedAt: selectedRecord.value.updatedAt,
        },
      },
    );

    toast.add({
      title: "Medical record updated",
      description: "The previous and new values were recorded in the audit history.",
      color: "success",
    });
    closeEdit();
    await refresh();
  } catch (requestError: any) {
    toast.add({
      title: "Unable to update medical record",
      description:
        requestError?.data?.message ||
        requestError?.message ||
        "The medical history could not be updated.",
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Medical Test History">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-2">
          <UInput
            v-model="searchQuery"
            placeholder="Search medical history..."
            icon="i-lucide-search"
            class="w-full max-w-sm"
          />
          <UButton
            label="Refresh"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            :loading="status === 'pending'"
            @click="refresh()"
          />
        </div>

        <div
          v-if="error"
          class="rounded-lg border border-error/30 bg-error/5 p-4 text-error"
        >
          Failed to load medical history.
        </div>

        <div v-else class="overflow-x-auto rounded-lg border border-default">
          <table class="min-w-full text-sm">
            <thead class="bg-elevated/50">
              <tr>
                <th class="px-3 py-2 text-left">Date</th>
                <th class="px-3 py-2 text-left">User</th>
                <th class="px-3 py-2 text-left">Branch Unit</th>
                <th class="px-3 py-2 text-left">Profession</th>
                <th class="px-3 py-2 text-center">Blood Pressure</th>
                <th class="px-3 py-2 text-center">Result</th>
                <th class="px-3 py-2 text-left">Doctor</th>
                <th class="px-3 py-2 text-left">Statement</th>
                <th class="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="record in filteredMedicalChecks"
                :key="record.id"
                class="border-t border-default"
              >
                <td class="px-3 py-2 whitespace-nowrap">{{ formatDate(record.createdAt) }}</td>
                <td class="px-3 py-2">
                  <p class="font-medium">{{ record.employeeUser?.name || '-' }}</p>
                  <p class="text-xs text-muted">{{ record.employee || '-' }}</p>
                </td>
                <td class="px-3 py-2">{{ record.employeeUser?.branchUnit?.unit || '-' }}</td>
                <td class="px-3 py-2">
                  {{ record.employeeUser?.professionInBranch?.profession?.profession || '-' }}
                </td>
                <td class="px-3 py-2 text-center">{{ record.bloodPressure || '-' }}</td>
                <td class="px-3 py-2 text-center">
                  <UBadge :color="record.isFit ? 'success' : 'error'" variant="soft">
                    {{ record.isFit ? 'Fit' : 'Unfit' }}
                  </UBadge>
                </td>
                <td class="px-3 py-2">{{ record.doctorUser?.name || '-' }}</td>
                <td class="px-3 py-2 max-w-xs whitespace-normal">
                  {{ record.unNormalCondition || '-' }}
                </td>
                <td class="px-3 py-2 text-center">
                  <UButton
                    label="Edit"
                    icon="i-lucide-shield-alert"
                    color="warning"
                    variant="soft"
                    size="xs"
                    @click="openEdit(record)"
                  />
                </td>
              </tr>
              <tr v-if="filteredMedicalChecks.length === 0">
                <td colspan="9" class="px-3 py-8 text-center text-muted">
                  No verified medical history found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <UModal
          v-model:open="isEditOpen"
          title="Edit Verified Medical Record"
          description="This is a sensitive change. The original values and your reason will be permanently recorded."
          :ui="{ content: 'max-w-xl w-full' }"
        >
          <template #body>
            <div class="space-y-4">
              <div class="rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error">
                Medical history cannot be deleted. Review every field before confirming this update.
              </div>

              <div class="grid grid-cols-2 gap-3">
                <UFormField label="Systolic" required>
                  <UInput v-model="systolic" inputmode="numeric" maxlength="3" class="w-full" />
                </UFormField>
                <UFormField label="Diastolic" required>
                  <UInput v-model="diastolic" inputmode="numeric" maxlength="3" class="w-full" />
                </UFormField>
              </div>

              <UFormField label="Verification Result" required>
                <USelectMenu
                  v-model="selectedResult"
                  :items="resultOptions"
                  placeholder="Select result"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Doctor Statement" :required="selectedResult?.value === false">
                <UTextarea v-model="doctorStatement" :rows="3" maxlength="2000" class="w-full" />
              </UFormField>

              <UFormField label="Reason for Editing" required>
                <UTextarea
                  v-model="editReason"
                  :rows="3"
                  maxlength="1000"
                  placeholder="Explain why this verified medical record must be changed..."
                  class="w-full"
                />
              </UFormField>

              <UCheckbox
                v-model="acknowledged"
                label="I have reviewed the original record and accept responsibility for this medical-data change."
              />

              <UFormField :label="`Type ${CONFIRMATION_PHRASE} to continue`" required>
                <UInput
                  v-model="confirmationText"
                  autocomplete="off"
                  :placeholder="CONFIRMATION_PHRASE"
                  class="w-full font-mono"
                />
              </UFormField>
            </div>
          </template>

          <template #footer>
            <div class="flex w-full justify-end gap-2">
              <UButton
                label="Cancel"
                color="neutral"
                variant="outline"
                :disabled="saving"
                @click="closeEdit"
              />
              <UButton
                label="Confirm Medical Record Update"
                icon="i-lucide-shield-check"
                color="error"
                :loading="saving"
                :disabled="!canSave || saving"
                @click="saveEdit"
              />
            </div>
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>
