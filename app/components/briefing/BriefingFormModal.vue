<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface Profession {
  profession: string;
}

interface ProfessionInBranch {
  id: number;
  profession: Profession | null;
}

interface ProfessionInBranchResponse {
  professionInBranch: ProfessionInBranch[];
}

interface ContentOfBriefing {
  id: number;
  contentOfBriefing: string | null;
  file: string | null;
}

interface Briefing {
  id: number;
  contentOfBriefings?: ContentOfBriefing[];
  briefingDestinations?: {
    id: number;
    professionInBranch: ProfessionInBranch | null;
  }[];
}

const props = defineProps<{
  briefing?: Briefing | null;
  mode: "add" | "edit";
  open: boolean;
}>();

const emit = defineEmits<{
  "saved": [];
  "update:open": [value: boolean];
}>();

const { token } = useAuth();
const toast = useToast();

const openState = computed({
  get: () => props.open,
  set: (value: boolean) => emit("update:open", value),
});

const loading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const selectedFileName = ref("");
const state = reactive({
  professionInBranchIds: [] as number[],
  contentOfBriefing: "",
});

const {
  data: professionData,
  status: professionStatus,
  refresh: refreshProfessionDestinations,
} = await useFetch<ProfessionInBranchResponse>(
  `${apiBaseUrl}/api/professionInBranch`,
  {
    immediate: false,
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

const destinationOptions = computed(() =>
  (professionData.value?.professionInBranch || []).map((item) => ({
    value: item.id,
    label: item.profession?.profession || `Profession #${item.id}`,
  })),
);

const selectedDestinations = computed(() => {
  const selectedIds = new Set(state.professionInBranchIds);
  return (professionData.value?.professionInBranch || []).filter((item) =>
    selectedIds.has(item.id),
  );
});

const canSubmit = computed(
  () =>
    state.professionInBranchIds.length > 0 &&
    stripHtml(state.contentOfBriefing).length > 0,
);

const modalTitle = computed(() =>
  props.mode === "add" ? "Add Briefing" : "Edit Briefing",
);
const modalDescription = computed(() =>
  props.mode === "add"
    ? "Write a briefing and choose where it should be sent."
    : "Update a briefing and adjust where it should be sent.",
);
const submitLabel = computed(() =>
  props.mode === "add" ? "Create Briefing" : "Update Briefing",
);
const emptyFileText = computed(() =>
  props.mode === "add" ? "No file selected" : "Keep existing file",
);

function syncFromProps() {
  state.professionInBranchIds =
    props.briefing?.briefingDestinations
      ?.map((item) => item.professionInBranch?.id)
      .filter((value): value is number => Number.isInteger(value)) || [];
  state.contentOfBriefing =
    props.briefing?.contentOfBriefings?.[0]?.contentOfBriefing || "";
  selectedFile.value = null;
  selectedFileName.value =
    props.mode === "edit"
      ? props.briefing?.contentOfBriefings?.[0]?.file?.split("/").pop() || ""
      : "";
  if (fileInput.value) fileInput.value.value = "";
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return;

    try {
      await refreshProfessionDestinations();
      syncFromProps();
    } catch (error: any) {
      toast.add({
        title: "Error",
        description:
          error?.data?.message ||
          error?.message ||
          "Failed to load destination professions.",
        color: "error",
      });
    }
  },
);

watch(
  () => props.briefing,
  () => {
    if (props.open && props.mode === "edit") {
      syncFromProps();
    }
  },
);

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  selectedFile.value = file;
  selectedFileName.value = file.name;
}

async function submit() {
  if (!canSubmit.value) {
    toast.add({
      title: "Incomplete briefing",
      description:
        "Please choose destination professions and fill the briefing content.",
      color: "warning",
    });
    return;
  }

  loading.value = true;

  try {
    const formData = new FormData();
    state.professionInBranchIds.forEach((id) => {
      formData.append("professionInBranchIds", String(id));
    });
    formData.append("contentOfBriefing", state.contentOfBriefing);
    if (selectedFile.value) {
      formData.append("briefingFile", selectedFile.value);
    }

    const url =
      props.mode === "add"
        ? `${apiBaseUrl}/api/briefings/create`
        : `${apiBaseUrl}/api/briefings/${props.briefing?.id}`;
    const method = props.mode === "add" ? "POST" : "PUT";

    await $fetch(url, {
      method,
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
      body: formData,
    });

    toast.add({
      title: "Success",
      description:
        props.mode === "add"
          ? "Briefing data has been created successfully."
          : "Briefing data has been updated successfully.",
      color: "success",
    });

    emit("saved");
    openState.value = false;
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        `Failed to ${props.mode} briefing data.`,
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="openState"
    :title="modalTitle"
    :description="modalDescription"
    :ui="{ content: 'max-w-4xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField
          label="Destination Profession"
          required
          :hint="`${destinationOptions.length} profession destinations available`"
        >
          <USelectMenu
            v-model="state.professionInBranchIds"
            :items="destinationOptions"
            value-key="value"
            label-key="label"
            multiple
            searchable
            class="w-full"
            placeholder="Select profession destination(s)"
            :loading="professionStatus === 'pending'"
          />
        </UFormField>

        <p
          v-if="professionStatus !== 'pending' && destinationOptions.length === 0"
          class="text-sm text-muted"
        >
          No destination profession found for your branch.
        </p>

        <UFormField label="Briefing Content" required>
          <RichTextEditor
            v-model="state.contentOfBriefing"
            placeholder="Write the briefing details here..."
          />
        </UFormField>

        <UFormField label="Briefing File">
          <div class="space-y-2">
            <input
              ref="fileInput"
              type="file"
              class="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              @change="handleFileChange"
            />
            <p class="text-xs text-muted">
              <template v-if="mode === 'add'">
                Optional. Supported: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX,
                images.
              </template>
              <template v-else>
                Optional. Upload a new file only if you want to replace the
                existing one.
              </template>
            </p>
            <p v-if="selectedFileName" class="text-sm text-muted">
              <template v-if="mode === 'add'">Selected file:</template>
              <template v-else>Current file:</template>
              <span class="font-medium">{{ selectedFileName }}</span>
            </p>
          </div>
        </UFormField>

        <div
          class="rounded-lg border border-default bg-elevated/40 p-4 space-y-3"
        >
          <div>
            <p class="text-sm font-semibold text-highlighted">Summary</p>
            <p class="text-sm text-muted">
              Confirm where this briefing should be delivered.
            </p>
          </div>

          <div class="text-sm">
            <span class="text-muted">Destination count:</span>
            <span class="ml-2 font-medium">
              {{ selectedDestinations.length }}
            </span>
          </div>

          <div
            v-if="selectedDestinations.length > 0"
            class="flex flex-wrap gap-2"
          >
            <UBadge
              v-for="destination in selectedDestinations"
              :key="destination.id"
              color="primary"
              variant="soft"
            >
              {{
                destination.profession?.profession ||
                `Profession #${destination.id}`
              }}
            </UBadge>
          </div>
          <p v-else class="text-sm text-muted">
            No profession destination selected yet.
          </p>

          <div
            v-if="stripHtml(state.contentOfBriefing).length > 0"
            class="rounded-md border border-default bg-background p-3"
          >
            <p class="mb-2 text-sm text-muted">Briefing preview</p>
            <div
              class="rich-preview text-sm [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
              v-html="state.contentOfBriefing"
            />
          </div>

          <div class="text-sm">
            <span class="text-muted">File:</span>
            <span class="ml-2 font-medium">
              {{ selectedFileName || emptyFileText }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="soft"
          :disabled="loading"
          @click="openState = false"
        />
        <UButton
          :label="submitLabel"
          color="primary"
          :loading="loading"
          :disabled="!canSubmit"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>
