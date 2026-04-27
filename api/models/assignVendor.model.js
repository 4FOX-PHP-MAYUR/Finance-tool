const mongoose = require("mongoose");

const fileEntrySchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    originalName: { type: String, default: "" },
  },
  { _id: false },
);

const assignVendorSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    businessOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessOrderInvoice",
      default: null,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },
    vatPercent: {
      type: String,
      default: "",
    },
    vatNeeded: { type: Boolean, default: false },
    vatAmount: { type: String, default: "", maxlength: 256 },
    costToAgency: { type: String, default: "", maxlength: 256 },
    costToClient: { type: String, default: "", maxlength: 256 },
    invoiceSubmissionDate: { type: Date, default: null },
    sow: { type: String, default: "", maxlength: 5000 },
    hodAssignUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      default: null,
    },
    sendToHodReview: { type: String, enum: ["yes", "no"], default: "no" },
    vendorInvoiceFiles: { type: [fileEntrySchema], default: [] },
    vendorReportFiles: { type: [fileEntrySchema], default: [] },
    paymentSlipFiles: { type: [fileEntrySchema], default: [] },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
    hodReviewStatus: {
      type: String,
      enum: ["", "approved", "rejected"],
      default: "",
    },
    hodReviewReason: { type: String, default: "", maxlength: 2000 },
    financeReviewStatus: {
      type: String,
      enum: ["", "paid", "unpaid", "overdue", "rejected"],
      default: "unpaid",
    },
    financeReviewReason: { type: String, default: "", maxlength: 2000 },
    paymentDate: { type: Date, default: null },
    paymentReference: { type: String, default: "", maxlength: 512 },
    clientPaidValue: {
      type: String,
      enum: ["paid", "unpaid"],
      default: "unpaid",
    },
    adminApprovalStatus: {
      type: String,
      enum: ["not_required", "pending", "approved", "rejected"],
      default: "not_required",
    },
    adminApprovalRequestedAt: { type: Date, default: null },
    adminApprovalReviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

assignVendorSchema.index({ projectId: 1, createdAt: -1 });
assignVendorSchema.index({ clientId: 1, createdAt: -1 });
assignVendorSchema.index({ vendorId: 1, createdAt: -1 });

module.exports = mongoose.model("AssignVendor", assignVendorSchema);
