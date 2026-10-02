<script setup lang="ts">
import type { CheckerHistoryAuthority } from '~/types/checkerHistory'

const props = defineProps<{ open: boolean, authority: CheckerHistoryAuthority | null }>()
const emit = defineEmits<{ close: [] }>()
const isAuthorityModalOpen = computed(() => props.open)
const selectedAuthority = computed(() => props.authority)
function closeAuthorityModal() {
  emit('close')
}
</script>

<template>
  <UModal
    :open="isAuthorityModalOpen"
    :title="`Authority CWP - ${selectedAuthority?.rating || ''}`"
    description="CWP authority from the final score event sector"
    :ui="{ content: 'max-w-lg' }"
    @update:open="(value) => (!value ? closeAuthorityModal() : null)"
  >
    <template #body>
      <div v-if="selectedAuthority" class="space-y-4">
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt class="text-muted">
            Name
          </dt>
          <dd class="font-medium">
            {{ selectedAuthority.user }}
          </dd>
          <dt class="text-muted">
            Application document
          </dt>
          <dd class="font-medium">
            {{ selectedAuthority.applicationDoc }}
          </dd>
          <dt class="text-muted">
            Rating
          </dt>
          <dd class="font-medium">
            {{ selectedAuthority.rating }}
          </dd>
        </dl>

        <div
          v-if="selectedAuthority.cwps.length === 0"
          class="rounded-lg border border-default bg-muted/20 p-4 text-sm text-muted"
        >
          No CWP authority is configured for this rating in the examination sector.
        </div>

        <ul v-else class="divide-y divide-default rounded-lg border border-default">
          <li
            v-for="cwp in selectedAuthority.cwps"
            :key="cwp.id"
            class="flex items-start justify-between gap-3 p-3"
          >
            <div class="space-y-2">
              <span class="font-medium">{{ cwp.name }}</span>
              <div v-if="cwp.frequencies.length" class="flex flex-wrap gap-1.5">
                <UBadge
                  v-for="frequency in cwp.frequencies"
                  :key="frequency.id"
                  :color="frequency.isPrimary ? 'success' : 'neutral'"
                  variant="soft"
                >
                  {{ frequency.frequency }}
                  {{ frequency.isPrimary ? '(Primary)' : '(Secondary)' }}
                </UBadge>
              </div>
              <p v-else class="text-xs text-muted">
                No frequency configured
              </p>
            </div>
            <UBadge color="neutral" variant="outline">
              {{ cwp.sector }}
            </UBadge>
          </li>
        </ul>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end">
        <UButton
          label="Close"
          color="neutral"
          variant="soft"
          @click="closeAuthorityModal"
        />
      </div>
    </template>
  </UModal>
</template>
