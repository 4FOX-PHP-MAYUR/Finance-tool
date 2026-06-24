import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  fetchBusinessOrdersForProject,
  fetchBusinessOrderForAssign,
  fileUrl,
} from "../../../services/assignVendorApi";

/**
 * Single string id for selects — matches how <option value> is compared in React.
 * Handles populated refs, $oid, and normalizes 24-char Mongo ObjectId hex to lowercase.
 */
function normalizeId(v) {
  if (v == null || v === "") return "";
  if (typeof v === "object") {
    if (v._id != null) return normalizeId(v._id);
    if (v.$oid != null) return normalizeId(v.$oid);
    return "";
  }
  const s = String(v).trim();
  if (/^[a-fA-F0-9]{24}$/.test(s)) return s.toLowerCase();
  return s;
}

function projectClientId(p) {
  return normalizeId(p?.clientId);
}

function clientNameFromInitial(initialRecord) {
  const c = initialRecord?.clientId;
  if (typeof c === "object" && c?.clientName) return String(c.clientName);
  return "";
}

function projectNameFromInitial(initialRecord) {
  const p = initialRecord?.projectId;
  if (typeof p === "object" && p?.projectName) return String(p.projectName);
  return "";
}

function boLabelFromInitial(initialRecord) {
  const b = initialRecord?.businessOrderId;
  if (typeof b !== "object" || !b) return "";
  const parts = [b.boNo, b.invoiceNumber].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  return b.originalFileName ? String(b.originalFileName) : "";
}

function vendorNameFromInitial(initialRecord) {
  const v = initialRecord?.vendorId;
  if (typeof v === "object" && v?.vendorName) return String(v.vendorName);
  return "";
}

function hodUserNameFromInitial(initialRecord) {
  const u = initialRecord?.hodAssignUserId;
  if (typeof u === "object" && u?.userName) return String(u.userName);
  if (typeof u === "object" && u?.email) return String(u.email);
  if (typeof u === "object" && u?.mobileNumber) return String(u.mobileNumber);
  return "";
}

const REVIEW_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "approved", label: "Approve" },
  { value: "rejected", label: "Reject" },
];
const FINANCE_REVIEW_OPTIONS = [
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "rejected", label: "Reject" },
];
const CLIENT_PAID_VALUE_OPTIONS = [
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
];
const BASE_VAT_OPTIONS = ["5", "10", "15", "20", "25"];

function normalizeVatRate(value) {
  if (value == null || value === "") return "";
  const n = Number(String(value).trim());
  if (!Number.isFinite(n) || n < 0 || n > 100) return "";
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

function openBlobFileInNewTab(file) {
  const blobUrl = URL.createObjectURL(file);
  const w = window.open(blobUrl, "_blank", "noopener,noreferrer");
  if (w) {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
  } else {
    URL.revokeObjectURL(blobUrl);
  }
}

function parseCostString(v) {
  if (v == null || v === "") return NaN;
  const cleaned = String(v)
    .trim()
    .replace(/[,\s]/g, "")
    .replace(/[₹$€£]/g, "")
    .replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return NaN;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function formatNumberDisplay(value) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function toInputDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function parseOrderDate(value) {
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

function isAfterFourWeeksFromOrderDate(value) {
  const date = parseOrderDate(value);
  if (!date) return false;
  const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000;
  return Date.now() - date.getTime() > FOUR_WEEKS_MS;
}

function isLicenseExpired(value) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  d.setHours(23, 59, 59, 999);
  return d.getTime() < Date.now();
}

function buildSowFromScopeItem(item) {
  const parts = [];
  const title = String(item?.title ?? "").trim();
  if (title) parts.push(title);
  if (Array.isArray(item?.details)) {
    item.details.forEach((line) => {
      const s = String(line ?? "").trim();
      if (s) parts.push(s);
    });
  }
  return parts.join("\n");
}

function vendorVatFromOptions(vendorOptions, vendorId) {
  const selected = (Array.isArray(vendorOptions) ? vendorOptions : []).find(
    (v) => normalizeId(v._id) === normalizeId(vendorId),
  );
  const vendorRate = normalizeVatRate(selected?.taxRate);
  return {
    vatNeeded: Boolean(vendorRate),
    vatPercent: vendorRate || "",
  };
}

function createVendorDraftSnapshot({
  clientId,
  projectId,
  businessOrderId,
  vendorId,
  sow,
  vendorOptions,
}) {
  const vat = vendorVatFromOptions(vendorOptions, vendorId);
  return {
    clientId,
    projectId,
    businessOrderId,
    vendorId,
    costToAgency: "",
    costToClient: "",
    invoiceSubmissionDate: "",
    vatNeeded: vat.vatNeeded,
    vatPercent: vat.vatPercent,
    vatAmount: "",
    sow,
    hodAssignUserId: "",
    sendToHodReview: "",
    vendorInvoiceFiles: [],
    vendorReportFiles: [],
  };
}

const AssignVendorForm = ({
  clients = [],
  projects = [],
  vendors = [],
  hodUsers = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialRecord = null,
  /** When set with all three ids, Client / Project / SO fields are hidden and locked to these values. */
  fixedContext = null,
  /**
   * Edit sub-mode: undefined = full assignment edit (unlocked).
   * "hod" | "finance" = read-only assignment + only that review block (HOD review / Finance review modules).
   */
  reviewMode = undefined,
}) => {
  const isEdit = Boolean(initialRecord);
  const fieldsLocked = Boolean(isEdit && reviewMode);

  const isFixedHierarchy = Boolean(
    fixedContext &&
      normalizeId(fixedContext.clientId) &&
      normalizeId(fixedContext.projectId) &&
      normalizeId(fixedContext.businessOrderId),
  );

  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [businessOrderId, setBusinessOrderId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [costToAgency, setCostToAgency] = useState("");
  const [costToClient, setCostToClient] = useState("");
  const [invoiceSubmissionDate, setInvoiceSubmissionDate] = useState("");
  const [vatNeeded, setVatNeeded] = useState(false);
  const [vatPercent, setVatPercent] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [sow, setSow] = useState("");
  const [hodAssignUserId, setHodAssignUserId] = useState("");
  const [sendToHodReview, setSendToHodReview] = useState("");
  const [vendorInvoiceFiles, setVendorInvoiceFiles] = useState([]);
  const [vendorReportFiles, setVendorReportFiles] = useState([]);
  const [paymentSlipFiles, setPaymentSlipFiles] = useState([]);

  const [hodReviewStatus, setHodReviewStatus] = useState("");
  const [hodReviewReason, setHodReviewReason] = useState("");
  const [financeReviewStatus, setFinanceReviewStatus] = useState("unpaid");
  const [financeReviewReason, setFinanceReviewReason] = useState("");
  const [clientPaidValue, setClientPaidValue] = useState("unpaid");

  const [boOptions, setBoOptions] = useState([]);
  const [boLoading, setBoLoading] = useState(false);
  const [boError, setBoError] = useState(null);

  const [existingInvoice, setExistingInvoice] = useState([]);
  const [existingReport, setExistingReport] = useState([]);
  const [existingPaymentSlips, setExistingPaymentSlips] = useState([]);

  // "Add more" (batch create) support — only used in create mode.
  const [drafts, setDrafts] = useState([]);
  const [editingDraftIndex, setEditingDraftIndex] = useState(null);
  const editingDraftRef = useRef(null);
  const contextLocked = !isEdit && (drafts.length > 0 || editingDraftIndex !== null);
  const soPrefillBoRef = useRef("");

  useEffect(() => {
    if (isFixedHierarchy) {
      setClientId(normalizeId(fixedContext.clientId));
      setProjectId(normalizeId(fixedContext.projectId));
      setBusinessOrderId(normalizeId(fixedContext.businessOrderId));
    }
  }, [isFixedHierarchy, fixedContext]);

  useEffect(() => {
    if (!initialRecord) {
      setHodAssignUserId("");
      setHodReviewStatus("");
      setHodReviewReason("");
      setFinanceReviewStatus("");
      setFinanceReviewReason("");
      setClientPaidValue("unpaid");
      setVatNeeded(false);
      setVatPercent("");
      setVatAmount("");
      setDrafts([]);
      setEditingDraftIndex(null);
      editingDraftRef.current = null;
      return;
    }
    if (!isFixedHierarchy) {
      setClientId(normalizeId(initialRecord.clientId));
      setProjectId(normalizeId(initialRecord.projectId));
      setBusinessOrderId(normalizeId(initialRecord.businessOrderId));
    }
    setVendorId(normalizeId(initialRecord.vendorId));
    setCostToAgency(initialRecord.costToAgency ?? "");
    setCostToClient(initialRecord.costToClient ?? "");
    setInvoiceSubmissionDate(toInputDate(initialRecord.invoiceSubmissionDate));
    const isVatNeeded =
      typeof initialRecord.vatNeeded === "boolean"
        ? initialRecord.vatNeeded
        : Boolean(normalizeVatRate(initialRecord.vatPercent));
    setVatNeeded(isVatNeeded);
    setVatPercent(normalizeVatRate(initialRecord.vatPercent));
    setVatAmount(initialRecord.vatAmount ?? "");
    setSow(initialRecord.sow ?? "");
    setHodAssignUserId(normalizeId(initialRecord.hodAssignUserId));
    setSendToHodReview(
      initialRecord.sendToHodReview === "yes"
        ? "yes"
        : initialRecord.sendToHodReview === "no"
          ? "no"
          : "",
    );
    setExistingInvoice(initialRecord.vendorInvoiceFiles || []);
    setExistingReport(initialRecord.vendorReportFiles || []);
    setExistingPaymentSlips(initialRecord.paymentSlipFiles || []);
    setVendorInvoiceFiles([]);
    setVendorReportFiles([]);
    setPaymentSlipFiles([]);
    const h = initialRecord.hodReviewStatus;
    setHodReviewStatus(
      h === "approved" || h === "rejected" ? h : "",
    );
    setHodReviewReason(initialRecord.hodReviewReason ?? "");
    const f = initialRecord.financeReviewStatus;
    setFinanceReviewStatus(
      f === "paid" || f === "unpaid" || f === "overdue" || f === "rejected"
        ? f
        : f === "approved"
          ? "paid"
          : "unpaid",
    );
    setFinanceReviewReason(initialRecord.financeReviewReason ?? "");
    const cpv = initialRecord.clientPaidValue;
    setClientPaidValue(cpv === "paid" || cpv === "unpaid" ? cpv : "unpaid");
  }, [initialRecord, isFixedHierarchy]);

  const filteredProjects = useMemo(() => {
    if (!clientId) return [];
    return projects.filter((p) => projectClientId(p) === clientId);
  }, [projects, clientId]);

  /** Saved id present but missing from loaded list — still need an <option> so the value shows. */
  const clientHasMatch = useMemo(
    () =>
      !clientId ||
      clients.some((c) => normalizeId(c._id) === normalizeId(clientId)),
    [clients, clientId],
  );

  const projectHasMatch = useMemo(
    () =>
      !projectId ||
      filteredProjects.some((p) => normalizeId(p._id) === normalizeId(projectId)),
    [filteredProjects, projectId],
  );

  const boHasMatch = useMemo(
    () =>
      !businessOrderId ||
      boOptions.some(
        (o) => normalizeId(o.id) === normalizeId(businessOrderId),
      ),
    [boOptions, businessOrderId],
  );

  const selectedBusinessOrder = useMemo(
    () => boOptions.find((o) => normalizeId(o.id) === normalizeId(businessOrderId)),
    [boOptions, businessOrderId],
  );

  const isSelectedSoAfterFourWeeks = useMemo(() => {
    if (!selectedBusinessOrder) return false;
    if (typeof selectedBusinessOrder.isAfterFourWeeksFromOrderDate === "boolean") {
      return selectedBusinessOrder.isAfterFourWeeksFromOrderDate;
    }
    return isAfterFourWeeksFromOrderDate(selectedBusinessOrder.purchaseOrderDate);
  }, [selectedBusinessOrder]);

  const vendorOptions = useMemo(
    () =>
      (Array.isArray(vendors) ? vendors : []).filter(
        (v) => v && v.isActive !== false,
      ),
    [vendors],
  );

  useEffect(() => {
    if (isEdit) return;
    const bid = normalizeId(businessOrderId);
    if (!bid) {
      soPrefillBoRef.current = "";
      setDrafts([]);
      setEditingDraftIndex(null);
      editingDraftRef.current = null;
      return;
    }
    if (soPrefillBoRef.current === bid) return;

    let cancelled = false;
    fetchBusinessOrderForAssign(bid)
      .then((bo) => {
        if (cancelled || !bo) return;
        soPrefillBoRef.current = bid;

        const scope = Array.isArray(bo.scopeOfWork) ? bo.scopeOfWork : [];
        const withVendor = scope.filter((item) => {
          const vid = normalizeId(item?.vendorId);
          if (!vid) return false;
          const vendor = vendorOptions.find((v) => normalizeId(v._id) === vid);
          return vendor && !isLicenseExpired(vendor.licenseExpiryDate);
        });

        setEditingDraftIndex(null);
        editingDraftRef.current = null;
        setVendorId("");
        setCostToAgency("");
        setCostToClient("");
        setInvoiceSubmissionDate("");
        setVatNeeded(false);
        setVatPercent("");
        setVatAmount("");
        setSow("");
        setHodAssignUserId("");
        setSendToHodReview("");
        setVendorInvoiceFiles([]);
        setVendorReportFiles([]);

        if (!withVendor.length) {
          setDrafts([]);
          return;
        }

        const cid = normalizeId(clientId);
        const pid = normalizeId(projectId);
        setDrafts(
          withVendor.map((item) =>
            createVendorDraftSnapshot({
              clientId: cid,
              projectId: pid,
              businessOrderId: bid,
              vendorId: normalizeId(item.vendorId),
              sow: buildSowFromScopeItem(item),
              vendorOptions,
            }),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) {
          soPrefillBoRef.current = "";
          setDrafts([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [businessOrderId, isEdit, clientId, projectId, vendorOptions]);

  useEffect(() => {
    if (isEdit || !soPrefillBoRef.current || !normalizeId(vendorId)) return;
    const vat = vendorVatFromOptions(vendorOptions, vendorId);
    if (vat.vatPercent && !vatPercent) {
      setVatNeeded(true);
      setVatPercent(vat.vatPercent);
    }
  }, [vendorOptions, vendorId, vatPercent, isEdit]);

  const vendorHasMatch = useMemo(
    () =>
      !vendorId ||
      vendorOptions.some((v) => normalizeId(v._id) === normalizeId(vendorId)),
    [vendorOptions, vendorId],
  );

  const selectedVendorTaxRate = useMemo(() => {
    const picked = vendorOptions.find((v) => normalizeId(v._id) === normalizeId(vendorId));
    return normalizeVatRate(picked?.taxRate);
  }, [vendorOptions, vendorId]);

  const selectedVendor = useMemo(
    () => vendorOptions.find((v) => normalizeId(v._id) === normalizeId(vendorId)) || null,
    [vendorOptions, vendorId],
  );
  const selectedVendorLicenseExpired = useMemo(
    () => isLicenseExpired(selectedVendor?.licenseExpiryDate),
    [selectedVendor],
  );

  const vatOptions = useMemo(() => {
    const values = new Set(BASE_VAT_OPTIONS);
    const current = normalizeVatRate(vatPercent);
    const selectedVendorRate = normalizeVatRate(selectedVendorTaxRate);
    if (current) values.add(current);
    if (selectedVendorRate) values.add(selectedVendorRate);
    return Array.from(values).sort((a, b) => Number(a) - Number(b));
  }, [selectedVendorTaxRate, vatPercent]);

  const hodUserHasMatch = useMemo(
    () =>
      !hodAssignUserId ||
      (Array.isArray(hodUsers) ? hodUsers : []).some(
        (u) => normalizeId(u._id) === normalizeId(hodAssignUserId),
      ),
    [hodUsers, hodAssignUserId],
  );

  useEffect(() => {
    if (isFixedHierarchy) {
      setBoOptions([]);
      return;
    }
    if (!projectId) {
      setBoOptions([]);
      return;
    }
    let cancelled = false;
    setBoLoading(true);
    setBoError(null);
    fetchBusinessOrdersForProject(normalizeId(projectId))
      .then((items) => {
        if (cancelled) return;
        let list = Array.isArray(items) ? items : [];
        if (
          initialRecord &&
          normalizeId(initialRecord.projectId) === normalizeId(projectId)
        ) {
          const bid = normalizeId(initialRecord.businessOrderId);
          if (
            bid &&
            !list.some((x) => normalizeId(x.id) === bid)
          ) {
            const bo = initialRecord.businessOrderId;
            const boNo =
              typeof bo === "object" ? bo.boNo || bo.invoiceNumber : "";
            const label =
              [boNo].filter(Boolean).join(" · ") ||
              (typeof bo === "object" ? bo.originalFileName : "") ||
              "Sales order";
            list = [{ id: bid, label, boNo: boNo || "" }, ...list];
          }
        }
        setBusinessOrderId((prev) => {
          const cur = normalizeId(prev);
          if (!cur) return prev;
          const hit = list.find((x) => normalizeId(x.id) === cur);
          return hit ? normalizeId(hit.id) : cur;
        });
        setBoOptions(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setBoError(err.message || "Could not load sales orders.");
          setBoOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setBoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, initialRecord, isFixedHierarchy]);

  const removeExistingInvoice = (path) => {
    if (fieldsLocked) return;
    setExistingInvoice((prev) => prev.filter((f) => f.path !== path));
  };
  const removeExistingReport = (path) => {
    if (fieldsLocked) return;
    setExistingReport((prev) => prev.filter((f) => f.path !== path));
  };
  const removeNewInvoiceFile = (index) => {
    if (fieldsLocked) return;
    setVendorInvoiceFiles((prev) => prev.filter((_, i) => i !== index));
  };
  const removeNewReportFile = (index) => {
    if (fieldsLocked) return;
    setVendorReportFiles((prev) => prev.filter((_, i) => i !== index));
  };
  const removeExistingPaymentSlip = (path) => {
    if (fieldsLocked && reviewMode !== "finance") return;
    setExistingPaymentSlips((prev) => prev.filter((f) => f.path !== path));
  };
  const removeNewPaymentSlipFile = (index) => {
    if (fieldsLocked && reviewMode !== "finance") return;
    setPaymentSlipFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const cid = normalizeId(clientId);
    const pid = normalizeId(projectId);
    const bid = normalizeId(businessOrderId);
    const vid = normalizeId(vendorId);

    const hasAnyDrafts = drafts.length > 0;

    if (!isEdit && !hasAnyDrafts) {
      const cid = normalizeId(clientId);
      const pid = normalizeId(projectId);
      const bid = normalizeId(businessOrderId);
      const vid = normalizeId(vendorId);
      if (!cid || !pid || !bid || !vid) {
        Swal.fire({
          icon: "warning",
          title: "Incomplete",
          text: "Select client, project, sales order (SO), and vendor.",
        });
        return;
      }
      if (selectedVendorLicenseExpired) {
        Swal.fire({
          icon: "warning",
          title: "License expired",
          text: "Selected vendor license is expired. Please choose a vendor with a valid license.",
        });
        return;
      }
    }

    if (!isEdit && hasAnyDrafts) {
      if (!cid || !pid || !bid) {
        Swal.fire({
          icon: "warning",
          title: "Incomplete",
          text: "Select client, project, and sales order (SO) before submitting.",
        });
        return;
      }
      if (editingDraftIndex !== null) {
        Swal.fire({
          icon: "warning",
          title: "Finish editing",
          text: "Update or cancel the assignment you are editing before submitting.",
        });
        return;
      }
    }

    if (isEdit && reviewMode === "hod") {
      if (!String(hodReviewReason || "").trim()) {
        Swal.fire({
          icon: "warning",
          title: "HOD review",
          text: "Reason is mandatory for HOD review.",
        });
        return;
      }
    }
    if (isEdit && reviewMode === "finance") {
      if (!String(financeReviewReason || "").trim()) {
        Swal.fire({
          icon: "warning",
          title: "Finance review",
          text: "Description is mandatory for Finance review.",
        });
        return;
      }
    }

    if (isEdit && !reviewMode) {
      const cid = normalizeId(clientId);
      const pid = normalizeId(projectId);
      const bid = normalizeId(businessOrderId);
      const vid = normalizeId(vendorId);
      if (!cid || !pid || !bid || !vid) {
        Swal.fire({
          icon: "warning",
          title: "Incomplete",
          text: "Client, project, sales order (SO), and vendor are required.",
        });
        return;
      }
      if (selectedVendorLicenseExpired) {
        Swal.fire({
          icon: "warning",
          title: "License expired",
          text: "Selected vendor license is expired. Please choose a vendor with a valid license.",
        });
        return;
      }
    }

    const payload = {
      clientId: cid,
      projectId: pid,
      businessOrderId: bid,
      vendorId: vid,
      costToAgency,
      costToClient,
      invoiceSubmissionDate,
      vatNeeded,
      vatPercent: vatNeeded ? vatPercent : "",
      vatAmount: vatNeeded ? vatAmount : "",
      sow,
      hodAssignUserId: normalizeId(hodAssignUserId),
      sendToHodReview,
      vendorInvoiceFiles,
      vendorReportFiles,
    };

    if (isEdit) {
      payload.vendorInvoiceFilesRetain = existingInvoice.map((f) => f.path);
      payload.vendorReportFilesRetain = existingReport.map((f) => f.path);
      if (reviewMode === "hod") {
        payload.hodReviewStatus = hodReviewStatus;
        payload.hodReviewReason = hodReviewReason;
      } else if (reviewMode === "finance") {
        payload.financeReviewStatus = financeReviewStatus;
        payload.financeReviewReason = financeReviewReason;
        payload.clientPaidValue = clientPaidValue;
        payload.paymentSlipFiles = paymentSlipFiles;
        payload.paymentSlipFilesRetain = existingPaymentSlips.map((f) => f.path);
      }
      onSubmit(payload);
      return;
    }

    // Create mode: if drafts exist, submit as a batch. Optionally include the current row if it's complete.
    const currentComplete = cid && pid && bid && vid;
    let batch = currentComplete ? [...drafts, payload] : [...drafts];
    if (editingDraftIndex !== null && currentComplete) {
      batch = [...drafts];
      batch.splice(editingDraftIndex, 0, payload);
    }
    editingDraftRef.current = null;
    setEditingDraftIndex(null);
    if (!batch.length) {
      Swal.fire({
        icon: "warning",
        title: "Nothing to submit",
        text: "Add at least one vendor assignment to the batch.",
      });
      return;
    }
    onSubmit(batch.length > 1 ? batch : batch[0] || payload);
  };

  const canAddMore =
    !isEdit &&
    !fieldsLocked &&
    normalizeId(clientId) &&
    normalizeId(projectId) &&
    normalizeId(businessOrderId) &&
    normalizeId(vendorId);

  const profitMetrics = useMemo(() => {
    const agency = parseCostString(costToAgency);
    const client = parseCostString(costToClient);
    if (!Number.isFinite(agency) || !Number.isFinite(client)) {
      return { amount: "—", percent: "—" };
    }
    const amount = client - agency;
    const percent = client !== 0 ? ((client - agency) / client) * 100 : NaN;
    return {
      amount: formatNumberDisplay(amount),
      percent: Number.isFinite(percent) ? `${formatNumberDisplay(percent)}%` : "—",
    };
  }, [costToAgency, costToClient]);

  const handleAddMore = () => {
    const cid = normalizeId(clientId);
    const pid = normalizeId(projectId);
    const bid = normalizeId(businessOrderId);
    const vid = normalizeId(vendorId);
    if (!cid || !pid || !bid || !vid) {
      Swal.fire({
        icon: "warning",
        title: "Incomplete",
        text: "Select client, project, SO, and vendor before adding more.",
      });
      return;
    }
    if (selectedVendorLicenseExpired) {
      Swal.fire({
        icon: "warning",
        title: "License expired",
        text: "Selected vendor license is expired. Please choose a vendor with a valid license.",
      });
      return;
    }

    const snapshot = {
      clientId: cid,
      projectId: pid,
      businessOrderId: bid,
      vendorId: vid,
      costToAgency,
      costToClient,
      invoiceSubmissionDate,
      vatNeeded,
      vatPercent: vatNeeded ? vatPercent : "",
      vatAmount: vatNeeded ? vatAmount : "",
      sow,
      hodAssignUserId: normalizeId(hodAssignUserId),
      sendToHodReview,
      vendorInvoiceFiles: [...vendorInvoiceFiles],
      vendorReportFiles: [...vendorReportFiles],
    };

    if (editingDraftIndex !== null) {
      setDrafts((prev) => {
        const next = [...prev];
        next.splice(editingDraftIndex, 0, snapshot);
        return next;
      });
      editingDraftRef.current = null;
      setEditingDraftIndex(null);
    } else {
      setDrafts((prev) => [...prev, snapshot]);
    }

    setVendorId("");
    setCostToAgency("");
    setCostToClient("");
    setInvoiceSubmissionDate("");
    setVatNeeded(false);
    setVatPercent("");
    setVatAmount("");
    setSow("");
    setHodAssignUserId("");
    setSendToHodReview("");
    setVendorInvoiceFiles([]);
    setVendorReportFiles([]);
  };

  const handleEditDraft = (idx) => {
    if (isEdit || fieldsLocked) return;
    const draft = drafts[idx];
    if (!draft) return;

    if (editingDraftIndex !== null) {
      Swal.fire({
        icon: "warning",
        title: "Finish current edit",
        text: "Update or cancel the assignment you are editing first.",
      });
      return;
    }

    if (normalizeId(vendorId)) {
      Swal.fire({
        icon: "warning",
        title: "Clear form first",
        text: "Add or clear the current assignment before editing another batch item.",
      });
      return;
    }

    editingDraftRef.current = {
      ...draft,
      vendorInvoiceFiles: Array.isArray(draft.vendorInvoiceFiles)
        ? [...draft.vendorInvoiceFiles]
        : [],
      vendorReportFiles: Array.isArray(draft.vendorReportFiles)
        ? [...draft.vendorReportFiles]
        : [],
    };

    setVendorId(normalizeId(draft.vendorId));
    setCostToAgency(draft.costToAgency ?? "");
    setCostToClient(draft.costToClient ?? "");
    setInvoiceSubmissionDate(draft.invoiceSubmissionDate ?? "");
    setVatNeeded(Boolean(draft.vatNeeded));
    setVatPercent(draft.vatPercent ?? "");
    setVatAmount(draft.vatAmount ?? "");
    setSow(draft.sow ?? "");
    setHodAssignUserId(normalizeId(draft.hodAssignUserId));
    setSendToHodReview(
      draft.sendToHodReview === "yes"
        ? "yes"
        : draft.sendToHodReview === "no"
          ? "no"
          : "",
    );
    setVendorInvoiceFiles(
      Array.isArray(draft.vendorInvoiceFiles) ? [...draft.vendorInvoiceFiles] : [],
    );
    setVendorReportFiles(
      Array.isArray(draft.vendorReportFiles) ? [...draft.vendorReportFiles] : [],
    );

    setDrafts((prev) => prev.filter((_, i) => i !== idx));
    setEditingDraftIndex(idx);
  };

  const handleCancelEditDraft = () => {
    if (editingDraftIndex === null || !editingDraftRef.current) return;

    const restored = editingDraftRef.current;
    setDrafts((prev) => {
      const next = [...prev];
      next.splice(editingDraftIndex, 0, restored);
      return next;
    });

    editingDraftRef.current = null;
    setEditingDraftIndex(null);
    setVendorId("");
    setCostToAgency("");
    setCostToClient("");
    setInvoiceSubmissionDate("");
    setVatNeeded(false);
    setVatPercent("");
    setVatAmount("");
    setSow("");
    setHodAssignUserId("");
    setSendToHodReview("");
    setVendorInvoiceFiles([]);
    setVendorReportFiles([]);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="row g-3">
        {!isFixedHierarchy ? (
          <>
            <div className="col-md-6">
              <label className="form-label text-muted" style={{ fontSize: 12 }}>
                Client
              </label>
              <select
                className="form-control"
                value={clientId}
                disabled={fieldsLocked || contextLocked}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setProjectId("");
                  setBusinessOrderId("");
                  setBoOptions([]);
                }}
              >
                <option value="">Not selected</option>
                {!clientHasMatch && clientId ? (
                  <option value={normalizeId(clientId)}>
                    {clientNameFromInitial(initialRecord) ||
                      `Saved client (${normalizeId(clientId)})`}
                  </option>
                ) : null}
                {clients.map((c) => (
                  <option key={normalizeId(c._id)} value={normalizeId(c._id)}>
                    {c.clientName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label text-muted" style={{ fontSize: 12 }}>
                Project
              </label>
              <select
                className="form-control"
                value={projectId}
                disabled={fieldsLocked || contextLocked || !clientId}
                onChange={(e) => {
                  const v = e.target.value;
                  setProjectId(v);
                  setBusinessOrderId("");
                  if (!v) setBoOptions([]);
                }}
              >
                <option value="">
                  {!clientId ? "Not selected — select client first" : "Not selected"}
                </option>
                {!projectHasMatch && projectId ? (
                  <option value={normalizeId(projectId)}>
                    {projectNameFromInitial(initialRecord) ||
                      `Saved project (${normalizeId(projectId)})`}
                  </option>
                ) : null}
                {filteredProjects.map((p) => (
                  <option key={normalizeId(p._id)} value={normalizeId(p._id)}>
                    {p.projectName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12">
              <label className="form-label text-muted" style={{ fontSize: 12 }}>
                SO (Sales order)
              </label>
              <select
                className="form-control"
                value={businessOrderId}
                disabled={fieldsLocked || contextLocked || !projectId || boLoading}
                onChange={(e) => {
                  soPrefillBoRef.current = "";
                  setBusinessOrderId(e.target.value);
                }}
              >
                <option value="">
                  {boLoading
                    ? "Loading…"
                    : !projectId
                      ? "Not selected — select project first"
                      : "Not selected"}
                </option>
                {!boHasMatch && businessOrderId ? (
                  <option value={normalizeId(businessOrderId)}>
                    {boLabelFromInitial(initialRecord) ||
                      `Saved SO (${normalizeId(businessOrderId)})`}
                  </option>
                ) : null}
                {boOptions.map((o) => (
                  <option key={normalizeId(o.id)} value={normalizeId(o.id)}>
                    {o.label}
                    {o.isAfterFourWeeksFromOrderDate ? " (after 4 weeks)" : ""}
                  </option>
                ))}
              </select>
              {isSelectedSoAfterFourWeeks ? (
                <div className="text-warning small mt-1">
                  This SO is after 4 weeks from Order Date. It will be sent for Admin/Superadmin approval.
                </div>
              ) : null}
              {boError ? (
                <div className="text-warning small mt-1">{boError}</div>
              ) : null}
            </div>
          </>
        ) : null}

        <div className="col-12">
          <label className="form-label text-muted" style={{ fontSize: 12 }}>
            Vendor
          </label>
          <select
            className="form-control"
            value={vendorId}
            disabled={fieldsLocked}
            onChange={(e) => {
              const nextVendorId = e.target.value;
              setVendorId(nextVendorId);
              const vat = vendorVatFromOptions(vendorOptions, nextVendorId);
              if (vat.vatPercent) {
                setVatNeeded(true);
                setVatPercent(vat.vatPercent);
              }
            }}
          >
            <option value="">Not selected</option>
            {!vendorHasMatch && vendorId ? (
              <option value={normalizeId(vendorId)}>
                {vendorNameFromInitial(initialRecord) ||
                  `Saved vendor (${normalizeId(vendorId)})`}
              </option>
            ) : null}
            {vendorOptions.map((v) => (
              <option
                key={normalizeId(v._id)}
                value={normalizeId(v._id)}
                disabled={isLicenseExpired(v.licenseExpiryDate)}
              >
                {v.vendorName}
                {isLicenseExpired(v.licenseExpiryDate) ? " (license expired)" : ""}
              </option>
            ))}
          </select>
          {selectedVendorLicenseExpired ? (
            <div className="text-danger small mt-1">
              Selected vendor license is expired. Assignment is not allowed.
            </div>
          ) : null}
        </div>

        <div className="col-md-6">
          <label className="form-label text-muted" style={{ fontSize: 12 }}>
            Cost to vendor
          </label>
          <input
            type="text"
            className="form-control"
            value={costToAgency}
            disabled={fieldsLocked}
            onChange={(e) => setCostToAgency(e.target.value)}
            placeholder="e.g. amount or note"
          />
        </div>

        <div className="col-md-6">
          <label className="form-label text-muted" style={{ fontSize: 12 }}>
            Cost to client
          </label>
          <input
            type="text"
            className="form-control"
            value={costToClient}
            disabled={fieldsLocked}
            onChange={(e) => setCostToClient(e.target.value)}
            placeholder="e.g. amount or note"
          />
        </div>

        <div className="col-md-6">
          <label className="form-label text-muted" style={{ fontSize: 12 }}>
            Invoice submission date
          </label>
          <input
            type="date"
            className="form-control"
            value={invoiceSubmissionDate}
            disabled={fieldsLocked}
            onChange={(e) => setInvoiceSubmissionDate(e.target.value)}
          />
        </div>

        <div className="col-md-6">
          <label className="form-label text-muted" style={{ fontSize: 12 }}>
            Profit amount
          </label>
          <input
            type="text"
            className="form-control"
            value={profitMetrics.amount}
            readOnly
            disabled
          />
        </div>

        <div className="col-md-6">
          <label className="form-label text-muted" style={{ fontSize: 12 }}>
            Profit %
          </label>
          <input
            type="text"
            className="form-control"
            value={profitMetrics.percent}
            readOnly
            disabled
          />
        </div>

        <div className="col-md-6">
          <label className="form-label text-muted d-block" style={{ fontSize: 12 }}>
            VAT needed
          </label>
          <div className="form-check mt-2">
            <input
              id="vat-needed-check"
              type="checkbox"
              className="form-check-input"
              checked={vatNeeded}
              disabled={fieldsLocked}
              onChange={(e) => setVatNeeded(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="vat-needed-check">
              Yes, VAT is needed
            </label>
          </div>
        </div>

        {vatNeeded ? (
          <>
            <div className="col-md-3">
              <label className="form-label text-muted" style={{ fontSize: 12 }}>
                VAT %
              </label>
              <select
                className="form-control"
                value={vatPercent}
                disabled={fieldsLocked}
                onChange={(e) => setVatPercent(e.target.value)}
              >
                <option value="">Please select</option>
                {vatOptions.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label text-muted" style={{ fontSize: 12 }}>
                VAT amount
              </label>
              <input
                type="text"
                className="form-control"
                value={vatAmount}
                disabled={fieldsLocked}
                onChange={(e) => setVatAmount(e.target.value)}
                placeholder="e.g. 2500"
              />
            </div>
          </>
        ) : null}

        <div className="col-12">
          <label className="form-label text-muted" style={{ fontSize: 12 }}>
            SOW
          </label>
          <textarea
            className="form-control"
            rows={3}
            value={sow}
            disabled={fieldsLocked}
            onChange={(e) => setSow(e.target.value)}
            placeholder="Enter scope of work..."
          />
        </div>

        <div className="col-md-6">
          <label className="form-label text-muted" style={{ fontSize: 12 }}>
            HOD users
          </label>
          <select
            className="form-control"
            value={hodAssignUserId}
            disabled={fieldsLocked}
            onChange={(e) => setHodAssignUserId(e.target.value)}
          >
            <option value="">
              {hodUsers.length ? "Please select" : "No HOD users found"}
            </option>
            {!hodUserHasMatch && hodAssignUserId ? (
              <option value={normalizeId(hodAssignUserId)}>
                {hodUserNameFromInitial(initialRecord) ||
                  `Saved HOD user (${normalizeId(hodAssignUserId)})`}
              </option>
            ) : null}
            {hodUsers.map((u) => (
              <option key={normalizeId(u._id)} value={normalizeId(u._id)}>
                {u.userName || u.email || u.mobileNumber || normalizeId(u._id)}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-6">
          <label className="form-label text-muted" style={{ fontSize: 12 }}>
            Send to HOD review
          </label>
          <select
            className="form-control"
            value={sendToHodReview}
            disabled={fieldsLocked}
            onChange={(e) => setSendToHodReview(e.target.value)}
          >
            <option value="">Please select</option>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>

        <div className="col-md-6">
          <label className="form-label text-muted" style={{ fontSize: 12 }}>
            Vendor invoice (optional, multiple files)
          </label>
          <input
            type="file"
            className="form-control"
            multiple
            disabled={fieldsLocked}
            onChange={(e) =>
              setVendorInvoiceFiles(Array.from(e.target.files || []))
            }
          />
          {isEdit && existingInvoice.length > 0 ? (
            <ul className="list-unstyled small mt-2 mb-0">
              {existingInvoice.map((f) => (
                <li
                  key={f.path}
                  className="d-flex align-items-center justify-content-between gap-2 mb-1"
                >
                  <a
                    href={fileUrl(f.path)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {f.originalName || "file"}
                  </a>
                  <div className="d-flex align-items-center gap-1">
                    <a
                      href={fileUrl(f.path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-link btn-sm text-info p-0"
                      title="Preview file"
                      aria-label="Preview file"
                    >
                      <i className="fa fa-eye" aria-hidden />
                    </a>
                    <a
                      href={fileUrl(f.path)}
                      download={f.originalName || "file"}
                      className="btn btn-link btn-sm text-primary p-0"
                      title="Download file"
                      aria-label="Download file"
                    >
                      <i className="fa fa-download" aria-hidden />
                    </a>
                    {!fieldsLocked ? (
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger p-0"
                        title="Delete file"
                        aria-label="Delete file"
                        onClick={() => removeExistingInvoice(f.path)}
                      >
                        <i className="fa fa-trash" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {vendorInvoiceFiles.length > 0 ? (
            <ul className="list-unstyled small mt-2 mb-0">
              {vendorInvoiceFiles.map((file, idx) => (
                <li
                  key={`${file.name}-${idx}`}
                  className="d-flex align-items-center justify-content-between gap-2 mb-1"
                >
                  <span className="text-truncate">{file.name}</span>
                  <div className="d-flex align-items-center gap-1">
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-info p-0"
                      title="Preview file"
                      aria-label="Preview file"
                      onClick={() => openBlobFileInNewTab(file)}
                    >
                      <i className="fa fa-eye" aria-hidden />
                    </button>
                    <a
                      href={URL.createObjectURL(file)}
                      download={file.name || "file"}
                      className="btn btn-link btn-sm text-primary p-0"
                      title="Download file"
                      aria-label="Download file"
                      onClick={(e) => {
                        const url = e.currentTarget.href;
                        setTimeout(() => URL.revokeObjectURL(url), 120000);
                      }}
                    >
                      <i className="fa fa-download" aria-hidden />
                    </a>
                    {!fieldsLocked ? (
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger p-0"
                        title="Delete file"
                        aria-label="Delete file"
                        onClick={() => removeNewInvoiceFile(idx)}
                      >
                        <i className="fa fa-trash" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="col-md-6">
          <label className="form-label text-muted" style={{ fontSize: 12 }}>
            Vendor report (optional, multiple files)
          </label>
          <input
            type="file"
            className="form-control"
            multiple
            disabled={fieldsLocked}
            onChange={(e) =>
              setVendorReportFiles(Array.from(e.target.files || []))
            }
          />
          {isEdit && existingReport.length > 0 ? (
            <ul className="list-unstyled small mt-2 mb-0">
              {existingReport.map((f) => (
                <li
                  key={f.path}
                  className="d-flex align-items-center justify-content-between gap-2 mb-1"
                >
                  <a
                    href={fileUrl(f.path)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {f.originalName || "file"}
                  </a>
                  <div className="d-flex align-items-center gap-1">
                    <a
                      href={fileUrl(f.path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-link btn-sm text-info p-0"
                      title="Preview file"
                      aria-label="Preview file"
                    >
                      <i className="fa fa-eye" aria-hidden />
                    </a>
                    <a
                      href={fileUrl(f.path)}
                      download={f.originalName || "file"}
                      className="btn btn-link btn-sm text-primary p-0"
                      title="Download file"
                      aria-label="Download file"
                    >
                      <i className="fa fa-download" aria-hidden />
                    </a>
                    {!fieldsLocked ? (
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger p-0"
                        title="Delete file"
                        aria-label="Delete file"
                        onClick={() => removeExistingReport(f.path)}
                      >
                        <i className="fa fa-trash" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {vendorReportFiles.length > 0 ? (
            <ul className="list-unstyled small mt-2 mb-0">
              {vendorReportFiles.map((file, idx) => (
                <li
                  key={`${file.name}-${idx}`}
                  className="d-flex align-items-center justify-content-between gap-2 mb-1"
                >
                  <span className="text-truncate">{file.name}</span>
                  <div className="d-flex align-items-center gap-1">
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-info p-0"
                      title="Preview file"
                      aria-label="Preview file"
                      onClick={() => openBlobFileInNewTab(file)}
                    >
                      <i className="fa fa-eye" aria-hidden />
                    </button>
                    <a
                      href={URL.createObjectURL(file)}
                      download={file.name || "file"}
                      className="btn btn-link btn-sm text-primary p-0"
                      title="Download file"
                      aria-label="Download file"
                      onClick={(e) => {
                        const url = e.currentTarget.href;
                        setTimeout(() => URL.revokeObjectURL(url), 120000);
                      }}
                    >
                      <i className="fa fa-download" aria-hidden />
                    </a>
                    {!fieldsLocked ? (
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger p-0"
                        title="Delete file"
                        aria-label="Delete file"
                        onClick={() => removeNewReportFile(idx)}
                      >
                        <i className="fa fa-trash" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {!isEdit ? (
          <div className="col-12">
            <div className="d-flex flex-wrap gap-2 align-items-center mt-2">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={handleAddMore}
                disabled={isSubmitting || !canAddMore}
                title={
                  canAddMore
                    ? editingDraftIndex !== null
                      ? "Save changes to this batch assignment"
                      : "Add this vendor assignment to the batch"
                    : "Select Client, Project, SO and Vendor first"
                }
              >
                <i className={`fa ${editingDraftIndex !== null ? "fa-check" : "fa-plus"} me-1`} />
                {editingDraftIndex !== null ? "Update assignment" : "Add more"}
              </button>
              {editingDraftIndex !== null ? (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={handleCancelEditDraft}
                  disabled={isSubmitting}
                >
                  Cancel edit
                </button>
              ) : null}
              {drafts.length > 0 ? (
                <span className="small text-muted">
                  {editingDraftIndex !== null
                    ? `Editing assignment #${editingDraftIndex + 1} — update details above, then click Update assignment.`
                    : `${drafts.length} assignment${drafts.length === 1 ? "" : "s"} in batch — click Edit on each row to add costs and other details.`}
                </span>
              ) : null}
              {editingDraftIndex !== null ? (
                <span className="small text-primary">
                  Editing batch assignment #{editingDraftIndex + 1}
                </span>
              ) : null}
              {contextLocked ? (
                <span className="small text-muted">
                  Context locked (client / project / SO) while batch has items.
                </span>
              ) : null}
            </div>

            {drafts.length > 0 ? (
              <div className="table-responsive mt-3">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>#</th>
                      <th>Vendor</th>
                      <th style={{ width: 140 }}>Cost to vendor</th>
                      <th style={{ width: 140 }}>Cost to client</th>
                      <th style={{ width: 160 }}>Invoice submission</th>
                      <th style={{ width: 90 }}>VAT</th>
                      <th style={{ width: 110 }}>VAT %</th>
                      <th style={{ width: 130 }}>VAT amount</th>
                      <th>SOW</th>
                      <th style={{ width: 130 }}>Send to HOD</th>
                      <th style={{ width: 120 }}>Files</th>
                      <th style={{ width: 110 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drafts.map((d, idx) => {
                      const vendor =
                        vendorOptions.find(
                          (v) => normalizeId(v._id) === normalizeId(d.vendorId),
                        ) || null;
                      const invCount = Array.isArray(d.vendorInvoiceFiles)
                        ? d.vendorInvoiceFiles.length
                        : 0;
                      const repCount = Array.isArray(d.vendorReportFiles)
                        ? d.vendorReportFiles.length
                        : 0;
                      return (
                        <tr key={`${d.vendorId}-${idx}`}>
                          <td className="text-muted">{idx + 1}</td>
                          <td>{vendor?.vendorName || d.vendorId}</td>
                          <td>{d.costToAgency || "—"}</td>
                          <td>{d.costToClient || "—"}</td>
                          <td>{d.invoiceSubmissionDate || "—"}</td>
                          <td>{d.vatNeeded ? "Yes" : "No"}</td>
                          <td>{d.vatNeeded && d.vatPercent ? `${d.vatPercent}%` : "—"}</td>
                          <td>{d.vatNeeded ? d.vatAmount || "—" : "—"}</td>
                          <td
                            className="text-truncate"
                            style={{ maxWidth: 220 }}
                            title={d.sow || ""}
                          >
                            {d.sow || "—"}
                          </td>
                          <td>
                            {d.sendToHodReview === "yes"
                              ? "Yes"
                              : d.sendToHodReview === "no"
                                ? "No"
                                : "Please select"}
                          </td>
                          <td className="text-muted">
                            {invCount} inv / {repCount} rep
                          </td>
                          <td>
                            <div className="d-flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="btn btn-link btn-sm text-primary p-0"
                                disabled={isSubmitting || editingDraftIndex !== null}
                                onClick={() => handleEditDraft(idx)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-link btn-sm text-danger p-0"
                                disabled={isSubmitting || editingDraftIndex !== null}
                                onClick={() =>
                                  setDrafts((prev) => prev.filter((_, i) => i !== idx))
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}

        {isEdit && reviewMode === "hod" ? (
          <>
            <div className="col-12">
              <hr className="my-2" />
              <h6 className="text-muted mb-0" style={{ fontSize: 13 }}>
                HOD review
              </h6>
              <p className="small text-muted mb-2 mt-1">
                Assignment details above are read-only. Set HOD decision and document the reason
                for approval or rejection.
              </p>
            </div>
            <div className="col-md-6">
              <label className="form-label text-muted" style={{ fontSize: 12 }}>
                HOD decision
              </label>
              <select
                className="form-control"
                value={hodReviewStatus}
                onChange={(e) => setHodReviewStatus(e.target.value)}
              >
                {REVIEW_OPTIONS.map((o) => (
                  <option key={`hod-${o.value || "x"}`} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label text-muted" style={{ fontSize: 12 }}>
                HOD reason{" "}
                <span className="text-danger">*</span>
                <span className="fw-normal"> (mandatory)</span>
              </label>
              <textarea
                className="form-control"
                rows={3}
                value={hodReviewReason}
                required
                onChange={(e) => setHodReviewReason(e.target.value)}
                placeholder="Explain why this assignment is approved or rejected…"
              />
            </div>
          </>
        ) : null}

        {isEdit && reviewMode === "finance" ? (
          <>
            <div className="col-12">
              <hr className="my-2" />
              <h6 className="text-muted mb-0" style={{ fontSize: 13 }}>
                Finance review
              </h6>
              <p className="small text-muted mb-2 mt-1">
                Assignment details above are read-only. Record Finance decision and the reason for
                approval or rejection.
              </p>
            </div>
            <div className="col-md-6">
              <label className="form-label text-muted" style={{ fontSize: 12 }}>
                Finance decision
              </label>
              <select
                className="form-control"
                value={financeReviewStatus}
                onChange={(e) => setFinanceReviewStatus(e.target.value)}
              >
                {FINANCE_REVIEW_OPTIONS.map((o) => (
                  <option key={`fin-${o.value || "x"}`} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label text-muted" style={{ fontSize: 12 }}>
                Client Paid
              </label>
              <select
                className="form-control"
                value={clientPaidValue}
                onChange={(e) => setClientPaidValue(e.target.value)}
              >
                {CLIENT_PAID_VALUE_OPTIONS.map((o) => (
                  <option key={`cpv-${o.value}`} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label text-muted" style={{ fontSize: 12 }}>
                Finance reason{" "}
                <span className="text-danger">*</span>
                <span className="fw-normal"> (mandatory)</span>
              </label>
              <textarea
                className="form-control"
                rows={3}
                value={financeReviewReason}
                required
                onChange={(e) => setFinanceReviewReason(e.target.value)}
                placeholder="Add finance note for paid, unpaid, overdue, or reject…"
              />
            </div>
            <div className="col-12">
              <label className="form-label text-muted" style={{ fontSize: 12 }}>
                <i className="fa fa-file-text me-1" aria-hidden />
                Upload payment slip
              </label>
              <input
                type="file"
                className="form-control"
                multiple
                onChange={(e) => setPaymentSlipFiles(Array.from(e.target.files || []))}
              />
              {existingPaymentSlips.length > 0 ? (
                <ul className="list-unstyled small mt-2 mb-0">
                  {existingPaymentSlips.map((f) => (
                    <li
                      key={f.path}
                      className="d-flex align-items-center justify-content-between gap-2 mb-1"
                    >
                      <a
                        href={fileUrl(f.path)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {f.originalName || "file"}
                      </a>
                      <div className="d-flex align-items-center gap-1">
                        <a
                          href={fileUrl(f.path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-link btn-sm text-info p-0"
                          title="Preview file"
                          aria-label="Preview file"
                        >
                          <i className="fa fa-eye" aria-hidden />
                        </a>
                        <a
                          href={fileUrl(f.path)}
                          download={f.originalName || "file"}
                          className="btn btn-link btn-sm text-primary p-0"
                          title="Download file"
                          aria-label="Download file"
                        >
                          <i className="fa fa-download" aria-hidden />
                        </a>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-danger p-0"
                          title="Delete file"
                          aria-label="Delete file"
                          onClick={() => removeExistingPaymentSlip(f.path)}
                        >
                          <i className="fa fa-trash" aria-hidden />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
              {paymentSlipFiles.length > 0 ? (
                <ul className="list-unstyled small mt-2 mb-0">
                  {paymentSlipFiles.map((file, idx) => (
                    <li
                      key={`${file.name}-${idx}`}
                      className="d-flex align-items-center justify-content-between gap-2 mb-1"
                    >
                      <span className="text-truncate">{file.name}</span>
                      <div className="d-flex align-items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-info p-0"
                          title="Preview file"
                          aria-label="Preview file"
                          onClick={() => openBlobFileInNewTab(file)}
                        >
                          <i className="fa fa-eye" aria-hidden />
                        </button>
                        <a
                          href={URL.createObjectURL(file)}
                          download={file.name || "file"}
                          className="btn btn-link btn-sm text-primary p-0"
                          title="Download file"
                          aria-label="Download file"
                          onClick={(e) => {
                            const url = e.currentTarget.href;
                            setTimeout(() => URL.revokeObjectURL(url), 120000);
                          }}
                        >
                          <i className="fa fa-download" aria-hidden />
                        </a>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-danger p-0"
                          title="Delete file"
                          aria-label="Delete file"
                          onClick={() => removeNewPaymentSlipFile(idx)}
                        >
                          <i className="fa fa-trash" aria-hidden />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <div className="d-flex gap-2 mt-4">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Saving…"
            : isEdit && reviewMode
              ? "Save review"
              : isEdit
                ? "Update"
                : "Save"}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
};

export default AssignVendorForm;
