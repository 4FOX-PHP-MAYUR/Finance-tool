const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const multer = require("multer");
const AssignVendor = require("../models/assignVendor.model");
const Vendor = require("../models/vendor.model");
const Project = require("../models/project.model");
const BusinessOrderInvoice = require("../models/businessOrderInvoice.model");
const { createLog } = require("../services/log.service");
const { db } = require("../startup/commonModules");
const {
  notifyInvoiceSubmittedToHod,
  notifyHodRejected,
  notifyHodApproved,
  notifyFinanceRejected,
  notifyPaymentCompleted,
} = require("../services/invoiceApprovalEmail.service");

const UPLOAD_SUBDIR = "assign-vendor";
const PUBLIC_PREFIX = "/public/uploads";

function uploadDir() {
  const dir = path.join(__dirname, "..", "public", "uploads", UPLOAD_SUBDIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir()),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const safe = `av-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, safe);
  },
});

function docFileFilter(_req, file, cb) {
  const allowed = /\.(pdf|png|jpe?g|gif|webp|doc|docx|xls|xlsx|csv|txt)$/i;
  if (!allowed.test(file.originalname)) {
    return cb(
      new Error(
        "Allowed: PDF, images, Word, Excel, CSV, text.",
      ),
    );
  }
  cb(null, true);
}

exports.assignVendorUploadMiddleware = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: docFileFilter,
}).fields([
  { name: "vendorInvoiceFiles", maxCount: 30 },
  { name: "vendorReportFiles", maxCount: 30 },
  { name: "paymentSlipFiles", maxCount: 30 },
]);

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers["user-agent"] || "",
  };
}

function getUserId(req) {
  return req.user?.userId || req.user?.id || req.user?._id;
}

function getLogRole(req) {
  const u = req.user;
  if (!u) return "unknown";
  return (
    u.role ||
    u.userRole ||
    u.type ||
    (u.roleId != null ? String(u.roleId) : "") ||
    "unknown"
  );
}

function mapUploadedFiles(files, fieldName) {
  const list = files && files[fieldName] ? files[fieldName] : [];
  return list.map((f) => ({
    path: `${PUBLIC_PREFIX}/${UPLOAD_SUBDIR}/${f.filename}`,
    originalName: f.originalname || f.filename,
  }));
}

function parseRetained(body, key) {
  const raw = body[key];
  if (raw == null || raw === "") return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => typeof p === "string" && p.length > 0);
  } catch {
    return [];
  }
}

function mergeFileLists(existing, retainedPaths, newFiles) {
  const existingList = Array.isArray(existing) ? existing : [];
  const kept =
    retainedPaths !== null
      ? existingList.filter((d) => retainedPaths.includes(d.path))
      : existingList;
  return [...kept, ...newFiles];
}

/** Empty or invalid → null (optional refs on AssignVendor). */
function parseOptionalObjectId(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  if (!mongoose.Types.ObjectId.isValid(s)) return null;
  return s;
}

function parseReviewStatus(v) {
  if (v == null || v === "") return "";
  const s = String(v).trim().toLowerCase();
  if (s === "approved" || s === "approve") return "approved";
  if (s === "rejected" || s === "reject") return "rejected";
  return "";
}

function parseFinanceReviewStatus(v) {
  if (v == null || v === "") return "unpaid";
  const s = String(v).trim().toLowerCase();
  if (s === "paid" || s === "unpaid" || s === "overdue" || s === "rejected") return s;
  // Backward compatibility: old value used in existing records.
  if (s === "approved") return "paid";
  return "unpaid";
}

function parseClientPaidValue(v) {
  if (v == null || v === "") return "unpaid";
  const s = String(v).trim().toLowerCase();
  return s === "paid" ? "paid" : "unpaid";
}

function parseReviewReason(v) {
  if (v == null) return "";
  return String(v).trim().slice(0, 2000);
}

function parsePaymentReference(v) {
  if (v == null) return "";
  return String(v).trim().slice(0, 512);
}

function parsePaymentDate(v) {
  if (v == null || v === "") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseSow(v) {
  if (v == null) return "";
  return String(v).trim().slice(0, 5000);
}

function parseInvoiceSubmissionDate(v) {
  if (v == null || v === "") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function isOlderThanVendorAssignmentWindow(dateValue) {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return false;
  const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000;
  return Date.now() - d.getTime() > FOUR_WEEKS_MS;
}

function parseSoDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

async function getBusinessOrderDate(businessOrderId) {
  if (!businessOrderId || !mongoose.Types.ObjectId.isValid(String(businessOrderId))) {
    return null;
  }
  const bo = await BusinessOrderInvoice.findById(businessOrderId)
    .select("purchaseOrderDate")
    .lean();
  return parseSoDate(bo?.purchaseOrderDate);
}

function isPrivilegedRoleName(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  return normalized === "admin" || normalized === "superadmin";
}

async function isAdminUser(req) {
  const roleHints = [req.user?.role, req.user?.userRole, req.user?.type]
    .filter(Boolean)
    .map((v) => String(v));
  if (roleHints.some((v) => isPrivilegedRoleName(v))) {
    return true;
  }

  const rawRoleId = req.user?.roleId;
  const roleId =
    typeof rawRoleId === "string"
      ? rawRoleId
      : rawRoleId?._id
      ? String(rawRoleId._id)
      : "";
  if (!roleId || !mongoose.Types.ObjectId.isValid(roleId)) {
    return false;
  }
  const role = await db.role.findById(roleId).select("roleName").lean();
  return isPrivilegedRoleName(role?.roleName);
}

function applyAdminApprovalWorkflow({ row, isAfterFourWeeks }) {
  if (!isAfterFourWeeks) {
    row.adminApprovalStatus = "not_required";
    row.adminApprovalRequestedAt = null;
    row.adminApprovalReviewedAt = null;
    return;
  }

  row.adminApprovalStatus = "pending";
  row.adminApprovalRequestedAt = new Date();
  row.adminApprovalReviewedAt = null;
  // Keep downstream workflow blocked until admin reviews.
  row.sendToHodReview = "no";
}

function parseSendToHodReview(v) {
  if (v == null || v === "") return "no";
  return String(v).trim().toLowerCase() === "yes" ? "yes" : "no";
}

async function getWorkflowUsers(row) {
  const [accountManager, hod] = await Promise.all([
    row?.createdBy
      ? db.user.findById(row.createdBy).select("userName email").lean()
      : null,
    row?.hodAssignUserId
      ? db.user.findById(row.hodAssignUserId).select("userName email").lean()
      : null,
  ]);
  return { accountManager, hod };
}

function parseVatPercent(v) {
  if (v == null || v === "") return "";
  const n = Number(String(v).trim());
  if (!Number.isFinite(n) || n < 0 || n > 100) return "";
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

function parseVatNeeded(v) {
  if (typeof v === "boolean") return v;
  if (v == null || v === "") return false;
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

function parseVatAmount(v) {
  if (v == null) return "";
  return String(v).trim().slice(0, 256);
}

function isVendorLicenseExpired(value) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  d.setHours(23, 59, 59, 999);
  return d.getTime() < Date.now();
}

async function assertHierarchy(clientId, projectId, businessOrderId) {
  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    return "Invalid client.";
  }
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return "Invalid project.";
  }
  if (!mongoose.Types.ObjectId.isValid(businessOrderId)) {
    return "Invalid sales order (SO).";
  }

  const project = await Project.findOne({
    _id: projectId,
    clientId,
    status: true,
  }).lean();
  if (!project) {
    return "Project does not belong to the selected client or was not found.";
  }

  const bo = await BusinessOrderInvoice.findById(businessOrderId).lean();
  if (!bo) {
    return "Sales order (SO) was not found.";
  }
  if (!bo.projectId) {
    return "This SO is not linked to a project; link it in SO uploads first.";
  }
  if (String(bo.projectId) !== String(projectId)) {
    return "Selected SO does not belong to the selected project.";
  }

  return null;
}

async function assertVendorRef(vendorId) {
  if (!vendorId) return null;
  const v = await Vendor.findOne({ _id: vendorId, status: true })
    .select("_id licenseExpiryDate")
    .lean();
  if (!v) {
    return "Vendor not found or inactive.";
  }
  if (isVendorLicenseExpired(v.licenseExpiryDate)) {
    return "Vendor license is expired. Assign vendor is not allowed.";
  }
  return null;
}

exports.listBusinessOrdersForProject = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Valid projectId query is required." });
    }

    const docs = await BusinessOrderInvoice.find({ projectId })
      .sort({ createdAt: -1 })
      .select("boNo invoiceNumber originalFileName totalAmount createdAt purchaseOrderDate")
      .lean();

    const items = docs.map((d) => {
      const parts = [d.boNo, d.invoiceNumber].filter(Boolean);
      const labelBase =
        parts.length > 0 ? parts.join(" · ") : d.originalFileName || "Sales order";
      const amt =
        d.totalAmount != null && d.totalAmount !== ""
          ? ` (${d.totalAmount})`
          : "";
      return {
        id: String(d._id),
        label: `${labelBase}${amt}`,
        boNo: d.boNo || "",
        invoiceNumber: d.invoiceNumber || "",
        originalFileName: d.originalFileName || "",
        purchaseOrderDate: d.purchaseOrderDate || "",
        isAfterFourWeeksFromOrderDate: isOlderThanVendorAssignmentWindow(
          parseSoDate(d.purchaseOrderDate),
        ),
      };
    });

    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message || "List failed." });
  }
};

exports.getBusinessOrderForAssign = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Valid business order id is required." });
    }

    const doc = await BusinessOrderInvoice.findById(id)
      .select("clientId projectId scopeOfWork boNo invoiceNumber originalFileName purchaseOrderDate")
      .lean();
    if (!doc) {
      return res.status(404).json({ message: "Sales order (SO) was not found." });
    }

    const scopeOfWork = Array.isArray(doc.scopeOfWork)
      ? doc.scopeOfWork.map((item) => ({
          title: item?.title ?? "",
          details: Array.isArray(item?.details) ? item.details.map((d) => String(d)) : [],
          departmentId: item?.departmentId != null ? String(item.departmentId) : "",
          vendorId: item?.vendorId != null ? String(item.vendorId) : "",
          taxAmount: item?.taxAmount ?? null,
          totalAmount: item?.totalAmount ?? null,
        }))
      : [];

    return res.json({
      id: String(doc._id),
      clientId: doc.clientId ? String(doc.clientId) : null,
      projectId: doc.projectId ? String(doc.projectId) : null,
      boNo: doc.boNo || "",
      invoiceNumber: doc.invoiceNumber || "",
      originalFileName: doc.originalFileName || "",
      purchaseOrderDate: doc.purchaseOrderDate || "",
      scopeOfWork,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Load failed." });
  }
};

exports.createAssignVendor = async (req, res) => {
  try {
    const body = req.body || {};
    const clientId = parseOptionalObjectId(body.clientId);
    const projectId = parseOptionalObjectId(body.projectId);
    const businessOrderId = parseOptionalObjectId(body.businessOrderId);
    const costToAgency = body.costToAgency != null ? String(body.costToAgency).trim() : "";
    const costToClient = body.costToClient != null ? String(body.costToClient).trim() : "";
    const invoiceSubmissionDate = parseInvoiceSubmissionDate(body.invoiceSubmissionDate);
    const vatPercent = parseVatPercent(body.vatPercent);
    const vatNeeded = parseVatNeeded(body.vatNeeded);
    const vatAmount = parseVatAmount(body.vatAmount);
    const sow = parseSow(body.sow);
    const sendToHodReview = parseSendToHodReview(body.sendToHodReview);
    const vendorId = parseOptionalObjectId(body.vendorId);
    const hodAssignUserId = parseOptionalObjectId(body.hodAssignUserId);
    const clientPaidValue = parseClientPaidValue(body.clientPaidValue);
    const isAdmin = await isAdminUser(req);
    const soDate = await getBusinessOrderDate(businessOrderId);
    const isAfterFourWeeks = isOlderThanVendorAssignmentWindow(soDate);

    if (vendorId) {
      const vendorErr = await assertVendorRef(vendorId);
      if (vendorErr) {
        return res.status(400).json({ message: vendorErr });
      }
    }

    if (clientId && projectId && businessOrderId) {
      const hierarchyErr = await assertHierarchy(clientId, projectId, businessOrderId);
      if (hierarchyErr) {
        return res.status(400).json({ message: hierarchyErr });
      }
    }

    const vendorInvoiceFiles = mapUploadedFiles(req.files, "vendorInvoiceFiles");
    const vendorReportFiles = mapUploadedFiles(req.files, "vendorReportFiles");
    const paymentSlipFiles = mapUploadedFiles(req.files, "paymentSlipFiles");

    const createdBy = getUserId(req);
    if (sendToHodReview === "yes" && vendorInvoiceFiles.length === 0) {
      return res.status(400).json({
        message: "Vendor invoice upload is mandatory before sending for approval.",
      });
    }

    const doc = await AssignVendor.create({
      clientId: clientId || null,
      projectId: projectId || null,
      businessOrderId: businessOrderId || null,
      vendorId: vendorId || null,
      vatPercent: vatNeeded ? vatPercent : "",
      vatNeeded,
      vatAmount: vatNeeded ? vatAmount : "",
      costToAgency,
      costToClient,
      invoiceSubmissionDate,
      sow,
      hodAssignUserId: hodAssignUserId || null,
      sendToHodReview: isAfterFourWeeks && !isAdmin ? "no" : sendToHodReview,
      vendorInvoiceFiles,
      vendorReportFiles,
      paymentSlipFiles,
      clientPaidValue,
      createdBy,
      adminApprovalStatus: isAfterFourWeeks ? "pending" : "not_required",
      adminApprovalRequestedAt: isAfterFourWeeks ? new Date() : null,
      adminApprovalReviewedAt: null,
    });

    if (createdBy) {
      await createLog({
        userId: createdBy,
        role: getLogRole(req),
        action: "CREATE",
        module: "assign_vendor",
        recordId: doc._id,
        newData: doc,
        ...getRequestMeta(req),
      });
    }

    if (doc.sendToHodReview === "yes" && doc.adminApprovalStatus !== "pending") {
      const populated = await AssignVendor.findById(doc._id).populate(listPopulate).lean();
      const users = await getWorkflowUsers(doc);
      await notifyInvoiceSubmittedToHod({
        record: populated,
        accountManager: users.accountManager,
        hod: users.hod,
      });
    }

    if (isAfterFourWeeks) {
      return res.status(201).json({
        ...doc.toObject(),
        message:
          "This assignment is older than 4 weeks from Order Date and has been sent for Admin/Superadmin approval.",
      });
    }
    res.status(201).json(doc);
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    }
    res.status(400).json({ message: err.message || "Create failed." });
  }
};

const listPopulate = [
  { path: "clientId", select: "clientName" },
  { path: "projectId", select: "projectName" },
  {
    path: "businessOrderId",
    select: "boNo invoiceNumber originalFileName purchaseOrderDate",
  },
  { path: "vendorId", select: "vendorName vendorEmail" },
  { path: "hodAssignUserId", select: "userName email mobileNumber" },
];

exports.getAssignVendors = async (req, res) => {
  try {
    const {
      clientId,
      projectId,
      businessOrderId,
      vendorId,
      sendToHodReview,
      hodReviewStatus,
      financeReviewStatus,
      adminApprovalStatus,
    } = req.query;
    let requestedAdminApprovalStatus = null;
    const q = {};
    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      q.clientId = clientId;
    }
    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      q.projectId = projectId;
    }
    if (businessOrderId && mongoose.Types.ObjectId.isValid(businessOrderId)) {
      q.businessOrderId = businessOrderId;
    }
    if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
      q.vendorId = vendorId;
    }
    if (sendToHodReview !== undefined) {
      const f = String(sendToHodReview).trim().toLowerCase();
      if (f === "yes" || f === "no") {
        q.sendToHodReview = f;
      }
    }
    if (hodReviewStatus !== undefined) {
      const h = parseReviewStatus(hodReviewStatus);
      q.hodReviewStatus = h;
    }
    if (financeReviewStatus !== undefined) {
      const f = parseFinanceReviewStatus(financeReviewStatus);
      q.financeReviewStatus = f;
    }
    if (adminApprovalStatus !== undefined) {
      const a = String(adminApprovalStatus).trim().toLowerCase();
      if (["not_required", "pending", "approved", "rejected"].includes(a)) {
        requestedAdminApprovalStatus = a;
        if (a !== "pending") {
          q.adminApprovalStatus = a;
        }
      }
    }

    let rows = await AssignVendor.find(q)
      .sort({ createdAt: -1 })
      .populate(listPopulate)
      .lean();

    if (requestedAdminApprovalStatus === "pending") {
      rows = rows
        .map((row) => {
          const status = String(row.adminApprovalStatus || "").trim().toLowerCase();
          if (status === "pending") return row;
          if (status === "approved" || status === "rejected") return null;
          const orderDate = row?.businessOrderId?.purchaseOrderDate;
          if (isOlderThanVendorAssignmentWindow(parseSoDate(orderDate))) {
            return { ...row, adminApprovalStatus: "pending" };
          }
          return null;
        })
        .filter(Boolean);
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAssignVendor = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid id." });
    }
    const row = await AssignVendor.findById(id).populate(listPopulate).lean();
    if (!row) return res.status(404).json({ message: "Record not found." });
    res.json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateAssignVendor = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid id." });
    }

    const row = await AssignVendor.findById(id);
    if (!row) return res.status(404).json({ message: "Record not found." });

    const body = req.body || {};
    const isAdmin = await isAdminUser(req);
    const previous = {
      sendToHodReview: row.sendToHodReview,
      hodReviewStatus: row.hodReviewStatus,
      financeReviewStatus: row.financeReviewStatus,
    };

    if (body.clientId !== undefined && String(body.clientId).trim() !== "") {
      row.clientId = parseOptionalObjectId(body.clientId);
    }
    if (body.projectId !== undefined && String(body.projectId).trim() !== "") {
      row.projectId = parseOptionalObjectId(body.projectId);
    }
    if (body.businessOrderId !== undefined) {
      if (String(body.businessOrderId).trim() !== "") {
        row.businessOrderId = parseOptionalObjectId(body.businessOrderId);
      }
    }

    const clientId = row.clientId;
    const projectId = row.projectId;
    const businessOrderId = row.businessOrderId;
    const soDate = await getBusinessOrderDate(businessOrderId);
    const isAfterFourWeeks = isOlderThanVendorAssignmentWindow(soDate);

    if (clientId && projectId && businessOrderId) {
      const hierarchyErr = await assertHierarchy(clientId, projectId, businessOrderId);
      if (hierarchyErr) {
        return res.status(400).json({ message: hierarchyErr });
      }
    }

    if (body.costToAgency !== undefined) {
      row.costToAgency = String(body.costToAgency).trim();
    }
    if (body.costToClient !== undefined) {
      row.costToClient = String(body.costToClient).trim();
    }
    if (body.invoiceSubmissionDate !== undefined) {
      row.invoiceSubmissionDate = parseInvoiceSubmissionDate(body.invoiceSubmissionDate);
    }
    if (body.vatPercent !== undefined) {
      row.vatPercent = parseVatPercent(body.vatPercent);
    }
    if (body.vatNeeded !== undefined) {
      row.vatNeeded = parseVatNeeded(body.vatNeeded);
    }
    if (body.vatAmount !== undefined) {
      row.vatAmount = parseVatAmount(body.vatAmount);
    }
    if (!row.vatNeeded) {
      row.vatPercent = "";
      row.vatAmount = "";
    }
    if (body.sow !== undefined) {
      row.sow = parseSow(body.sow);
    }
    if (body.sendToHodReview !== undefined) {
      if (row.adminApprovalStatus === "pending") {
        return res.status(400).json({
          message:
            "This assignment is pending Admin/Superadmin approval because Order Date is older than 4 weeks.",
        });
      }
      row.sendToHodReview = parseSendToHodReview(body.sendToHodReview);
    }
    if (body.adminApprovalStatus !== undefined) {
      if (!isAdmin) {
        return res.status(403).json({
          message: "Only Admin/Superadmin can review admin approval requests.",
        });
      }
      const nextApproval = String(body.adminApprovalStatus).trim().toLowerCase();
      if (!["approved", "rejected", "pending", "not_required"].includes(nextApproval)) {
        return res.status(400).json({
          message: "Invalid admin approval status.",
        });
      }
      if (!isAfterFourWeeks && nextApproval !== "not_required") {
        return res.status(400).json({
          message:
            "Admin approval is applicable only when SO Order Date is older than 4 weeks.",
        });
      }
      row.adminApprovalStatus = nextApproval;
      if (nextApproval === "approved" || nextApproval === "rejected") {
        row.adminApprovalReviewedAt = new Date();
        if (!row.adminApprovalRequestedAt) {
          row.adminApprovalRequestedAt = new Date();
        }
        if (nextApproval === "approved") {
          if (!row.vendorInvoiceFiles || row.vendorInvoiceFiles.length === 0) {
            return res.status(400).json({
              message:
                "Vendor invoice upload is mandatory before Admin/Superadmin can approve and send to HOD.",
            });
          }
          // After admin/superadmin approval, route forward to HOD workflow.
          row.sendToHodReview = "yes";
        } else {
          // Rejected by admin/superadmin: keep HOD workflow blocked.
          row.sendToHodReview = "no";
        }
      } else if (nextApproval === "pending") {
        row.adminApprovalRequestedAt = new Date();
        row.adminApprovalReviewedAt = null;
        row.sendToHodReview = "no";
      } else {
        row.adminApprovalRequestedAt = null;
        row.adminApprovalReviewedAt = null;
      }
    }
    if (body.hodAssignUserId !== undefined) {
      row.hodAssignUserId = parseOptionalObjectId(body.hodAssignUserId);
    }
    if (body.vendorId !== undefined) {
      if (String(body.vendorId).trim() !== "") {
        const vid = parseOptionalObjectId(body.vendorId);
        if (vid) {
          const isChangingVendor = String(row.vendorId || "") !== String(vid);
          if (isChangingVendor && isAfterFourWeeks) {
            applyAdminApprovalWorkflow({ row, isAfterFourWeeks });
          }
          const vendorErr = await assertVendorRef(vid);
          if (vendorErr) {
            return res.status(400).json({ message: vendorErr });
          }
          row.vendorId = vid;
        }
      }
    }


    const retainedInv = parseRetained(body, "vendorInvoiceFilesRetain");
    const retainedRep = parseRetained(body, "vendorReportFilesRetain");
    const retainedPay = parseRetained(body, "paymentSlipFilesRetain");
    const newInv = mapUploadedFiles(req.files, "vendorInvoiceFiles");
    const newRep = mapUploadedFiles(req.files, "vendorReportFiles");
    const newPay = mapUploadedFiles(req.files, "paymentSlipFiles");

    if (retainedInv !== null || newInv.length > 0) {
      row.vendorInvoiceFiles = mergeFileLists(row.vendorInvoiceFiles, retainedInv, newInv);
    }
    if (retainedRep !== null || newRep.length > 0) {
      row.vendorReportFiles = mergeFileLists(row.vendorReportFiles, retainedRep, newRep);
    }
    if (retainedPay !== null || newPay.length > 0) {
      row.paymentSlipFiles = mergeFileLists(row.paymentSlipFiles, retainedPay, newPay);
    }

    if (body.hodReviewStatus !== undefined) {
      row.hodReviewStatus = parseReviewStatus(body.hodReviewStatus);
    }
    if (body.hodReviewReason !== undefined) {
      row.hodReviewReason = parseReviewReason(body.hodReviewReason);
    }
    if (body.financeReviewStatus !== undefined) {
      row.financeReviewStatus = parseFinanceReviewStatus(body.financeReviewStatus);
    }
    if (body.financeReviewReason !== undefined) {
      row.financeReviewReason = parseReviewReason(body.financeReviewReason);
    }
    if (body.clientPaidValue !== undefined) {
      row.clientPaidValue = parseClientPaidValue(body.clientPaidValue);
    }
    if (body.paymentReference !== undefined || body.paymentNote !== undefined) {
      row.paymentReference = parsePaymentReference(
        body.paymentReference !== undefined ? body.paymentReference : body.paymentNote,
      );
    }
    if (body.paymentDate !== undefined) {
      row.paymentDate = parsePaymentDate(body.paymentDate);
    }

    const isResubmission =
      row.sendToHodReview === "yes" &&
      (previous.hodReviewStatus === "rejected" || previous.financeReviewStatus === "rejected");
    if (isResubmission) {
      row.hodReviewStatus = "";
      row.hodReviewReason = "";
      row.financeReviewStatus = "unpaid";
      row.financeReviewReason = "";
      row.paymentDate = null;
      row.paymentReference = "";
      row.paymentSlipFiles = [];
    }

    if (row.sendToHodReview === "yes" && (!row.vendorInvoiceFiles || row.vendorInvoiceFiles.length === 0)) {
      return res.status(400).json({
        message: "Vendor invoice upload is mandatory before sending for approval.",
      });
    }

    if (row.hodReviewStatus === "rejected" && !row.hodReviewReason) {
      return res.status(400).json({
        message: "Rejection reason is mandatory for HOD rejection.",
      });
    }
    if (row.financeReviewStatus === "rejected" && !row.financeReviewReason) {
      return res.status(400).json({
        message: "Rejection reason is mandatory for Finance rejection.",
      });
    }

    if (
      (row.financeReviewStatus === "paid" || row.financeReviewStatus === "rejected") &&
      row.hodReviewStatus !== "approved"
    ) {
      return res.status(400).json({
        message: "Finance cannot take action before HOD approval.",
      });
    }

    if (row.financeReviewStatus === "paid") {
      // Payment proof is optional based on current workflow preference.
    }

    const uid = getUserId(req);
    if (uid) row.updatedBy = uid;

    await row.save();

    await createLog({
      userId: uid,
      role: getLogRole(req),
      action: "UPDATE",
      module: "assign_vendor",
      recordId: row._id,
      newData: row,
      ...getRequestMeta(req),
    });

    const fresh = await AssignVendor.findById(row._id).populate(listPopulate).lean();
    const users = await getWorkflowUsers(row);
    const hodApprovedTransition =
      previous.hodReviewStatus !== "approved" && fresh.hodReviewStatus === "approved";
    const hodRejectedTransition =
      previous.hodReviewStatus !== "rejected" && fresh.hodReviewStatus === "rejected";
    const financeRejectedTransition =
      previous.financeReviewStatus !== "rejected" && fresh.financeReviewStatus === "rejected";
    const financePaidTransition =
      previous.financeReviewStatus !== "paid" && fresh.financeReviewStatus === "paid";
    const submittedToHodTransition =
      (previous.sendToHodReview !== "yes" || isResubmission) &&
      fresh.sendToHodReview === "yes";

    if (submittedToHodTransition) {
      await notifyInvoiceSubmittedToHod({
        record: fresh,
        accountManager: users.accountManager,
        hod: users.hod,
      });
    }
    if (hodRejectedTransition) {
      await notifyHodRejected({
        record: fresh,
        accountManager: users.accountManager,
        hod: users.hod,
        reason: fresh.hodReviewReason,
      });
    }
    if (hodApprovedTransition) {
      await notifyHodApproved({
        record: fresh,
        accountManager: users.accountManager,
        hod: users.hod,
      });
    }
    if (financeRejectedTransition) {
      await notifyFinanceRejected({
        accountManager: users.accountManager,
        hod: users.hod,
        reason: fresh.financeReviewReason,
      });
    }
    if (financePaidTransition) {
      const paymentSlipLabel =
        fresh.paymentSlipFiles && fresh.paymentSlipFiles[0]
          ? fresh.paymentSlipFiles[0].originalName || "Payment Slip"
          : "Payment Slip";
      const paymentDateValue = fresh.paymentDate || fresh.updatedAt || new Date();
      await notifyPaymentCompleted({
        accountManager: users.accountManager,
        hod: users.hod,
        paymentDate: new Date(paymentDateValue).toISOString().slice(0, 10),
        paymentSlipLabel,
      });
    }
    res.json(fresh);
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    }
    res.status(400).json({ message: err.message || "Update failed." });
  }
};

exports.deleteAssignVendor = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid id." });
    }
    const row = await AssignVendor.findByIdAndDelete(id);
    if (!row) return res.status(404).json({ message: "Record not found." });

    const uid = getUserId(req);
    if (uid) {
      await createLog({
        userId: uid,
        role: getLogRole(req),
        action: "DELETE",
        module: "assign_vendor",
        recordId: row._id,
        oldData: row,
        ...getRequestMeta(req),
      });
    }

    res.json({ message: "Deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
