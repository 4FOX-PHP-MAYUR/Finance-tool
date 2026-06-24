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
 * Plain multi-line editor for scope details. Shows extracted/uploaded lines from props;
 * keeps local edits until the details content from props changes (new upload / load).
 */
export default function ScopeDetailsRichText({ details, onDetailsChange, editorId }) {
  const propText = linesToText(details);
  const [editedText, setEditedText] = useState(null);
  const textareaRef = useRef(null);
  const displayText = editedText != null ? editedText : propText;

  const syncTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    setEditedText(null);
  }, [propText]);

  useEffect(() => {
    requestAnimationFrame(syncTextareaHeight);
  }, [displayText]);

  return (
    <textarea
      ref={textareaRef}
      id={editorId}
      className="bom-textarea form-control form-control-sm bom-scope-details-textarea"
      rows={6}
      placeholder="Details (one line per bullet)"
      value={displayText}
      onChange={(e) => {
        const t = e.target.value;
        setEditedText(t);
        onDetailsChange(textToLines(t));
      }}
    />
  );
}
