<script setup lang="ts">
import ip from "../../utils/config.json";
import { useApplicationDocStore } from "../../stores/applicationDoc";
import ApplicationDocModal from "../../components/verification/ApplicationDocModal.vue";
import VerificationModal from "../../components/verification/VerificationModal.vue";
import VerificationDetailModal from "../../components/verification/VerificationDetailModal.vue";

const { token } = useAuth();
const store = useApplicationDocStore();

// Modal state
const isModalOpen = ref(false);
const isDocSelectionOpen = ref(false);
const selectedApplicationDoc = ref<any>(null);
const selectedUserData = ref<any>(null);
const availableApplicationDocs = ref<any[]>([]);
const pendingUserMember = ref<any>(null);
const pendingGroupMemberId = ref<number | null>(null);

// Verification Item Modal state
const isVerificationItemModalOpen = ref(false);
const verificationItemData = ref<any>(null);
const verificationItemLoading = ref(false);
const verificationItemError = ref<string | null>(null);

// Verification Modal state (for verification form)
const isVerificationModalOpen = ref(false);
const verificationApiResponse = ref<any>(null);
const verificationApplicationDocId = ref<number | null>(null);
const verificationGroupMemberId = ref<number | null>(null);
const verificationMember = ref<any>(null); // Full group member object

// Verification Detail Modal state (for viewing verification details)
const isVerificationDetailModalOpen = ref(false);
const selectedVerificationData = ref<any>(null);
const selectedVerificationMember = ref<any>(null);

// Types
interface EventItem {
  id: number;
  event: string;
  remarkDoc: {
    id: number;
    remark: string;
  };
  session: {
    id: number;
    session: string;
  };
}

interface VerificationInitResponse {
  event: EventItem[];
}

interface UserChecker {
  nik: string;
  name: string;
}

interface CheckerGroup {
  id: number;
  userChecker: UserChecker;
}

interface UserMember {
  nik: string;
  name: string;
  competences: any[];
  applicationDocs: any[];
}

interface GroupMember {
  id: number;
  userMember: UserMember;
  verification?: any; // Verification data if member has been verified
}

interface EventDetail {
  id: number;
  event: string;
  startDate: string;
  finishDate: string;
  remarkDoc: {
    id: number;
    remark: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  session: {
    id: number;
    session: string;
  };
}

interface VerificationItem {
  id: number;
  group: string;
  userPic: {
    name: string;
  };
  event: EventDetail;
  checkerGroups: CheckerGroup[];
  groupMembers: GroupMember[];
}

// State
const selectedEventId = ref<number | undefined>(undefined);
const loading = ref(false);
const searchLoading = ref(false);
const toast = useToast();
const verificationData = ref<VerificationItem[]>([]);

// Fetch events for dropdown
const { data: initData, status: initStatus } =
  await useFetch<VerificationInitResponse>(
    `http://${ip.ipBackEnd}/api/verificationInit`,
    {
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    },
  );

// Computed dropdown items
const eventOptions = computed(() => {
  if (!initData.value?.event) return [];
  return initData.value.event.map((evt) => ({
    label: `${evt.session.session} | ${evt.remarkDoc.remark} | ${evt.event}`,
    value: evt.id,
  }));
});

// Format date helper
function formatDate(dateString: string): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Search button handler
async function handleSearch() {
  if (!selectedEventId.value) {
    toast.add({
      title: "Error",
      description: "Please select an event first",
      color: "error",
    });
    return;
  }

  searchLoading.value = true;
  try {
    const response = await $fetch<VerificationItem[]>(
      `http://${ip.ipBackEnd}/api/verification`,
      {
        method: "POST",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
          "Content-Type": "application/json",
        },
        body: {
          eventId: selectedEventId.value,
        },
      },
    );

    verificationData.value = response;

    toast.add({
      title: "Success",
      description: "Verification data retrieved successfully",
      color: "success",
    });
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error?.message || "Failed to fetch verification data",
      color: "error",
    });
    verificationData.value = [];
  } finally {
    searchLoading.value = false;
  }
}

// View application doc details - opens both modals side by side
function viewApplicationDoc(
  applicationDocs: any[],
  userMember?: any,
  groupMemberId?: number,
  member?: any, // Full group member object
) {
  if (!applicationDocs || applicationDocs.length === 0) {
    return;
  }

  // Store available docs, user member, group member ID, and full member object for selection
  availableApplicationDocs.value = applicationDocs;
  pendingUserMember.value = userMember;
  pendingGroupMemberId.value = groupMemberId || null;
  verificationMember.value = member || null;

  // If only one doc, open both modals side by side
  if (applicationDocs.length === 1) {
    openBothModals(applicationDocs[0]);
    return;
  }

  // If multiple docs, show selection modal
  isDocSelectionOpen.value = true;
}

// Open both ApplicationDocModal and VerificationModal side by side
function openBothModals(doc: any) {
  // Set the selected data for the ApplicationDocModal
  selectedApplicationDoc.value = doc;

  // Use user data from applicationDoc.user (from API response)
  // Fall back to pendingUserMember if needed
  if (doc.user) {
    selectedUserData.value = {
      name: doc.user.name,
      licenseUserId: doc.user.licenseUserId || "-",
      dateOfBirth: doc.user.dateOfBirth,
      placeOfBirth: doc.user.placeOfBirth,
      personalAddress: doc.user.personalAddress,
      nationality: doc.user.nationality,
      phoneNumber: doc.user.phoneNumber,
      genderId: doc.user.genderId,
      gender: doc.user.gender,
      competences: pendingUserMember.value?.competences || [],
    };
  } else if (pendingUserMember.value) {
    selectedUserData.value = {
      name: pendingUserMember.value.name,
      licenseUserId: pendingUserMember.value.licenseUserId || "-",
      dateOfBirth: pendingUserMember.value.dateOfBirth,
      placeOfBirth: pendingUserMember.value.placeOfBirth,
      personalAddress: pendingUserMember.value.personalAddress,
      nationality: pendingUserMember.value.nationality,
      phoneNumber: pendingUserMember.value.phoneNumber,
      genderId: pendingUserMember.value.genderId,
      competences: pendingUserMember.value.competences || [],
    };
  } else {
    // Fallback to store user data or minimal structure
    selectedUserData.value = store.user || {
      name: doc.userNik || "-",
      licenseUserId: "-",
      dateOfBirth: null,
      placeOfBirth: null,
      personalAddress: null,
      nationality: null,
      phoneNumber: null,
      genderId: null,
      competences: [],
    };
  }

  // Open ApplicationDocModal
  isModalOpen.value = true;

  // Fetch verification data and open VerificationModal simultaneously
  fetchVerificationItemAndOpenModal(doc);
}

// Select a specific application doc and open the main modal
function selectApplicationDoc(doc: any) {
  // Set the selected data for the modal
  selectedApplicationDoc.value = doc;

  // Use user data from applicationDoc.user (from API response)
  // Fall back to pendingUserMember if needed
  if (doc.user) {
    selectedUserData.value = {
      name: doc.user.name,
      licenseUserId: doc.user.licenseUserId || "-",
      dateOfBirth: doc.user.dateOfBirth,
      placeOfBirth: doc.user.placeOfBirth,
      personalAddress: doc.user.personalAddress,
      nationality: doc.user.nationality,
      phoneNumber: doc.user.phoneNumber,
      genderId: doc.user.genderId,
      gender: doc.user.gender,
      competences: pendingUserMember.value?.competences || [],
    };
  } else if (pendingUserMember.value) {
    selectedUserData.value = {
      name: pendingUserMember.value.name,
      licenseUserId: pendingUserMember.value.licenseUserId || "-",
      dateOfBirth: pendingUserMember.value.dateOfBirth,
      placeOfBirth: pendingUserMember.value.placeOfBirth,
      personalAddress: pendingUserMember.value.personalAddress,
      nationality: pendingUserMember.value.nationality,
      phoneNumber: pendingUserMember.value.phoneNumber,
      genderId: pendingUserMember.value.genderId,
      competences: pendingUserMember.value.competences || [],
    };
  } else {
    // Fallback to store user data or minimal structure
    selectedUserData.value = store.user || {
      name: doc.userNik || "-",
      licenseUserId: "-",
      dateOfBirth: null,
      placeOfBirth: null,
      personalAddress: null,
      nationality: null,
      phoneNumber: null,
      genderId: null,
      competences: [],
    };
  }

  // Close selection modal if open, then open main modal
  isDocSelectionOpen.value = false;
  isModalOpen.value = true;

  // Also fetch verification item data and open verification modal simultaneously
  fetchVerificationItemAndOpenModal(doc);
}

// Close document selection modal
function closeDocSelection() {
  isDocSelectionOpen.value = false;
  availableApplicationDocs.value = [];
  pendingUserMember.value = null;
  pendingGroupMemberId.value = null;
}

// Fetch verification item data from API
async function fetchVerificationItem(doc: any) {
  const remark = doc.eventUser?.event?.remarkDoc?.remark;

  if (!remark) {
    verificationItemError.value = "No remark data available for this document";
    isVerificationItemModalOpen.value = true;
    return;
  }

  verificationItemLoading.value = true;
  verificationItemError.value = null;
  isVerificationItemModalOpen.value = true;

  try {
    const response = await $fetch<any>(
      `http://${ip.ipBackEnd}/api/verificationItem`,
      {
        method: "POST",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
          "Content-Type": "application/json",
        },
        body: {
          remark: remark,
        },
      },
    );

    verificationItemData.value = response;
  } catch (error: any) {
    verificationItemError.value =
      error?.message || "Failed to fetch verification item data";
    toast.add({
      title: "Error",
      description: verificationItemError.value ?? undefined,
      color: "error",
    });
  } finally {
    verificationItemLoading.value = false;
  }
}

// Close verification item modal
function closeVerificationItemModal() {
  isVerificationItemModalOpen.value = false;
  verificationItemData.value = null;
  verificationItemError.value = null;
}

// Fetch verification item data and open verification modal simultaneously
async function fetchVerificationItemAndOpenModal(doc: any) {
  const remark = doc.eventUser?.event?.remarkDoc?.remark;

  if (!remark) {
    verificationItemError.value = "No remark data available for this document";
    return;
  }

  verificationItemLoading.value = true;
  verificationItemError.value = null;

  try {
    const response = await $fetch<any>(
      `http://${ip.ipBackEnd}/api/verificationItem`,
      {
        method: "POST",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
          "Content-Type": "application/json",
        },
        body: {
          remark: remark,
        },
      },
    );

    verificationItemData.value = response;

    // Set the data for verification modal and open it simultaneously
    verificationApplicationDocId.value = doc.id || null;
    verificationApiResponse.value = response || [];
    isVerificationModalOpen.value = true;
  } catch (error: any) {
    verificationItemError.value =
      error?.message || "Failed to fetch verification item data";
    toast.add({
      title: "Error",
      description: verificationItemError.value ?? undefined,
      color: "error",
    });
  } finally {
    verificationItemLoading.value = false;
  }
}

// Close all modals
function closeAllModals() {
  isModalOpen.value = false;
  isVerificationItemModalOpen.value = false;
  isDocSelectionOpen.value = false;
  isVerificationModalOpen.value = false;
}

// Open verification modal with API response
function openVerificationModal(applicationDoc: any) {
  // Set the application doc ID
  verificationApplicationDocId.value = applicationDoc.id || null;

  // Use verificationItemData as the API response for the verification modal
  // This assumes the verificationItem API returns the items needed for the form
  verificationApiResponse.value = verificationItemData.value || [];

  isVerificationModalOpen.value = true;
}

// Close verification modal
function closeVerificationModal() {
  isVerificationModalOpen.value = false;
  verificationApiResponse.value = null;
  verificationApplicationDocId.value = null;
  verificationGroupMemberId.value = null;
  verificationMember.value = null;
}

// Handle successful verification submission
function handleVerificationSubmitSuccess() {
  toast.add({
    title: "Success",
    description: "Verification data saved successfully",
    color: "success",
  });
  closeVerificationModal();
}

// View verification details - opens the detail modal
function viewVerification(verification: any, member?: any) {
  // Store the verification data and member
  selectedVerificationData.value = verification;
  selectedVerificationMember.value = member || null;

  // Open the detail modal
  isVerificationDetailModalOpen.value = true;
}

// Close verification detail modal
function closeVerificationDetailModal() {
  isVerificationDetailModalOpen.value = false;
  selectedVerificationData.value = null;
  selectedVerificationMember.value = null;
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Verification">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4">
        <UCard class="mt-6">
          <template #header>
            <h2 class="text-lg font-semibold">Select Event</h2>
          </template>

          <div class="flex flex-col gap-4">
            <!-- Loading State -->
            <div
              v-if="initStatus === 'pending'"
              class="flex items-center gap-2 text-muted"
            >
              <UIcon name="i-lucide-loader-2" class="animate-spin" />
              <span>Loading events...</span>
            </div>

            <!-- Dropdown and Search -->
            <div v-else class="flex flex-col sm:flex-row gap-4 items-end">
              <UFormField label="Event" class="flex-1 w-full">
                <USelect
                  v-model="selectedEventId"
                  :items="eventOptions"
                  placeholder="Select an event"
                  class="w-full"
                  :disabled="eventOptions.length === 0"
                />
              </UFormField>

              <UButton
                label="Search"
                color="primary"
                variant="solid"
                icon="i-lucide-search"
                :loading="searchLoading"
                :disabled="!selectedEventId || eventOptions.length === 0"
                @click="handleSearch"
              />
            </div>

            <!-- Empty State -->
            <div
              v-if="initStatus === 'success' && eventOptions.length === 0"
              class="text-muted"
            >
              No events available
            </div>
          </div>
        </UCard>

        <!-- Verification Data Table -->
        <UCard v-if="verificationData.length > 0" class="mt-6">
          <template #header>
            <h2 class="text-lg font-semibold">Verification Results</h2>
          </template>

          <div class="overflow-x-auto">
            <table class="w-full border-collapse border border-gray-200">
              <thead>
                <tr class="bg-gray-100">
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    No
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Event
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Start Date
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Finish Date
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    PIC
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Checker
                  </th>
                  <th class="border border-gray-300 px-4 py-2 text-center">
                    Member
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in verificationData"
                  :key="item.id"
                  class="hover:bg-gray-50"
                >
                  <td class="border border-gray-300 px-4 py-2">
                    {{ index + 1 }}
                  </td>
                  <td class="border border-gray-300 px-4 py-2">
                    {{ item.event.event }}
                  </td>
                  <td class="border border-gray-300 px-4 py-2">
                    {{ formatDate(item.event.startDate) }}
                  </td>
                  <td class="border border-gray-300 px-4 py-2">
                    {{ formatDate(item.event.finishDate) }}
                  </td>
                  <td class="border border-gray-300 px-4 py-2">
                    {{ item.userPic.name }}
                  </td>
                  <td class="border border-gray-300 px-4 py-2">
                    <ul class="list-disc list-inside">
                      <li
                        v-for="checker in item.checkerGroups"
                        :key="checker.id"
                      >
                        {{ checker.userChecker.name }} ({{
                          checker.userChecker.nik
                        }})
                      </li>
                    </ul>
                  </td>
                  <td class="border border-gray-300 px-4 py-2">
                    <ul class="list-disc list-inside">
                      <li
                        v-for="member in item.groupMembers"
                        :key="member.id"
                        class="flex items-center gap-2 mb-1"
                      >
                        <span
                          >{{ member.userMember.name }} ({{
                            member.userMember.nik
                          }})</span
                        >
                        <!-- Checklist badge for members with verification -->
                        <UButton
                          v-if="member.verification"
                          type="button"
                          size="lg"
                          color="success"
                          variant="soft"
                          icon="i-lucide-clipboard-check"
                          class="ml-1"
                          @click.stop="
                            viewVerification(member.verification, member)
                          "
                        />
                        <!-- Eye badge for members with applicationDocs -->
                        <UButton
                          v-if="
                            member.userMember.applicationDocs &&
                            member.userMember.applicationDocs.length > 0
                          "
                          type="button"
                          size="lg"
                          color="primary"
                          variant="soft"
                          icon="i-lucide-eye"
                          class="ml-1"
                          @click.stop="
                            viewApplicationDoc(
                              member.userMember.applicationDocs,
                              member.userMember,
                              member.id,
                              member,
                            )
                          "
                        />
                      </li>
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>

        <!-- No Results State -->
        <UCard
          v-else-if="
            !searchLoading && verificationData.length === 0 && selectedEventId
          "
          class="mt-6"
        >
          <div class="text-center py-8 text-muted">
            <UIcon name="i-lucide-inbox" class="text-4xl mb-2" />
            <p>No verification data found for the selected event</p>
          </div>
        </UCard>

        <!-- Document Selection Modal -->
        <div
          v-if="isDocSelectionOpen"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/50 backdrop-blur-sm"
            @click="closeDocSelection"
          />

          <!-- Modal Content -->
          <div
            class="relative bg-white rounded-lg shadow-xl max-w-md w-full flex flex-col"
          >
            <!-- Header -->
            <div
              class="flex items-center justify-between p-4 border-b border-gray-200"
            >
              <h3 class="text-lg font-semibold">Pilih Dokumen Aplikasi</h3>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="closeDocSelection"
              />
            </div>

            <!-- Body -->
            <div class="p-4">
              <p class="text-sm text-gray-600 mb-4">
                Tersedia {{ availableApplicationDocs.length }} dokumen. Pilih
                salah satu:
              </p>
              <div class="space-y-2">
                <UButton
                  v-for="doc in availableApplicationDocs"
                  :key="doc.id"
                  color="primary"
                  variant="soft"
                  class="w-full justify-start text-left"
                  @click="selectApplicationDoc(doc)"
                >
                  <div class="flex flex-col items-start">
                    <span class="font-medium">{{
                      doc.number || "No Number"
                    }}</span>
                    <span class="text-xs text-gray-500">
                      {{ doc.eventUser?.event?.remarkDoc?.remark || "-" }} |
                      {{ formatDate(doc.createdAt) }}
                    </span>
                  </div>
                </UButton>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex justify-end p-4 border-t border-gray-200">
              <UButton
                label="Batal"
                color="neutral"
                variant="outline"
                @click="closeDocSelection"
              />
            </div>
          </div>
        </div>

        <!-- Side-by-Side Modals Container -->
        <div
          v-if="isModalOpen || isVerificationModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/50 backdrop-blur-sm"
            @click="closeAllModals"
          />

          <!-- Modals Wrapper - Side by Side -->
          <div
            class="relative flex flex-row gap-4 w-full max-w-[95vw] h-full max-h-[90vh] items-stretch"
          >
            <!-- Application Doc Modal -->
            <div
              v-if="isModalOpen"
              class="flex-1 min-w-0"
              style="flex-basis: 60%"
            >
              <ApplicationDocModal
                :is-open="true"
                :application-doc="selectedApplicationDoc"
                :user-data="selectedUserData"
                @close="isModalOpen = false"
              />
            </div>

            <!-- Verification Form Modal (Side by Side) -->
            <div
              v-if="isVerificationModalOpen"
              class="flex-1 min-w-0"
              style="flex-basis: 35%"
            >
              <VerificationModal
                :is-open="true"
                :api-response="verificationApiResponse"
                :application-doc-id="verificationApplicationDocId"
                :member="verificationMember"
                :inline="true"
                @close="closeVerificationModal"
                @submit-success="handleVerificationSubmitSuccess"
              />
            </div>
          </div>
        </div>

        <!-- Verification Detail Modal -->
        <VerificationDetailModal
          :is-open="isVerificationDetailModalOpen"
          :verification="selectedVerificationData"
          :member="selectedVerificationMember"
          @close="closeVerificationDetailModal"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
