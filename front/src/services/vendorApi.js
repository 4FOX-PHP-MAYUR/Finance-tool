/**
 * Vendor Management API — /api/vendors
 */

import axios from "axios";
import { authHeaders } from "./nodeAuthService";
import { API_BASE_URL, resolveUploadedAssetUrl } from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/vendors`;

/** Build a browser URL for a stored registration document path. */
export function getVendorDocUrl(storedPath) {
  return resolveUploadedAssetUrl(storedPath);
}

export async function fetchVendors() {
  const { data } = await axios.get(BASE_URL, { headers: authHeaders() });
  return Array.isArray(data) ? data : data.data ?? data.vendors ?? [];
}

function appendVendorFields(formData, payload) {
  formData.append("vendorName", payload.vendorName ?? "");
  formData.append("vendorEmail", payload.vendorEmail ?? "");
  formData.append("accountsContactName", payload.accountsContactName ?? "");
  formData.append("accountsContactEmail", payload.accountsContactEmail ?? "");
  formData.append("accountsContactPhone", payload.accountsContactPhone ?? "");
  formData.append("accountsContactAddress", payload.accountsContactAddress ?? "");
  formData.append("regularContactName", payload.regularContactName ?? "");
  formData.append("regularContactEmail", payload.regularContactEmail ?? "");
  formData.append("regularContactPhone", payload.regularContactPhone ?? "");
  formData.append("regularContactAddress", payload.regularContactAddress ?? "");
  formData.append("vendorAddress", payload.vendorAddress ?? "");
  formData.append("country", payload.country ?? "");
  formData.append("taxRate", payload.taxRate ?? "");
  formData.append("licenseNo", payload.licenseNo ?? "");
  formData.append("licenseExpiryDate", payload.licenseExpiryDate ?? "");
  formData.append("taxCertificate", String(Boolean(payload.taxCertificate)));
}

export async function createVendor(payload) {
  const formData = new FormData();
  appendVendorFields(formData, payload);
  const files = payload.companyRegistrationDocs;
  if (files && files.length) {
    for (let i = 0; i < files.length; i++) {
      if (files[i] instanceof File) {
        formData.append("companyRegistrationDocs", files[i]);
      }
    }
  }
  if (payload.licenseUpload instanceof File) {
    formData.append("licenseUpload", payload.licenseUpload);
  }
  if (payload.taxLaterCertificate instanceof File) {
    formData.append("taxLaterCertificate", payload.taxLaterCertificate);
  }
  const { data } = await axios.post(BASE_URL, formData, {
    headers: { ...authHeaders() },
  });
  return data.data ?? data;
}

/**
 * @param {object} payload — same as create; include companyRegistrationDocsRetain: string[] of paths to keep when editing
 */
export async function updateVendor(id, payload) {
  const formData = new FormData();
  appendVendorFields(formData, payload);
  if (Array.isArray(payload.companyRegistrationDocsRetain)) {
    formData.append(
      "companyRegistrationDocsRetain",
      JSON.stringify(payload.companyRegistrationDocsRetain)
    );
  }
  const files = payload.companyRegistrationDocs;
  if (files && files.length) {
    for (let i = 0; i < files.length; i++) {
      if (files[i] instanceof File) {
        formData.append("companyRegistrationDocs", files[i]);
      }
    }
  }
  if (payload.licenseUploadRetain !== undefined) {
    formData.append("licenseUploadRetain", String(Boolean(payload.licenseUploadRetain)));
  }
  if (payload.taxLaterCertificateRetain !== undefined) {
    formData.append(
      "taxLaterCertificateRetain",
      String(Boolean(payload.taxLaterCertificateRetain))
    );
  }
  if (payload.licenseUpload instanceof File) {
    formData.append("licenseUpload", payload.licenseUpload);
  }
  if (payload.taxLaterCertificate instanceof File) {
    formData.append("taxLaterCertificate", payload.taxLaterCertificate);
  }
  const { data } = await axios.put(`${BASE_URL}/${id}`, formData, {
    headers: { ...authHeaders() },
  });
  return data.data ?? data;
}

export async function deleteVendor(id) {
  const { data } = await axios.delete(`${BASE_URL}/${id}`, {
    headers: authHeaders(),
  });
  return data;
}
