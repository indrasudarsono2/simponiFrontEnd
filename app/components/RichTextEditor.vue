<script setup lang="ts">
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
  }>(),
  {
    modelValue: "",
    placeholder: "Start typing...",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const editor = useEditor({
  content: props.modelValue ?? "",
  extensions: [StarterKit],
  editorProps: {
    attributes: {
      class: "focus:outline-none",
    },
  },
  onUpdate: ({ editor }) => {
    emit("update:modelValue", editor.getHTML());
  },
});

const isEmpty = computed(() => {
  if (!editor.value) return true;
  return editor.value.isEmpty;
});

watch(
  () => props.modelValue,
  (newValue) => {
    const val = newValue ?? "";
    if (editor.value && editor.value.getHTML() !== val) {
      editor.value.commands.setContent(val);
    }
  },
);

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<template>
  <div
    class="border border-default rounded-md bg-background overflow-hidden w-full"
  >
    <!-- Toolbar -->
    <div
      class="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-default bg-elevated/50"
    >
      <!-- Bold -->
      <UButton
        icon="i-lucide-bold"
        color="neutral"
        :variant="editor?.isActive('bold') ? 'solid' : 'ghost'"
        size="xs"
        :disabled="!editor"
        title="Bold"
        @click="editor?.chain().focus().toggleBold().run()"
      />
      <!-- Italic -->
      <UButton
        icon="i-lucide-italic"
        color="neutral"
        :variant="editor?.isActive('italic') ? 'solid' : 'ghost'"
        size="xs"
        :disabled="!editor"
        title="Italic"
        @click="editor?.chain().focus().toggleItalic().run()"
      />

      <div class="w-px h-5 bg-default mx-0.5" />

      <!-- Heading 1 -->
      <UButton
        icon="i-lucide-heading-1"
        color="neutral"
        :variant="editor?.isActive('heading', { level: 1 }) ? 'solid' : 'ghost'"
        size="xs"
        :disabled="!editor"
        title="Heading 1"
        @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
      />
      <!-- Heading 2 -->
      <UButton
        icon="i-lucide-heading-2"
        color="neutral"
        :variant="editor?.isActive('heading', { level: 2 }) ? 'solid' : 'ghost'"
        size="xs"
        :disabled="!editor"
        title="Heading 2"
        @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
      />

      <div class="w-px h-5 bg-default mx-0.5" />

      <!-- Bullet List -->
      <UButton
        icon="i-lucide-list"
        color="neutral"
        :variant="editor?.isActive('bulletList') ? 'solid' : 'ghost'"
        size="xs"
        :disabled="!editor"
        title="Bullet List"
        @click="editor?.chain().focus().toggleBulletList().run()"
      />
      <!-- Ordered List -->
      <UButton
        icon="i-lucide-list-ordered"
        color="neutral"
        :variant="editor?.isActive('orderedList') ? 'solid' : 'ghost'"
        size="xs"
        :disabled="!editor"
        title="Numbered List"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      />

      <div class="w-px h-5 bg-default mx-0.5" />

      <!-- Blockquote -->
      <UButton
        icon="i-lucide-quote"
        color="neutral"
        :variant="editor?.isActive('blockquote') ? 'solid' : 'ghost'"
        size="xs"
        :disabled="!editor"
        title="Blockquote"
        @click="editor?.chain().focus().toggleBlockquote().run()"
      />

      <div class="w-px h-5 bg-default mx-0.5" />

      <!-- Undo -->
      <UButton
        icon="i-lucide-undo-2"
        color="neutral"
        variant="ghost"
        size="xs"
        :disabled="!editor?.can().undo()"
        title="Undo"
        @click="editor?.chain().focus().undo().run()"
      />
      <!-- Redo -->
      <UButton
        icon="i-lucide-redo-2"
        color="neutral"
        variant="ghost"
        size="xs"
        :disabled="!editor?.can().redo()"
        title="Redo"
        @click="editor?.chain().focus().redo().run()"
      />
    </div>

    <!-- Editor Area -->
    <div class="relative">
      <EditorContent :editor="editor" class="rich-editor-content" />
      <!-- Placeholder -->
      <div
        v-if="isEmpty"
        class="absolute top-2 left-3 text-muted pointer-events-none text-sm select-none"
      >
        {{ placeholder }}
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.ProseMirror) {
  min-height: 120px;
  padding: 0.5rem 0.75rem;
  outline: none;
  font-size: 0.875rem;
  line-height: 1.6;
  word-break: break-word;
}

:deep(.ProseMirror ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin: 0.4rem 0;
}

:deep(.ProseMirror ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin: 0.4rem 0;
}

:deep(.ProseMirror li) {
  margin: 0.2rem 0;
}

:deep(.ProseMirror li p) {
  margin: 0;
}

:deep(.ProseMirror h1) {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0.6rem 0 0.3rem;
  line-height: 1.3;
}

:deep(.ProseMirror h2) {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0.6rem 0 0.3rem;
  line-height: 1.3;
}

:deep(.ProseMirror p) {
  margin: 0.2rem 0;
}

:deep(.ProseMirror strong) {
  font-weight: 700;
}

:deep(.ProseMirror em) {
  font-style: italic;
}

:deep(.ProseMirror blockquote) {
  border-left: 3px solid var(--color-primary-500, #6366f1);
  padding-left: 0.75rem;
  margin: 0.5rem 0;
  color: var(--color-muted);
  font-style: italic;
}

:deep(.ProseMirror > * + *) {
  margin-top: 0.3rem;
}
</style>
