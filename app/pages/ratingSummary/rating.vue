<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface RatingSummaryUserRatingItem {
  id?: number;
  ratingId?: number | null;
  appRatingId?: number | null;
  expireddate?: string | null;
  createdAt?: string | null;
  status?: "ACTIVE" | "RE_EXAMINATION_REQUIRED";
  rating?: {
    rating?: string | null;
  } | null;
}

interface RatingSummaryUserItem {
  nik?: string | null;
  licenseUserId?: string | null;
  name?: string | null;
  userRatings?: RatingSummaryUserRatingItem[] | null;
}

interface RatingSummaryRow {
  id: string;
  userKey: string;
  nik: string;
  licenseNumber: string;
  name: string;
  rating: string;
  ratingStatus: "ACTIVE" | "RE_EXAMINATION_REQUIRED" | "-";
  expiredDate: string;
  elapsedDays: number | null;
}

interface RatingSummaryDisplayRow extends RatingSummaryRow {
  showUserInfo: boolean;
  userRowSpan: number;
  groupNo: number;
}

type SortKey =
  | "no"
  | "nik"
  | "licenseNumber"
  | "name"
  | "rating"
  | "ratingStatus"
  | "expiredDate"
  | "elapsedDays";

const { token } = useAuth();

const sortKey = ref<SortKey>("no");
const sortDirection = ref<"asc" | "desc">("asc");

const { data, status, error, refresh } = await useFetch<
  RatingSummaryUserItem[]
>(`${apiBaseUrl}/api/ratingSummary`, {
  headers: {
    Authorization: token.value ? `Bearer ${token.value}` : "",
  },
});

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const year = parsed.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

function calculateElapsedDays(expiredDate?: string | null): number | null {
  if (!expiredDate) return null;
  const parsed = new Date(expiredDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  const diffMs = parsed.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

const rawRows = computed<RatingSummaryRow[]>(() => {
  const source = data.value || [];
  const rows: RatingSummaryRow[] = [];

  source.forEach((user, userIndex) => {
    const ratings = user.userRatings || [];

    if (ratings.length === 0) {
      rows.push({
        id: `${user.nik || userIndex}-empty`,
        userKey: `${user.nik || "-"}|${user.licenseUserId || "-"}|${user.name || "-"}`,
        nik: user.nik || "-",
        licenseNumber: user.licenseUserId || "-",
        name: user.name || "-",
        rating: "-",
        ratingStatus: "-",
        expiredDate: "-",
        elapsedDays: null,
      });
      return;
    }

    ratings.forEach((userRating, ratingIndex) => {
      rows.push({
        id: `${user.nik || userIndex}-${userRating.id || ratingIndex}`,
        userKey: `${user.nik || "-"}|${user.licenseUserId || "-"}|${user.name || "-"}`,
        nik: user.nik || "-",
        licenseNumber: user.licenseUserId || "-",
        name: user.name || "-",
        rating: userRating.rating?.rating || "-",
        ratingStatus: userRating.status || "ACTIVE",
        expiredDate: formatDate(userRating.expireddate),
        elapsedDays: calculateElapsedDays(userRating.expireddate),
      });
    });
  });

  return rows;
});

const rows = computed(() => {
  const list = [...rawRows.value];

  list.sort((a, b) => {
    const dir = sortDirection.value === "asc" ? 1 : -1;
    const aIndex = rawRows.value.findIndex((row) => row.id === a.id);
    const bIndex = rawRows.value.findIndex((row) => row.id === b.id);

    switch (sortKey.value) {
      case "no":
        return (aIndex - bIndex) * dir;
      case "nik":
        return a.nik.localeCompare(b.nik) * dir;
      case "licenseNumber":
        return a.licenseNumber.localeCompare(b.licenseNumber) * dir;
      case "name":
        return a.name.localeCompare(b.name) * dir;
      case "rating":
        return a.rating.localeCompare(b.rating) * dir;
      case "ratingStatus":
        return a.ratingStatus.localeCompare(b.ratingStatus) * dir;
      case "expiredDate":
        return a.expiredDate.localeCompare(b.expiredDate) * dir;
      case "elapsedDays":
        return (
          ((a.elapsedDays ?? Number.NEGATIVE_INFINITY) -
            (b.elapsedDays ?? Number.NEGATIVE_INFINITY)) *
          dir
        );
      default:
        return 0;
    }
  });

  return list;
});

const displayRows = computed<RatingSummaryDisplayRow[]>(() => {
  const list = rows.value;
  const result: RatingSummaryDisplayRow[] = [];
  let groupNo = 0;

  for (let i = 0; i < list.length; i += 1) {
    const row = list[i]!;
    const prev = i > 0 ? list[i - 1]! : null;
    const isFirstInGroup = !prev || prev.userKey !== row.userKey;

    let rowSpan = 1;
    if (isFirstInGroup) {
      for (let j = i + 1; j < list.length; j += 1) {
        if (list[j]!.userKey !== row.userKey) break;
        rowSpan += 1;
      }
      groupNo += 1;
    }

    result.push({
      ...row,
      showUserInfo: isFirstInGroup,
      userRowSpan: isFirstInGroup ? rowSpan : 0,
      groupNo,
    });
  }

  return result;
});

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
    return;
  }
  sortKey.value = key;
  sortDirection.value = "asc";
}

function sortIcon(key: SortKey): string {
  if (sortKey.value !== key) return "i-lucide-arrow-up-down";
  return sortDirection.value === "asc"
    ? "i-lucide-arrow-up"
    : "i-lucide-arrow-down";
}

const errorMessage = computed(() => {
  if (!error.value) return "";
  const err = error.value as {
    data?: { message?: string };
    message?: string;
  };
  return (
    err.data?.message || err.message || "Failed to fetch rating summary data."
  );
});

function elapsedStyle(value: number | null): Record<string, string> {
  if (value == null) return {};
  if (value < 30) {
    return {
      backgroundColor: "#fed7aa",
      color: "#9a3412",
    };
  }
  if (value < 60) {
    return {
      backgroundColor: "#fef08a",
      color: "#854d0e",
    };
  }
  return {};
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Rating Summary">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Rating Summary Table</h2>
        </template>

        <div
          v-if="status === 'pending'"
          class="flex items-center gap-2 text-muted py-2"
        >
          <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
          Loading data...
        </div>

        <div
          v-else-if="error"
          class="rounded-lg border border-error/30 bg-error/5 p-4 space-y-2"
        >
          <p class="font-medium text-error">{{ errorMessage }}</p>
          <UButton
            label="Retry"
            color="error"
            variant="outline"
            icon="i-lucide-refresh-cw"
            @click="refresh()"
          />
        </div>

        <div v-else class="overflow-x-auto rounded-lg border">
          <table
            class="min-w-full text-sm border-collapse border border-default"
          >
            <thead class="bg-muted/40">
              <tr>
                <th
                  class="px-3 py-2 text-center font-medium border border-default"
                >
                  <button
                    type="button"
                    class="inline-flex items-center gap-1"
                    @click="toggleSort('ratingStatus')"
                  >
                    Status
                    <UIcon :name="sortIcon('ratingStatus')" class="size-4" />
                  </button>
                </th>
                <th
                  class="px-3 py-2 text-center font-medium border border-default"
                >
                  <button
                    type="button"
                    class="inline-flex items-center gap-1"
                    @click="toggleSort('no')"
                  >
                    No
                    <UIcon :name="sortIcon('no')" class="size-4" />
                  </button>
                </th>
                <th
                  class="px-3 py-2 text-center font-medium border border-default"
                >
                  <button
                    type="button"
                    class="inline-flex items-center gap-1"
                    @click="toggleSort('nik')"
                  >
                    NIK
                    <UIcon :name="sortIcon('nik')" class="size-4" />
                  </button>
                </th>
                <th
                  class="px-3 py-2 text-center font-medium border border-default"
                >
                  <button
                    type="button"
                    class="inline-flex items-center gap-1"
                    @click="toggleSort('licenseNumber')"
                  >
                    License Number
                    <UIcon :name="sortIcon('licenseNumber')" class="size-4" />
                  </button>
                </th>
                <th
                  class="px-3 py-2 text-center font-medium border border-default"
                >
                  <button
                    type="button"
                    class="inline-flex items-center gap-1"
                    @click="toggleSort('name')"
                  >
                    Name
                    <UIcon :name="sortIcon('name')" class="size-4" />
                  </button>
                </th>
                <th
                  class="px-3 py-2 text-center font-medium border border-default"
                >
                  <button
                    type="button"
                    class="inline-flex items-center gap-1"
                    @click="toggleSort('rating')"
                  >
                    Rating
                    <UIcon :name="sortIcon('rating')" class="size-4" />
                  </button>
                </th>
                <th
                  class="px-3 py-2 text-center font-medium border border-default"
                >
                  <button
                    type="button"
                    class="inline-flex items-center gap-1"
                    @click="toggleSort('expiredDate')"
                  >
                    Expired Date
                    <UIcon :name="sortIcon('expiredDate')" class="size-4" />
                  </button>
                </th>
                <th
                  class="px-3 py-2 text-center font-medium border border-default"
                >
                  <button
                    type="button"
                    class="inline-flex items-center gap-1"
                    @click="toggleSort('elapsedDays')"
                  >
                    Elapse Time
                    <UIcon :name="sortIcon('elapsedDays')" class="size-4" />
                  </button>
                </th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="row in displayRows" :key="row.id">
                <td
                  v-if="row.showUserInfo"
                  class="px-3 py-2 border border-default text-center align-middle"
                  :rowspan="row.userRowSpan"
                >
                  {{ row.groupNo }}
                </td>
                <td
                  v-if="row.showUserInfo"
                  class="px-3 py-2 border border-default text-center align-middle"
                  :rowspan="row.userRowSpan"
                >
                  {{ row.nik }}
                </td>
                <td
                  v-if="row.showUserInfo"
                  class="px-3 py-2 border border-default text-center align-middle"
                  :rowspan="row.userRowSpan"
                >
                  {{ row.licenseNumber }}
                </td>
                <td
                  v-if="row.showUserInfo"
                  class="px-3 py-2 border border-default align-middle"
                  :rowspan="row.userRowSpan"
                >
                  {{ row.name }}
                </td>
                <td class="px-3 py-2 border border-default text-center">
                  {{ row.rating }}
                </td>
                <td class="px-3 py-2 border border-default text-center">
                  <UBadge
                    :color="row.ratingStatus === 'ACTIVE' ? 'success' : row.ratingStatus === 'RE_EXAMINATION_REQUIRED' ? 'warning' : 'neutral'"
                    variant="soft"
                  >
                    {{ row.ratingStatus === 'RE_EXAMINATION_REQUIRED' ? 'Re-examination Required' : row.ratingStatus === 'ACTIVE' ? 'Active' : '-' }}
                  </UBadge>
                </td>
                <td class="px-3 py-2 border border-default text-center">
                  {{ row.expiredDate }}
                </td>
                <td
                  class="px-3 py-2 border border-default text-center"
                  :style="elapsedStyle(row.elapsedDays)"
                >
                  {{
                    row.elapsedDays == null ? "-" : `${row.elapsedDays} days`
                  }}
                </td>
              </tr>

              <tr v-if="displayRows.length === 0">
                <td
                  class="px-3 py-3 text-muted border border-default text-center"
                  colspan="8"
                >
                  No rating summary data available.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
