"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AtSign,
  Bold,
  ChevronDown,
  Code2,
  Highlighter,
  ImagePlus,
  Italic,
  List,
  Link2,
  PaintBucket,
  Palette,
  Paperclip,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Underline as UnderlineIcon,
  Undo2
} from "lucide-react";
import { cn } from "../lib/utils";

const headingLevels = [1, 2, 3, 4, 5, 6] as const;
const textColors = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#9333ea", "#ea580c"] as const;
const backgroundColors = [
  "#ffffff",
  "#fee2e2",
  "#dbeafe",
  "#dcfce7",
  "#fef3c7",
  "#f3e8ff"
] as const;
const highlightColors = ["#fef08a", "#bfdbfe", "#bbf7d0", "#fecaca", "#e9d5ff", "#fed7aa"] as const;
const mentionItems = [
  { id: "codeit", label: "CODEIT" },
  { id: "zero", label: "ZERO" },
  { id: "super-admin", label: "Super Admin" },
  { id: "tenant-admin", label: "Tenant Admin" },
  { id: "support", label: "Support" },
  { id: "developer", label: "Developer" },
  { id: "reviewer", label: "Reviewer" },
  { id: "release-manager", label: "Release Manager" }
] as const;

type MentionItem = (typeof mentionItems)[number];
type MentionSuggestionProps = SuggestionProps<MentionItem>;

const TextBackgroundColor = Extension.create({
  name: "textBackgroundColor",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element) => element.style.backgroundColor || null,
            renderHTML: (attributes) => {
              if (!attributes.backgroundColor) return {};
              return { style: `background-color: ${attributes.backgroundColor}` };
            }
          }
        }
      }
    ];
  }
});

const mentionSuggestion = {
  items: ({ query }: { query: string }) => {
    const normalizedQuery = query.trim().toLowerCase();
    return mentionItems
      .filter(
        (item) =>
          !normalizedQuery ||
          item.label.toLowerCase().includes(normalizedQuery) ||
          item.id.includes(normalizedQuery)
      )
      .slice(0, 8);
  },
  render: () => {
    let container: HTMLDivElement | null = null;
    let selectedIndex = 0;
    let latestProps: MentionSuggestionProps | null = null;

    function selectItem(index: number) {
      const item = latestProps?.items[index];
      if (!item || !latestProps) return;
      latestProps.command(item);
    }

    function updatePosition(props: MentionSuggestionProps) {
      if (!container || !props.clientRect) return;
      const rect = props.clientRect();
      if (!rect) return;
      container.style.left = `${rect.left}px`;
      container.style.top = `${rect.bottom + 8}px`;
    }

    function renderItems(props: MentionSuggestionProps) {
      if (!container) return;
      latestProps = props;
      selectedIndex = Math.min(selectedIndex, Math.max(props.items.length - 1, 0));
      container.innerHTML = "";

      if (!props.items.length) {
        const empty = document.createElement("div");
        empty.className = "px-3 py-2 text-xs text-muted-foreground";
        empty.textContent = "No mentions";
        container.appendChild(empty);
        updatePosition(props);
        return;
      }

      for (const [index, item] of props.items.entries()) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
          index === selectedIndex
            ? "bg-accent text-accent-foreground"
            : "text-foreground hover:bg-muted"
        );
        const marker = document.createElement("span");
        marker.className =
          "flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold";
        marker.textContent = "@";
        const label = document.createElement("span");
        label.textContent = item.label;
        button.append(marker, label);
        button.addEventListener("mousedown", (event) => {
          event.preventDefault();
          selectItem(index);
        });
        container.appendChild(button);
      }

      updatePosition(props);
    }

    return {
      onStart: (props: MentionSuggestionProps) => {
        selectedIndex = 0;
        container = document.createElement("div");
        container.className =
          "z-50 min-w-44 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md";
        container.style.position = "fixed";
        document.body.appendChild(container);
        renderItems(props);
      },
      onUpdate: (props: MentionSuggestionProps) => {
        renderItems(props);
      },
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        const itemCount = latestProps?.items.length ?? 0;

        if (event.key === "Escape") {
          container?.remove();
          container = null;
          return true;
        }

        if (!itemCount) return false;

        if (event.key === "ArrowUp") {
          selectedIndex = (selectedIndex + itemCount - 1) % itemCount;
          if (latestProps) renderItems(latestProps);
          return true;
        }

        if (event.key === "ArrowDown") {
          selectedIndex = (selectedIndex + 1) % itemCount;
          if (latestProps) renderItems(latestProps);
          return true;
        }

        if (event.key === "Enter" || event.key === "Tab") {
          selectItem(selectedIndex);
          return true;
        }

        return false;
      },
      onExit: () => {
        container?.remove();
        container = null;
        latestProps = null;
      }
    };
  }
};

export function WorkspaceEditor({
  className,
  content,
  onChange,
  placeholder = "Start typing..."
}: {
  className?: string;
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}) {
  const [mode, setMode] = React.useState<"write" | "preview">("write");
  const headingSelectId = React.useId();
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: "rounded-md border border-border"
        }
      }),
      Underline,
      Superscript,
      Subscript,
      TextAlign.configure({
        types: ["heading", "paragraph"]
      }),
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "rounded bg-accent px-1 py-0.5 font-medium text-accent-foreground"
        },
        renderHTML: ({ node }) => [
          "span",
          { class: "rounded bg-accent px-1 py-0.5 font-medium text-accent-foreground" },
          `@${node.attrs.label ?? node.attrs.id}`
        ],
        suggestion: mentionSuggestion
      }),
      TextBackgroundColor,
      Placeholder.configure({ placeholder }),
      Link.configure({
        autolink: true,
        defaultProtocol: "https",
        openOnClick: false
      })
    ],
    content: content ?? "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[132px] px-4 py-4 focus:outline-none"
      }
    },
    onUpdate: ({ editor }) => onChange?.(editor.getHTML())
  });

  React.useEffect(() => {
    if (!editor || content === undefined || content === editor.getHTML()) return;
    editor.commands.setContent(content, false);
  }, [content, editor]);

  if (!editor) return null;
  const activeEditor = editor;

  function toggleLink() {
    const previousUrl = activeEditor.getAttributes("link").href;
    const url = window.prompt("Enter URL", previousUrl ?? "");
    if (url === null) return;
    if (url === "") {
      activeEditor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    activeEditor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  function toggleCodeBlock() {
    if (activeEditor.isActive("codeBlock")) {
      activeEditor.chain().focus().toggleCodeBlock().run();
      return;
    }

    const language = window.prompt(
      "Code language. Leave blank for plain code block.",
      "typescript"
    );
    if (language === null) return;
    const trimmedLanguage = language.trim();
    if (!trimmedLanguage) {
      activeEditor.chain().focus().toggleCodeBlock().run();
      return;
    }
    activeEditor.chain().focus().toggleCodeBlock({ language: trimmedLanguage }).run();
  }

  function insertImage() {
    const src = window.prompt("Image URL");
    if (src === null) return;
    const trimmedSrc = src.trim();
    if (!trimmedSrc) return;

    const alt = window.prompt("Image description", "") ?? "";
    activeEditor.chain().focus().setImage({ src: trimmedSrc, alt: alt.trim() }).run();
  }

  function setHeadingLevel(value: string) {
    if (value === "paragraph") {
      activeEditor.chain().focus().setParagraph().run();
      return;
    }

    const level = Number(value) as (typeof headingLevels)[number];
    if (headingLevels.includes(level)) {
      activeEditor.chain().focus().toggleHeading({ level }).run();
    }
  }

  function setListMode(value: string) {
    if (value === "none") {
      if (activeEditor.isActive("bulletList"))
        activeEditor.chain().focus().toggleBulletList().run();
      if (activeEditor.isActive("orderedList"))
        activeEditor.chain().focus().toggleOrderedList().run();
      if (activeEditor.isActive("taskList")) activeEditor.chain().focus().toggleTaskList().run();
      return;
    }

    if (value === "bullet") {
      activeEditor.chain().focus().toggleBulletList().run();
      return;
    }

    if (value === "ordered") {
      activeEditor.chain().focus().toggleOrderedList().run();
      return;
    }

    if (value === "task") {
      activeEditor.chain().focus().toggleTaskList().run();
    }
  }

  function setTextColor(color: string) {
    if (color === "reset") {
      activeEditor.chain().focus().unsetColor().run();
      return;
    }

    activeEditor.chain().focus().setColor(color).run();
  }

  function setBackgroundColor(color: string) {
    if (color === "reset") {
      activeEditor
        .chain()
        .focus()
        .setMark("textStyle", { backgroundColor: null })
        .removeEmptyTextStyle()
        .run();
      return;
    }

    activeEditor.chain().focus().setMark("textStyle", { backgroundColor: color }).run();
  }

  function setHighlightColor(color: string) {
    if (color === "reset") {
      activeEditor.chain().focus().unsetHighlight().run();
      return;
    }

    activeEditor.chain().focus().setHighlight({ color }).run();
  }

  const currentHeadingLevel = headingLevels.find((level) =>
    activeEditor.isActive("heading", { level })
  );
  const currentListMode = activeEditor.isActive("bulletList")
    ? "bullet"
    : activeEditor.isActive("orderedList")
      ? "ordered"
      : activeEditor.isActive("taskList")
        ? "task"
        : "none";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="overflow-hidden rounded-md border border-input bg-background">
        <div className="border-b border-border/70 bg-background">
          <div className="flex min-h-10 flex-wrap items-center gap-1 px-3 py-1 text-muted-foreground shadow-sm">
            <EditorIconButton
              active={activeEditor.isActive("bold")}
              disabled={!activeEditor.can().chain().focus().toggleBold().run()}
              label="Bold"
              onClick={() => activeEditor.chain().focus().toggleBold().run()}
            >
              <Bold className="size-4" />
            </EditorIconButton>
            <EditorIconButton
              active={activeEditor.isActive("italic")}
              disabled={!activeEditor.can().chain().focus().toggleItalic().run()}
              label="Italic"
              onClick={() => activeEditor.chain().focus().toggleItalic().run()}
            >
              <Italic className="size-4" />
            </EditorIconButton>
            <EditorIconButton
              active={activeEditor.isActive("strike")}
              disabled={!activeEditor.can().chain().focus().toggleStrike().run()}
              label="Strikethrough"
              onClick={() => activeEditor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="size-4" />
            </EditorIconButton>
            <EditorIconButton
              active={activeEditor.isActive("code")}
              disabled={!activeEditor.can().chain().focus().toggleCode().run()}
              label="Inline code"
              onClick={() => activeEditor.chain().focus().toggleCode().run()}
            >
              <Code2 className="size-4" />
            </EditorIconButton>
            <EditorIconButton
              active={activeEditor.isActive("underline")}
              label="Underline"
              onClick={() => activeEditor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="size-4" />
            </EditorIconButton>
            <EditorIconButton
              active={activeEditor.isActive("highlight")}
              label="Highlight"
              onClick={() => activeEditor.chain().focus().toggleHighlight().run()}
            >
              <Highlighter className="size-4" />
            </EditorIconButton>
            <EditorIconButton
              active={activeEditor.isActive("link")}
              label="Link"
              onClick={toggleLink}
            >
              <Link2 className="size-4" />
            </EditorIconButton>
            <EditorIconButton
              active={activeEditor.isActive("superscript")}
              label="Superscript"
              onClick={() => activeEditor.chain().focus().toggleSuperscript().run()}
            >
              <SuperscriptIcon className="size-4" />
            </EditorIconButton>
            <EditorIconButton
              active={activeEditor.isActive("subscript")}
              label="Subscript"
              onClick={() => activeEditor.chain().focus().toggleSubscript().run()}
            >
              <SubscriptIcon className="size-4" />
            </EditorIconButton>
            <ToolbarDivider />
            <ToolbarSelect
              id={headingSelectId}
              label="Heading level"
              value={currentHeadingLevel ?? "paragraph"}
              onChange={setHeadingLevel}
            >
              <option value="paragraph">P</option>
              {headingLevels.map((level) => (
                <option key={level} value={level}>
                  H{level}
                </option>
              ))}
            </ToolbarSelect>
            <ToolbarSelect
              icon={<List className="size-4" />}
              id={`${headingSelectId}-list`}
              label="List style"
              value={currentListMode}
              onChange={setListMode}
            >
              <option value="none">List</option>
              <option value="bullet">Bullet</option>
              <option value="ordered">Number</option>
              <option value="task">Task</option>
            </ToolbarSelect>
            <EditorIconButton
              label="Quote"
              active={activeEditor.isActive("blockquote")}
              onClick={() => activeEditor.chain().focus().toggleBlockquote().run()}
            >
              <Quote className="size-4" />
            </EditorIconButton>
            <ToolbarDivider />
            <EditorIconButton
              active={activeEditor.isActive({ textAlign: "left" })}
              label="Align left"
              onClick={() => activeEditor.chain().focus().setTextAlign("left").run()}
            >
              <AlignLeft className="size-4" />
            </EditorIconButton>
            <EditorIconButton
              active={activeEditor.isActive({ textAlign: "center" })}
              label="Align center"
              onClick={() => activeEditor.chain().focus().setTextAlign("center").run()}
            >
              <AlignCenter className="size-4" />
            </EditorIconButton>
            <EditorIconButton
              active={activeEditor.isActive({ textAlign: "right" })}
              label="Align right"
              onClick={() => activeEditor.chain().focus().setTextAlign("right").run()}
            >
              <AlignRight className="size-4" />
            </EditorIconButton>
            <EditorIconButton
              active={activeEditor.isActive({ textAlign: "justify" })}
              label="Justify"
              onClick={() => activeEditor.chain().focus().setTextAlign("justify").run()}
            >
              <AlignJustify className="size-4" />
            </EditorIconButton>
            <ToolbarDivider />
            <EditorIconButton
              label="Code block"
              active={activeEditor.isActive("codeBlock")}
              onClick={toggleCodeBlock}
            >
              <span className="font-mono text-[11px] leading-none">```</span>
            </EditorIconButton>
            <EditorIconButton
              label="Mention"
              onClick={() => activeEditor.chain().focus().insertContent("@").run()}
            >
              <AtSign className="size-4" />
            </EditorIconButton>
            <EditorIconButton label="Add image" onClick={insertImage}>
              <ImagePlus className="size-4" />
              <span className="text-xs">Add</span>
            </EditorIconButton>
            <ToolbarDivider />
            <ColorMenu
              icon={<Palette className="size-4" />}
              label="Text color"
              resetLabel="Reset text color"
              colors={textColors}
              onPick={setTextColor}
            />
            <ColorMenu
              icon={<PaintBucket className="size-4" />}
              label="Text background"
              resetLabel="Reset text background"
              colors={backgroundColors}
              onPick={setBackgroundColor}
            />
            <ColorMenu
              icon={<Highlighter className="size-4" />}
              label="Highlight color"
              resetLabel="Remove highlight"
              colors={highlightColors}
              onPick={setHighlightColor}
            />
            <ToolbarDivider />
            <EditorIconButton
              disabled={!activeEditor.can().chain().focus().undo().run()}
              label="Undo"
              onClick={() => activeEditor.chain().focus().undo().run()}
            >
              <Undo2 className="size-4" />
            </EditorIconButton>
            <EditorIconButton
              disabled={!activeEditor.can().chain().focus().redo().run()}
              label="Redo"
              onClick={() => activeEditor.chain().focus().redo().run()}
            >
              <Redo2 className="size-4" />
            </EditorIconButton>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border/50 bg-muted/10 px-3">
            <div className="flex items-end gap-1 self-stretch">
              <button
                type="button"
                className={cn(
                  "border-b-2 px-3 py-2 text-sm font-medium",
                  mode === "write"
                    ? "border-background bg-background text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setMode("write")}
              >
                Write
              </button>
              <button
                type="button"
                className={cn(
                  "border-b-2 px-3 py-2 text-sm font-medium",
                  mode === "preview"
                    ? "border-background bg-background text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setMode("preview")}
              >
                Preview
              </button>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Pilcrow className="size-3.5" />
              <span>Rich text</span>
            </div>
          </div>
        </div>
        {mode === "write" ? (
          <EditorContent editor={activeEditor} />
        ) : (
          <div
            className="typeset typeset-article min-h-[132px] max-w-[37em] px-4 py-4"
            dangerouslySetInnerHTML={{ __html: activeEditor.getHTML() || "<p>No preview yet.</p>" }}
          />
        )}
      </div>
      <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
        <Paperclip className="size-4" />
        <span>Paste, drop, or click to add files</span>
      </div>
    </div>
  );
}

function EditorIconButton({
  children,
  active,
  disabled,
  label,
  onClick
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "pointer-events-none opacity-40"
      )}
      disabled={disabled}
      title={label}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ToolbarSelect({
  children,
  icon,
  id,
  label,
  onChange,
  value
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string | number;
}) {
  return (
    <div className="relative inline-flex h-8 items-center">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      {icon ? (
        <span className="pointer-events-none absolute left-2 text-muted-foreground">{icon}</span>
      ) : null}
      <select
        id={id}
        className={cn(
          "h-8 appearance-none rounded-md border border-transparent bg-transparent py-0 text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring",
          icon ? "pl-7 pr-7" : "pl-2 pr-7"
        )}
        title={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground" />
    </div>
  );
}

function ColorMenu({
  colors,
  icon,
  label,
  onPick,
  resetLabel
}: {
  colors: readonly string[];
  icon: React.ReactNode;
  label: string;
  onPick: (color: string) => void;
  resetLabel: string;
}) {
  return (
    <details className="group relative">
      <summary
        aria-label={label}
        className="inline-flex h-8 min-w-8 cursor-pointer list-none items-center justify-center rounded-md px-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
        title={label}
      >
        {icon}
      </summary>
      <div className="absolute right-0 top-9 z-50 grid w-52 grid-cols-6 gap-1 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md">
        <button
          aria-label={resetLabel}
          className="flex h-8 min-w-8 items-center justify-center rounded-md text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          title={resetLabel}
          type="button"
          onClick={() => onPick("reset")}
        >
          A
        </button>
        {colors.map((color) => (
          <button
            aria-label={`${label} ${color}`}
            className="flex h-8 min-w-8 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            key={color}
            title={`${label} ${color}`}
            type="button"
            onClick={() => onPick(color)}
          >
            <span
              className="h-4 w-4 rounded-sm border border-border shadow-sm"
              style={{ backgroundColor: color }}
            />
          </button>
        ))}
        <label className="col-span-6 mt-1 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-within:ring-1 focus-within:ring-ring">
          <span>Custom</span>
          <input
            aria-label={`Custom ${label.toLowerCase()}`}
            className="h-6 flex-1 cursor-pointer border-0 bg-transparent p-0"
            type="color"
            onChange={(event) => onPick(event.target.value)}
          />
        </label>
      </div>
    </details>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-5 w-px bg-border" />;
}
