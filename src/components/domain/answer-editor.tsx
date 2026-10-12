"use client";

import * as React from "react";
import { EditorContent, Extension, Mark, mergeAttributes, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Redo2,
  Strikethrough,
  Subscript as SubIcon,
  Superscript as SupIcon,
  Underline,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = [
  { id: "red", label: "Đỏ", swatch: "bg-danger" },
  { id: "blue", label: "Xanh dương", swatch: "bg-info" },
  { id: "green", label: "Xanh lá", swatch: "bg-success" },
  { id: "orange", label: "Cam", swatch: "bg-primary" },
] as const;
const SYMBOLS = ["√", "×", "÷", "±", "≤", "≥", "≠", "≈", "→", "⇒", "⇔", "∞", "π", "α", "β", "Δ", "°", "∈", "∉", "⊂", "∪", "∩", "∅", "∀", "∃", "∑", "∫", "½"];
const MAX_INDENT = 4;

// Màu chữ lưu bằng data-color (không lưu style) để server lọc theo danh sách cho phép.
const TextColor = Mark.create({
  name: "textColor",
  addAttributes() {
    return { color: { default: null, parseHTML: (el) => el.getAttribute("data-color"), renderHTML: (a) => (a.color ? { "data-color": a.color } : {}) } };
  },
  parseHTML() {
    return [{ tag: "span[data-color]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
});

// Căn lề và thụt lề của đoạn văn, cũng lưu bằng data-attribute.
const BlockLayout = Extension.create({
  name: "blockLayout",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          align: { default: null, parseHTML: (el) => el.getAttribute("data-align"), renderHTML: (a) => (a.align ? { "data-align": a.align } : {}) },
          indent: { default: 0, parseHTML: (el) => Number(el.getAttribute("data-indent")) || 0, renderHTML: (a) => (a.indent ? { "data-indent": String(a.indent) } : {}) },
        },
      },
    ];
  },
});

function setBlockAttr(editor: Editor, attrs: Record<string, unknown>) {
  editor.chain().focus().updateAttributes("paragraph", attrs).updateAttributes("heading", attrs).run();
}

function currentBlock(editor: Editor) {
  const name = editor.isActive("heading") ? "heading" : "paragraph";
  return editor.getAttributes(name) as { align?: string | null; indent?: number };
}

function ToolButton({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      // Giữ vùng chọn trong bài làm khi bấm nút
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "focus-visible:ring-ring flex size-9 shrink-0 items-center justify-center rounded-[10px] text-sm font-semibold focus-visible:ring-2 focus-visible:outline-hidden disabled:opacity-40 [&_svg]:size-4",
        active ? "bg-primary-soft text-primary" : "hover:bg-surface",
      )}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="bg-border mx-1 h-5 w-px shrink-0" aria-hidden="true" />;

/**
 * Trình soạn bài làm của học sinh. Xuất HTML; server lọc lại bằng sanitizeAnswerHtml trước khi lưu.
 * `initialHtml` chỉ đọc lúc khởi tạo; muốn nạp nội dung khác thì đổi `key` của component.
 */
export function AnswerEditor({ id, initialHtml, onChange, onBlur }: { id: string; initialHtml: string; onChange: (html: string, text: string) => void; onBlur?: () => void }) {
  const [full, setFull] = React.useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ link: false, code: false, codeBlock: false, horizontalRule: false, heading: { levels: [2, 3] } }), Subscript, Superscript, TextColor, BlockLayout],
    content: initialHtml,
    editorProps: { attributes: { id, role: "textbox", "aria-multiline": "true", "aria-label": "Bài làm", class: "rich-content answer-editor-body" } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML(), e.getText()),
    onBlur: () => onBlur?.(),
  });

  React.useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);

  if (!editor) {
    return <div className="border-border bg-surface min-h-[380px] animate-pulse rounded-[16px] border" aria-hidden="true" />;
  }
  return <EditorShell editor={editor} id={id} full={full} onToggleFull={() => setFull((v) => !v)} />;
}

function EditorShell({ editor, id, full, onToggleFull }: { editor: Editor; id: string; full: boolean; onToggleFull: () => void }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const block = currentBlock(e);
      return {
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        strike: e.isActive("strike"),
        sub: e.isActive("subscript"),
        sup: e.isActive("superscript"),
        heading: e.isActive("heading", { level: 2 }),
        bullet: e.isActive("bulletList"),
        ordered: e.isActive("orderedList"),
        inList: e.isActive("listItem"),
        color: (e.getAttributes("textColor").color as string | null) ?? null,
        align: block.align ?? "left",
        indent: block.indent ?? 0,
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
        words: e.getText().trim() ? e.getText().trim().split(/\s+/).length : 0,
      };
    },
  });

  const chain = () => editor.chain().focus();
  const indentBy = (d: number) => {
    if (state.inList) {
      if (d > 0) chain().sinkListItem("listItem").run();
      else chain().liftListItem("listItem").run();
      return;
    }
    setBlockAttr(editor, { indent: Math.max(0, Math.min(MAX_INDENT, state.indent + d)) });
  };

  return (
    <div className={cn("flex flex-col", full && "bg-background fixed inset-0 z-50 p-3 md:p-8")}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold">
          Bài làm
        </label>
        <button
          type="button"
          onClick={onToggleFull}
          aria-pressed={full}
          className="text-muted hover:text-foreground focus-visible:ring-ring rounded-control inline-flex min-h-9 items-center gap-1.5 px-2 text-xs font-semibold focus-visible:ring-2 focus-visible:outline-hidden"
        >
          {full ? <Minimize2 className="size-4" aria-hidden="true" /> : <Maximize2 className="size-4" aria-hidden="true" />}
          {full ? "Thu nhỏ (Esc)" : "Viết toàn màn hình"}
        </button>
      </div>

      <div className={cn("border-border bg-surface focus-within:ring-ring flex flex-col overflow-hidden rounded-[16px] border shadow-sm focus-within:ring-2", full && "mx-auto min-h-0 w-full max-w-4xl flex-1")}>
        <div role="toolbar" aria-label="Định dạng bài làm" className="border-border bg-surface-2 flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
          <ToolButton label="Hoàn tác" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
            <Undo2 />
          </ToolButton>
          <ToolButton label="Làm lại" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
            <Redo2 />
          </ToolButton>
          <Divider />
          <ToolButton label="In đậm (Ctrl+B)" active={state.bold} onClick={() => chain().toggleBold().run()}>
            <Bold />
          </ToolButton>
          <ToolButton label="In nghiêng (Ctrl+I)" active={state.italic} onClick={() => chain().toggleItalic().run()}>
            <Italic />
          </ToolButton>
          <ToolButton label="Gạch chân (Ctrl+U)" active={state.underline} onClick={() => chain().toggleUnderline().run()}>
            <Underline />
          </ToolButton>
          <ToolButton label="Gạch ngang" active={state.strike} onClick={() => chain().toggleStrike().run()}>
            <Strikethrough />
          </ToolButton>
          <ToolButton label="Chỉ số trên, ví dụ x²" active={state.sup} onClick={() => chain().unsetSubscript().toggleSuperscript().run()}>
            <SupIcon />
          </ToolButton>
          <ToolButton label="Chỉ số dưới, ví dụ H₂O" active={state.sub} onClick={() => chain().unsetSuperscript().toggleSubscript().run()}>
            <SubIcon />
          </ToolButton>
          <Divider />
          <ToolButton label="Màu chữ mặc định" active={!state.color} onClick={() => chain().unsetMark("textColor").run()}>
            <span className="bg-foreground size-4 rounded-full" aria-hidden="true" />
          </ToolButton>
          {COLORS.map((c) => (
            <ToolButton key={c.id} label={`Chữ màu ${c.label.toLowerCase()}`} active={state.color === c.id} onClick={() => chain().setMark("textColor", { color: c.id }).run()}>
              <span className={cn("size-4 rounded-full", c.swatch)} aria-hidden="true" />
            </ToolButton>
          ))}
          <Divider />
          <ToolButton label="Tiêu đề" active={state.heading} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
            <Heading2 />
          </ToolButton>
          <ToolButton label="Gạch đầu dòng" active={state.bullet} onClick={() => chain().toggleBulletList().run()}>
            <List />
          </ToolButton>
          <ToolButton label="Danh sách đánh số" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}>
            <ListOrdered />
          </ToolButton>
          <ToolButton label="Giảm thụt lề" disabled={!state.inList && state.indent === 0} onClick={() => indentBy(-1)}>
            <IndentDecrease />
          </ToolButton>
          <ToolButton label="Tăng thụt lề" disabled={!state.inList && state.indent >= MAX_INDENT} onClick={() => indentBy(1)}>
            <IndentIncrease />
          </ToolButton>
          <Divider />
          <ToolButton label="Căn trái" active={state.align === "left"} onClick={() => setBlockAttr(editor, { align: null })}>
            <AlignLeft />
          </ToolButton>
          <ToolButton label="Căn giữa" active={state.align === "center"} onClick={() => setBlockAttr(editor, { align: "center" })}>
            <AlignCenter />
          </ToolButton>
          <ToolButton label="Căn phải" active={state.align === "right"} onClick={() => setBlockAttr(editor, { align: "right" })}>
            <AlignRight />
          </ToolButton>
          <ToolButton label="Căn đều hai bên" active={state.align === "justify"} onClick={() => setBlockAttr(editor, { align: "justify" })}>
            <AlignJustify />
          </ToolButton>
        </div>

        <div role="toolbar" aria-label="Chèn ký hiệu" className="border-border flex gap-0.5 overflow-x-auto border-b px-2 py-1">
          {SYMBOLS.map((sym) => (
            <ToolButton key={sym} label={`Chèn ${sym}`} onClick={() => chain().insertContent(sym).run()}>
              <span className="text-base">{sym}</span>
            </ToolButton>
          ))}
        </div>

        <EditorContent editor={editor} className={cn("cursor-text overflow-y-auto", full ? "min-h-0 flex-1" : "max-h-[70vh] min-h-[320px]")} onClick={() => editor.isFocused || editor.commands.focus()} />
        <p className="text-muted border-border border-t px-4 py-1.5 text-right text-xs tabular-nums">{state.words} từ</p>
      </div>
    </div>
  );
}

/** Chuyển bài làm văn bản thuần (bài cũ, nháp cũ) sang HTML để mở trong trình soạn. */
export function plainTextToHtml(text: string) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split("\n")
    .map((line) => `<p>${esc(line)}</p>`)
    .join("");
}
