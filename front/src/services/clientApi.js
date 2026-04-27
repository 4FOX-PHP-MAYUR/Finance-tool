/**
 * Client Management API
 * Real API integration for http://localhost:3000/api/clients
 */

import axios from "axios";
import { authHeaders } from "./nodeAuthService";
import { API_BASE_URL } from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/clients`;

// Base URL for serving uploaded images — adjust if your backend differs
export const UPLOADS_BASE_URL = `${API_BASE_URL}/uploads`;

/**
 * Returns a displayable image src from the value stored by the backend.
 * Handles: full URLs, base64 data URIs, bare filenames, and empty values.
 */
export function getClientImageSrc(clientImage) {
  if (!clientImage) return null;
  if (clientImage.startsWith("data:") || clientImage.startsWith("http"))
    return clientImage;
  if (clientImage.startsWith("/")) return `${API_BASE_URL}${clientImage}`;
  return `${UPLOADS_BASE_URL}/${clientImage}`;
}

export async function fetchClients() {
  const { data } = await axios.get(BASE_URL, { headers: authHeaders() });
  // Support both bare array and wrapped { data: [...] } responses
  return Array.isArray(data) ? data : data.data ?? data.clients ?? [];
}

export async function createClient(payload) {
  let body;
  let headers = { ...authHeaders() };

  if (payload.clientImage instanceof File) {
    body = new FormData();
    body.append("clientName", payload.clientName);
    body.append("contactPerson", payload.contactPerson);
    body.append("clientEmail", payload.clientEmail);
    body.append("clientMobile", payload.clientMobile);
    if (payload.clientAddress != null) body.append("clientAddress", payload.clientAddress);
    if (payload.trn != null) body.append("trn", payload.trn);
    body.append("clientImage", payload.clientImage);
    // axios sets Content-Type: multipart/form-data automatically for FormData
  } else {
    body = {
      clientName: payload.clientName,
      contactPerson: payload.contactPerson,
      clientEmail: payload.clientEmail,
      clientMobile: payload.clientMobile,
      clientAddress: payload.clientAddress ?? "",
      trn: payload.trn ?? "",
      clientImage: payload.clientImage || "",
    };
    headers["Content-Type"] = "application/json";
  }

  const { data } = await axios.post(BASE_URL, body, { headers });
  return data.data ?? data;
}

export async function updateClient(id, payload) {
  let body;
  let headers = { ...authHeaders() };

  if (payload.clientImage instanceof File) {
    body = new FormData();
    body.append("clientName", payload.clientName);
    body.append("contactPerson", payload.contactPerson);
    body.append("clientEmail", payload.clientEmail);
    body.append("clientMobile", payload.clientMobile);
    if (payload.clientAddress != null) body.append("clientAddress", payload.clientAddress);
    if (payload.trn != null) body.append("trn", payload.trn);
    body.append("clientImage", payload.clientImage);
  } else {
    body = {
      clientName: payload.clientName,
      contactPerson: payload.contactPerson,
      clientEmail: payload.clientEmail,
      clientMobile: payload.clientMobile,
      clientAddress: payload.clientAddress ?? "",
      trn: payload.trn ?? "",
    };
    // Only include clientImage when explicitly provided (avoids overwriting with undefined)
    if (payload.clientImage !== undefined) {
      body.clientImage = payload.clientImage;
    }
    headers["Content-Type"] = "application/json";
  }

  const { data } = await axios.put(`${BASE_URL}/${id}`, body, { headers });
  return data.data ?? data;
}

export async function deleteClient(id) {
  const { data } = await axios.delete(`${BASE_URL}/${id}`, {
    headers: authHeaders(),
  });
  return data;
}