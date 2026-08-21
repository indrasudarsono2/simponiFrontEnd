<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
defineOptions({ name: "ApplicationDocAddModal" });
const { token } = useAuth();
// ─── Types ────────────────────────────────────────────────────────────────
interface EventItem {
  id: number;
  event: string;
  remarkDoc: {
    remark: string;
  };
  startDate: string;
  finishDate: string;
  passingGrade: number;
  isPractical: boolean;
  isSimulator: boolean;
  eventUsers: {
    id: number;
    userNik: string;
    event?: {
      groups?: {
        id: number;
        group: string;
        groupMembers?: {
          id: number;
          member?: string;
        }[];
        checkerGroups?: {
          id: number;
          name?: string;
          userChecker?: {
            userRoles?: {
              checkerRatings?: {
                rating?: {
                  id?: number;
                } | null;
              }[];
            }[];
          } | null;
        }[];
      }[];
    } | null;
  }[];
}

interface LicenseItem {
  id: number;
  userNik: string;
  note: string;
  file: string;
  expiredDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface LogbookItem {
  id: number;
  userNik: string;
  note: string;
  file: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface MedexItem {
  id: number;
  isConfirmed: boolean;
  institution: string;
  userNik: string;
  released: string;
  expired: string | null;
  examiner: string;
  file: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface IelpItem {
  id: number;
  isConfirmed: boolean;
  userNik: string;
  released: string;
  expired: string | null;
  rater: string;
  institution: string;
  level: string;
  file: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface CompetenceItem {
  id: number;
  userId: string;
  ratingId: number;
  competence?: string;
  institution: string;
  released: string;
  file: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface UserData {
  nik: string;
  licenseUserId: string;
  professionInBranchId: number;
  sectorId: number;
  branchId: number;
  branchUnitId: number;
  name: string;
  password: string;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  personalAddress: string | null;
  nationality: string | null;
  phoneNumber: string | null;
  genderId: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  ielp: IelpItem[];
  medex: MedexItem[];
  logbookUsers: LogbookItem[];
  license: LicenseItem[];
  competences: CompetenceItem[];
}

// ─── Props & Emits ────────────────────────────────────────────────────────
interface RatingItem {
  id: number;
  professionId: number;
  rating: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

const props = defineProps<{
  events: EventItem[];
  user: UserData | null;
  ratings: RatingItem[];
  ratingReal: RatingItem[];
}>();

const emit = defineEmits<{ applicationDocAdded: [] }>();

const open = ref(false);
const toast = useToast();
const loading = ref(false);

// ─── Form State ────────────────────────────────────────────────────────────
const selectedEventId = ref("");
const selectedEventUserId = ref("");
const selectedLicenseId = ref("");
const selectedLogbookId = ref("");

// ─── Computed Data from Props ─────────────────────────────────────────────
const eventOptions = computed(() => {
  return props.events.map((e) => {
    // Find the eventUser for the current user
    const eventUser = e.eventUsers?.find(
      (eu) => eu.userNik === props.user?.nik,
    );
    return {
      id: String(e.id),
      label: `${e.remarkDoc?.remark || ""} - ${e.event}`,
      remark: e.remarkDoc?.remark || "",
      event: e.event,
      eventUserId: eventUser ? String(eventUser.id) : null,
    };
  });
});

// Watch for event selection to set eventUserId
watch(selectedEventId, (newEventId) => {
  if (newEventId) {
    const selectedEvent = eventOptions.value.find((e) => e.id === newEventId);
    selectedEventUserId.value = selectedEvent?.eventUserId || "";
  } else {
    selectedEventUserId.value = "";
  }
});

const userData = computed(() => {
  if (!props.user) {
    return {
      nik: "",
      licenseUserId: "",
      name: "",
      dateOfBirth: null as string | null,
      placeOfBirth: null as string | null,
      personalAddress: null as string | null,
      nationality: null as string | null,
      phoneNumber: null as string | null,
      gender: { id: "", gender: "-" },
      license: [] as LicenseItem[],
      logbook: [] as LogbookItem[],
      ielp: [] as IelpItem[],
      medex: [] as MedexItem[],
      competence: [] as CompetenceItem[],
    };
  }

  return {
    nik: props.user.nik,
    licenseUserId: props.user.licenseUserId,
    name: props.user.name,
    dateOfBirth: props.user.dateOfBirth,
    placeOfBirth: props.user.placeOfBirth,
    personalAddress: props.user.personalAddress,
    nationality: props.user.nationality,
    phoneNumber: props.user.phoneNumber,
    gender: props.user.genderId
      ? {
          id: props.user.genderId,
          gender: `${props.user.genderId}` === "1" ? "LAKI-LAKI" : "PEREMPUAN",
        }
      : { id: "", gender: "-" },
    license: props.user.license || [],
    logbook: props.user.logbookUsers || [],
    ielp: props.user.ielp || [],
    medex: props.user.medex || [],
    competence: props.user.competences || [],
  };
});

const reasonOptions = [
  "Perpanjangan Rating",
  "Penambahan Rating",
  "Pindah Tugas",
  "Pengaktifan Rating Kembali",
  "Penugasan",
];

// Computed rating options from API - using ratingReal for item D (Jenis Rating)
const ratingOptions = computed(() => {
  return props.ratingReal.map((r) => ({
    id: r.id,
    rating: r.rating,
  }));
});

// All available ratings from the ratings prop (for item 9c - previous ratings selection)
const allRatingOptions = computed(() => {
  return props.ratings.map((r) => r.rating);
});

// Part 1
const atsName = ref("");
const address = ref("");
// Dynamic rating selections and control hours based on ratings
const selectedRatings = ref<Record<string, boolean>>({});
const controlHours = ref<Record<string, number | null>>({});
const selectedCheckerGroups = ref<Record<string, string[]>>({});

const selectedEvent = computed(() => {
  if (!selectedEventId.value) return null;
  return (
    props.events.find((e) => String(e.id) === selectedEventId.value) || null
  );
});

const selectedGroupMemberId = computed(() => {
  const event = selectedEvent.value;
  const targetNik = String(props.user?.nik || "").trim();
  if (!event || !targetNik) return "";

  const toArray = <T>(value: T | T[] | null | undefined): T[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  for (const eventUser of event.eventUsers || []) {
    const groups = [
      ...toArray((eventUser as any)?.event?.groups),
      ...toArray((eventUser as any)?.event?.group),
      ...toArray((event as any)?.groups),
      ...toArray((event as any)?.group),
    ];

    for (const group of groups) {
      const members = [
        ...toArray((group as any)?.groupMembers),
        ...toArray((group as any)?.groupMember),
      ];
      const match = members.find(
        (m: any) => String(m?.member || "").trim() === targetNik,
      );
      if (match?.id != null) return String(match.id);
    }
  }

  return "";
});

function getCheckerOptionsForRating(ratingId: number, ratingName?: string) {
  const options: { id: string; label: string }[] = [];
  const event = selectedEvent.value;
  const eventsSource = event ? [event] : props.events;
  if (!eventsSource?.length) return options;

  const seen = new Set<string>();
  const targetRatingId = Number(ratingId);
  const targetRatingName = String(ratingName || "").toUpperCase().trim();

  const toArray = <T>(value: T | T[] | null | undefined): T[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  eventsSource.forEach((eventItem) => {
    const eventUsers = toArray((eventItem as any)?.eventUsers);
    eventUsers.forEach((eventUser: any) => {
      const groupsFromEventUser = [
        ...toArray(eventUser?.event?.groups),
        ...toArray(eventUser?.event?.group),
        ...toArray(eventUser?.groups),
        ...toArray(eventUser?.group),
      ];
      const groupsFromEvent = [
        ...toArray((eventItem as any)?.groups),
        ...toArray((eventItem as any)?.group),
      ];
      const groups = [...groupsFromEventUser, ...groupsFromEvent];

      groups.forEach((group: any) => {
        const checkerGroups = [
          ...toArray(group?.checkerGroups),
          ...toArray(group?.checkerGroup),
          ...toArray(eventUser?.checkerGroups),
          ...toArray(eventUser?.checkerGroup),
        ];
        checkerGroups.forEach((checkerGroup: any) => {
          const userRoles = toArray(checkerGroup?.userChecker?.userRoles);
          const directCheckerRatings = toArray(checkerGroup?.userChecker?.checkerRatings);
          const allCheckerRatings = [
            ...directCheckerRatings,
            ...userRoles.flatMap((role: any) => toArray(role?.checkerRatings)),
          ];

          const matches = allCheckerRatings.some((checkerRating: any) => {
            const idMatches =
              Number(checkerRating?.rating?.id) === targetRatingId;
            const nameMatches =
              targetRatingName &&
              String(checkerRating?.rating?.rating || "")
                .toUpperCase()
                .trim() === targetRatingName;
            return idMatches || nameMatches;
          });

          if (!matches) return;

          const id = String(checkerGroup.id || "");
          if (!id || seen.has(id)) return;
          seen.add(id);

          options.push({
            id,
            label:
              checkerGroup?.userChecker?.name ||
              checkerGroup.name ||
              checkerGroup.groupName ||
              group?.group ||
              `GROUP ${group?.id || "-"}`,
          });
        });
      });
    });
  });

  return options;
}

function applyDefaultCheckersForRating(ratingId: number, ratingName?: string) {
  const ratingKey = String(ratingId);
  if (selectedCheckerGroups.value[ratingKey] !== undefined) return;

  const options = getCheckerOptionsForRating(ratingId, ratingName);
  if (!options.length) return;
  selectedCheckerGroups.value[ratingKey] = options.map((item) => item.id);
}

watch(
  selectedRatings,
  () => {
    ratingOptions.value.forEach((rating) => {
      const ratingKey = String(rating.id);
      if (selectedRatings.value[ratingKey]) {
        applyDefaultCheckersForRating(rating.id, rating.rating);
      } else if (selectedCheckerGroups.value[ratingKey] !== undefined) {
        delete selectedCheckerGroups.value[ratingKey];
      }
    });
  },
  { deep: true },
);

watch(selectedEventId, () => {
  ratingOptions.value.forEach((rating) => {
    const ratingKey = String(rating.id);
    if (!selectedRatings.value[ratingKey]) return;
    const options = getCheckerOptionsForRating(rating.id, rating.rating);
    selectedCheckerGroups.value[ratingKey] = options.map((item) => item.id);
  });
});

// Part 2
const confirmRating = ref<boolean | null>(null);
const reason = ref("");
const previousRatings = ref<string[]>([]);
const location = ref("");
const dateForExp = ref("");
const confirmOjt = ref<boolean | null>(null);
const letterNumber = ref("");
const letterDate = ref("");
const ojtControlHour = ref("");
const ojtId = ref("");
const ojtName = ref("");
const isDrugs = ref<boolean | null>(null);

// Part 4
const isFailed = ref<boolean | null>(null);

// Drugs popup
const showDrugsPopup = ref(false);

// ─── Computed ──────────────────────────────────────────────────────────────
const latestMedex = computed(() => {
  const list = userData.value?.medex || [];
  return list.length ? list[list.length - 1] : null;
});

const latestIelp = computed(() => {
  const list = userData.value?.ielp || [];
  return list.length ? list[list.length - 1] : null;
});

const isMedexValid = computed(() => {
  if (!latestMedex.value || !latestMedex.value.expired) return false;
  return new Date(latestMedex.value.expired) > new Date();
});

const isIelpValid = computed(() => {
  if (!latestIelp.value || !latestIelp.value.expired) return false;
  return new Date(latestIelp.value.expired) > new Date();
});

const medexRemainingDays = computed(() => {
  if (!latestMedex.value || !latestMedex.value.expired) return 0;
  const diff = new Date(latestMedex.value.expired).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
});

const ielpRemainingDays = computed(() => {
  if (!latestIelp.value || !latestIelp.value.expired) return 0;
  const diff = new Date(latestIelp.value.expired).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
});

const userAge = computed(() => {
  const dob = userData.value?.dateOfBirth;
  if (!dob) return 0;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
});

const canSubmit = computed(() => {
  if (
    !selectedEventUserId.value ||
    !selectedLicenseId.value ||
    !selectedLogbookId.value
  )
    return false;
  if (!atsName.value.trim() || !address.value.trim()) return false;

  // Check if at least one rating is selected
  const hasSelectedRating = ratingOptions.value.some(
    (rating) => selectedRatings.value[String(rating.id)],
  );
  if (!hasSelectedRating) return false;

  // Check if all selected ratings have valid control hours (min 40)
  for (const rating of ratingOptions.value) {
    const ratingKey = String(rating.id);
    if (selectedRatings.value[ratingKey]) {
      const hours = controlHours.value[ratingKey];
      if (!hours || hours < 40) return false;

      const checkerOptions = getCheckerOptionsForRating(
        rating.id,
        rating.rating,
      );
      if (
        checkerOptions.length > 0 &&
        (!selectedCheckerGroups.value[ratingKey] ||
          selectedCheckerGroups.value[ratingKey]!.length === 0)
      ) {
        return false;
      }
    }
  }

  if (!isMedexValid.value || !isIelpValid.value) return false;
  if (isDrugs.value === true) return false;
  if (isFailed.value === null) return false;
  return true;
});

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function resetForm() {
  selectedEventUserId.value = "";
  selectedLicenseId.value = "";
  selectedLogbookId.value = "";
  atsName.value = "";
  address.value = "";
  // Reset dynamic ratings
  selectedRatings.value = {};
  controlHours.value = {};
  selectedCheckerGroups.value = {};
  confirmRating.value = null;
  reason.value = "";
  previousRatings.value = [];
  location.value = "";
  dateForExp.value = "";
  confirmOjt.value = null;
  letterNumber.value = "";
  letterDate.value = "";
  ojtControlHour.value = "";
  ojtId.value = "";
  ojtName.value = "";
  isDrugs.value = null;
  isFailed.value = null;
  showDrugsPopup.value = false;
}

function onDrugsChange(val: boolean) {
  if (val === true) {
    showDrugsPopup.value = true;
  }
}

function onDrugsPopupConfirm() {
  showDrugsPopup.value = false;
  resetForm();
  open.value = false;
  toast.add({
    title: "Process Stopped",
    description:
      "The application cannot proceed due to prohibited drug use.",
    color: "error",
  });
}

function onDrugsPopupCancel() {
  showDrugsPopup.value = false;
  isDrugs.value = null;
}

async function onSubmit() {
  if (loading.value) return;

  if (!canSubmit.value) {
    toast.add({
      title: "Validation Failed",
      description: "Please complete all required fields.",
      color: "error",
    });
    return;
  }
  loading.value = true;
  try {
    // Build appRating dynamically from selected ratings
    const appRating = [];
    for (const rating of ratingOptions.value) {
      const ratingKey = String(rating.id);
      if (selectedRatings.value[ratingKey]) {
          appRating.push({
            rating: { id: String(rating.id), rating: rating.rating },
            controlHour: String(controlHours.value[ratingKey]),
            checkerGroupId: selectedCheckerGroups.value[ratingKey] || [],
          });
        }
      }

    await $fetch(`${apiBaseUrl}/api/applicationDocument`, {
      method: "POST",
      body: {
        eventId: selectedEventId.value,
        eventUserId: selectedEventUserId.value,
        groupMemberId: selectedGroupMemberId.value || null,
        licenseId: selectedLicenseId.value,
        logbookUserId: selectedLogbookId.value,
        atsName: atsName.value,
        address: address.value,
        appRating,
        confirmRating: confirmRating.value,
        reason: reason.value,
        ratings: previousRatings.value,
        location: location.value,
        dateForExpired: dateForExp.value,
        confirmOjt: confirmOjt.value,
        letterNumber: letterNumber.value,
        letterDate: letterDate.value,
        controlHour: ojtControlHour.value,
        ojtNik: ojtId.value,
        ojtName: ojtName.value,
        isDrugs: isDrugs.value,
        isFailed: isFailed.value,
        medexId: latestMedex.value?.id || null,
        ielpId: latestIelp.value?.id || null,
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: "Document sumbited successfully",
      color: "success",
    });
    resetForm();
    open.value = false;
    emit("applicationDocAdded");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error?.data?.statusMessage || "Failed to create the document.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <UButton
      label="Create Application"
      icon="i-lucide-plus"
      color="primary"
      @click="open = true"
    />

    <!-- Drugs Confirmation Popup -->
    <UModal v-model:open="showDrugsPopup" title="Warning">
      <template #description>
        <p class="text-sm">
          You are not allowed to proceed with this action. Are you sure?
        </p>
      </template>
      <template #body>
        <div class="flex justify-end gap-2">
          <UButton
            label="No"
            color="neutral"
            variant="subtle"
            @click="onDrugsPopupCancel"
          />
          <UButton
            label="Yes, Stop"
            color="error"
            variant="solid"
            @click="onDrugsPopupConfirm"
          />
        </div>
      </template>
    </UModal>

    <!-- Main Slideover -->
    <USlideover
      v-model:open="open"
      title="Create Application Document"
      :ui="{
        content: 'max-w-5xl',
      }"
    >
      <template #body>
        <div class="space-y-8 pb-24">
          <!-- ── DOKUMEN PENDUKUNG ──────────────────────────────────── -->
          <div
            class="bg-elevated/30 rounded-lg p-4 space-y-4 border border-default"
          >
            <h3
              class="font-semibold text-sm text-muted uppercase tracking-wide"
            >
              Supporting Documents
            </h3>
            <div class="grid grid-cols-1 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1"
                  >Event <span class="text-error">*</span></label
                >
                <USelect
                  v-model="selectedEventId"
                  :items="eventOptions"
                  value-key="id"
                  label-key="label"
                  placeholder="Select Event"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1"
                  >License <span class="text-error">*</span></label
                >
                <USelect
                  v-model="selectedLicenseId"
                  :items="
                    (userData?.license || []).map((l) => ({
                      id: String(l.id),
                      label: l.note,
                    }))
                  "
                  value-key="id"
                  label-key="label"
                  placeholder="Select License"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1"
                  >Logbook <span class="text-error">*</span></label
                >
                <USelect
                  v-model="selectedLogbookId"
                  :items="
                    (userData?.logbook || []).map((l) => ({
                      id: String(l.id),
                      label: l.note,
                    }))
                  "
                  value-key="id"
                  label-key="label"
                  placeholder="Select Logbook"
                  class="w-full"
                />
              </div>
            </div>
          </div>

          <!-- ── PART 1: JENIS PERMOHONAN RATING ───────────────────── -->
          <div class="space-y-4">
            <h2
              class="text-base font-bold border-b border-default pb-2 flex items-center gap-2"
            >
              <UIcon name="i-lucide-file-badge" class="text-primary" />
              I. RATING APPLICATION TYPE
            </h2>

            <div>
              <label class="block text-sm font-medium mb-1"
                >A. Rating Application Type
                <span class="text-error">*</span></label
              >
              <USelect
                v-model="selectedEventId"
                :items="eventOptions"
                value-key="id"
                label-key="label"
                placeholder="Select Application Type"
                class="w-full"
              />
              <p v-if="selectedEventId" class="text-xs text-muted mt-1">
                Remark:
                <strong>{{
                  eventOptions.find((e) => e.id === selectedEventId)?.remark
                }}</strong>
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1"
                >B. ATS Unit Name <span class="text-error">*</span></label
              >
              <UInput
                v-model="atsName"
                placeholder="e.g., ACC JAKARTA"
                class="w-full"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1"
                >C. Office Address <span class="text-error">*</span></label
              >
              <UInput
                v-model="address"
                placeholder="e.g., TOWER SOEKARNO HATTA"
                class="w-full"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2"
                >D. Jenis Rating <span class="text-error">*</span></label
              >
              <div class="space-y-3">
                <!-- Dynamic Rating Checkboxes based on ratings -->
                <div
                  v-for="rating in ratingOptions"
                  :key="rating.id"
                  class="border border-default rounded-lg p-3"
                >
                  <UCheckbox
                    v-model="selectedRatings[String(rating.id)]"
                    :label="rating.rating"
                  />
                  <div
                    v-if="selectedRatings[String(rating.id)]"
                    class="mt-3 ml-6 space-y-1"
                  >
                    <label class="block text-xs text-muted"
                      >Control Hours (min. 40 hours)</label
                    >
                    <UInput
                      v-model.number="controlHours[String(rating.id)]"
                      type="number"
                      placeholder="Enter control hours"
                      class="max-w-xs"
                    />
                    <p
                      v-if="
                        controlHours[String(rating.id)] != null &&
                        controlHours[String(rating.id)]! < 40
                      "
                      class="text-xs text-error"
                    >
                      ⚠ A minimum of 40 control hours is required to proceed
                    </p>
                    <p
                      v-else-if="
                        controlHours[String(rating.id)] != null &&
                        controlHours[String(rating.id)]! >= 40
                      "
                      class="text-xs text-success"
                    >
                      ✓ Jam pemanduan memenuhi syarat
                    </p>
                    <div
                      v-if="getCheckerOptionsForRating(rating.id, rating.rating).length"
                      class="pt-2"
                    >
                      <label class="block text-xs text-muted mb-1">
                        Checker Available
                      </label>
                      <USelect
                        v-model="selectedCheckerGroups[String(rating.id)]"
                        :items="getCheckerOptionsForRating(rating.id, rating.rating)"
                        value-key="id"
                        label-key="label"
                        placeholder="Select checker group(s)"
                        class="max-w-xs"
                        multiple
                      />
                    </div>
                    <p v-else class="text-xs text-warning pt-2">
                      No checker is available for rating {{ rating.rating }}.
                    </p>
                  </div>
                </div>
                <p
                  v-if="ratingOptions.length === 0"
                  class="text-sm text-muted italic"
                >
                  No ratings available
                </p>
              </div>
            </div>
          </div>

          <!-- ── PART 2: INFORMASI PEMOHON ──────────────────────────── -->
          <div class="space-y-4">
            <h2
              class="text-base font-bold border-b border-default pb-2 flex items-center gap-2"
            >
              <UIcon name="i-lucide-user" class="text-primary" />
              II. APPLICANT INFORMATION
            </h2>

            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="block text-sm font-medium mb-1">1. Name</label>
                <UInput :model-value="userData.name" disabled class="w-full" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1"
                  >2. License Number</label
                >
                <UInput
                  :model-value="userData.licenseUserId"
                  disabled
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1"
                  >3. Date of Birth</label
                >
                <div class="flex items-center gap-2">
                  <UInput
                    :model-value="formatDate(userData.dateOfBirth)"
                    disabled
                    class="flex-1"
                  />
                  <UBadge
                    color="info"
                    variant="subtle"
                    :label="`${userAge} thn`"
                  />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1"
                  >4. Tempat Lahir</label
                >
                <UInput
                  :model-value="userData.placeOfBirth"
                  disabled
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1"
                  >5. Residential Address</label
                >
                <UInput
                  :model-value="userData.personalAddress"
                  disabled
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1"
                  >6. Kebangsaan</label
                >
                <UInput
                  :model-value="userData.nationality"
                  disabled
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1"
                  >7. No Handphone</label
                >
                <UInput
                  :model-value="userData.phoneNumber"
                  disabled
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1"
                  >8. Jenis Kelamin</label
                >
                <UInput
                  :model-value="userData.gender.gender"
                  disabled
                  class="w-full"
                />
              </div>
            </div>

            <!-- 9a. Rating Sebelumnya -->
            <div class="border border-default rounded-lg p-4 space-y-3">
              <label class="block text-sm font-semibold"
                >9a. Have you held a rating before?</label
              >
              <div class="flex gap-6">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    :value="true"
                    v-model="confirmRating"
                    class="accent-primary"
                  />
                  <span class="text-sm">Yes</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    :value="false"
                    v-model="confirmRating"
                    class="accent-primary"
                  />
                  <span class="text-sm">No</span>
                </label>
              </div>

              <div
                v-if="confirmRating === true"
                class="space-y-4 pl-4 border-l-2 border-primary/50"
              >
                <div>
                  <label class="block text-sm font-medium mb-2"
                    >9b. Reason for Rating Application</label
                  >
                  <div class="space-y-2">
                    <label
                      v-for="opt in reasonOptions"
                      :key="opt"
                      class="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        :value="opt"
                        v-model="reason"
                        class="accent-primary"
                      />
                      <span class="text-sm">{{ opt }}</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium mb-2"
                    >9c. Rating Type (Select one or more)</label
                  >
                  <div class="space-y-2">
                    <label
                      v-for="rating in allRatingOptions"
                      :key="rating"
                      class="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        :value="rating"
                        v-model="previousRatings"
                        class="accent-primary"
                      />
                      <span class="text-sm">{{ rating }}</span>
                    </label>
                  </div>
                  <p
                    v-if="previousRatings.length > 0"
                    class="text-xs text-muted mt-2"
                  >
                    Selected: {{ previousRatings.join(", ") }}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1"
                    >9d. Rating Location</label
                  >
                  <UInput
                    v-model="location"
                    placeholder="e.g., JATSC"
                    class="max-w-xs"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1"
                    >9e. Masa Berlaku Rating</label
                  >
                  <UInput v-model="dateForExp" type="date" class="max-w-xs" />
                </div>
              </div>
            </div>

            <!-- 10. Medex -->
            <div
              class="border rounded-lg p-4 space-y-3"
              :class="
                isMedexValid
                  ? 'border-success/40 bg-success/5'
                  : 'border-error/40 bg-error/5'
              "
            >
              <div class="flex items-center justify-between">
                <label class="block text-sm font-semibold"
                  >10a. Sertifikat Kesehatan (Medex)</label
                >
                <UBadge
                  :color="isMedexValid ? 'success' : 'error'"
                  :label="isMedexValid ? 'Valid' : 'Expired / Unavailable'"
                />
              </div>
              <p v-if="!isMedexValid" class="text-sm text-error font-medium">
                ⚠ Your medical examination has expired or is unavailable. The application cannot
                proceed.
              </p>
              <div v-if="latestMedex" class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-muted text-xs">10b. Date Issued</p>
                  <p class="font-medium">
                    {{ formatDate(latestMedex.released) }}
                  </p>
                </div>
                <div>
                  <p class="text-muted text-xs">Expiry Date</p>
                  <p
                    class="font-medium"
                    :class="isMedexValid ? 'text-success' : 'text-error'"
                  >
                    {{ formatDate(latestMedex.expired) }}
                  </p>
                </div>
                <div class="col-span-2">
                  <p class="text-muted text-xs">Sisa Masa Berlaku</p>
                  <p
                    class="font-medium"
                    :class="
                      medexRemainingDays > 90
                        ? 'text-success'
                        : medexRemainingDays > 0
                          ? 'text-warning'
                          : 'text-error'
                    "
                  >
                    {{
                      medexRemainingDays > 0
                        ? `${medexRemainingDays} days remaining`
                        : "Sudah expired"
                    }}
                  </p>
                </div>
                <div>
                  <p class="text-muted text-xs">10c. Medical Examiner Name</p>
                  <p class="font-medium">{{ latestMedex.examiner }}</p>
                </div>
                <div>
                  <p class="text-muted text-xs">File Medex</p>
                  <UButton
                    v-if="latestMedex.file"
                    size="xs"
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-file-text"
                    label="Preview"
                    class="mt-1"
                  />
                  <p v-else class="text-xs text-muted italic mt-1">
                    No file available
                  </p>
                </div>
              </div>
              <p v-else class="text-sm text-muted italic">
                No medical examination data available
              </p>
            </div>

            <!-- 11. IELP -->
            <div
              class="border rounded-lg p-4 space-y-3"
              :class="
                isIelpValid
                  ? 'border-success/40 bg-success/5'
                  : 'border-error/40 bg-error/5'
              "
            >
              <div class="flex items-center justify-between">
                <label class="block text-sm font-semibold"
                  >11a. ICAO Language Proficiency (IELP)</label
                >
                <UBadge
                  :color="isIelpValid ? 'success' : 'error'"
                  :label="isIelpValid ? 'Valid' : 'Expired / Unavailable'"
                />
              </div>
              <p v-if="!isIelpValid" class="text-sm text-error font-medium">
                ⚠ Your IELP has expired or is unavailable. The application cannot
                proceed.
              </p>
              <div v-if="latestIelp" class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-muted text-xs">11b. Rater Name</p>
                  <p class="font-medium">{{ latestIelp.rater }}</p>
                </div>
                <div>
                  <p class="text-muted text-xs">11c. Lembaga Pelatihan</p>
                  <p class="font-medium">{{ latestIelp.institution }}</p>
                </div>
                <div>
                  <p class="text-muted text-xs">11d. Date Issued</p>
                  <p class="font-medium">
                    {{ formatDate(latestIelp.released) }}
                  </p>
                </div>
                <div>
                  <p class="text-muted text-xs">11e. Level</p>
                  <p class="font-medium">Level {{ latestIelp.level }}</p>
                </div>
                <div>
                  <p class="text-muted text-xs">Expiry Date</p>
                  <p
                    class="font-medium"
                    :class="isIelpValid ? 'text-success' : 'text-error'"
                  >
                    {{ formatDate(latestIelp.expired) }}
                  </p>
                </div>
                <div>
                  <p class="text-muted text-xs">Sisa Masa Berlaku</p>
                  <p
                    class="font-medium"
                    :class="
                      ielpRemainingDays > 90
                        ? 'text-success'
                        : ielpRemainingDays > 0
                          ? 'text-warning'
                          : 'text-error'
                    "
                  >
                    {{
                      ielpRemainingDays > 0
                        ? `${ielpRemainingDays} days remaining`
                        : "Sudah expired"
                    }}
                  </p>
                </div>
                <div class="col-span-2">
                  <p class="text-muted text-xs">File IELP</p>
                  <UButton
                    v-if="latestIelp.file"
                    size="xs"
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-file-text"
                    label="Preview"
                    class="mt-1"
                  />
                  <p v-else class="text-xs text-muted italic mt-1">
                    No file available
                  </p>
                </div>
              </div>
              <p v-else class="text-sm text-muted italic">
                No IELP data available
              </p>
            </div>

            <!-- 12a. OJT -->
            <div class="border border-default rounded-lg p-4 space-y-3">
              <label class="block text-sm font-semibold">
                12a. Do you have an OJTI recommendation letter?
                <span class="text-xs text-muted font-normal ml-1"
                  >(Select YES when applying for a rating)</span
                >
              </label>
              <div class="flex gap-6">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    :value="true"
                    v-model="confirmOjt"
                    class="accent-primary"
                  />
                  <span class="text-sm">Yes</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    :value="false"
                    v-model="confirmOjt"
                    class="accent-primary"
                  />
                  <span class="text-sm">No</span>
                </label>
              </div>
              <div
                v-if="confirmOjt === true"
                class="space-y-3 pl-4 border-l-2 border-primary/50"
              >
                <div>
                  <label class="block text-sm font-medium mb-1"
                    >12b. Letter Number</label
                  >
                  <UInput
                    v-model="letterNumber"
                    placeholder="Recommendation letter number"
                    class="w-full"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1"
                    >12c. Letter Date</label
                  >
                  <UInput v-model="letterDate" type="date" class="max-w-xs" />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1"
                    >12d. Jumlah Jam Pemanduan</label
                  >
                  <UInput
                    v-model="ojtControlHour"
                    placeholder="Total control hours"
                    class="max-w-xs"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1"
                    >12e. OJTI License Number</label
                  >
                  <UInput
                    v-model="ojtId"
                    placeholder="OJTI license number"
                    class="max-w-xs"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1"
                    >12f. OJTI Name</label
                  >
                  <UInput
                    v-model="ojtName"
                    placeholder="OJTI name"
                    class="max-w-xs"
                  />
                </div>
              </div>
            </div>

            <!-- 13. Drugs -->
            <div class="border border-default rounded-lg p-4 space-y-3">
              <label
                class="block text-sm font-semibold text-sm leading-relaxed"
              >
                13. Have you been involved in a violation caused by
                prohibited drugs, marijuana, antidepressants, stimulants, or
                operating a motor vehicle under the influence of alcohol?
              </label>
              <div class="flex gap-6">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    :value="true"
                    v-model="isDrugs"
                    class="accent-primary"
                    @change="onDrugsChange(true)"
                  />
                  <span class="text-sm text-error font-medium">Yes</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    :value="false"
                    v-model="isDrugs"
                    class="accent-primary"
                  />
                  <span class="text-sm">No</span>
                </label>
              </div>
            </div>
          </div>

          <!-- ── PART 3: SERTIFIKASI KOMPETENSI ─────────────────────── -->
          <div class="space-y-4">
            <h2
              class="text-base font-bold border-b border-default pb-2 flex items-center gap-2"
            >
              <UIcon name="i-lucide-award" class="text-primary" />
              III. COMPETENCY CERTIFICATIONS HELD
            </h2>
            <div class="space-y-2">
              <div
                v-for="comp in userData.competence"
                :key="comp.id"
                class="flex items-center justify-between border border-default rounded-lg px-4 py-3"
              >
                <div class="flex items-center gap-3">
                  <UBadge
                    color="primary"
                    variant="subtle"
                    :label="comp.competence"
                  />
                  <span class="text-sm font-medium">{{
                    comp.institution
                  }}</span>
                </div>
                <span class="text-xs text-muted">{{
                  formatDate(comp.released)
                }}</span>
              </div>
              <p
                v-if="!userData.competence.length"
                class="text-sm text-muted italic"
              >
                No competency data available
              </p>
            </div>
          </div>

          <!-- ── PART 4: PERNAH GAGAL UJIAN ─────────────────────────── -->
          <div class="space-y-4">
            <h2
              class="text-base font-bold border-b border-default pb-2 flex items-center gap-2"
            >
              <UIcon name="i-lucide-clipboard-x" class="text-primary" />
              IV. EXAMINATION HISTORY
            </h2>
            <div class="border border-default rounded-lg p-4 space-y-3">
              <label class="block text-sm font-semibold">
                Have you failed an examination within the previous 30
                days?
              </label>
              <div class="flex gap-6">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    :value="true"
                    v-model="isFailed"
                    class="accent-primary"
                  />
                  <span class="text-sm">Yes</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    :value="false"
                    v-model="isFailed"
                    class="accent-primary"
                  />
                  <span class="text-sm">No</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            label="Submit Application"
            color="primary"
            variant="solid"
            icon="i-lucide-send"
            :loading="loading"
            :disabled="loading || !canSubmit"
            @click="onSubmit"
          />
        </div>
      </template>
    </USlideover>
  </div>
</template>



