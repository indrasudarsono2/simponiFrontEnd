<script setup lang="ts">
interface RatingAuthority {
  id: number;
  rating?: { id?: number; rating?: string | null } | null;
  expiredAt?: string | null;
  finalScore?: number | null;
  applicationDoc?: { id?: number; number?: string | null } | null;
  practicalScores?: Array<{
    id: number;
    kind?: string | null;
    score?: number | null;
  }>;
  cwps?: Array<{
    id: number;
    name?: string | null;
    sector?: string | null;
    frequencies?: Array<{
      id: number;
      frequency?: string | null;
      isPrimary?: boolean | null;
    }>;
  }>;
}

const props = defineProps<{
  userName: string;
  authorities: RatingAuthority[];
}>();

const isOpen = ref(false);
const selectedAuthority = ref<RatingAuthority | null>(null);

function openAuthority(authority: RatingAuthority) {
  selectedAuthority.value = authority;
  isOpen.value = true;
}

function closeAuthority() {
  isOpen.value = false;
  selectedAuthority.value = null;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatPracticalScores(authority: RatingAuthority) {
  const scores = authority.practicalScores || [];
  if (!scores.length) return "-";
  return scores
    .map((item) => `${item.kind || "PRACTICAL"}: ${item.score ?? "-"}`)
    .join(", ");
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-semibold text-highlighted">Current Rating Authority</h2>
          <p class="text-sm text-muted">
            Newest valid final score for each rating type.
          </p>
        </div>
      </div>
    </template>

    <div v-if="authorities.length" class="overflow-x-auto rounded-lg border border-default">
      <table class="w-full min-w-[860px] text-sm">
        <thead class="bg-elevated/60 text-left text-xs uppercase text-muted">
          <tr>
            <th class="px-4 py-3">Rating</th>
            <th class="px-4 py-3">Application Document</th>
            <th class="px-4 py-3 text-center">Theory Score</th>
            <th class="px-4 py-3">Practical Score</th>
            <th class="px-4 py-3">Expired Date</th>
            <th class="px-4 py-3 text-center">CWP Authority</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr v-for="authority in authorities" :key="authority.id">
            <td class="px-4 py-3 font-semibold">{{ authority.rating?.rating || "-" }}</td>
            <td class="px-4 py-3">{{ authority.applicationDoc?.number || "-" }}</td>
            <td class="px-4 py-3 text-center">{{ authority.finalScore ?? "-" }}</td>
            <td class="px-4 py-3">{{ formatPracticalScores(authority) }}</td>
            <td class="px-4 py-3 font-medium text-primary">
              {{ formatDate(authority.expiredAt) }}
            </td>
            <td class="px-4 py-3 text-center">
              <UButton
                label="View"
                icon="i-lucide-eye"
                color="primary"
                variant="soft"
                size="sm"
                @click="openAuthority(authority)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="rounded-lg border border-dashed border-default p-4 text-sm text-muted">
      No valid rating based on a successful final score is currently available.
    </div>
  </UCard>

  <UModal
    v-model:open="isOpen"
    :title="`Authority CWP - ${selectedAuthority?.rating?.rating || ''}`"
    description="CWP authority from the newest valid final score for this rating"
    :ui="{ content: 'max-w-lg' }"
    @update:open="(value) => (!value ? closeAuthority() : null)"
  >
    <template #body>
      <div v-if="selectedAuthority" class="space-y-4">
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt class="text-muted">Name</dt>
          <dd class="font-medium">{{ props.userName }}</dd>
          <dt class="text-muted">Application document</dt>
          <dd class="font-medium">{{ selectedAuthority.applicationDoc?.number || "-" }}</dd>
          <dt class="text-muted">Rating</dt>
          <dd class="font-medium">{{ selectedAuthority.rating?.rating || "-" }}</dd>
          <dt class="text-muted">Theory score</dt>
          <dd class="font-medium">{{ selectedAuthority.finalScore ?? "-" }}</dd>
          <dt class="text-muted">Practical score</dt>
          <dd class="font-medium">{{ formatPracticalScores(selectedAuthority) }}</dd>
          <dt class="text-muted">Expired date</dt>
          <dd class="font-medium text-primary">{{ formatDate(selectedAuthority.expiredAt) }}</dd>
        </dl>

        <div
          v-if="!selectedAuthority.cwps?.length"
          class="rounded-lg border border-default bg-muted/20 p-4 text-sm text-muted"
        >
          No CWP authority snapshot is available for this final score.
        </div>

        <ul v-else class="divide-y divide-default rounded-lg border border-default">
          <li
            v-for="cwp in selectedAuthority.cwps"
            :key="cwp.id"
            class="flex items-start justify-between gap-3 p-3"
          >
            <div class="space-y-2">
              <span class="font-medium">{{ cwp.name || `CWP ${cwp.id}` }}</span>
              <div v-if="cwp.frequencies?.length" class="flex flex-wrap gap-1.5">
                <UBadge
                  v-for="frequency in cwp.frequencies"
                  :key="frequency.id"
                  :color="frequency.isPrimary ? 'success' : 'neutral'"
                  variant="soft"
                >
                  {{ frequency.frequency || "-" }}
                  {{ frequency.isPrimary ? "(Primary)" : "(Secondary)" }}
                </UBadge>
              </div>
              <p v-else class="text-xs text-muted">No frequency configured</p>
            </div>
            <UBadge color="neutral" variant="outline">{{ cwp.sector || "-" }}</UBadge>
          </li>
        </ul>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end">
        <UButton label="Close" color="neutral" variant="soft" @click="closeAuthority" />
      </div>
    </template>
  </UModal>
</template>
