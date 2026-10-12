<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { apiFetch } = useApiFetch();
const { authUser } = useAuth();
const training = useTrainingMode();
const canSyncEchain = computed(() => authUser.value?.authenticationType === "AIRNAV_SSO");
const schema = z.object({
  note: z.string().min(2, "Note must be at least 2 characters"),
  licenseExpiredDate: z.string().min(1, "License expired date is required"),
  file: z.instanceof(File).optional(),
  echainFileName: z.string().nullable().optional(),
  echainFileUrl: z.string().nullable().optional(),
  echainFileMimeType: z.string().nullable().optional(),
  syncData: z.boolean().default(false),
});

const open = ref(false);
const records=ref<Array<{data:LicenseSyncResponse['data'];syncReceipt:string}>>([]);
const selectedRecord=ref<number|null>(null);
const syncReceipt=ref<string|null>(null);
function selectRecord(index:number){
 const record=records.value[index];if(!record)return;
 selectedRecord.value=index;syncReceipt.value=record.syncReceipt;
 Object.assign(state,{note:record.data.note,licenseExpiredDate:record.data.licenseExpiredDate,file:undefined,
  echainFileName:record.data.fileName??null,echainFileUrl:record.data.fileUrl??null,echainFileMimeType:record.data.fileMimeType??null,syncData:true});
}
function manualInput(){
 if(loading.value)return;
 records.value=[];selectedRecord.value=null;syncReceipt.value=null;
 Object.assign(state,{note:undefined,licenseExpiredDate:undefined,file:undefined,echainFileName:null,echainFileUrl:null,echainFileMimeType:null,syncData:false});
}

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  note: undefined,
  licenseExpiredDate: undefined,
  file: undefined,
  echainFileName: null,
  echainFileUrl: null,
  echainFileMimeType: null,
  syncData: false,
});

const toast = useToast();
const loading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

interface LicenseSyncResponse {
  success: boolean;
  message?: string;
  data: {
    note?: string;
    licenseExpiredDate?: string;
    fileName?: string | null;
    fileUrl?: string | null;
    fileMimeType?: string | null;
    rating?:string;
    level?:string|null;
    released?:string;
    testDate?:string;
  };
  records:Array<{data:LicenseSyncResponse['data'];syncReceipt:string}>;
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    state.file = target.files[0];
    state.echainFileName = null;
    state.echainFileUrl = null;
    state.echainFileMimeType = null;
  }
}

function triggerFileInput() {
  fileInput.value?.click();
}

async function syncFromSystem() {
  if(loading.value)return;
  manualInput();state.syncData=true;
  loading.value = true;

  try {
    const response = (await apiFetch(
      "/api/licenseUser/sync-echain",
      {
        method: "POST",
      },
    )) as LicenseSyncResponse;

    if(!response.success||!response.records?.length)throw new Error('No performance-check records returned.');
    records.value=response.records;
    if(records.value.length===1)selectRecord(0);

    toast.add({
      title: "Sync Success",
      description: records.value.length>1?'Several records share the newest check date. Choose the correct record.':'Newest ECHAIN performance check loaded. Review before saving.',
      color: "success",
    });
  } catch (error: any) {
    const errorMessage =
      error?.data?.message ||
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to sync license data. Please try again.";
    toast.add({
      title: "Sync Failed",
      description: errorMessage,
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if(loading.value)return;
  if(state.syncData&&(!syncReceipt.value||selectedRecord.value===null))return;
  loading.value = true;

  try {
    // Create FormData for file upload
    const formData = new FormData();

    formData.append("note", event.data.note);
    formData.append("licenseExpiredDate", event.data.licenseExpiredDate);
    if(state.syncData&&syncReceipt.value){formData.append('source','ECHAIN_PERFORMANCE');formData.append('syncReceipt',syncReceipt.value);}

    // Append file ONLY if it exists and is a File
    if (event.data.file instanceof File) {
      formData.append("file", event.data.file);
    }

    if (!event.data.file && event.data.echainFileUrl) {
      formData.append("echainFileUrl", event.data.echainFileUrl);
      if (event.data.echainFileName) {
        formData.append("echainFileName", event.data.echainFileName);
      }
      if (event.data.echainFileMimeType) {
        formData.append("echainFileMimeType", event.data.echainFileMimeType);
      }
    }

    // Call local Nuxt API route (which will forward to backend)
    await apiFetch("/api/licenseUser/", {
      method: "POST",
      body: formData,
    });

    toast.add({
      title: "Success",
      description: `License "${event.data.note}" has been created successfully`,
      color: "success",
    });

    // Reset form and close modal
    state.note = undefined;
    state.licenseExpiredDate = undefined;
    state.file = undefined;
    state.echainFileName = null;
    state.echainFileUrl = null;
    state.echainFileMimeType = null;
    state.syncData = false;
    records.value=[];selectedRecord.value=null;syncReceipt.value=null;
    open.value = false;

    // Emit event to refresh parent table
    emit("licenseAdded");
  } catch (error: any) {
    const errorMessage =
      error?.data?.message || error?.data?.statusMessage ||
      error?.message ||
      "Failed to create license. Please try again.";
    toast.add({
      title: "Error",
      description: errorMessage,
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

const emit = defineEmits<{
  licenseAdded: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Add New License"
    description="Create a new license document"
  >
    <UButton label="Add License" icon="i-lucide-plus" color="primary" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <!-- Sync Button -->
        <div v-if="canSyncEchain" class="flex items-center gap-2 p-3 bg-elevated/50 rounded-lg">
          <UIcon name="i-lucide-refresh-cw" class="text-primary" />
          <div class="flex-1">
            <p class="text-sm font-medium">Sync from External System</p>
            <p class="text-xs text-muted">
              Import the newest ECHAIN performance check across all ratings
            </p>
          </div>
          <UButton
            label="Sync"
            color="primary"
            variant="soft"
            size="sm"
            :loading="loading"
            @click="syncFromSystem"
          />
        </div>
        <div v-if="state.syncData" class="space-y-3 rounded-lg bg-elevated/50 p-3">
          <p class="text-sm">Review the performance-check record before adding it as a license document. ECHAIN expiry is preserved, including expired records.</p>
          <fieldset v-if="records.length>1" class="space-y-2">
            <legend class="text-sm font-medium">Choose a record from the newest check date</legend>
            <label v-for="(record,index) in records" :key="record.syncReceipt" class="block border rounded p-2 text-sm">
              <input type="radio" name="performance-record" :checked="selectedRecord===index" :disabled="loading" @change="selectRecord(index)" />
              {{record.data.rating}} · Check: {{record.data.testDate}} · Expiry: {{record.data.licenseExpiredDate}}
              <span class="block text-xs text-muted">{{record.data.fileName || 'No ECHAIN document available'}}</span>
            </label>
          </fieldset>
          <p v-if="selectedRecord!==null" class="text-sm">Rating: {{records[selectedRecord]?.data.rating}} · Level: {{records[selectedRecord]?.data.level || 'Not provided'}} · Check date: {{records[selectedRecord]?.data.testDate}}</p>
          <UButton label="Use manual input instead" color="neutral" variant="outline" :disabled="loading" @click="manualInput" />
        </div>

        <UFormField
          label="Note"
          placeholder="Enter license note"
          name="note"
          required
        >
          <UInput
            v-model="state.note"
            class="w-full"
            placeholder="e.g., License 2025 SMT 1"
            :disabled="state.syncData"
          />
        </UFormField>

        <UFormField
          label="License Expiration Date"
          name="licenseExpiredDate"
          required
        >
          <UInput
            v-model="state.licenseExpiredDate"
            type="date"
            class="w-full"
            :disabled="state.syncData"
          />
        </UFormField>

        <UFormField label="License File" name="file">
          <div class="flex items-center gap-2">
            <input
              ref="fileInput"
              type="file"
              accept=".pdf,.doc,.docx"
              class="hidden"
              @change="handleFileChange"
            />
            <UButton
              v-if="!state.syncData && !training.active.value"
              label="Choose File"
              color="neutral"
              variant="outline"
              icon="i-lucide-upload"
              @click="triggerFileInput"
            />
            <TrainingSampleButton v-else-if="!state.syncData" sample="LICENSE.pdf" @selected="state.file = $event" />
            <span v-if="state.file" class="text-sm text-muted">
              {{ state.file.name }}
            </span>
            <span v-else-if="state.echainFileName" class="text-sm text-muted">
              {{ state.echainFileName }}
            </span>
            <span v-else class="text-sm text-muted">No file selected</span>
          </div>
        </UFormField>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            label="Create License"
            color="primary"
            variant="solid"
            type="submit"
            :loading="loading"
            :disabled="loading || (state.syncData && (!syncReceipt || selectedRecord===null))"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
