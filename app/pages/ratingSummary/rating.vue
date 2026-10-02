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
  nik: string;
  licenseNumber: string;
  name: string;
  rating: string;
  ratingStatus: "ACTIVE" | "RE_EXAMINATION_REQUIRED" | "-";
  expiredDate: string;
  expiredAt: number | null;
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
  | "expiredDate"
  | "elapsedDays";

const { token } = useAuth();

const sortKey = ref<SortKey>("no");
const sortDirection = ref<"asc" | "desc">("asc");
const selectedRating = ref("all");

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
        nik: user.nik || "-",
        licenseNumber: user.licenseUserId || "-",
        name: user.name || "-",
        rating: "-",
        ratingStatus: "-",
        expiredDate: "-",
        expiredAt: null,
        elapsedDays: null,
      });
      return;
    }

    ratings.forEach((userRating, ratingIndex) => {
      rows.push({
        id: `${user.nik || userIndex}-${userRating.id || ratingIndex}`,
        nik: user.nik || "-",
        licenseNumber: user.licenseUserId || "-",
        name: user.name || "-",
        rating: userRating.rating?.rating || "-",
        ratingStatus: userRating.status || "ACTIVE",
        expiredDate: formatDate(userRating.expireddate),
        expiredAt: userRating.expireddate ? new Date(userRating.expireddate).getTime() : null,
        elapsedDays: calculateElapsedDays(userRating.expireddate),
      });
    });
  });

  return rows;
});

const ratingCounts = computed(() => {
  const counts = new Map<string, number>();
  for (const row of rawRows.value) {
    if (row.rating === "-") continue;
    const rating = row.rating.trim().toUpperCase();
    counts.set(rating, (counts.get(rating) || 0) + 1);
  }
  const preferred = ["TWR", "APP", "APS"];
  const names = [...new Set([...preferred, ...counts.keys()])];
  return names.map((rating) => ({ rating, count: counts.get(rating) || 0 }));
});

const ratingOptions = computed(() => [
  { label: "All ratings", value: "all" },
  ...ratingCounts.value.filter((item) => item.count > 0).map((item) => ({
    label: item.rating,
    value: item.rating,
  })),
]);

const rows = computed(() => {
  const list = rawRows.value.filter((row) =>
    selectedRating.value === "all" || row.rating.trim().toUpperCase() === selectedRating.value,
  );

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
      case "expiredDate":
        return ((a.expiredAt ?? Number.NEGATIVE_INFINITY) - (b.expiredAt ?? Number.NEGATIVE_INFINITY)) * dir;
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
  if (selectedRating.value !== "all") {
    return rows.value.map((row, index) => ({
      ...row,
      showUserInfo: true,
      userRowSpan: 1,
      groupNo: index + 1,
    }));
  }

  // Keep a user's ratings adjacent even when a rating or expiry sort was selected.
  const groups = new Map<string, RatingSummaryRow[]>();
  for (const row of rows.value) {
    const userKey = row.nik;
    const group = groups.get(userKey) || [];
    group.push(row);
    groups.set(userKey, group);
  }

  const result: RatingSummaryDisplayRow[] = [];
  let groupNo = 0;
  for (const group of groups.values()) {
    groupNo += 1;
    group.forEach((row, index) => result.push({
      ...row,
      showUserInfo: index === 0,
      userRowSpan: index === 0 ? group.length : 0,
      groupNo,
    }));
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

        <div v-else class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div
              v-for="item in ratingCounts"
              :key="item.rating"
              class="rounded-lg border border-default bg-muted/20 px-4 py-3"
            >
              <p class="text-sm text-muted">{{ item.rating }} ratings</p>
              <p class="text-2xl font-semibold">{{ item.count }}</p>
            </div>
          </div>

          <div class="max-w-xs">
            <UFormField label="Filter by rating">
              <USelect v-model="selectedRating" :items="ratingOptions" value-key="value" class="w-full" />
            </UFormField>
          </div>

          <div class="overflow-x-auto rounded-lg border">
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
                    No License
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
                <td v-if="row.showUserInfo" :rowspan="row.userRowSpan" class="px-3 py-2 border border-default text-center align-middle">{{ row.groupNo }}</td>
                <td v-if="row.showUserInfo" :rowspan="row.userRowSpan" class="px-3 py-2 border border-default text-center align-middle">{{ row.nik }}</td>
                <td v-if="row.showUserInfo" :rowspan="row.userRowSpan" class="px-3 py-2 border border-default text-center align-middle">{{ row.licenseNumber }}</td>
                <td v-if="row.showUserInfo" :rowspan="row.userRowSpan" class="px-3 py-2 border border-default align-middle">{{ row.name }}</td>
                <td class="px-3 py-2 border border-default text-center">
                  <div class="flex flex-wrap items-center justify-center gap-1.5">
                    <span>{{ row.rating }}</span>
                    <UBadge
                      v-if="row.ratingStatus !== '-'"
                      :color="row.ratingStatus === 'ACTIVE' ? 'success' : 'warning'"
                      variant="soft"
                    >
                      {{ row.ratingStatus === 'ACTIVE' ? 'Active' : 'Re-examination Required' }}
                    </UBadge>
                  </div>
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
                  colspan="7"
                >
                  No ratings match the selected filter.
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
