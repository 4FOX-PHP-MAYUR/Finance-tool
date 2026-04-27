import axios from "axios";
import { authHeaders } from "./nodeAuthService";
import { API_BASE_URL, resolveUploadedAssetUrl } from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/assign-vendors`;

export function fileUrl(storedPath) {
  return resolveUploadedAssetUrl(storedPath) || "";
}

export async function fetchBusinessOrdersForProject(projectId) {
  if (!projectId) return [];
  const { data } = await axios.get(`${BASE_URL}/business-orders`, {
    headers: authHeaders(),
    params: { projectId },
  });
  return data.items ?? [];
}

export async function fetchAssignVendors(params = {}) {
  const { data } = await axios.get(BASE_URL, {
    headers: authHeaders(),
    params,
  });
  return Array.isArray(data) ? data : [];
}

export async function fetchAssignVendor(id) {
  const { data } = await axios.get(`${BASE_URL}/${encodeURIComponent(id)}`, {
    headers: authHeaders(),
  });
  return data;
}

function appendFormFields(formData, payload) {
  if (payload.clientId !== undefined) {
    formData.append("clientId", String(payload.clientId ?? ""));
  }
  if (payload.projectId !== undefined) {
    formData.append("projectId", String(payload.projectId ?? ""));
  }
  if (payload.businessOrderId !== undefined) {
    formData.append("businessOrderId", String(payload.businessOrderId ?? ""));
  }
  if (payload.costToAgency !== undefined) {
    formData.append("costToAgency", payload.costToAgency ?? "");
  }
  if (payload.costToClient !== undefined) {
    formData.append("costToClient", payload.costToClient ?? "");
  }
  if (payload.invoiceSubmissionDate !== undefined) {
    formData.append(
      "invoiceSubmissionDate",
      String(payload.invoiceSubmissionDate ?? ""),
    );
  }
  if (payload.vatPercent !== undefined) {
    formData.append("vatPercent", String(payload.vatPercent ?? ""));
  }
  if (payload.vatNeeded !== undefined) {
    formData.append("vatNeeded", String(Boolean(payload.vatNeeded)));
  }
  if (payload.vatAmount !== undefined) {
    formData.append("vatAmount", String(payload.vatAmount ?? ""));
  }
  if (payload.sow !== undefined) {
    formData.append("sow", payload.sow ?? "");
  }
  if (payload.sendToHodReview !== undefined) {
    formData.append("sendToHodReview", payload.sendToHodReview ?? "");
  }
  if (payload.hodAssignUserId !== undefined) {
    formData.append("hodAssignUserId", String(payload.hodAssignUserId ?? ""));
  }
  if (payload.vendorId !== undefined) {
    formData.append("vendorId", String(payload.vendorId ?? ""));
  }

  const invFiles = payload.vendorInvoiceFiles || [];
  invFiles.forEach((f) => {
    if (f instanceof File) formData.append("vendorInvoiceFiles", f);
  });

  const repFiles = payload.vendorReportFiles || [];
  repFiles.forEach((f) => {
    if (f instanceof File) formData.append("vendorReportFiles", f);
  });
  const payFiles = payload.paymentSlipFiles || [];
  payFiles.forEach((f) => {
    if (f instanceof File) formData.append("paymentSlipFiles", f);
  });

  if (Array.isArray(payload.vendorInvoiceFilesRetain)) {
    formData.append(
      "vendorInvoiceFilesRetain",
      JSON.stringify(payload.vendorInvoiceFilesRetain),
    );
  }
  if (Array.isArray(payload.vendorReportFilesRetain)) {
    formData.append(
      "vendorReportFilesRetain",
      JSON.stringify(payload.vendorReportFilesRetain),
    );
  }
  if (Array.isArray(payload.paymentSlipFilesRetain)) {
    formData.append(
      "paymentSlipFilesRetain",
      JSON.stringify(payload.paymentSlipFilesRetain),
    );
  }

  if (payload.hodReviewStatus !== undefined) {
    formData.append("hodReviewStatus", String(payload.hodReviewStatus ?? ""));
  }
  if (payload.hodReviewReason !== undefined) {
    formData.append("hodReviewReason", String(payload.hodReviewReason ?? ""));
  }
  if (payload.financeReviewStatus !== undefined) {
    formData.append(
      "financeReviewStatus",
      String(payload.financeReviewStatus ?? ""),
    );
  }
  if (payload.financeReviewReason !== undefined) {
    formData.append(
      "financeReviewReason",
      String(payload.financeReviewReason ?? ""),
    );
  }
  if (payload.clientPaidValue !== undefined) {
    formData.append("clientPaidValue", String(payload.clientPaidValue ?? ""));
  }
  if (payload.adminApprovalStatus !== undefined) {
    formData.append("adminApprovalStatus", String(payload.adminApprovalStatus ?? ""));
  }
}

export async function createAssignVendor(payload) {
  const formData = new FormData();
  appendFormFields(formData, payload);
  const { data } = await axios.post(BASE_URL, formData, {
    headers: { ...authHeaders() },
  });
  return data;
}

export async function updateAssignVendor(id, payload) {
  const formData = new FormData();
  appendFormFields(formData, payload);
  const { data } = await axios.put(
    `${BASE_URL}/${encodeURIComponent(id)}`,
    formData,
    { headers: { ...authHeaders() } },
  );
  return data;
}

export async function deleteAssignVendor(id) {
  const { data } = await axios.delete(`${BASE_URL}/${encodeURIComponent(id)}`, {
    headers: authHeaders(),
  });
  return data;
}
