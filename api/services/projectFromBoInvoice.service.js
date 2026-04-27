const mongoose = require("mongoose");
const Project = require("../models/project.model");
const { createLog } = require("./log.service");

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRequestMeta(req) {
  if (!req) return { ipAddress: "", userAgent: "" };
  return {
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers["user-agent"] || "",
  };
}

/**
 * Normalize a free-typed name to match Project.projectName rules (letters, numbers, spaces, max 60).
 */
function sanitizeProjectNameForProjectModel(raw) {
  if (raw == null) return null;
  let s = String(raw)
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  if (!s || !/^[A-Za-z0-9 ]+$/.test(s)) return null;
  return s;
}

/**
 * When a BO invoice uses a new project name, find an existing Project (same client, same name)
 * or create one in the Projects module. Requires `userId` when creating.
 * Without `clientId`, only the invoice text is stored (no Project row).
 */
async function findOrCreateProjectFromBoInvoice({
  rawProjectName,
  clientId,
  userId,
  req,
}) {
  const nameForInvoice = String(rawProjectName || "").trim().slice(0, 200);
  if (!nameForInvoice) {
    return { projectId: null, projectName: "", error: "Project name is required." };
  }

  if (!clientId) {
    return {
      projectId: null,
      projectName: nameForInvoice,
      createdInModule: false,
    };
  }

  if (!userId) {
    return {
      error:
        "Sign in to save new projects to the Projects module, or pick an existing project from the list.",
    };
  }

  const sanitized = sanitizeProjectNameForProjectModel(rawProjectName);
  if (!sanitized) {
    return {
      error:
        "For the Projects list, use only letters, numbers, and spaces (max 60 characters). You can fix the name and save again.",
    };
  }

  const cid = new mongoose.Types.ObjectId(String(clientId));

  const existing = await Project.findOne({
    clientId: cid,
    status: true,
    projectName: new RegExp(`^${escapeRegex(sanitized)}$`, "i"),
  }).lean();

  if (existing) {
    return {
      projectId: existing._id,
      projectName: existing.projectName,
      createdInModule: true,
    };
  }

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  const uid = new mongoose.Types.ObjectId(String(userId));

  const project = await Project.create({
    projectName: sanitized,
    projectDescription: "Created from Business Order invoice upload.",
    clientId: cid,
    createdBy: uid,
    startDate,
    endDate,
    isCompleted: false,
    projectPercentageCompleted: 0,
    status: true,
    invoiceBoImport: true,
  });

  if (req) {
    const role = req.user?.role || req.user?.userRole || req.user?.type || "unknown";
    await createLog({
      userId: uid,
      role,
      action: "CREATE",
      module: "projects",
      recordId: project._id,
      newData: project,
      ...getRequestMeta(req),
    });
  }

  return {
    projectId: project._id,
    projectName: project.projectName,
    createdInModule: true,
    createdNew: true,
  };
}

module.exports = {
  findOrCreateProjectFromBoInvoice,
  sanitizeProjectNameForProjectModel,
};
