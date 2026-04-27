import React from "react";

/**
 * Multi-line field styled like Business Orders (BO) scope / address textareas:
 * `bom-textarea form-control form-control-sm` (+ optional `bom-scope-details-textarea`).
 */
export default function BomTextarea({
  id,
  name,
  value,
  onChange,
  onBlur,
  rows = 4,
  placeholder,
  className = "",
  /** When true, matches BO "Scope details" height (min-height ~120px). */
  variant = "scope",
}) {
  const scopeClass = variant === "scope" ? "bom-scope-details-textarea" : "";
  return (
    <textarea
      id={id}
      name={name}
      className={`bom-textarea form-control form-control-sm ${scopeClass} ${className}`.trim()}
      rows={rows}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
    />
  );
}
