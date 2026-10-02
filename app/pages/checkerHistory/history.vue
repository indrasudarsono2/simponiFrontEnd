<script setup lang="ts">
const {
  selectedRemarkId, selectedSessionId, selectedEventIds,
  resultLoading, resultData, printTitle,
  isAuthorityModalOpen, selectedAuthority, openAuthorityModal, closeAuthorityModal,
  isFileModalOpen, selectedFilePath, selectedFileTitle, openFileModal, closeFileModal,
  status, error, refresh, remarkOptions, sessionOptions, eventOptions,
  rows, handleSearch, initialErrorMessage
} = await useCheckerHistory()
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Checker History">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">
              Filter History
            </h2>
          </template>

          <div
            v-if="status === 'pending'"
            class="flex items-center gap-2 text-muted py-2"
          >
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
            Loading options...
          </div>

          <div
            v-else-if="error"
            class="rounded-lg border border-error/30 bg-error/5 p-4 space-y-2"
          >
            <p class="font-medium text-error">
              {{ initialErrorMessage }}
            </p>
            <UButton
              label="Retry"
              color="error"
              variant="outline"
              icon="i-lucide-refresh-cw"
              @click="refresh()"
            />
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <UFormField label="Remark">
              <USelect
                v-model="selectedRemarkId"
                :items="remarkOptions"
                placeholder="Select remark"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Session">
              <USelect
                v-model="selectedSessionId"
                :items="sessionOptions"
                :disabled="!selectedRemarkId"
                placeholder="Select session"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Event">
              <USelect
                v-model="selectedEventIds"
                :items="eventOptions"
                multiple
                :disabled="!selectedRemarkId || !selectedSessionId"
                placeholder="Select event(s)"
                class="w-full"
              />
            </UFormField>

            <div class="flex items-end">
              <UButton
                label="Search"
                color="primary"
                icon="i-lucide-search"
                :loading="resultLoading"
                :disabled="selectedEventIds.length === 0 || resultLoading"
                class="w-full md:w-auto"
                @click="handleSearch"
              />
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-lg font-semibold">
                Result
              </h2>
              <CheckerHistoryPrintButton
                :result-data="resultData"
                :title="printTitle"
                :disabled="rows.length === 0"
              />
            </div>
          </template>

          <div
            v-if="resultLoading"
            class="flex items-center gap-2 text-muted py-2"
          >
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
            Loading checker history...
          </div>

          <div v-else-if="resultData == null" class="text-sm text-muted">
            No result yet. Please select and search.
          </div>

          <CheckerHistoryResultTable
            v-else
            :rows="rows"
            @open-authority="openAuthorityModal"
            @open-file="openFileModal"
          />
        </UCard>

        <CheckerHistoryAuthorityModal
          :open="isAuthorityModalOpen"
          :authority="selectedAuthority"
          @close="closeAuthorityModal"
        />
        <CheckerHistoryFilePreviewModal
          :open="isFileModalOpen"
          :path="selectedFilePath"
          :title="selectedFileTitle"
          @close="closeFileModal"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
