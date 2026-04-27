import { API_BASE_URL } from "../config/api";
import { authHeaders } from "./nodeAuthService";

const BASE_URL = `${API_BASE_URL}/api/invoice-pdf`;
const UPLOAD_URL = `${BASE_URL}/upload`;

function apiErrorMessage(data, fallback) {
  if (!data || typeof data !== "object") return fallback;
  return data.error || data.message || fallback;
}

async function parseJsonResponse(response) {
  const responseText = await response.text();
  const contentType = response.headers.get("content-type") || "";
  let data;
  if (contentType.includes("application/json")) {
    data = JSON.parse(responseText);
  } else {
    throw new Error(
      `Server returned non-JSON response (${response.status}). Check API URL (REACT_APP_API_BASE_URL).`
    );
  }
  return data;
}

/**
 * Upload an invoice PDF and return extracted fields (same contract as PDF reader /upload).
 * Pass either `projectId` (existing project) or `projectName` (free-text project name).
 */
export async function uploadInvoicePdf(file, projectFields = {}) {
  const formData = new FormData();
  formData.append("invoice", file);
  if (projectFields.projectId) {
    formData.append("projectId", String(projectFields.projectId));
  }
  if (projectFields.projectName != null && projectFields.projectName !== "") {
    formData.append("projectName", String(projectFields.projectName));
  }
  if (projectFields.boNo != null && String(projectFields.boNo).trim() !== "") {
    formData.append("boNo", String(projectFields.boNo).trim());
  }

  const response = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(apiErrorMessage(data, "Failed to extract invoice data."));
  }

  return data;
}

/**
 * List all saved invoice PDF records (newest first).
 */
export async function listInvoicePdfs() {
  const response = await fetch(BASE_URL, { headers: { ...authHeaders() } });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(apiErrorMessage(data, "Failed to load invoices."));
  }
  return data;
}

function parseFilenameFromContentDisposition(header) {
  if (!header || typeof header !== "string") return null;
  const utf8 = /filename\*=UTF-8''([^;\n]+)/i.exec(header);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1].trim().replace(/^["']|["']$/g, ""));
    } catch {
      return utf8[1].trim();
    }
  }
  const quoted = /filename\s*=\s*"([^"]+)"/i.exec(header);
  if (quoted) return quoted[1];
  const unquoted = /filename\s*=\s*([^;\n]+)/i.exec(header);
  if (unquoted) return unquoted[1].trim().replace(/^["']|["']$/g, "");
  return null;
}

/**
 * Download PDF for a saved record.
 * @param {"summary" | "original" | undefined} options.source - `summary` = generated SOW report (tax/amounts, edits). `original` = raw upload only (when stored). Omit = legacy default (original if stored, else summary).
 * Returns the blob and optional filename from Content-Disposition.
 */
export async function downloadInvoicePdf(id, options = {}) {
  const params = new URLSearchParams();
  if (options.source === "summary" || options.source === "original") {
    params.set("source", options.source);
  }
  const qs = params.toString();
  const url = `${BASE_URL}/${encodeURIComponent(id)}/pdf${qs ? `?${qs}` : ""}`;
  const response = await fetch(url, { headers: { ...authHeaders() } });
  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      throw new Error(apiErrorMessage(data, "Failed to download PDF."));
    }
    throw new Error("Failed to download PDF.");
  }
  const blob = await response.blob();
  const filename = parseFilenameFromContentDisposition(
    response.headers.get("Content-Disposition"),
  );
  return { blob, filename };
}

/**
 * Load one saved invoice by id (same shape as upload response for editing).
 */
export async function getInvoicePdf(id) {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(id)}`, {
    headers: { ...authHeaders() },
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(apiErrorMessage(data, "Failed to load invoice."));
  }
  return data;
}

/**
 * Delete a saved invoice record.
 */
export async function deleteInvoicePdf(id) {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(apiErrorMessage(data, "Failed to delete invoice."));
  }
  return data;
}

/**
 * PATCH saved BO invoice fields (amounts as numbers/strings in body; parsed server-side).
 */
export async function updateInvoicePdf(id, body) {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(apiErrorMessage(data, "Failed to save invoice."));
  }

  return data;
}
