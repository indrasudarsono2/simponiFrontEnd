<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

const { token } = useAuth();

defineOptions({ name: "ApplicationDocUpdateModal" });

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
            name?: string;
            checkerRatings?: {
              rating?: {
                id?: number;
                rating?: string;
              } | null;
            }[];
            userRoles?: {
              checkerRatings?: {
                rating?: {
                  id?: number;
                  rating?: string;
                } | null;
              }[];
            }[];
          } | null;
        }[];
      }[];
      group?: {
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
            name?: string;
            checkerRatings?: {
              rating?: {
                id?: number;
                rating?: string;
              } | null;
            }[];
            userRoles?: {
              checkerRatings?: {
                rating?: {
                  id?: number;
                  rating?: string;
                } | null;
              }[];
            }[];
          } | null;
        }[];
      } | null;
    } | null;
  }[];
}

interface RatingItem {
  id: number;
  professionId: number;
  rating: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface AppRating {
  id?: number;
  rating: { id: number; rating: string };
  controlHour: string;
  checkerGroupId?: string[] | string | number[] | number | null;
  practicalTests?: {
    kindOfPractical?: {
      kind?: string;
    } | null;
    checkerGroup?: {
      id?: number;
      userChecker?: {
        name?: string;
      } | null;
    } | null;
  }[];
  statusId?: number;
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

interface ApplicationDoc {
  id: number;
  doc?: string | null;
  number: string;
  eventUserId?: number;
  userNik?: string;
  statusId?: number;
  medexId?: number;
  ielpId?: number;
  briefingDate?: string | null;
  confirmRating?: boolean;
  reason?: string;
  location?: string;
  rating?: string;
  dateForExpired?: string;
  confirmOjt?: boolean;
  ojtNik?: string | null;
  letterNumber?: string | null;
  letterDate?: string | null;
  controlHour?: string | null;
  atsName?: string;
  address?: string;
  isDrugs?: boolean;
  isFailed?: boolean;
  licenseId?: number;
  logbookUserId?: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  eventUser?: {
    id: number;
    eventId: number;
    userNik: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    event?: {
      id: number;
      sessionId: number;
      sectorId: number;
      remarkDocId: number;
      event: string;
      formFillingDate: string;
      startDate: string;
      finishDate: string;
      forExpiredDate: string;
      briefingFile: string;
      passingGrade: number;
      isPractical: boolean;
      isSimulator: boolean;
      createdAt: string;
      updatedAt: string;
      deletedAt: string | null;
      remarkDoc?: {
        remark: string;
      };
    };
  };
  medex?: {
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
  };
  ielp?: {
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
  };
  status?: {
    id: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  appRatings?: AppRating[];
}

const props = defineProps<{
  applicationDoc: ApplicationDoc | null;
  events: EventItem[];
  ratings: RatingItem[];
  ratingReal: RatingItem[];
  user: UserData | null;
}>();

const emit = defineEmits<{
  applicationDocUpdated: [];
  close: [];
}>();

const open = ref(false);
const toast = useToast();
const loading = ref(false);

// ─── Computed User Data from API ─────────────────────────────────────────
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
      license: [] as any[],
      logbook: [] as any[],
      ielp: [] as any[],
      medex: [] as any[],
      competence: [] as any[],
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

// Computed event options from API
const eventOptions = computed(() => {
  const options = props.events.map((e) => {
    // Find the eventUser for the current user (using userData.value.nik)
    const eventUser = e.eventUsers?.find(
      (eu) => eu.userNik === userData.value.nik,
    );
    return {
      id: String(e.id),
      label: `${e.remarkDoc?.remark || ""} - ${e.event}`,
      remark: e.remarkDoc?.remark || "",
      event: e.event,
      eventUserId: eventUser ? String(eventUser.id) : null,
    };
  });

  // If the current applicationDoc's event is not in the list, add it
  const currentEvent = props.applicationDoc?.eventUser?.event;
  if (currentEvent) {
    const eventId = String(currentEvent.id);
    const exists = options.some((o) => o.id === eventId);
    if (!exists) {
      options.unshift({
        id: eventId,
        label: `${currentEvent.remarkDoc?.remark || ""} - ${currentEvent.event}`,
        remark: currentEvent.remarkDoc?.remark || "",
        event: currentEvent.event,
        eventUserId: String(props.applicationDoc.eventUser?.id),
      });
    }
  }

  return options;
});

const reasonOptions = [
  "Perpanjangan Rating",
  "Penambahan Rating",
  "Pindah Tugas",
  "Pengaktifan Rating Kembali",
  "Penugasan",
];

// D. Jenis Rating should follow current applicationDoc.appRatings only
const ratingOptions = computed(() => {
  const appRatings = props.applicationDoc?.appRatings || [];
  const seen = new Set<string>();
  const options: string[] = [];

  appRatings.forEach((item) => {
    const code = String(item?.rating?.rating || "").trim();
    if (!code) return;
    const key = code.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    options.push(code);
  });

  return options;
});

// ─── Form State (initialized from props) ─────────────────────────────────
const selectedEventUserId = ref("");
const selectedLicenseId = ref("");
const selectedLogbookId = ref("");

const atsName = ref("");
const address = ref("");
// Dynamic rating selections - key is rating string (e.g., "ACP", "ACS", "APP")
const selectedRatings = ref<Record<string, boolean>>({});
const ratingControlHours = ref<Record<string, number | undefined>>({});
const selectedCheckerGroups = ref<Record<string, string[]>>({});

const selectedEvent = computed(() => {
  return (
    props.events.find((e) => String(e.id) === selectedEventUserId.value) || null
  );
});

const selectedGroupMemberId = computed(() => {
  const event = selectedEvent.value;
  const targetNik = String(props.user?.nik || "").trim();
  if (!event || !targetNik) return "";

  const toArray = <T,>(value: T | T[] | null | undefined): T[] => {
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

function getCheckerOptionsForRating(ratingCode: string) {
  const options: { id: string; label: string }[] = [];
  const targetCode = String(ratingCode || "")
    .toUpperCase()
    .trim();
  const toArray = <T,>(value: T | T[] | null | undefined): T[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  // Prefer checkers directly related to this document's appRatings
  const seenFromAppRatings = new Set<string>();
  const appRatings = props.applicationDoc?.appRatings || [];
  appRatings.forEach((appRating) => {
    const code = String(appRating?.rating?.rating || "")
      .toUpperCase()
      .trim();
    if (code !== targetCode) return;

    toArray(appRating?.practicalTests).forEach((test: any, index: number) => {
      const checkerGroupId = test?.checkerGroup?.id;
      const checkerName = String(test?.checkerGroup?.userChecker?.name || "").trim();
      if (!checkerName) return;
      const id =
        checkerGroupId != null && checkerGroupId !== ""
          ? String(checkerGroupId)
          : `${targetCode}-${checkerName}-${index}`;
      if (seenFromAppRatings.has(id)) return;
      seenFromAppRatings.add(id);

      const kind = String(test?.kindOfPractical?.kind || "").trim();
      options.push({
        id,
        label: kind ? `${checkerName} (${kind})` : checkerName,
      });
    });
  });
  if (options.length > 0) return options;

  const event = selectedEvent.value;
  const eventsSource: any[] = [];
  if (event) eventsSource.push(event);
  if (props.applicationDoc?.eventUser?.event) {
    eventsSource.push(props.applicationDoc.eventUser.event);
  }
  if (!eventsSource.length) {
    eventsSource.push(...(props.events || []));
  }
  if (!eventsSource.length) return options;

  const targetId =
    props.ratings.find((r) => r.rating === ratingCode)?.id ??
    props.ratingReal.find((r) => r.rating === ratingCode)?.id;
  const seen = new Set<string>();

  const collectCheckerGroupsDeep = (root: any) => {
    const result: any[] = [];
    const queue: any[] = [root];
    const visited = new Set<any>();

    while (queue.length) {
      const node = queue.shift();
      if (!node || typeof node !== "object") continue;
      if (visited.has(node)) continue;
      visited.add(node);

      const direct = [
        ...toArray((node as any)?.checkerGroups),
        ...toArray((node as any)?.checkerGroup),
      ];
      direct.forEach((cg) => {
        if (cg && typeof cg === "object") result.push(cg);
      });

      Object.values(node).forEach((value) => {
        if (value && typeof value === "object") queue.push(value);
      });
    }

    return result;
  };

  eventsSource.forEach((eventItem: any) => {
    const checkerGroups = collectCheckerGroupsDeep(eventItem);

    checkerGroups.forEach((checkerGroup: any) => {
      const userRoles = toArray(checkerGroup?.userChecker?.userRoles);
      const directCheckerRatings = toArray(
        checkerGroup?.userChecker?.checkerRatings,
      );
      const checkerRatings = [
        ...directCheckerRatings,
        ...userRoles.flatMap((role: any) => toArray(role?.checkerRatings)),
      ];

      const matches = checkerRatings.some((checkerRating: any) => {
        const ratingId = Number(checkerRating?.rating?.id);
        const ratingText = String(
          checkerRating?.rating?.rating || "",
        ).toUpperCase();
        return (
          (targetId != null && ratingId === Number(targetId)) ||
          ratingText === targetCode
        );
      });

      if (!matches) return;
      const id = String(checkerGroup?.id || "");
      if (!id || seen.has(id)) return;
      seen.add(id);

      options.push({
        id,
        label:
          checkerGroup?.userChecker?.name ||
          checkerGroup?.name ||
          checkerGroup?.groupName ||
          `Checker ${id}`,
      });
    });
  });

  return options;
}

function getPracticalSummaryForRating(ratingCode: string) {
  const appRatings = props.applicationDoc?.appRatings || [];
  const target = appRatings.find((item) => item.rating?.rating === ratingCode);
  const tests = target?.practicalTests || [];

  return tests.map((test) => ({
    kind: test?.kindOfPractical?.kind || "-",
    checkerName: test?.checkerGroup?.userChecker?.name || "-",
  }));
}

function applyDefaultCheckersForRating(ratingCode: string) {
  if (selectedCheckerGroups.value[ratingCode] !== undefined) return;
  const options = getCheckerOptionsForRating(ratingCode);
  if (!options.length) return;
  selectedCheckerGroups.value[ratingCode] = options.map((o) => o.id);
}

const isConfirmRating = ref<boolean | null>(null);
const reason = ref("");
const previousRatings = ref<string[]>([]);
const location = ref("");
const dateForExp = ref("");
const confirmOjt = ref<boolean | null>(null);
const letterNumber = ref("");
const letterDate = ref("");
const ojtControlHour = ref<number | null>(null);
const ojtId = ref("");
const ojtName = ref("");
const isDrugs = ref<boolean | null>(null);
const isFailed = ref<boolean | null>(null);

const showDrugsPopup = ref(false);

// Watch for prop changes
watch(
  () => props.applicationDoc,
  (doc) => {
    if (doc) {
      // Use eventId from eventUser.event for proper display
      // Need to wait for events to be loaded
      nextTick(() => {
        selectedEventUserId.value = doc.eventUser?.eventId
          ? String(doc.eventUser.eventId)
          : "";
      });
      selectedLicenseId.value = doc.licenseId ? String(doc.licenseId) : "";
      selectedLogbookId.value = doc.logbookUserId
        ? String(doc.logbookUserId)
        : "";

      atsName.value = doc.atsName || "";
      address.value = doc.address || "";

      // Initialize dynamic rating selections from appRatings
      // Reset first
      selectedRatings.value = {};
      ratingControlHours.value = {};
      selectedCheckerGroups.value = {};

      // Populate from appRatings - handles any rating (APP, ACP, ACS, TWR, etc.)
      doc.appRatings?.forEach((appRating: AppRating) => {
        const ratingCode = appRating.rating.rating; // e.g., "APP", "ACP", "ACS"
        selectedRatings.value[ratingCode] = true;
        ratingControlHours.value[ratingCode] =
          Number(appRating.controlHour) || undefined;
        const checkerRaw = appRating.checkerGroupId;
        if (Array.isArray(checkerRaw)) {
          selectedCheckerGroups.value[ratingCode] = checkerRaw.map((id) =>
            String(id),
          );
        } else if (checkerRaw != null && checkerRaw !== "") {
          selectedCheckerGroups.value[ratingCode] = [String(checkerRaw)];
        }
      });

      isConfirmRating.value = doc.confirmRating ?? null;
      reason.value = doc.reason || "";
      // Parse rating string into array for section 9c (e.g., "ACP, ACS" -> ["ACP", "ACS"])
      // This ONLY uses applicationDoc.rating, not appRatings
      if (doc.rating && doc.rating.trim()) {
        try {
          const parsed = JSON.parse(doc.rating);
          if (Array.isArray(parsed)) {
            previousRatings.value = parsed
              .map((r) => String(r).trim())
              .filter((r) => r);
          } else {
            previousRatings.value = doc.rating
              .split(",")
              .map((r) => r.replace(/^\[?"?|"?\]?$/g, "").trim())
              .filter((r) => r);
          }
        } catch {
          previousRatings.value = doc.rating
            .split(",")
            .map((r) => r.replace(/^\[?"?|"?\]?$/g, "").trim())
            .filter((r) => r);
        }
      } else {
        previousRatings.value = [];
      }
      location.value = doc.location || "";
      // Format dateForExpired to YYYY-MM-DD for UInput type="date"
      dateForExp.value = doc.dateForExpired
        ? (new Date(doc.dateForExpired).toISOString().split("T")[0] ?? "")
        : "";
      confirmOjt.value = doc.confirmOjt ?? null;

      letterNumber.value = doc.letterNumber || "";
      letterDate.value = doc.letterDate || "";
      ojtControlHour.value = doc.controlHour ? Number(doc.controlHour) : null;
      ojtId.value = doc.ojtNik || "";
      ojtName.value = "";
      isDrugs.value = doc.isDrugs ?? null;
      isFailed.value = doc.isFailed ?? null;

      open.value = true;
    }
  },
  { immediate: true },
);

watch(open, (isOpen) => {
  if (!isOpen) emit("close");
});

watch(
  selectedRatings,
  () => {
    Object.entries(selectedRatings.value).forEach(
      ([ratingCode, isSelected]) => {
        if (isSelected) {
          applyDefaultCheckersForRating(ratingCode);
        } else if (selectedCheckerGroups.value[ratingCode] !== undefined) {
          delete selectedCheckerGroups.value[ratingCode];
        }
      },
    );
  },
  { deep: true },
);

watch(selectedEventUserId, () => {
  Object.entries(selectedRatings.value).forEach(([ratingCode, isSelected]) => {
    if (!isSelected) return;
    const options = getCheckerOptionsForRating(ratingCode);
    selectedCheckerGroups.value[ratingCode] = options.map((item) => item.id);
  });
});

// Watch for events to be loaded and set the selected value
watch(
  () => props.events,
  (events) => {
    if (events.length > 0 && props.applicationDoc?.eventUser?.eventId) {
      selectedEventUserId.value = String(
        props.applicationDoc.eventUser.eventId,
      );
    }
  },
  { immediate: true },
);

// ─── Computed ──────────────────────────────────────────────────────────────
const latestMedex = computed(
  () => userData.value.medex[userData.value.medex.length - 1],
);
const latestIelp = computed(
  () => userData.value.ielp[userData.value.ielp.length - 1],
);

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
  return Math.ceil(
    (new Date(latestMedex.value.expired).getTime() - Date.now()) / 86400000,
  );
});

const ielpRemainingDays = computed(() => {
  if (!latestIelp.value || !latestIelp.value.expired) return 0;
  return Math.ceil(
    (new Date(latestIelp.value.expired).getTime() - Date.now()) / 86400000,
  );
});

const userAge = computed(() => {
  const birth = new Date(userData.value.dateOfBirth || "");
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
  const hasSelectedRating = Object.values(selectedRatings.value).some((v) => v);
  if (!hasSelectedRating) return false;

  // Check all selected ratings have valid control hours (min 40)
  for (const [rating, isSelected] of Object.entries(selectedRatings.value)) {
    if (isSelected) {
      const hours = ratingControlHours.value[rating];
      if (!hours || hours < 40) return false;
      const checkerOptions = getCheckerOptionsForRating(rating);
      const selectedCheckers = selectedCheckerGroups.value[rating] || [];
      if (checkerOptions.length > 0 && selectedCheckers.length === 0) {
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
function formatDate(d: string | null | undefined) {
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
  ratingControlHours.value = {};
  selectedCheckerGroups.value = {};
  isConfirmRating.value = null;
  reason.value = "";
  previousRatings.value = [];
  location.value = "";
  dateForExp.value = "";
  confirmOjt.value = null;
  letterNumber.value = "";
  letterDate.value = "";
  ojtControlHour.value = null;
  ojtId.value = "";
  ojtName.value = "";
  isDrugs.value = null;
  isFailed.value = null;
  showDrugsPopup.value = false;
}

function onDrugsChange(val: boolean) {
  if (val === true) showDrugsPopup.value = true;
}

function onDrugsPopupConfirm() {
  showDrugsPopup.value = false;
  resetForm();
  open.value = false;
  toast.add({
    title: "Proses Dihentikan",
    description: "Permohonan tidak dapat dilanjutkan.",
    color: "error",
  });
}

function onDrugsPopupCancel() {
  showDrugsPopup.value = false;
  isDrugs.value = null;
}

async function onSubmit() {
  if (!props.applicationDoc || !canSubmit.value) return;
  loading.value = true;
  try {
    const eventIdNumber = selectedEventUserId.value
      ? Number(selectedEventUserId.value)
      : null;

    const selectedEvent = eventOptions.value.find(
      (e) => e.id === selectedEventUserId.value,
    );
    const eventUserIdNumber = selectedEvent?.eventUserId
      ? Number(selectedEvent.eventUserId)
      : null;

    const licenseIdNumber = selectedLicenseId.value
      ? Number(selectedLicenseId.value)
      : null;

    const logbookUserIdNumber = selectedLogbookId.value
      ? Number(selectedLogbookId.value)
      : null;

    // Build appRating dynamically from selectedRatings
    const appRating: {
      rating: { id: string; rating: string };
      controlHour: string;
    }[] = [];

    // Iterate through all selected ratings and build the payload
    for (const [ratingCode, isSelected] of Object.entries(
      selectedRatings.value,
    )) {
      if (isSelected) {
        const ratingMeta = props.ratings.find((r) => r.rating === ratingCode);
        const controlHour = ratingControlHours.value[ratingCode];

        if (ratingMeta && controlHour !== null && controlHour !== undefined) {
          appRating.push({
            rating: { id: String(ratingMeta.id), rating: ratingCode },
            controlHour: String(controlHour),
          });
        }
      }
    }

    const payload = {
      eventId: eventIdNumber,
      eventUserId: eventUserIdNumber,
      groupMemberId: selectedGroupMemberId.value || null,
      licenseId: licenseIdNumber,
      logbookUserId: logbookUserIdNumber,
      atsName: atsName.value,
      address: address.value,
      appRating,
      confirmRating: isConfirmRating.value,
      reason: reason.value,
      ratings: previousRatings.value.length ? [...previousRatings.value] : [],
      location: location.value,
      dateForExpired: dateForExp.value,
      confirmOjt: confirmOjt.value,
      letterNumber: letterNumber.value,
      letterDate: letterDate.value,
      controlHour:
        ojtControlHour.value !== null ? String(ojtControlHour.value) : null,
      ojtNik: ojtId.value || null,
      isDrugs: isDrugs.value,
      isFailed: isFailed.value,
      medexId: props.applicationDoc.medexId ?? null,
      ielpId: props.applicationDoc.ielpId ?? null,
    };

    await $fetch(
      `${apiBaseUrl}/api/applicationDocument/${props.applicationDoc.id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
        body: payload,
      },
    );

    toast.add({
      title: "Success",
      description: "Document edited successfully",
      color: "success",
    });
    open.value = false;
    emit("applicationDocUpdated");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        "Gagal memperbarui dokumen.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <!-- Drugs Confirmation Popup -->
    <UModal v-model:open="showDrugsPopup" title="Peringatan">
      <template #description>
        <p class="text-sm">
          Anda tidak diperbolehkan melakukan tindakan ini. Apakah anda yakin?
        </p>
      </template>
      <template #body>
        <div class="flex justify-end gap-2">
          <UButton
            label="Tidak"
            color="neutral"
            variant="subtle"
            @click="onDrugsPopupCancel"
          />
          <UButton
            label="Ya, Hentikan"
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
      title="Edit Dokumen Permohonan"
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
              Dokumen Pendukung
            </h3>
            <div class="grid grid-cols-1 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1"
                  >Event <span class="text-error">*</span></label
                >
                <USelect
                  v-model="selectedEventUserId"
                  :items="eventOptions"
                  value-key="id"
                  label-key="label"
                  placeholder="Pilih Event"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1"
                  >Lisensi <span class="text-error">*</span></label
                >
                <USelect
                  v-model="selectedLicenseId"
                  :items="
                    userData.license.map((l) => ({
                      id: String(l.id),
                      label: l.note,
                    }))
                  "
                  value-key="id"
                  label-key="label"
                  placeholder="Pilih Lisensi"
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
                    userData.logbook.map((l) => ({
                      id: String(l.id),
                      label: l.note,
                    }))
                  "
                  value-key="id"
                  label-key="label"
                  placeholder="Pilih Logbook"
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
              I. JENIS PERMOHONAN RATING
            </h2>
            <div>
              <label class="block text-sm font-medium mb-1"
                >A. Jenis Permohonan Rating
                <span class="text-error">*</span></label
              >
              <USelect
                v-model="selectedEventUserId"
                :items="eventOptions"
                value-key="id"
                label-key="label"
                placeholder="Pilih Jenis Permohonan"
                class="w-full"
              />
              <p v-if="selectedEventUserId" class="text-xs text-muted mt-1">
                Remark:
                <strong>{{
                  eventOptions.find((e) => e.id === selectedEventUserId)?.remark
                }}</strong>
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1"
                >B. Nama ATS Unit <span class="text-error">*</span></label
              >
              <UInput
                v-model="atsName"
                placeholder="e.g., ACC JAKARTA"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1"
                >C. Alamat Kantor <span class="text-error">*</span></label
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
                <div
                  v-for="rating in ratingOptions"
                  :key="rating"
                  class="border border-default rounded-lg p-3"
                >
                  <UCheckbox
                    v-model="selectedRatings[rating]"
                    :label="rating"
                  />
                  <div
                    v-if="selectedRatings[rating]"
                    class="mt-3 ml-6 space-y-1"
                  >
                    <label class="block text-xs text-muted"
                      >Jam Pemanduan (min. 40 jam)</label
                    >
                    <UInput
                      v-model.number="ratingControlHours[rating]"
                      type="number"
                      placeholder="Masukkan jam pemanduan"
                      class="max-w-xs"
                    />
                    <p
                      v-if="
                        ratingControlHours[rating] !== null &&
                        ratingControlHours[rating] !== undefined &&
                        ratingControlHours[rating] < 40
                      "
                      class="text-xs text-error"
                    >
                      ⚠ Jam pemanduan minimal 40 jam
                    </p>
                    <p
                      v-else-if="
                        ratingControlHours[rating] !== null &&
                        ratingControlHours[rating] !== undefined &&
                        ratingControlHours[rating] >= 40
                      "
                      class="text-xs text-success"
                    >
                      ✓ Jam pemanduan memenuhi syarat
                    </p>
                    <div
                      v-if="getCheckerOptionsForRating(rating).length"
                      class="pt-2"
                    >
                      <label class="block text-xs text-muted mb-1">
                        Checker Available
                      </label>
                      <USelect
                        v-model="selectedCheckerGroups[rating]"
                        :items="getCheckerOptionsForRating(rating)"
                        value-key="id"
                        label-key="label"
                        placeholder="Pilih checker group(s)"
                        class="max-w-xs"
                        multiple
                      />
                    </div>
                    <div
                      v-if="getPracticalSummaryForRating(rating).length"
                      class="pt-2 rounded-md border border-default bg-elevated/30 p-2"
                    >
                      <p class="text-xs font-medium text-highlighted mb-1">
                        Summary (Existing Application)
                      </p>
                      <ul class="list-disc list-inside space-y-1">
                        <li
                          v-for="(item, idx) in getPracticalSummaryForRating(
                            rating,
                          )"
                          :key="`${rating}-${idx}`"
                          class="text-xs text-muted"
                        >
                          {{ item.kind }} - {{ item.checkerName }}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── PART 2: INFORMASI PEMOHON ──────────────────────────── -->
          <div class="space-y-4">
            <h2
              class="text-base font-bold border-b border-default pb-2 flex items-center gap-2"
            >
              <UIcon name="i-lucide-user" class="text-primary" />
              II. INFORMASI PEMOHON
            </h2>
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="block text-sm font-medium mb-1">1. Nama</label>
                <UInput :model-value="userData.name" disabled class="w-full" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1"
                  >2. Nomor Lisensi</label
                >
                <UInput
                  :model-value="userData.licenseUserId"
                  disabled
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1"
                  >3. Tanggal Lahir</label
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
                  :model-value="userData.placeOfBirth ?? undefined"
                  disabled
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1"
                  >5. Alamat Tinggal</label
                >
                <UInput
                  :model-value="userData.personalAddress ?? undefined"
                  disabled
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1"
                  >6. Kebangsaan</label
                >
                <UInput
                  :model-value="userData.nationality ?? undefined"
                  disabled
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1"
                  >7. No Handphone</label
                >
                <UInput
                  :model-value="userData.phoneNumber ?? undefined"
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

            <!-- 9a-13 & 10-11 similar to AddModal -->
            <div class="border border-default rounded-lg p-4 space-y-3">
              <label class="block text-sm font-semibold"
                >9a. Apakah anda memiliki rating sebelumnya?</label
              >
              <div class="flex gap-6">
                <label class="flex items-center gap-2 cursor-pointer"
                  ><input
                    type="radio"
                    :value="true"
                    v-model="isConfirmRating"
                    class="accent-primary"
                  /><span class="text-sm">Ya</span></label
                >
                <label class="flex items-center gap-2 cursor-pointer"
                  ><input
                    type="radio"
                    :value="false"
                    v-model="isConfirmRating"
                    class="accent-primary"
                  /><span class="text-sm">Tidak</span></label
                >
              </div>
              <div
                v-if="isConfirmRating === true"
                class="space-y-4 pl-4 border-l-2 border-primary/50"
              >
                <div>
                  <label class="block text-sm font-medium mb-2"
                    >9b. Alasan Pengajuan Rating</label
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
                      /><span class="text-sm">{{ opt }}</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium mb-2"
                    >9c. Jenis Rating (Pilih satu atau lebih)</label
                  >
                  <div class="space-y-2">
                    <label
                      v-for="rating in ratingOptions"
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
                    Terpilih: {{ previousRatings.join(", ") }}
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1"
                    >9d. Lokasi Rating</label
                  ><UInput
                    v-model="location"
                    placeholder="e.g., JATSC"
                    class="max-w-xs"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1"
                    >9e. Masa Berlaku Rating</label
                  ><UInput v-model="dateForExp" type="date" class="max-w-xs" />
                </div>
              </div>
            </div>

            <!-- Medex -->
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
                  :label="isMedexValid ? 'Valid' : 'Expired'"
                />
              </div>
              <p v-if="!isMedexValid" class="text-sm text-error font-medium">
                ⚠ Medex expired atau tidak ada
              </p>
              <div v-if="latestMedex" class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-muted text-xs">10b. Tanggal Dikeluarkan</p>
                  <p class="font-medium">
                    {{ formatDate(latestMedex.released) }}
                  </p>
                </div>
                <div>
                  <p class="text-muted text-xs">Tanggal Expired</p>
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
                        ? `${medexRemainingDays} hari lagi`
                        : "Sudah expired"
                    }}
                  </p>
                </div>
                <div>
                  <p class="text-muted text-xs">10c. Nama Dokter Penguji</p>
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
                    Tidak ada file
                  </p>
                </div>
              </div>
              <p v-else class="text-sm text-muted italic">
                Tidak ada data medex
              </p>
            </div>

            <!-- IELP -->
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
                  :label="isIelpValid ? 'Valid' : 'Expired'"
                />
              </div>
              <p v-if="!isIelpValid" class="text-sm text-error font-medium">
                ⚠ IELP expired atau tidak ada
              </p>
              <div v-if="latestIelp" class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-muted text-xs">11b. Nama Rater</p>
                  <p class="font-medium">{{ latestIelp.rater }}</p>
                </div>
                <div>
                  <p class="text-muted text-xs">11c. Lembaga Pelatihan</p>
                  <p class="font-medium">{{ latestIelp.institution }}</p>
                </div>
                <div>
                  <p class="text-muted text-xs">11d. Tanggal Dikeluarkan</p>
                  <p class="font-medium">
                    {{ formatDate(latestIelp.released) }}
                  </p>
                </div>
                <div>
                  <p class="text-muted text-xs">11e. Level</p>
                  <p class="font-medium">Level {{ latestIelp.level }}</p>
                </div>
                <div>
                  <p class="text-muted text-xs">Tanggal Expired</p>
                  <p class="font-medium">
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
                        ? `${ielpRemainingDays} hari lagi`
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
                    Tidak ada file
                  </p>
                </div>
              </div>
              <p v-else class="text-sm text-muted italic">
                Tidak ada data IELP
              </p>
            </div>

            <!-- OJT -->
            <div class="border border-default rounded-lg p-4 space-y-3">
              <label class="block text-sm font-semibold"
                >12a. Apakah ada surat Rekomendasi OJTI?</label
              >
              <div class="flex gap-6">
                <label class="flex items-center gap-2 cursor-pointer"
                  ><input
                    type="radio"
                    :value="true"
                    v-model="confirmOjt"
                    class="accent-primary"
                  /><span class="text-sm">Ya</span></label
                >
                <label class="flex items-center gap-2 cursor-pointer"
                  ><input
                    type="radio"
                    :value="false"
                    v-model="confirmOjt"
                    class="accent-primary"
                  /><span class="text-sm">Tidak</span></label
                >
              </div>
              <div
                v-if="confirmOjt === true"
                class="space-y-3 pl-4 border-l-2 border-primary/50"
              >
                <div>
                  <label class="block text-sm font-medium mb-1"
                    >12b. Nomor Surat</label
                  ><UInput
                    v-model="letterNumber"
                    placeholder="Nomor surat"
                    class="w-full"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1"
                    >12c. Tanggal Surat</label
                  ><UInput v-model="letterDate" type="date" class="max-w-xs" />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1"
                    >12d. Jumlah Jam Pemanduan</label
                  ><UInput
                    v-model.number="ojtControlHour"
                    type="number"
                    placeholder="Total jam"
                    class="max-w-xs"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1"
                    >12e. Nomor Lisensi OJTI</label
                  ><UInput
                    v-model="ojtId"
                    placeholder="Nomor lisensi OJTI"
                    class="max-w-xs"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1"
                    >12f. Nama OJTI</label
                  ><UInput
                    v-model="ojtName"
                    placeholder="Nama OJTI"
                    class="max-w-xs"
                  />
                </div>
              </div>
            </div>

            <!-- Drugs -->
            <div class="border border-default rounded-lg p-4 space-y-3">
              <label class="block text-sm font-semibold text-sm leading-relaxed"
                >13. Apakah anda terlibat pelanggaran obat-obatan
                terlarang?</label
              >
              <div class="flex gap-6">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    :value="true"
                    v-model="isDrugs"
                    class="accent-primary"
                    @change="onDrugsChange(true)"
                  />
                  <span class="text-sm text-error font-medium">Ya</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer"
                  ><input
                    type="radio"
                    :value="false"
                    v-model="isDrugs"
                    class="accent-primary"
                  /><span class="text-sm">Tidak</span></label
                >
              </div>
            </div>
          </div>

          <!-- ── PART 3: SERTIFIKASI KOMPETENSI ─────────────────────── -->
          <div class="space-y-4">
            <h2
              class="text-base font-bold border-b border-default pb-2 flex items-center gap-2"
            >
              <UIcon name="i-lucide-award" class="text-primary" />
              III. JENIS SERTIFIKASI KOMPETENSI YANG DIMILIKI
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
            </div>
          </div>

          <!-- ── PART 4: PERNAH GAGAL UJIAN ─────────────────────────── -->
          <div class="space-y-4">
            <h2
              class="text-base font-bold border-b border-default pb-2 flex items-center gap-2"
            >
              <UIcon name="i-lucide-clipboard-x" class="text-primary" />
              IV. RIWAYAT UJIAN
            </h2>
            <div class="border border-default rounded-lg p-4 space-y-3">
              <label class="block text-sm font-semibold"
                >Apakah anda pernah gagal ujian sebelumnya, dalam kurun waktu 30
                hari?</label
              >
              <div class="flex gap-6">
                <label class="flex items-center gap-2 cursor-pointer"
                  ><input
                    type="radio"
                    :value="true"
                    v-model="isFailed"
                    class="accent-primary"
                  /><span class="text-sm">Ya</span></label
                >
                <label class="flex items-center gap-2 cursor-pointer"
                  ><input
                    type="radio"
                    :value="false"
                    v-model="isFailed"
                    class="accent-primary"
                  /><span class="text-sm">Tidak</span></label
                >
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <UButton
            label="Batal"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            label="Simpan Perubahan"
            color="primary"
            variant="solid"
            icon="i-lucide-save"
            :loading="loading"
            :disabled="!canSubmit"
            @click="onSubmit"
          />
        </div>
      </template>
    </USlideover>
  </div>
</template>
