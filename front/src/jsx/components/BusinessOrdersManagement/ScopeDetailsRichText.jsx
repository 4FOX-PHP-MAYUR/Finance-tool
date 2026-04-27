import { useEffect, useRef, useState } from "react";

function linesToText(details) {
  return (Array.isArray(details) ? details : []).join("\n");
}

function textToLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, ""));
}

/**
 * Plain multi-line editor for scope details (no toolbar). Syncs local text when `resetKey` changes.
 */
export default function ScopeDetailsRichText({ details, onDetailsChange, resetKey, editorId }) {
  const [text, setText] = useState(() => linesToText(details));
  const detailsRef = useRef(details);
  const textareaRef = useRef(null);
  detailsRef.current = details;

  const syncTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    setText(linesToText(detailsRef.current));
  }, [resetKey]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "";
    }
    // Sync after reset.
    requestAnimationFrame(syncTextareaHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    syncTextareaHeight();
  }, [text]);

  return (
    <textarea
      ref={textareaRef}
      id={editorId}
      className="bom-textarea form-control form-control-sm bom-scope-details-textarea"
      rows={15}
      placeholder="Details (one line per bullet)"
      value={text}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        onDetailsChange(textToLines(t));
      }}
    />
  );
}
