import { defineStore } from "pinia";

// Types defined inline to avoid external import issues
interface AppRating {
  id?: number;
  rating: { id: number; rating: string };
  controlHour: string;
  statusId?: number;
}

interface Verification {
  id: number;
  applicationDocId: number;
  verifiedBy: string;
  verifiedAt: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface ApplicationDoc {
  id: number;
  number: string;
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
        id: number;
        remark: string;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
      };
    };
  };
  status?: {
    id: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  medex?: {
    id: number;
    isConfirmed: boolean;
    source: "ECHAIN" | "MANUAL" | "LEGACY";
    verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
    verifiedByNik?: string | null;
    verifiedAt?: string | null;
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
    source: "ECHAIN" | "MANUAL" | "LEGACY";
    verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
    verifiedByNik?: string | null;
    verifiedAt?: string | null;
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
  briefingDate?: string | null;
  appRatings?: AppRating[];
  atsName?: string;
  address?: string;
  isFailed?: boolean;
  isDrugs?: boolean;
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
  license?: any;
  logbookUser?: any;
  verifications?: Verification | null;
  [key: string]: any;
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
  ielp: any[];
  medex: any[];
  logbookUsers: any[];
  license: any[];
  competences: any[];
}

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
  eventUsers: any[];
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

interface ApiResponse {
  event: EventItem[];
  applicationDoc: ApplicationDoc[];
  user: UserData | null;
  rating: RatingItem[];
  ratingReal: RatingItem[];
}

interface StoreState {
  apiResponse: ApiResponse | null;
  lastFetched: number | null;
}

export const useApplicationDocStore = defineStore("applicationDoc", () => {
  // State
  const apiResponse = ref<ApiResponse | null>(null);
  const lastFetched = ref<number | null>(null);

  // Getters
  const applicationDocs = computed((): ApplicationDoc[] => {
    return apiResponse.value?.applicationDoc || [];
  });

  const events = computed((): EventItem[] => {
    return apiResponse.value?.event || [];
  });

  const user = computed((): UserData | null => {
    return apiResponse.value?.user || null;
  });

  const ratings = computed((): RatingItem[] => {
    return apiResponse.value?.rating || [];
  });

  const ratingReal = computed((): RatingItem[] => {
    return apiResponse.value?.ratingReal || [];
  });

  const getApplicationDocById = (id: number): ApplicationDoc | null => {
    return (
      apiResponse.value?.applicationDoc?.find(
        (d: ApplicationDoc) => d.id === id,
      ) || null
    );
  };

  const isDataAvailable = computed((): boolean => {
    return !!apiResponse.value;
  });

  const isStale = computed((): boolean => {
    if (!lastFetched.value) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - lastFetched.value > fiveMinutes;
  });

  // Actions
  const setApiResponse = (response: ApiResponse): void => {
    apiResponse.value = response;
    lastFetched.value = Date.now();
  };

  const clearCache = (): void => {
    apiResponse.value = null;
    lastFetched.value = null;
  };

  const updateApplicationDoc = (updatedDoc: ApplicationDoc): void => {
    if (!apiResponse.value?.applicationDoc) return;

    const index = apiResponse.value.applicationDoc.findIndex(
      (d: ApplicationDoc) => d.id === updatedDoc.id,
    );

    if (index !== -1) {
      apiResponse.value.applicationDoc[index] = updatedDoc;
    }
  };

  const removeApplicationDoc = (id: number): void => {
    if (!apiResponse.value?.applicationDoc) return;

    apiResponse.value.applicationDoc = apiResponse.value.applicationDoc.filter(
      (d: ApplicationDoc) => d.id !== id,
    );
  };

  const addApplicationDoc = (newDoc: ApplicationDoc): void => {
    if (!apiResponse.value?.applicationDoc) return;

    apiResponse.value.applicationDoc.unshift(newDoc);
  };

  return {
    apiResponse,
    lastFetched,
    applicationDocs,
    events,
    user,
    ratings,
    ratingReal,
    getApplicationDocById,
    isDataAvailable,
    isStale,
    setApiResponse,
    clearCache,
    updateApplicationDoc,
    removeApplicationDoc,
    addApplicationDoc,
  };
});
