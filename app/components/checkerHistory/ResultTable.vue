<script setup lang="ts">
import type { CheckerHistoryRow } from '~/types/checkerHistory'

defineProps<{ rows: CheckerHistoryRow[] }>()
const emit = defineEmits<{
  'open-authority': [row: CheckerHistoryRow]
  'open-file': [path: string, title: string]
}>()
function openAuthorityModal(row: CheckerHistoryRow) {
  emit('open-authority', row)
}
function openFileModal(path: string, title: string) {
  emit('open-file', path, title)
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg border">
    <table
      class="min-w-full text-sm border-collapse border border-default"
    >
      <thead class="bg-muted/40">
        <tr>
          <th
            class="px-3 py-2 text-center font-medium border border-default"
          >
            No
          </th>
          <th
            class="px-3 py-2 text-center font-medium border border-default"
          >
            ApplicationDocNumber
          </th>
          <th
            class="px-3 py-2 text-center font-medium border border-default"
          >
            Name
          </th>
          <th
            class="px-3 py-2 text-center font-medium border border-default"
          >
            File
          </th>
          <th
            class="px-3 py-2 text-center font-medium border border-default"
          >
            Rating
          </th>
          <th
            class="px-3 py-2 text-center font-medium border border-default"
          >
            Score
          </th>
          <th
            class="px-3 py-2 text-center font-medium border border-default"
          >
            Practical Type
          </th>
          <th
            class="px-3 py-2 text-center font-medium border border-default"
          >
            Practical Score
          </th>
          <th
            class="px-3 py-2 text-center font-medium border border-default"
          >
            Remark
          </th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="row in rows" :key="row.id" class="align-top">
          <td
            v-if="row.showNo"
            class="px-3 py-2 border border-default align-middle text-center"
            :rowspan="row.noRowSpan"
          >
            {{ row.no }}
          </td>

          <td
            v-if="row.showApplicationDocNumber"
            class="px-3 py-2 border border-default align-middle text-center"
            :rowspan="row.applicationDocNumberRowSpan"
          >
            {{ row.applicationDocNumber }}
          </td>
          <td
            v-if="row.showName"
            class="px-3 py-2 border border-default align-middle"
            :rowspan="row.nameRowSpan"
          >
            {{ row.name }}
          </td>

          <td
            v-if="row.showFile"
            class="px-3 py-2 border border-default align-middle"
            :rowspan="row.fileRowSpan"
          >
            <div class="flex items-center justify-center gap-2">
              <UTooltip v-if="row.licenseFile" text="License">
                <UButton
                  icon="i-lucide-id-card"
                  color="success"
                  variant="soft"
                  size="xs"
                  @click="
                    openFileModal(row.licenseFile, 'License Preview')
                  "
                />
              </UTooltip>

              <UTooltip v-if="row.medexFile" text="Medex">
                <UButton
                  icon="i-lucide-heart-pulse"
                  color="success"
                  variant="soft"
                  size="xs"
                  @click="openFileModal(row.medexFile, 'Medex Preview')"
                />
              </UTooltip>

              <UTooltip v-if="row.ielpFile" text="IELP">
                <UButton
                  icon="i-lucide-badge-check"
                  color="success"
                  variant="soft"
                  size="xs"
                  @click="openFileModal(row.ielpFile, 'IELP Preview')"
                />
              </UTooltip>

              <UTooltip v-if="row.logbookFile" text="Logbook">
                <UButton
                  icon="i-lucide-book-open"
                  color="success"
                  variant="soft"
                  size="xs"
                  @click="
                    openFileModal(row.logbookFile, 'Logbook Preview')
                  "
                />
              </UTooltip>
              <span
                v-if="
                  !row.licenseFile
                    && !row.medexFile
                    && !row.ielpFile
                    && !row.logbookFile
                "
              >
                -
              </span>
            </div>
          </td>

          <td
            v-if="row.showRating"
            class="px-3 py-2 border border-default align-middle text-center"
            :rowspan="row.ratingRowSpan"
          >
            <UButton
              :label="row.rating"
              color="primary"
              variant="link"
              size="sm"
              :disabled="row.rating === '-'"
              @click="openAuthorityModal(row)"
            />
          </td>

          <td
            class="px-3 py-2 border border-default text-center"
          >
            {{ row.score }}
          </td>
          <td class="px-3 py-2 border border-default text-center">
            {{ row.kind }}
          </td>

          <td class="px-3 py-2 border border-default text-center">
            {{ row.practicalScore }}
          </td>
          <td
            v-if="row.showRemark"
            class="px-3 py-2 border border-default align-middle text-center"
            :rowspan="row.remarkRowSpan"
          >
            {{ row.remark }}
          </td>
        </tr>

        <tr v-if="rows.length === 0">
          <td
            class="px-3 py-3 text-muted border border-default text-center"
          colspan="9"
          >
            No checker history data available.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
