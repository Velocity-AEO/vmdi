"use client";

import { useRef, useCallback, useEffect, useState } from "react";

export interface EditorHighlight {
  text: string;
  severity: "high" | "medium" | "low";
  signal: string;
  description: string;
  suggestion: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  highlights: EditorHighlight[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SEVERITY_STYLES: Record<string, string> = {
  high: "background: rgba(239,68,68,0.25); border-bottom: 2px solid #ef4444; border-radius: 2px; cursor: help;",
  medium: "background: rgba(234,179,8,0.2); border-bottom: 2px solid #eab308; border-radius: 2px; cursor: help;",
  low: "border-bottom: 2px solid #3b82f6; cursor: help;",
};

function buildHighlightedHtml(
  text: string,
  highlights: EditorHighlight[]
): string {
  if (highlights.length === 0) return escapeHtml(text);

  const sortedHighlights = [...highlights].sort(
    (a, b) => b.text.length - a.text.length
  );

  interface Marker {
    start: number;
    end: number;
    highlight: EditorHighlight;
  }

  const markers: Marker[] = [];
  const used = new Set<number>();

  for (const h of sortedHighlights) {
    const escapedText = escapeRegExp(h.text);
    const regex = new RegExp(escapedText, "gi");
    let match;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      let overlaps = false;
      for (let i = start; i < end; i++) {
        if (used.has(i)) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        markers.push({ start, end, highlight: h });
        for (let i = start; i < end; i++) used.add(i);
      }
    }
  }

  markers.sort((a, b) => a.start - b.start);

  let result = "";
  let cursor = 0;

  for (const m of markers) {
    if (m.start > cursor) {
      result += escapeHtml(text.slice(cursor, m.start));
    }
    const style = SEVERITY_STYLES[m.highlight.severity] ?? "";
    const tooltip = `[${m.highlight.severity.toUpperCase()}] ${m.highlight.signal.replace(/_/g, " ")}: ${m.highlight.description}`;
    result += `<span style="${style}" title="${escapeHtml(tooltip)}" data-signal="${escapeHtml(m.highlight.signal)}">${escapeHtml(text.slice(m.start, m.end))}</span>`;
    cursor = m.end;
  }

  if (cursor < text.length) {
    result += escapeHtml(text.slice(cursor));
  }

  return result;
}

export function RichTextEditor({
  value,
  onChange,
  highlights,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const syncScroll = useCallback(() => {
    if (editorRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = editorRef.current.scrollTop;
      overlayRef.current.scrollLeft = editorRef.current.scrollLeft;
    }
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.innerText;
      onChange(text);
    }
  }, [onChange]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    },
    []
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand("insertText", false, "  ");
    }
    if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
      if (e.shiftKey) {
        e.preventDefault();
        document.execCommand("redo");
      }
    }
  }, []);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerText !== value) {
      const sel = window.getSelection();
      const hadFocus =
        document.activeElement === editorRef.current && sel && sel.rangeCount > 0;

      let savedOffset = 0;
      if (hadFocus && sel) {
        const range = sel.getRangeAt(0);
        savedOffset = range.startOffset;
      }

      editorRef.current.innerText = value;

      if (hadFocus && sel && editorRef.current.firstChild) {
        try {
          const range = document.createRange();
          const node = editorRef.current.firstChild;
          const offset = Math.min(savedOffset, (node.textContent ?? "").length);
          range.setStart(node, offset);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        } catch {
          // cursor restore failed silently
        }
      }
    }
  }, [value]);

  const highlightedHtml = buildHighlightedHtml(value, highlights);

  return (
    <div className="relative h-full">
      {/* Highlight overlay (behind, non-interactive) */}
      <div
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-sm leading-relaxed text-transparent"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />

      {/* Editable text layer */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className={`relative h-full overflow-auto whitespace-pre-wrap break-words bg-transparent p-5 font-mono text-sm leading-relaxed text-text outline-none caret-primary ${
          isFocused ? "ring-1 ring-primary/30" : ""
        }`}
        spellCheck
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onScroll={syncScroll}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </div>
  );
}
