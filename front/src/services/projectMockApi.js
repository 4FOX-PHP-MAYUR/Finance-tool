/**
 * Mock Project Management API
 * Module-level singleton — data persists across navigations for the session.
 * Async delays simulate real network latency.
 */

let nextId = 3;

let mockProjects = [
  {
    _id: "1",
    projectName: "Website Redesign",
    projectDescription: "Revamp company website UI/UX",
    projectImage: "",
    isCompleted: false,
    projectPercentageCompleted: 40,
  },
  {
    _id: "2",
    projectName: "Mobile App Development",
    projectDescription: "Build cross-platform mobile app",
    projectImage: "",
    isCompleted: true,
    projectPercentageCompleted: 100,
  },
];

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchMockProjects() {
  await delay();
  return [...mockProjects];
}

export async function fetchMockProjectById(id) {
  await delay(400);
  const project = mockProjects.find((p) => p._id === String(id));
  if (!project) throw new Error("Project not found");
  return { ...project };
}

export async function createMockProject(payload) {
  await delay();
  const isCompleted = Boolean(payload.isCompleted);
  const newProject = {
    _id: String(++nextId),
    projectName: payload.projectName,
    projectDescription: payload.projectDescription || "",
    projectImage: payload.projectImage || "",
    isCompleted,
    projectPercentageCompleted: isCompleted
      ? 100
      : Math.min(100, Math.max(0, Number(payload.projectPercentageCompleted) || 0)),
  };
  mockProjects = [...mockProjects, newProject];
  return newProject;
}

export async function updateMockProject(id, payload) {
  await delay();
  const index = mockProjects.findIndex((p) => p._id === String(id));
  if (index === -1) throw new Error("Project not found");
  const existing = mockProjects[index];
  const isCompleted =
    payload.isCompleted !== undefined ? Boolean(payload.isCompleted) : existing.isCompleted;
  const updated = {
    ...existing,
    projectName: payload.projectName ?? existing.projectName,
    projectDescription: payload.projectDescription ?? existing.projectDescription,
    projectImage:
      payload.projectImage !== undefined ? payload.projectImage : existing.projectImage,
    isCompleted,
    projectPercentageCompleted: isCompleted
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            Number(
              payload.projectPercentageCompleted ?? existing.projectPercentageCompleted
            ) || 0
          )
        ),
  };
  mockProjects = mockProjects.map((p) => (p._id === String(id) ? updated : p));
  return updated;
}

export async function deleteMockProject(id) {
  await delay(400);
  const exists = mockProjects.some((p) => p._id === String(id));
  if (!exists) throw new Error("Project not found");
  mockProjects = mockProjects.filter((p) => p._id !== String(id));
  return { success: true };
}