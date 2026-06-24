/**
 * Department Management API
 * Real API integration for http://localhost:4195/api/departments
 */

import axios from "axios";
import { authHeaders } from "./nodeAuthService";
import { API_BASE_URL } from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/departments`;

export async function fetchDepartments() {
  const { data } = await axios.get(BASE_URL, { headers: authHeaders() });
  return Array.isArray(data) ? data : data.data ?? data.departments ?? [];
}

export async function createDepartment(payload) {
  const { data } = await axios.post(
    BASE_URL,
    {
      departmentName: payload.departmentName.trim(),
      departmentDescription: (payload.departmentDescription || "").trim(),
    },
    { headers: { ...authHeaders(), "Content-Type": "application/json" } }
  );
  return data.data ?? data;
}

export async function updateDepartment(id, payload) {
  const { data } = await axios.put(
    `${BASE_URL}/${id}`,
    {
      departmentName: payload.departmentName.trim(),
      departmentDescription: (payload.departmentDescription || "").trim(),
    },
    { headers: { ...authHeaders(), "Content-Type": "application/json" } }
  );
  return data.data ?? data;
}

export async function deleteDepartment(id) {
  const { data } = await axios.delete(`${BASE_URL}/${id}`, {
    headers: authHeaders(),
  });
  return data;
}