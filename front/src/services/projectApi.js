/**
 * Project Management API
 * Real API integration for http://localhost:4195/api/projects
 */

import axios from "axios";
import { authHeaders } from "./nodeAuthService";
import { API_BASE_URL } from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/projects`;

export const UPLOADS_BASE_URL = `${API_BASE_URL}/uploads`;

export function getProjectImageSrc(projectImage) {
  if (!projectImage) return null;
  if (projectImage.startsWith("data:") || projectImage.startsWith("http"))
    return projectImage;
  if (projectImage.startsWith("/")) return `${API_BASE_URL}${projectImage}`;
  return `${UPLOADS_BASE_URL}/${projectImage}`;
}

export async function fetchProjects() {
  const { data } = await axios.get(BASE_URL, { headers: authHeaders() });
  return Array.isArray(data) ? data : data.data ?? data.projects ?? [];
}

export async function createProject(payload) {
  let body;
  let headers = { ...authHeaders() };

  if (payload.projectImage instanceof File) {
    body = new FormData();
    body.append("clientId", payload.clientId);
    body.append("projectName", payload.projectName);
    body.append("projectDescription", payload.projectDescription);
    body.append("projectImage", payload.projectImage);
    body.append("isCompleted", String(payload.isCompleted));
    body.append("projectPercentageCompleted", String(payload.projectPercentageCompleted));
    body.append("startDate", payload.startDate);
    body.append("endDate", payload.endDate);
  } else {
    body = {
      clientId: payload.clientId,
      projectName: payload.projectName,
      projectDescription: payload.projectDescription,
      projectImage: payload.projectImage || "",
      isCompleted: payload.isCompleted,
      projectPercentageCompleted: payload.projectPercentageCompleted,
      startDate: payload.startDate,
      endDate: payload.endDate,
    };
    headers["Content-Type"] = "application/json";
  }

  const { data } = await axios.post(BASE_URL, body, { headers });
  return data.data ?? data;
}

export async function updateProject(id, payload) {
  let body;
  let headers = { ...authHeaders() };

  if (payload.projectImage instanceof File) {
    body = new FormData();
    body.append("clientId", payload.clientId);
    body.append("projectName", payload.projectName);
    body.append("projectDescription", payload.projectDescription);
    body.append("projectImage", payload.projectImage);
    body.append("isCompleted", String(payload.isCompleted));
    body.append("projectPercentageCompleted", String(payload.projectPercentageCompleted));
    body.append("startDate", payload.startDate);
    body.append("endDate", payload.endDate);
  } else {
    body = {
      clientId: payload.clientId,
      projectName: payload.projectName,
      projectDescription: payload.projectDescription,
      isCompleted: payload.isCompleted,
      projectPercentageCompleted: payload.projectPercentageCompleted,
      startDate: payload.startDate,
      endDate: payload.endDate,
    };
    // Only include projectImage when explicitly provided (avoids overwriting)
    if (payload.projectImage !== undefined) {
      body.projectImage = payload.projectImage;
    }
    headers["Content-Type"] = "application/json";
  }

  const { data } = await axios.put(`${BASE_URL}/${id}`, body, { headers });
  return data.data ?? data;
}

export async function deleteProject(id) {
  const { data } = await axios.delete(`${BASE_URL}/${id}`, {
    headers: authHeaders(),
  });
  return data;
}