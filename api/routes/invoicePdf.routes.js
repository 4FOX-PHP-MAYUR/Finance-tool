const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { extractInvoiceFields, INVOICE_EXTRACTOR_VERSION } = require("../services/invoiceExtractor");
const { extractTextFromPdfBuffer } = require("../services/pdfTextExtract.service");
const { parseMoneyToNumber } = require("../utils/invoiceMoney");
const { buildInvoiceSummaryPdf } = require("../services/invoicePdfExport");
const BusinessOrderInvoice = require("../models/businessOrderInvoice.model");
const Project = require("../models/project.model");
const {
  resolveClientForInvoicePdf,
  mergeClientFromInvoiceData,
} = require("../services/clientInvoiceResolve.service");
const { findOrCreateProjectFromBoInvoice } = require("../services/projectFromBoInvoice.service");
const auth = require("../middlewares/auth.middleware");
const { checkPermission } = require("../middlewares/permission.middleware");

const STANDARD_RATE_PERCENT = 5;

const router = express.Router();

/** Deploy check — open while logged in: GET /api/invoice-pdf/version */
router.get("/version", (_req, res) => {
  res.json({
    extractorVersion: INVOICE_EXTRACTOR_VERSION,
    ok: true,
  });
});

router.use(auth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === "application/pdf";
    if (!isPdf) {
      return cb(new Error("Only PDF files are allowed."));
    }
    cb(null, true);
  },
});

async function resolveProjectFromUploadBody(body) {
  const rawId = body?.projectId != null ? String(body.projectId).trim() : "";
  const rawName = body?.projectName != null ? String(body.projectName).trim() : "";

  if (rawId && mongoose.Types.ObjectId.isValid(rawId)) {
    const proj = await Project.findOne({ _id: rawId, status: true }).lean();
    if (!proj) {
      return { error: "Selected project was not found." };
    }
    return {
      projectId: proj._id,
      projectName: String(proj.projectName || "").slice(0, 200),
    };
  }

  const name = rawName.slice(0, 200);
  if (!name) {
    return { error: "Select a project or enter a project name." };
  }
  return { projectId: null, projectName: name };
}

router.post("/upload", checkPermission("so", "add"), upload.single("invoice"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a PDF file." });
    }

    const projectResolved = await resolveProjectFromUploadBody(req.body || {});
    if (projectResolved.error) {
      return res.status(400).json({ error: projectResolved.error });
    }

    const boNoFromBody =
      req.body?.boNo != null ? String(req.body.boNo).trim().slice(0, 128) : "";

    let rawText = "";
    let pagesParsed = 1;
    let textLength = 0;
    try {
      const extractedText = await extractTextFromPdfBuffer(req.file.buffer);
      rawText = extractedText.rawText;
      pagesParsed = extractedText.pagesParsed;
      textLength = extractedText.textLength || rawText.length;
    } catch (parseErr) {
      console.error("[invoice-pdf/upload] PDF text extraction failed:", parseErr?.message || parseErr);
      return res.status(400).json({
        error: parseErr?.message || "Failed to read PDF text. Please check the file and try again.",
      });
    }

    let extracted;
    try {
      extracted = extractInvoiceFields(rawText);
    } catch (extractErr) {
      console.error("[invoice-pdf/upload] Field extraction failed:", extractErr?.message || extractErr);
      return res.status(500).json({
        error: "Failed to parse invoice fields from PDF text.",
      });
    }

    const scopeCount = Array.isArray(extracted.scopeOfWork) ? extracted.scopeOfWork.length : 0;
    console.log(
      `[invoice-pdf/upload] extractor=${INVOICE_EXTRACTOR_VERSION} pages=${pagesParsed} textLen=${textLength} scopeItems=${scopeCount} file=${req.file.originalname || "invoice.pdf"}`,
    );

    const subtotalNum = parseMoneyToNumber(extracted.subtotal);
    const totalNum = parseMoneyToNumber(extracted.totalAmount);
    let standardRateAmtNum = parseMoneyToNumber(extracted.standardRateAmount);
    if (standardRateAmtNum == null && subtotalNum != null) {
      standardRateAmtNum = (subtotalNum * STANDARD_RATE_PERCENT) / 100;
    }

    const resolution = await resolveClientForInvoicePdf(extracted.clientName, {
      clientAddress: extracted.clientAddress,
      trn: extracted.trn,
    });
    if (resolution.systemError) {
      return res.status(500).json({
        error: resolution.error || "Failed to link client record.",
      });
    }

    let linkedClientId = null;
    let storedClientName =
      extracted.clientName === "Not Found" ? "" : extracted.clientName || "";
    let clientExtractionFailed = false;
    let clientResolutionError = null;

    if (resolution.client) {
      linkedClientId = resolution.client._id;
      storedClientName = resolution.client.clientName || storedClientName;
    } else {
      clientExtractionFailed = Boolean(resolution.clientExtractionFailed);
      clientResolutionError = resolution.error || null;
    }

    let finalProjectId = projectResolved.projectId;
    let finalProjectName = projectResolved.projectName || "";
    let projectCreatedNewInModule = false;

    if (!finalProjectId && finalProjectName) {
      const userId = req.user?.id || req.user?._id || req.user?.userId || req.user?.sub;
      const pr = await findOrCreateProjectFromBoInvoice({
        rawProjectName: finalProjectName,
        clientId: linkedClientId,
        userId,
        req,
      });
      if (pr.error) {
        return res.status(400).json({ error: pr.error });
      }
      finalProjectId = pr.projectId;
      finalProjectName = pr.projectName || finalProjectName;
      projectCreatedNewInModule = Boolean(pr.createdNew);
    }

    const doc = await BusinessOrderInvoice.create({
      originalFileName: req.file.originalname || "invoice.pdf",
      invoiceType: extracted.invoiceType || "",
      pagesParsed,
      clientId: linkedClientId,
      projectId: finalProjectId,
      projectName: finalProjectName || "",
      boNo: boNoFromBody,
      clientName: storedClientName,
      clientAddress: extracted.clientAddress === "Not Found" ? "" : extracted.clientAddress || "",
      trn: extracted.trn === "Not Found" ? "" : extracted.trn || "",
      salesPerson: extracted.salesPerson === "Not Found" ? "" : extracted.salesPerson || "",
      purchaseOrderNumber:
        extracted.purchaseOrderNumber === "Not Found" ? "" : extracted.purchaseOrderNumber || "",
      purchaseOrderDate:
        extracted.purchaseOrderDate === "Not Found" ? "" : extracted.purchaseOrderDate || "",
      invoiceNumber: extracted.invoiceNumber === "Not Found" ? "" : extracted.invoiceNumber || "",
      subtotal: subtotalNum,
      standardRatePercent: STANDARD_RATE_PERCENT,
      standardRateAmount: standardRateAmtNum,
      totalAmount: totalNum,
      termsAndConditions:
        extracted.termsAndConditions === "Not Found" ? "" : extracted.termsAndConditions || "",
      scopeOfWork: Array.isArray(extracted.scopeOfWork) ? extracted.scopeOfWork : [],
      uploadedPdf: req.file.buffer,
      hasUploadedPdf: true,
    });

    return res.json({
      ...extracted,
      pagesParsed,
      scopeItemCount: scopeCount,
      extractorVersion: INVOICE_EXTRACTOR_VERSION,
      pdfTextLength: textLength,
      savedId: doc._id,
      clientId: linkedClientId,
      projectId: doc.projectId ? String(doc.projectId) : null,
      projectName: doc.projectName || "",
      boNo: doc.boNo || "",
      approved: Boolean(doc.approved),
      approvedAt: doc.approvedAt ? doc.approvedAt.toISOString() : null,
      projectCreatedNewInModule: projectCreatedNewInModule,
      clientExtractionFailed,
      clientResolutionError,
      amountsNumeric: {
        subtotal: doc.subtotal,
        standardRateAmount: doc.standardRateAmount,
        totalAmount: doc.totalAmount,
      },
    });
  } catch (error) {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: error.message || "Failed to parse PDF or save record.",
    });
  }
});

function parseNumberOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return parseMoneyToNumber(String(v));
}

function getSowMainHeading(scope) {
  if (!Array.isArray(scope) || !scope.length) return "";
  const first = scope[0];
  const title = (first?.title || "").trim();
  if (title) return title;
  const det = first?.details;
  if (Array.isArray(det) && det.length && String(det[0]).trim()) {
    return String(det[0]).trim().slice(0, 120);
  }
  return "";
}

function docToClientShape(doc) {
  return {
    invoiceType: doc.invoiceType ?? "",
    clientId: doc.clientId ?? null,
    projectId: doc.projectId ? String(doc.projectId) : null,
    projectName: doc.projectName ?? "",
    boNo: doc.boNo ?? "",
    clientName: doc.clientName ?? "",
    clientAddress: doc.clientAddress ?? "",
    trn: doc.trn ?? "",
    salesPerson: doc.salesPerson ?? "",
    purchaseOrderNumber: doc.purchaseOrderNumber ?? "",
    purchaseOrderDate: doc.purchaseOrderDate ?? "",
    invoiceNumber: doc.invoiceNumber ?? "",
    approved: Boolean(doc.approved),
    approvedAt: doc.approvedAt ? doc.approvedAt.toISOString() : null,
    subtotal: doc.subtotal != null ? String(doc.subtotal) : "",
    standardRate: `${doc.standardRatePercent ?? STANDARD_RATE_PERCENT}%`,
    standardRateAmount:
      doc.standardRateAmount != null ? String(doc.standardRateAmount) : "",
    totalAmount: doc.totalAmount != null ? String(doc.totalAmount) : "",
    termsAndConditions: doc.termsAndConditions ?? "",
    scopeOfWork: doc.scopeOfWork || [],
    pagesParsed: doc.pagesParsed,
    savedId: doc._id,
    originalFileName: doc.originalFileName ?? "",
    amountsNumeric: {
      subtotal: doc.subtotal,
      standardRateAmount: doc.standardRateAmount,
      totalAmount: doc.totalAmount,
    },
  };
}

router.get("/", checkPermission("so", "view"), async (_req, res) => {
  try {
    const docs = await BusinessOrderInvoice.find({})
      .sort({ createdAt: -1 })
      .select(
        "clientId clientName clientAddress projectId projectName boNo salesPerson purchaseOrderNumber purchaseOrderDate invoiceNumber totalAmount originalFileName createdAt scopeOfWork hasUploadedPdf approved",
      )
      .lean();

    const items = docs.map((d) => ({
      id: String(d._id),
      clientId: d.clientId ? String(d.clientId) : null,
      clientName: d.clientName || "",
      clientAddress: d.clientAddress || "",
      projectId: d.projectId ? String(d.projectId) : null,
      projectName: d.projectName || "",
      boNo: d.boNo || "",
      salesPerson: d.salesPerson || "",
      purchaseOrderNumber: d.purchaseOrderNumber || "",
      purchaseOrderDate: d.purchaseOrderDate || "",
      invoiceNumber: d.invoiceNumber || "",
      totalAmount: d.totalAmount,
      originalFileName: d.originalFileName || "",
      createdAt: d.createdAt,
      sowHeading: getSowMainHeading(d.scopeOfWork),
      hasUploadedPdf: Boolean(d.hasUploadedPdf),
      approved: Boolean(d.approved),
    }));

    return res.json({ items });
  } catch (error) {
    return res.status(500).json({ error: error.message || "List failed." });
  }
});

router.get("/:id/pdf", checkPermission("so", "view"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid id." });
    }

    const doc = await BusinessOrderInvoice.findById(id).select("+uploadedPdf");
    if (!doc) {
      return res.status(404).json({ error: "Record not found." });
    }

    const safeName = String(doc.originalFileName || "invoice.pdf")
      .replace(/[^\w.\-]+/g, "_")
      .slice(0, 150);
    const attachmentName = safeName.toLowerCase().endsWith(".pdf") ? safeName : `${safeName || "invoice"}.pdf`;

    const source = String(req.query.source || "").toLowerCase();

    /** Generated PDF includes edited SOW, tax amount, and line totals. */
    if (source === "summary") {
      const buffer = await buildInvoiceSummaryPdf(doc);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="SOW-summary-${String(id).slice(-6)}.pdf"`,
      );
      res.setHeader("X-Pdf-Source", "generated");
      return res.send(buffer);
    }

    /** Only the raw file from upload (no app edits). */
    if (source === "original") {
      if (!doc.uploadedPdf || doc.uploadedPdf.length === 0) {
        return res.status(404).json({ error: "Original PDF upload is not stored for this record." });
      }
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${attachmentName}"`);
      res.setHeader("X-Pdf-Source", "uploaded");
      return res.send(doc.uploadedPdf);
    }

    if (doc.uploadedPdf && doc.uploadedPdf.length > 0) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${attachmentName}"`);
      res.setHeader("X-Pdf-Source", "uploaded");
      return res.send(doc.uploadedPdf);
    }

    const buffer = await buildInvoiceSummaryPdf(doc);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="SOW-summary-${String(id).slice(-6)}.pdf"`,
    );
    res.setHeader("X-Pdf-Source", "generated");
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ error: error.message || "PDF export failed." });
  }
});

router.get("/:id", checkPermission("so", "view"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid id." });
    }

    const doc = await BusinessOrderInvoice.findById(id);
    if (!doc) {
      return res.status(404).json({ error: "Record not found." });
    }

    return res.json(docToClientShape(doc));
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to load record." });
  }
});

router.delete("/:id", checkPermission("so", "delete"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid id." });
    }

    const doc = await BusinessOrderInvoice.findByIdAndDelete(id);
    if (!doc) {
      return res.status(404).json({ error: "Record not found." });
    }

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Delete failed." });
  }
});

router.patch("/:id", checkPermission("so", "update"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid id." });
    }

    const existingDoc = await BusinessOrderInvoice.findById(id);
    if (!existingDoc) {
      return res.status(404).json({ error: "Record not found." });
    }

    const body = req.body || {};
    const updates = {};

    let mergedClientId = existingDoc.clientId;
    if (body.clientId !== undefined) {
      if (body.clientId === null || body.clientId === "") {
        mergedClientId = null;
      } else if (mongoose.Types.ObjectId.isValid(String(body.clientId))) {
        mergedClientId = new mongoose.Types.ObjectId(String(body.clientId));
      } else {
        return res.status(400).json({ error: "Invalid clientId." });
      }
    }

    const userId = req.user?.id || req.user?._id || req.user?.userId || req.user?.sub;

    if (body.projectId !== undefined) {
      if (body.projectId === null || body.projectId === "") {
        const nm = body.projectName !== undefined ? String(body.projectName).trim() : "";
        if (nm) {
          const pr = await findOrCreateProjectFromBoInvoice({
            rawProjectName: nm,
            clientId: mergedClientId,
            userId,
            req,
          });
          if (pr.error) return res.status(400).json({ error: pr.error });
          updates.projectId = pr.projectId;
          updates.projectName = String(pr.projectName || nm).slice(0, 200);
        } else {
          updates.projectId = null;
          updates.projectName = "";
        }
      } else if (mongoose.Types.ObjectId.isValid(String(body.projectId))) {
        const proj = await Project.findOne({ _id: body.projectId, status: true });
        if (!proj) {
          return res.status(400).json({ error: "Project not found." });
        }
        updates.projectId = proj._id;
        updates.projectName = String(proj.projectName || "").slice(0, 200);
      } else {
        return res.status(400).json({ error: "Invalid projectId." });
      }
    } else if (body.projectName !== undefined) {
      const nm = String(body.projectName).trim();
      if (!nm) {
        updates.projectId = null;
        updates.projectName = "";
      } else {
        const pr = await findOrCreateProjectFromBoInvoice({
          rawProjectName: nm,
          clientId: mergedClientId,
          userId,
          req,
        });
        if (pr.error) return res.status(400).json({ error: pr.error });
        updates.projectId = pr.projectId;
        updates.projectName = String(pr.projectName || nm).slice(0, 200);
      }
    }

    if (body.invoiceType !== undefined) updates.invoiceType = String(body.invoiceType);
    if (body.boNo !== undefined) updates.boNo = String(body.boNo).trim().slice(0, 128);
    if (body.pagesParsed !== undefined) {
      const p = parseInt(String(body.pagesParsed), 10);
      updates.pagesParsed = Number.isFinite(p) && p > 0 ? p : 1;
    }
    if (body.clientName !== undefined) updates.clientName = String(body.clientName);
    if (body.clientAddress !== undefined) updates.clientAddress = String(body.clientAddress);
    if (body.clientId !== undefined) {
      if (body.clientId === null || body.clientId === "") {
        updates.clientId = null;
      } else if (mongoose.Types.ObjectId.isValid(String(body.clientId))) {
        updates.clientId = new mongoose.Types.ObjectId(String(body.clientId));
      }
    }
    if (body.trn !== undefined) updates.trn = String(body.trn);
    if (body.salesPerson !== undefined) {
      updates.salesPerson = String(body.salesPerson).trim().slice(0, 256);
    }
    if (body.purchaseOrderNumber !== undefined) {
      updates.purchaseOrderNumber = String(body.purchaseOrderNumber).trim().slice(0, 128);
    }
    if (body.purchaseOrderDate !== undefined) {
      updates.purchaseOrderDate = String(body.purchaseOrderDate).trim().slice(0, 64);
    }
    if (body.invoiceNumber !== undefined) updates.invoiceNumber = String(body.invoiceNumber);
    if (body.subtotal !== undefined) updates.subtotal = parseNumberOrNull(body.subtotal);
    if (body.standardRateAmount !== undefined) {
      updates.standardRateAmount = parseNumberOrNull(body.standardRateAmount);
    }
    if (body.totalAmount !== undefined) updates.totalAmount = parseNumberOrNull(body.totalAmount);
    if (body.standardRatePercent !== undefined) {
      const r = Number(body.standardRatePercent);
      if (Number.isFinite(r)) updates.standardRatePercent = r;
    }
    if (body.termsAndConditions !== undefined) {
      updates.termsAndConditions = String(body.termsAndConditions).trim().slice(0, 8000);
    }
    if (body.scopeOfWork !== undefined) {
      if (!Array.isArray(body.scopeOfWork)) {
        return res.status(400).json({ error: "scopeOfWork must be an array." });
      }
      updates.scopeOfWork = body.scopeOfWork.map((item) => ({
        title: String(item?.title ?? ""),
        details: Array.isArray(item?.details) ? item.details.map((d) => String(d)) : [],
        departmentId: String(item?.departmentId ?? "").trim().slice(0, 64),
        vendorId: String(item?.vendorId ?? "").trim().slice(0, 64),
        taxAmount: parseNumberOrNull(item?.taxAmount),
        totalAmount: parseNumberOrNull(item?.totalAmount),
      }));
    }

    if (body.approved !== undefined) {
      const approved = Boolean(body.approved);
      updates.approved = approved;
      updates.approvedAt = approved ? new Date() : null;
    }

    const doc = await BusinessOrderInvoice.findByIdAndUpdate(id, { $set: updates }, {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      return res.status(404).json({ error: "Record not found." });
    }

    if (doc.clientId) {
      await mergeClientFromInvoiceData(doc.clientId, {
        clientAddress: doc.clientAddress,
        trn: doc.trn,
      });
    }

    return res.json(docToClientShape(doc));
  } catch (error) {
    return res.status(500).json({ error: error.message || "Update failed." });
  }
});

module.exports = router;
