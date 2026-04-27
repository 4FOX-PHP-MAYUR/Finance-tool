const mongoose = require("mongoose");

const scopeItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    details: [{ type: String }],
    /** Department selected for this deliverable block. */
    departmentId: { type: String, default: "", trim: true, maxlength: 64 },
    taxAmount: { type: Number, default: null },
    /** Line total for this SOW block (distinct from invoice-level totalAmount). */
    totalAmount: { type: Number, default: null },
  },
  { _id: false },
);

const businessOrderInvoiceSchema = new mongoose.Schema(
  {
    originalFileName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 512,
    },
    invoiceType: { type: String, default: "" },
    pagesParsed: { type: Number, default: 1 },
    /** Linked Client document when upload matched or created a client. */
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    /** Linked Project when user picked an existing project from the list. */
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    /** Display name: from selected project or typed when project is not in the list. */
    projectName: { type: String, default: "", maxlength: 200 },
    /** User-entered Business Order number (optional; set at PDF upload or edited later). */
    boNo: { type: String, default: "", maxlength: 128, trim: true },
    clientName: { type: String, default: "" },
    /** Billing / registered address extracted from PDF (plain text). */
    clientAddress: { type: String, default: "" },
    trn: { type: String, default: "" },
    /** Sales / account contact (manual or extracted from PDF). */
    salesPerson: { type: String, default: "", maxlength: 256, trim: true },
    /** Tracking number (stored as purchaseOrderNumber; labels shown as Tracking no). */
    purchaseOrderNumber: { type: String, default: "", maxlength: 128, trim: true },
    /** Shown as "Tracking date"; often parsed from PDF "Order date" lines. */
    purchaseOrderDate: { type: String, default: "", maxlength: 64, trim: true },
    invoiceNumber: { type: String, default: "" },
    /** Amounts stored as numbers (INR or same unit as source PDF). */
    subtotal: { type: Number, default: null },
    standardRatePercent: { type: Number, default: 5 },
    standardRateAmount: { type: Number, default: null },
    totalAmount: { type: Number, default: null },
    scopeOfWork: {
      type: [scopeItemSchema],
      default: [],
    },
    /** Original uploaded PDF bytes (excluded from default queries). */
    uploadedPdf: { type: Buffer, select: false },
    /** True when `uploadedPdf` was saved at upload time. */
    hasUploadedPdf: { type: Boolean, default: false },
    /** User marked this upload as reviewed / approved. */
    approved: { type: Boolean, default: false },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("BusinessOrderInvoice", businessOrderInvoiceSchema);
