import { useEffect, useMemo } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Markdown } from "tiptap-markdown";
import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  CodeXml,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import "./spec-document-editor.css";

export type SpecDocSaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

type SpecDocumentEditorProps = {
  initialMarkdown: string;
  onMarkdownChange?: (markdown: string) => void;
  className?: string;
};

type ToolbarBtnProps = {
  editor: Editor;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
};

function ToolbarBtn({ onClick, active, disabled, title, children }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      className={`spec-doc-tool${active ? " is-active" : ""}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="spec-doc-tool-divider" aria-hidden />;
}

function getMarkdown(editor: Editor | null): string {
  if (!editor) return "";
  const storage = editor.storage as { markdown?: { getMarkdown?: () => string } };
  return storage.markdown?.getMarkdown?.() ?? "";
}

function setLink(editor: Editor) {
  const previous = editor.getAttributes("link").href as string | undefined;
  const url = window.prompt("Link URL", previous || "https://");
  if (url === null) return;
  if (url.trim() === "") {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
}

function insertImage(editor: Editor) {
  const url = window.prompt("Image URL");
  if (!url?.trim()) return;
  editor.chain().focus().setImage({ src: url.trim() }).run();
}

function insertTable(editor: Editor) {
  editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive("bold"),
      italic: ed.isActive("italic"),
      underline: ed.isActive("underline"),
      strike: ed.isActive("strike"),
      code: ed.isActive("code"),
      highlight: ed.isActive("highlight"),
      subscript: ed.isActive("subscript"),
      superscript: ed.isActive("superscript"),
      heading1: ed.isActive("heading", { level: 1 }),
      heading2: ed.isActive("heading", { level: 2 }),
      heading3: ed.isActive("heading", { level: 3 }),
      paragraph: ed.isActive("paragraph"),
      bulletList: ed.isActive("bulletList"),
      orderedList: ed.isActive("orderedList"),
      taskList: ed.isActive("taskList"),
      blockquote: ed.isActive("blockquote"),
      codeBlock: ed.isActive("codeBlock"),
      link: ed.isActive("link"),
      alignLeft: ed.isActive({ textAlign: "left" }),
      alignCenter: ed.isActive({ textAlign: "center" }),
      alignRight: ed.isActive({ textAlign: "right" }),
      alignJustify: ed.isActive({ textAlign: "justify" }),
      canUndo: ed.can().chain().focus().undo().run(),
      canRedo: ed.can().chain().focus().redo().run(),
      color: (ed.getAttributes("textStyle").color as string | undefined) || "#1a1f2e",
    }),
  });

  const blockValue = state.heading1
    ? "h1"
    : state.heading2
      ? "h2"
      : state.heading3
        ? "h3"
        : "p";

  return (
    <div className="spec-doc-toolbar" role="toolbar" aria-label="Formatting">
      <div className="spec-doc-tool-group">
        <ToolbarBtn
          editor={editor}
          title="Undo"
          disabled={!state.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 />
        </ToolbarBtn>
        <ToolbarBtn
          editor={editor}
          title="Redo"
          disabled={!state.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 />
        </ToolbarBtn>
      </div>

      <Divider />

      <div className="spec-doc-tool-group">
        <select
          className="spec-doc-select"
          aria-label="Text style"
          value={blockValue}
          onChange={(e) => {
            const value = e.target.value;
            const chain = editor.chain().focus();
            if (value === "p") chain.setParagraph().run();
            else if (value === "h1") chain.toggleHeading({ level: 1 }).run();
            else if (value === "h2") chain.toggleHeading({ level: 2 }).run();
            else if (value === "h3") chain.toggleHeading({ level: 3 }).run();
          }}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
      </div>

      <Divider />

      <div className="spec-doc-tool-group">
        <ToolbarBtn
          editor={editor}
          title="Bold"
          active={state.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolbarBtn>
        <ToolbarBtn
          editor={editor}
          title="Italic"
          active={state.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolbarBtn>
        <ToolbarBtn
          editor={editor}
          title="Underline"
          active={state.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon />
        </ToolbarBtn>
        <ToolbarBtn
          editor={editor}
          title="Strikethrough"
          active={state.strike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough />
        </ToolbarBtn>
        <ToolbarBtn
          editor={editor}
          title="Inline code"
          active={state.code}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code />
        </ToolbarBtn>
        <ToolbarBtn
          editor={editor}
          title="Highlight"
          active={state.highlight}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter />
        </ToolbarBtn>
        <label className="spec-doc-color-swatch" title="Text color">
          <span className="spec-doc-color-bar" style={{ background: state.color }} />
          <input
            type="color"
            value={/^#/.test(state.color) ? state.color : "#1a1f2e"}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            aria-label="Text color"
          />
          <Pilcrow style={{ opacity: 0.55, width: 14, height: 14 }} />
        </label>
      </div>

      <Divider />

      <div className="spec-doc-tool-group">
        <ToolbarBtn
          editor={editor}
          title="Subscript"
          active={state.subscript}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        >
          <SubscriptIcon />
        </ToolbarBtn>
        <ToolbarBtn
          editor={editor}
          title="Superscript"
          active={state.superscript}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        >
          <SuperscriptIcon />
        </ToolbarBtn>
        <ToolbarBtn
          editor={editor}
          title="Clear formatting"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <RemoveFormatting />
        </ToolbarBtn>
      </div>

      <Divider />

      <div className="spec-doc-tool-group">
        <ToolbarBtn
          editor={editor}
          title="Heading 1"
          active={state.heading1}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 />
        </ToolbarBtn>
        <ToolbarBtn
          editor={editor}
          title="Heading 2"
          active={state.heading2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 />
        </ToolbarBtn>
        <ToolbarBtn
          editor={editor}
          title="Heading 3"
          active={state.heading3}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 />
        </ToolbarBtn>
      </div>

      <Divider />

      <div className="spec-doc-tool-group">
        <ToolbarBtn
          editor={editor}
          title="Bullet list"
          active={state.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List />
        </ToolbarBtn>
        <ToolbarBtn
          editor={editor}
          title="Numbered list"
          active={state.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </ToolbarBtn>
        <ToolbarBtn
          editor={editor}
          title="Checklist"
          active={state.taskList}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ListTodo />
        </ToolbarBtn>
        <ToolbarBtn
          editor={editor}
          title="Quote"
          active={state.blockquote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote />
        </ToolbarBtn>
        <ToolbarBtn
          editor={editor}
          title="Code block"
          active={state.codeBlock}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <CodeXml />
        </ToolbarBtn>
        <ToolbarBtn
          editor={editor}
          title="Divider"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus />
        </ToolbarBtn>
      </div>

      <Divider />

      <div className="spec-doc-tool-group">
        <ToolbarBtn
          editor={editor}
          title="Align left"
          active={state.alignLeft}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft />
        </ToolbarBtn>
        <ToolbarBtn
          editor={editor}
          title="Align center"
          active={state.alignCenter}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter />
        </ToolbarBtn>
        <ToolbarBtn
          editor={editor}
          title="Align right"
          active={state.alignRight}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight />
        </ToolbarBtn>
        <ToolbarBtn
          editor={editor}
          title="Justify"
          active={state.alignJustify}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustify />
        </ToolbarBtn>
      </div>

      <Divider />

      <div className="spec-doc-tool-group">
        <ToolbarBtn
          editor={editor}
          title="Insert link"
          active={state.link}
          onClick={() => setLink(editor)}
        >
          <Link2 />
        </ToolbarBtn>
        <ToolbarBtn editor={editor} title="Insert image" onClick={() => insertImage(editor)}>
          <ImageIcon />
        </ToolbarBtn>
        <ToolbarBtn editor={editor} title="Insert table" onClick={() => insertTable(editor)}>
          <TableIcon />
        </ToolbarBtn>
      </div>
    </div>
  );
}

function SelectionBubble({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive("bold"),
      italic: ed.isActive("italic"),
      underline: ed.isActive("underline"),
      strike: ed.isActive("strike"),
      code: ed.isActive("code"),
      highlight: ed.isActive("highlight"),
      link: ed.isActive("link"),
    }),
  });

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 8 }}
      className="spec-doc-bubble"
    >
      <ToolbarBtn
        editor={editor}
        title="Bold"
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold />
      </ToolbarBtn>
      <ToolbarBtn
        editor={editor}
        title="Italic"
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic />
      </ToolbarBtn>
      <ToolbarBtn
        editor={editor}
        title="Underline"
        active={state.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon />
      </ToolbarBtn>
      <ToolbarBtn
        editor={editor}
        title="Strikethrough"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough />
      </ToolbarBtn>
      <ToolbarBtn
        editor={editor}
        title="Code"
        active={state.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code />
      </ToolbarBtn>
      <ToolbarBtn
        editor={editor}
        title="Highlight"
        active={state.highlight}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter />
      </ToolbarBtn>
      <ToolbarBtn
        editor={editor}
        title="Link"
        active={state.link}
        onClick={() => setLink(editor)}
      >
        <Link2 />
      </ToolbarBtn>
    </BubbleMenu>
  );
}

export function SpecDocumentEditor({
  initialMarkdown,
  onMarkdownChange,
  className,
}: SpecDocumentEditorProps) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: false,
        underline: false,
      }),
      Underline,
      TextStyle,
      Color,
      Subscript,
      Superscript,
      Highlight.configure({ multicolor: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: { rel: "noopener noreferrer nofollow" },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ allowBase64: true }),
      Typography,
      CharacterCount,
      Placeholder.configure({
        placeholder: "Start writing your spec…",
      }),
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: "-",
        linkify: false,
        breaks: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    content: initialMarkdown || "",
    // Avoid SSR/client markup mismatch for the ProseMirror mount.
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: "spec-doc-prose",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onMarkdownChange?.(getMarkdown(ed));
    },
  });

  // Re-hydrate when the server file changes (e.g. after save + refetch).
  useEffect(() => {
    if (!editor) return;
    const current = getMarkdown(editor);
    if (initialMarkdown === current) return;
    // Avoid clobbering in-progress dirty edits with identical content loads.
    editor.commands.setContent(initialMarkdown || "", { emitUpdate: false });
  }, [editor, initialMarkdown]);

  if (!editor) {
    return (
      <div className={`spec-doc-editor ${className ?? ""}`.trim()}>
        <div className="spec-doc-canvas-wrap" />
      </div>
    );
  }

  return (
    <div className={`spec-doc-editor ${className ?? ""}`.trim()}>
      <div className="spec-doc-toolbar-sticky">
        <Toolbar editor={editor} />
      </div>

      <div className="spec-doc-canvas-wrap">
        <article className="spec-doc-page">
          <div className="spec-doc-page-inner">
            <SelectionBubble editor={editor} />
            <EditorContent editor={editor} />
          </div>
        </article>
      </div>
    </div>
  );
}

export { getMarkdown };
