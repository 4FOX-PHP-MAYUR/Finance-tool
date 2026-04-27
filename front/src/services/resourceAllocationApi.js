import axios from "axios";
import { authHeaders } from "./nodeAuthService";
import { API_BASE_URL } from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/resource-allocations`;

export async function fetchResourceAllocations(params = {}) {
  const { data } = await axios.get(BASE_URL, {
    headers: authHeaders(),
    params,
  });
  return Array.isArray(data) ? { data, total: data.length } : data;
}

export async function fetchResourceAllocation(id) {
  const { data } = await axios.get(`${BASE_URL}/${id}`, { headers: authHeaders() });
  return data;
}

export async function createResourceAllocation(payload) {
  const { data } = await axios.post(BASE_URL, payload, {
    headers: { ...authHeaders(), "Content-Type": "application/json" },
  });
  return data.data ?? data;
}

export async function updateResourceAllocation(id, payload) {
  const { data } = await axios.put(`${BASE_URL}/${id}`, payload, {
    headers: { ...authHeaders(), "Content-Type": "application/json" },
  });
  return data.data ?? data;
}

export async function deleteResourceAllocation(id) {
  const { data } = await axios.delete(`${BASE_URL}/${id}`, {
    headers: authHeaders(),
  });
  return data;
}