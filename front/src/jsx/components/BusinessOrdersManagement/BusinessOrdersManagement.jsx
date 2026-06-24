import { useRef, useState, Fragment, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Modal from "react-bootstrap/Modal";
import PageTitle from "../../layouts/PageTitle";
import {
  uploadInvoicePdf,
  updateInvoicePdf,
  getInvoicePdf,
  listInvoicePdfs,
  deleteInvoicePdf,
  downloadInvoicePdf,
} from "../../../services/invoicePdfApi";
import { fetchDepartments } from "../../../services/departmentApi";
import { fetchVendors } from "../../../services/vendorApi";
import CreatableSelect from "react-select/creatable";
import { fetchProjects } from "../../../services/projectApi";
import ScopeDetailsRichText from "./ScopeDetailsRichText";
import "./BusinessOrdersManagement.css";

const BOM_PROJECT_SELECT_STYLES = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? "#6418c3" : "#ced4da",
    boxShadow: state.isFocused ? "0 0 0 0.2rem rgba(100,24,195,.15)" : "none",
    "&:hover": { borderColor: "#6418c3" },
    minHeight: "calc(1.5em + 0.75rem + 2px)",
    fontSize: "0.875rem",
  }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
  menuPortal: (base) => ({ ...base, zIndex: 10000 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#6418c3"
      : state.isFocused
        ? "rgba(100,24,195,.08)"
        : "white",
    color: state.isSelected ? "#fff" : "#212529",
    fontSize: "0.875rem",
  }),
  placeholder: (base) => ({ ...base, color: "#6c757d" }),
  singleValue: (base) => ({ ...base, color: "#212529" }),
};

/** Value shown in CreatableSelect from draft + loaded projects / API result. */
function buildProjectOptionValue(draft, projects, result) {
  if (!draft) return null;
  if (draft.projectSelectId) {
    const p = projects.find((x) => String(x._id) === String(draft.projectSelectId));
    const label = p?.projectName || result?.projectName || "";
    return {
      value: draft.projectSelectId,
      label: label || "Linked project",
    };
  }
  const name = draft.projectNameCustom?.trim();
  if (!name) return null;
  return { value: `__free__:${name}`, label: name };
}

function scopeItemMoneyStr(v) {
  if (v == null || v === "") return "";
  return String(v);
}

function isLicenseExpired(value) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  d.setHours(23, 59, 59, 999);
  return d.getTime() < Date.now();
}

function findVendorById(vendors, vendorId) {
  const id = String(vendorId ?? "").trim();
  if (!id) return null;
  return (Array.isArray(vendors) ? vendors : []).find((v) => String(v._id) === id) || null;
}

function isScopeVendorExpired(vendors, vendorId) {
  const vendor = findVendorById(vendors, vendorId);
  if (!vendor) return false;
  return isLicenseExpired(vendor.licenseExpiryDate);
}

function getExpiredVendorIndices(scopeOfWork, vendors) {
  if (!Array.isArray(scopeOfWork)) return [];
  const expired = [];
  scopeOfWork.forEach((item, index) => {
    const vendorId = String(item?.vendorId ?? "").trim();
    if (vendorId && isScopeVendorExpired(vendors, vendorId)) {
      expired.push(index + 1);
    }
  });
  return expired;
}

function normalizeScopeItemForDraft(item) {
  const taxRaw =
    item?.taxAmount != null && item?.taxAmount !== ""
      ? item.taxAmount
      : item?.serviceTax;
  const lineTotalRaw =
    item?.totalAmount != null && item?.totalAmount !== ""
      ? item.totalAmount
      : item?.amount;
  return {
    title: item?.title ?? "",
    details: Array.isArray(item?.details) ? [...item.details] : [],
    departmentId: item?.departmentId != null ? String(item.departmentId) : "",
    vendorId: item?.vendorId != null ? String(item.vendorId) : "",
    taxAmount: scopeItemMoneyStr(taxRaw),
    totalAmount: scopeItemMoneyStr(lineTotalRaw),
  };
}

function getMissingDepartmentIndices(scopeOfWork) {
  if (!Array.isArray(scopeOfWork)) return [];
  const missing = [];
  scopeOfWork.forEach((item, index) => {
    const departmentId = String(item?.departmentId ?? "").trim();
    if (!departmentId) {
      missing.push(index + 1);
    }
  });
  return missing;
}

function buildDraftFromResult(r) {
  if (!r) return null;
  const n = r.amountsNumeric || {};
  const empty = (v) => (v == null || v === "Not Found" ? "" : String(v));
  const money = (numKey, strKey) => {
    if (n[numKey] != null && n[numKey] !== "") return String(n[numKey]);
    return empty(r[strKey]);
  };

  let scope = Array.isArray(r.scopeOfWork) ? JSON.parse(JSON.stringify(r.scopeOfWork)) : [];
  scope = scope.map(normalizeScopeItemForDraft);
  if (!scope.length) scope = [normalizeScopeItemForDraft({ title: "", details: [] })];

  return {
    invoiceType: empty(r.invoiceType),
    projectSelectId: r.projectId ? String(r.projectId) : "",
    projectNameCustom: r.projectId ? "" : empty(r.projectName),
    boNo: empty(r.boNo),
    clientName: empty(r.clientName),
    clientAddress: empty(r.clientAddress),
    trn: empty(r.trn),
    salesPerson: empty(r.salesPerson),
    purchaseOrderNumber: empty(r.purchaseOrderNumber),
    purchaseOrderDate: empty(r.purchaseOrderDate),
    invoiceNumber: empty(r.invoiceNumber),
    subtotal: money("subtotal", "subtotal"),
    standardRateAmount: money("standardRateAmount", "standardRateAmount"),
    totalAmount: money("totalAmount", "totalAmount"),
    termsAndConditions: empty(r.termsAndConditions),
    scopeOfWork: scope,
  };
}

function formatListAmount(value) {
  if (value == null || value === "") return "—";
  const num = parseListAmountNumber(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseListAmountNumber(value) {
  if (value == null || value === "") return NaN;
  const cleaned = String(value)
    .trim()
    .replace(/[,\s]/g, "")
    .replace(/[₹$€£]/g, "")
    .replace(/[^\d.-]/g, "");
  return Number(cleaned);
}

function formatListDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

function normalizeOrderDateForCompare(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";

  // Already ISO-like date.
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Common dd/mm/yyyy or dd-mm-yyyy format.
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, "0");
    const m = dmyMatch[2].padStart(2, "0");
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return "";
}

const INVOICE_LIST_PAGE_SIZE = 10;

const BusinessOrdersManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const invoiceId = searchParams.get("invoiceId");

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadInvoiceLoading, setLoadInvoiceLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [draft, setDraft] = useState(null);
  const [baseline, setBaseline] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [approveLoading, setApproveLoading] = useState(false);
  const [scopeDepartmentErrorIndices, setScopeDepartmentErrorIndices] = useState([]);
  const [scopeExpiredVendorErrorIndices, setScopeExpiredVendorErrorIndices] = useState([]);
  const inputRef = useRef(null);

  const [listItems, setListItems] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [viewRow, setViewRow] = useState(null);
  const [viewDetail, setViewDetail] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [pdfDownloadingId, setPdfDownloadingId] = useState(null);

  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceOrderDateFrom, setInvoiceOrderDateFrom] = useState("");
  const [invoiceOrderDateTo, setInvoiceOrderDateTo] = useState("");
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceSort, setInvoiceSort] = useState({ key: "clientName", direction: "asc" });

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsLoadError, setProjectsLoadError] = useState("");
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentsLoadError, setDepartmentsLoadError] = useState("");
  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorsLoadError, setVendorsLoadError] = useState("");
  /** Single combobox: linked project `{ projectId, projectName }` or typed-only `{ projectId: null, projectName }`. */
  const [uploadProject, setUploadProject] = useState(null);

  const projectOptions = useMemo(
    () =>
      projects.map((p) => ({
        value: String(p._id),
        label: p.projectName,
      })),
    [projects],
  );

  const uploadProjectValue = useMemo(() => {
    if (!uploadProject?.projectName) return null;
    if (uploadProject.projectId) {
      return { value: uploadProject.projectId, label: uploadProject.projectName };
    }
    return { value: `__free__:${uploadProject.projectName}`, label: uploadProject.projectName };
  }, [uploadProject]);

  const draftProjectValue = useMemo(
    () => buildProjectOptionValue(draft, projects, result),
    [draft, projects, result],
  );

  const handleUploadProjectChange = useCallback((opt, meta) => {
    if (!opt) {
      setUploadProject(null);
      return;
    }
    if (meta.action === "create-option") {
      setUploadProject({
        projectId: null,
        projectName: String(opt.label || "").trim(),
      });
      return;
    }
    if (meta.action === "select-option") {
      const id = String(opt.value);
      if (/^[a-f\d]{24}$/i.test(id)) {
        setUploadProject({ projectId: id, projectName: String(opt.label || "").trim() });
      } else {
        setUploadProject({ projectId: null, projectName: String(opt.label || "").trim() });
      }
    }
  }, []);

  const loadInvoiceList = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const data = await listInvoicePdfs();
      setListItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setListError(e.message || "Failed to load invoices.");
      setListItems([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoiceList();
  }, [loadInvoiceList]);

  useEffect(() => {
    let cancelled = false;
    setProjectsLoading(true);
    setProjectsLoadError("");
    fetchProjects()
      .then((list) => {
        if (!cancelled) setProjects(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        if (!cancelled) {
          setProjectsLoadError(e.message || "Could not load projects.");
          setProjects([]);
        }
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDepartmentsLoading(true);
    setDepartmentsLoadError("");
    fetchDepartments()
      .then((list) => {
        if (!cancelled) setDepartments(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        if (!cancelled) {
          setDepartmentsLoadError(e.message || "Could not load departments.");
          setDepartments([]);
        }
      })
      .finally(() => {
        if (!cancelled) setDepartmentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setVendorsLoading(true);
    setVendorsLoadError("");
    fetchVendors()
      .then((list) => {
        if (!cancelled) setVendors(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        if (!cancelled) {
          setVendorsLoadError(e.message || "Could not load vendors.");
          setVendors([]);
        }
      })
      .finally(() => {
        if (!cancelled) setVendorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSortedInvoices = useMemo(() => {
    let rows = [...listItems];
    const q = invoiceSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const sow = (r.sowHeading || "").toLowerCase();
        return (
          (r.clientName || "").toLowerCase().includes(q) ||
          (r.invoiceNumber || "").toLowerCase().includes(q) ||
          (r.salesPerson || "").toLowerCase().includes(q) ||
          (r.purchaseOrderNumber || "").toLowerCase().includes(q) ||
          (r.purchaseOrderDate || "").toLowerCase().includes(q) ||
          (r.boNo || "").toLowerCase().includes(q) ||
          (r.projectName || "").toLowerCase().includes(q) ||
          (r.clientAddress || "").toLowerCase().includes(q) ||
          (r.originalFileName || "").toLowerCase().includes(q) ||
          sow.includes(q)
        );
      });
    }
    if (invoiceOrderDateFrom || invoiceOrderDateTo) {
      rows = rows.filter((r) => {
        const d = normalizeOrderDateForCompare(r.purchaseOrderDate);
        if (!d) return false;
        if (invoiceOrderDateFrom && d < invoiceOrderDateFrom) return false;
        if (invoiceOrderDateTo && d > invoiceOrderDateTo) return false;
        return true;
      });
    }
    rows.sort((a, b) => {
      if (invoiceSort.key === "totalAmount") {
        const av = parseListAmountNumber(a.totalAmount);
        const bv = parseListAmountNumber(b.totalAmount);
        const aNum = Number.isFinite(av) ? av : -Infinity;
        const bNum = Number.isFinite(bv) ? bv : -Infinity;
        return invoiceSort.direction === "asc" ? aNum - bNum : bNum - aNum;
      }
      if (invoiceSort.key === "sowHeading") {
        const av = (a.sowHeading || "").toLowerCase();
        const bv = (b.sowHeading || "").toLowerCase();
        if (av < bv) return invoiceSort.direction === "asc" ? -1 : 1;
        if (av > bv) return invoiceSort.direction === "asc" ? 1 : -1;
        return 0;
      }
      if (invoiceSort.key === "invoiceNumber") {
        const av = (a.invoiceNumber || "").toLowerCase();
        const bv = (b.invoiceNumber || "").toLowerCase();
        if (av < bv) return invoiceSort.direction === "asc" ? -1 : 1;
        if (av > bv) return invoiceSort.direction === "asc" ? 1 : -1;
        return 0;
      }
      if (invoiceSort.key === "projectName") {
        const av = (a.projectName || "").toLowerCase();
        const bv = (b.projectName || "").toLowerCase();
        if (av < bv) return invoiceSort.direction === "asc" ? -1 : 1;
        if (av > bv) return invoiceSort.direction === "asc" ? 1 : -1;
        return 0;
      }
      if (invoiceSort.key === "purchaseOrderDate") {
        const av = normalizeOrderDateForCompare(a.purchaseOrderDate);
        const bv = normalizeOrderDateForCompare(b.purchaseOrderDate);
        if (av < bv) return invoiceSort.direction === "asc" ? -1 : 1;
        if (av > bv) return invoiceSort.direction === "asc" ? 1 : -1;
        return 0;
      }
      const av = (a.clientName || "").toLowerCase();
      const bv = (b.clientName || "").toLowerCase();
      if (av < bv) return invoiceSort.direction === "asc" ? -1 : 1;
      if (av > bv) return invoiceSort.direction === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [listItems, invoiceOrderDateFrom, invoiceOrderDateTo, invoiceSearch, invoiceSort]);

  const invoiceTotalPages = Math.max(
    1,
    Math.ceil(filteredSortedInvoices.length / INVOICE_LIST_PAGE_SIZE)
  );

  const invoicePaginated = useMemo(() => {
    return filteredSortedInvoices.slice(
      (invoicePage - 1) * INVOICE_LIST_PAGE_SIZE,
      invoicePage * INVOICE_LIST_PAGE_SIZE
    );
  }, [filteredSortedInvoices, invoicePage]);

  useEffect(() => {
    setInvoicePage(1);
  }, [invoiceOrderDateFrom, invoiceOrderDateTo, invoiceSearch]);

  useEffect(() => {
    if (invoicePage > invoiceTotalPages) {
      setInvoicePage(invoiceTotalPages);
    }
  }, [invoicePage, invoiceTotalPages]);

  const handleInvoiceSort = (key) => {
    setInvoiceSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
    setInvoicePage(1);
  };

  const InvoiceSortIcon = ({ field }) => {
    if (invoiceSort.key !== field) {
      return <i className="fa fa-sort ms-1 text-muted" style={{ fontSize: 11 }} />;
    }
    return invoiceSort.direction === "asc" ? (
      <i className="fa fa-sort-asc ms-1 text-primary" style={{ fontSize: 11 }} />
    ) : (
      <i className="fa fa-sort-desc ms-1 text-primary" style={{ fontSize: 11 }} />
    );
  };

  const renderInvoicePagination = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, invoicePage - Math.floor(maxVisible / 2));
    let end = Math.min(invoiceTotalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i += 1) {
      pages.push(
        <li key={i} className={`page-item ${invoicePage === i ? "active" : ""}`}>
          <button type="button" className="page-link" onClick={() => setInvoicePage(i)}>
            {i}
          </button>
        </li>
      );
    }
    return pages;
  };

  useEffect(() => {
    if (!result) {
      setDraft(null);
      setBaseline("");
      return;
    }
    const d = buildDraftFromResult(result);
    setDraft(d);
    setBaseline(JSON.stringify(d));
  }, [result]);

  useEffect(() => {
    if (!invoiceId) {
      return;
    }
    let cancelled = false;
    setLoadInvoiceLoading(true);
    setError("");
    getInvoicePdf(invoiceId)
      .then((data) => {
        if (!cancelled) {
          setResult(data);
          setSelectedFile(null);
          setSaveError("");
          if (inputRef.current) {
            inputRef.current.value = "";
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setResult(null);
          setError(e.message || "Failed to load invoice.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadInvoiceLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  const isDirty = useMemo(() => {
    if (!draft || !baseline) return false;
    try {
      return JSON.stringify(draft) !== baseline;
    } catch {
      return true;
    }
  }, [draft, baseline]);

  const missingDepartmentIndices = useMemo(
    () => getMissingDepartmentIndices(draft?.scopeOfWork),
    [draft?.scopeOfWork]
  );

  const expiredVendorIndices = useMemo(
    () => getExpiredVendorIndices(draft?.scopeOfWork, vendors),
    [draft?.scopeOfWork, vendors],
  );

  useEffect(() => {
    if (!scopeDepartmentErrorIndices.length) return;
    setScopeDepartmentErrorIndices(missingDepartmentIndices);
  }, [missingDepartmentIndices, scopeDepartmentErrorIndices.length]);

  useEffect(() => {
    if (!scopeExpiredVendorErrorIndices.length) return;
    setScopeExpiredVendorErrorIndices(expiredVendorIndices);
  }, [expiredVendorIndices, scopeExpiredVendorErrorIndices.length]);

  const setFileIfPdf = (file) => {
    if (!file) {
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      setSelectedFile(null);
      return;
    }

    setError("");
    setSelectedFile(file);
  };

  const handleFileChange = (event) => {
    const [file] = event.target.files || [];
    setFileIfPdf(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const [file] = event.dataTransfer.files || [];
    setFileIfPdf(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Choose a PDF file first.");
      return;
    }

    if (!uploadProject?.projectName?.trim()) {
      setError("Choose a project from the list or type a new name.");
      return;
    }
    let projectFields;
    if (uploadProject.projectId) {
      projectFields = { projectId: uploadProject.projectId };
    } else {
      projectFields = { projectName: uploadProject.projectName.trim() };
    }
    setLoading(true);
    setError("");
    setSaveError("");

    try {
      const data = await uploadInvoicePdf(selectedFile, projectFields);
      setResult(data);
      setUploadProject(null);
      setSearchParams({});
      loadInvoiceList();
      fetchProjects()
        .then((list) => setProjects(Array.isArray(list) ? list : []))
        .catch(() => {});
    } catch (uploadError) {
      setResult(null);
      setError(uploadError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (!result?.savedId || !draft) return;
    const missingDepartments = getMissingDepartmentIndices(draft.scopeOfWork);
    if (missingDepartments.length) {
      setScopeDepartmentErrorIndices(missingDepartments);
      setSaveError(
        `Please select Department for Deliverable ${missingDepartments.join(", ")} before saving.`
      );
      return;
    }
    const expiredVendors = getExpiredVendorIndices(draft.scopeOfWork, vendors);
    if (expiredVendors.length) {
      setScopeExpiredVendorErrorIndices(expiredVendors);
      setSaveError(
        `Deliverable ${expiredVendors.join(", ")} has an expired vendor license. Please choose another vendor.`
      );
      return;
    }
    setScopeDepartmentErrorIndices([]);
    setScopeExpiredVendorErrorIndices([]);
    setSaveLoading(true);
    setSaveError("");
    try {
      const payload = {
        invoiceType: draft.invoiceType,
        boNo: draft.boNo,
        clientName: draft.clientName,
        clientAddress: draft.clientAddress,
        trn: draft.trn,
        salesPerson: draft.salesPerson,
        purchaseOrderNumber: draft.purchaseOrderNumber,
        purchaseOrderDate: draft.purchaseOrderDate,
        invoiceNumber: draft.invoiceNumber,
        subtotal: draft.subtotal,
        standardRateAmount: draft.standardRateAmount,
        totalAmount: draft.totalAmount,
        termsAndConditions: draft.termsAndConditions,
        scopeOfWork: draft.scopeOfWork,
      };
      if (draft.projectSelectId) {
        payload.projectId = draft.projectSelectId;
      } else {
        payload.projectId = null;
        payload.projectName = draft.projectNameCustom;
      }
      const updated = await updateInvoicePdf(result.savedId, payload);
      setResult((prev) => ({ ...prev, ...updated }));
      loadInvoiceList();
    } catch (e) {
      setSaveError(e.message || "Save failed.");
    } finally {
      setSaveLoading(false);
    }
  }, [result, draft, loadInvoiceList, vendors]);

  const handleApprove = useCallback(async () => {
    if (!result?.savedId || result.approved) return;
    const missingDepartments = getMissingDepartmentIndices(draft?.scopeOfWork);
    if (missingDepartments.length) {
      setScopeDepartmentErrorIndices(missingDepartments);
      setSaveError(
        `Please select Department for Deliverable ${missingDepartments.join(", ")} before approving.`
      );
      return;
    }
    const expiredVendors = getExpiredVendorIndices(draft?.scopeOfWork, vendors);
    if (expiredVendors.length) {
      setScopeExpiredVendorErrorIndices(expiredVendors);
      setSaveError(
        `Deliverable ${expiredVendors.join(", ")} has an expired vendor license. Please choose another vendor.`
      );
      return;
    }
    setScopeDepartmentErrorIndices([]);
    setScopeExpiredVendorErrorIndices([]);
    setApproveLoading(true);
    setSaveError("");
    try {
      const updated = await updateInvoicePdf(result.savedId, { approved: true });
      setResult((prev) => ({ ...prev, ...updated }));
      loadInvoiceList();
    } catch (e) {
      setSaveError(e.message || "Approve failed.");
    } finally {
      setApproveLoading(false);
    }
  }, [result?.savedId, result?.approved, draft?.scopeOfWork, loadInvoiceList, vendors]);

  const openInvoiceView = async (row) => {
    setViewRow(row);
    setViewDetail(null);
    setViewLoading(true);
    try {
      const detail = await getInvoicePdf(row.id);
      setViewDetail(detail);
    } catch (e) {
      setViewDetail({ error: e.message || "Failed to load." });
    } finally {
      setViewLoading(false);
    }
  };

  const closeInvoiceView = () => {
    setViewRow(null);
    setViewDetail(null);
  };

  const handleListEdit = (id) => {
    setSearchParams({ invoiceId: id });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleListDelete = async (id) => {
    if (!window.confirm("Delete this invoice record? This cannot be undone.")) {
      return;
    }
    setDeleteLoading(id);
    setListError("");
    try {
      await deleteInvoicePdf(id);
      if (result?.savedId && String(result.savedId) === String(id)) {
        setResult(null);
        setSearchParams({});
      }
      await loadInvoiceList();
    } catch (e) {
      setListError(e.message || "Delete failed.");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleDownloadPdf = async (row, source = "summary") => {
    setPdfDownloadingId(row.id);
    setListError("");
    try {
      const { blob, filename } = await downloadInvoicePdf(row.id, { source });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      const defaultName =
        source === "original"
          ? String(row.originalFileName || "invoice.pdf").replace(/[^\w.-]+/g, "_") || "invoice.pdf"
          : `SOW-summary-${String(row.id).slice(-6)}.pdf`;
      a.download = filename || defaultName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      setListError(e.message || "PDF download failed.");
    } finally {
      setPdfDownloadingId(null);
    }
  };

  const updateDraft = useCallback((patch) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }, []);

  const handleDraftProjectChange = useCallback(
    (opt, meta) => {
      if (!opt) {
        updateDraft({ projectSelectId: "", projectNameCustom: "" });
        return;
      }
      if (meta.action === "create-option") {
        updateDraft({
          projectSelectId: "",
          projectNameCustom: String(opt.label || "").trim(),
        });
        return;
      }
      if (meta.action === "select-option") {
        const id = String(opt.value);
        if (/^[a-f\d]{24}$/i.test(id)) {
          updateDraft({ projectSelectId: id, projectNameCustom: "" });
        } else {
          updateDraft({
            projectSelectId: "",
            projectNameCustom: String(opt.label || "").trim(),
          });
        }
      }
    },
    [updateDraft],
  );

  const updateScopeTitle = useCallback((index, title) => {
    setDraft((d) => {
      if (!d) return d;
      const scopeOfWork = d.scopeOfWork.map((item, i) =>
        i === index ? { ...item, title } : item
      );
      return { ...d, scopeOfWork };
    });
  }, []);

  const updateScopeDetailsLines = useCallback((index, detailsLines) => {
    const details = Array.isArray(detailsLines)
      ? detailsLines.map((line) => String(line).replace(/\s+$/, ""))
      : [];
    setDraft((d) => {
      if (!d) return d;
      const scopeOfWork = d.scopeOfWork.map((item, i) =>
        i === index ? { ...item, details } : item
      );
      return { ...d, scopeOfWork };
    });
  }, []);

  const updateScopeMoneyField = useCallback((index, field, value) => {
    setDraft((d) => {
      if (!d) return d;
      const scopeOfWork = d.scopeOfWork.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      );
      return { ...d, scopeOfWork };
    });
  }, []);

  const addScopeBlock = useCallback(() => {
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        scopeOfWork: [...d.scopeOfWork, normalizeScopeItemForDraft({ title: "", details: [] })],
      };
    });
  }, []);

  const removeScopeBlock = useCallback((index) => {
    setDraft((d) => {
      if (!d) return d;
      const scopeOfWork = d.scopeOfWork.filter((_, i) => i !== index);
      return {
        ...d,
        scopeOfWork: scopeOfWork.length
          ? scopeOfWork
          : [normalizeScopeItemForDraft({ title: "", details: [] })],
      };
    });
  }, []);

  return (
    <Fragment>
      <PageTitle motherMenu="SO" activeMenu="Uploads" />
      <div id="bom-pdf-root" className="container-fluid px-0">
        <main className="bom-app">
          <section className="bom-invoice-full-wrapper px-3 px-md-4 px-xl-5">
            <header className="bom-app-topbar">
              <div>
                <p className="bom-topbar-tag">Invoice Intelligence</p>
                <h1 className="bom-topbar-title">PDF Invoice Data Extractor</h1>
              </div>
            </header>

            <div className="bom-app-layout">
              <section className="bom-panel bom-panel-side bom-panel-sow">
              <div className="bom-panel-header">
                <span className="bom-badge">Smart Invoice Parser</span>
                <h1 className="bom-title">Upload Invoice PDF</h1>
                <p className="bom-subtitle">
                  Extract client name, invoice details, and scope of work in one click.
                </p>
              </div>

              <section
                className={`bom-dropzone ${isDragging ? "bom-dropzone-active" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  className="bom-visually-hidden"
                  onChange={handleFileChange}
                />
                <p className="bom-dropzone-title">Drag & drop your invoice PDF here</p>
                <p className="bom-dropzone-subtitle">or</p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="bom-btn bom-btn-dark"
                >
                  Choose PDF
                </button>
                <p className="bom-file-name">
                  {selectedFile ? `Selected: ${selectedFile.name}` : "No file selected"}
                </p>
              </section>

                <div className="row g-3 mb-3 mt-1">
                  <div className="col-12">
                    <div className="bom-project-fields">
                      <label
                        className="form-label small fw-semibold mb-1"
                        htmlFor="bom-upload-project-combo"
                      >
                        Project *
                      </label>
                      <CreatableSelect
                        inputId="bom-upload-project-combo"
                        classNamePrefix="bom-project-creatable"
                        placeholder={
                          projectsLoading ? "Loading projects…" : "Select a project or type a new name…"
                        }
                        isClearable
                        isDisabled={projectsLoading}
                        isLoading={projectsLoading}
                        options={projectOptions}
                        value={uploadProjectValue}
                        onChange={handleUploadProjectChange}
                        styles={BOM_PROJECT_SELECT_STYLES}
                        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                        menuPosition="fixed"
                        formatCreateLabel={(input) => `Add "${input}"`}
                        noOptionsMessage={() => "No matching projects — type to add a new name"}
                      />
                      <p className="small text-muted mt-1 mb-0">
                        Pick a suggestion or type and use <strong>Add &quot;…&quot;</strong>. New names are
                        also created under <strong>Projects</strong> when the invoice is linked to a
                        client (same rules: letters, numbers, spaces).
                      </p>
                      {projectsLoadError ? (
                        <p className="small text-warning mb-0 mt-1">{projectsLoadError}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="bom-actions">
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={loading}
                    className="bom-btn bom-btn-primary"
                  >
                    {loading ? "Processing..." : "Upload & Extract"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResult(null);
                      setError("");
                      setSaveError("");
                      setSelectedFile(null);
                      setUploadProject(null);
                      setSearchParams({});
                      if (inputRef.current) {
                        inputRef.current.value = "";
                      }
                    }}
                    className="bom-btn bom-btn-light"
                  >
                    Reset
                  </button>
                </div>

                {error ? <p className="bom-message bom-message-error">{error}</p> : null}
                {loadInvoiceLoading ? (
                  <p className="bom-message text-muted small">Loading invoice…</p>
                ) : null}
                {result?.projectCreatedNewInModule ? (
                  <p className="bom-message small text-success mb-0">
                    <i className="fa fa-check-circle me-1" aria-hidden />
                    New project was added to the Projects module.
                  </p>
                ) : null}

                {result && draft ? (
                  <section className="bom-result-section">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                      <h2 className="bom-result-title mb-0">Information</h2>
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        {isDirty && result.savedId ? (
                          <button
                            type="button"
                            className="bom-btn bom-btn-primary"
                            disabled={saveLoading}
                            onClick={handleSave}
                          >
                            {saveLoading ? "Saving…" : "Save"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {result.savedId ? (
                      <p className="text-muted small mb-2">
                        Stored in database (ID: {String(result.savedId)})
                      </p>
                    ) : null}
                    {!result.savedId && isDirty ? (
                      <p className="bom-message bom-message-error small">
                        Edits cannot be saved until the invoice is stored. Upload again if needed.
                      </p>
                    ) : null}
                    {saveError ? (
                      <p className="bom-message bom-message-error small">{saveError}</p>
                    ) : null}

                    <div className="bom-result-list">
                    <article className="bom-result-row">
                      <p className="bom-result-label">SO No</p>
                      <input
                        className="bom-input form-control form-control-sm"
                        value={draft.invoiceNumber}
                        onChange={(e) => updateDraft({ invoiceNumber: e.target.value })}
                        placeholder="Sales order no."
                      />
                    </article>
                    <article className="bom-result-row">
                      <p className="bom-result-label">Purchase no</p>
                      <input
                        className="bom-input form-control form-control-sm"
                        value={draft.purchaseOrderNumber}
                        onChange={(e) => updateDraft({ purchaseOrderNumber: e.target.value })}
                        placeholder="Tracking number"
                        maxLength={128}
                      />
                    </article>
                    <article className="bom-result-row">
                      <p className="bom-result-label">Invoice Type</p>
                      <input
                        className="bom-input form-control form-control-sm"
                        value={draft.invoiceType}
                        onChange={(e) => updateDraft({ invoiceType: e.target.value })}
                      />
                    </article>
                    <article className="bom-result-row">
                      <p className="bom-result-label">TRN</p>
                      <input
                        className="bom-input form-control form-control-sm"
                        value={draft.trn}
                        onChange={(e) => updateDraft({ trn: e.target.value })}
                      />
                    </article>
                    <article className="bom-result-row">
                      <p className="bom-result-label">Date</p>
                      <input
                        className="bom-input form-control form-control-sm"
                        value={draft.purchaseOrderDate}
                        onChange={(e) => updateDraft({ purchaseOrderDate: e.target.value })}
                        placeholder="e.g. DD/MM/YYYY"
                        maxLength={64}
                      />
                    </article>
                    <article className="bom-result-row">
                      <p className="bom-result-label">Client Name</p>
                      <input
                        className="bom-input form-control form-control-sm"
                        value={draft.clientName}
                        onChange={(e) => updateDraft({ clientName: e.target.value })}
                      />
                    </article>
                    <article className="bom-result-row">
                      <p className="bom-result-label">Project Name</p>
                      <CreatableSelect
                        inputId="bom-draft-project-combo"
                        classNamePrefix="bom-draft-project-creatable"
                        placeholder={
                          projectsLoading ? "Loading projects…" : "Select or type project name…"
                        }
                        isClearable
                        isDisabled={projectsLoading}
                        isLoading={projectsLoading}
                        options={projectOptions}
                        value={draftProjectValue}
                        onChange={handleDraftProjectChange}
                        styles={BOM_PROJECT_SELECT_STYLES}
                        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                        menuPosition="fixed"
                        formatCreateLabel={(input) => `Add "${input}"`}
                        noOptionsMessage={() => "Type to add a new project name"}
                      />
                    </article>
                    <article className="bom-result-row">
                      <p className="bom-result-label">Client Address</p>
                      <textarea
                        className="bom-input form-control form-control-sm"
                        rows={3}
                        value={draft.clientAddress}
                        onChange={(e) => updateDraft({ clientAddress: e.target.value })}
                        placeholder="Billing / registered address from PDF"
                      />
                    </article>
                    <article className="bom-result-row">
                      <p className="bom-result-label">Sales Person</p>
                      <input
                        className="bom-input form-control form-control-sm"
                        value={draft.salesPerson}
                        onChange={(e) => updateDraft({ salesPerson: e.target.value })}
                        placeholder="Name of sales contact"
                        maxLength={256}
                      />
                    </article>
                    <article className="bom-result-row">
                      <p className="bom-result-label">Subtotal</p>
                      <input
                        className="bom-input form-control form-control-sm"
                        value={draft.subtotal}
                        onChange={(e) => updateDraft({ subtotal: e.target.value })}
                        inputMode="decimal"
                      />
                    </article>
                    <article className="bom-result-row">
                      <p className="bom-result-label">{"Standard rate (5%)"}</p>
                      <input
                        className="bom-input form-control form-control-sm"
                        value={draft.standardRateAmount}
                        onChange={(e) => updateDraft({ standardRateAmount: e.target.value })}
                        inputMode="decimal"
                        placeholder="Amount at 5%"
                      />
                    </article>
                    <article className="bom-result-row">
                      <p className="bom-result-label">Total amount</p>
                      <input
                        className="bom-input form-control form-control-sm"
                        value={draft.totalAmount}
                        onChange={(e) => updateDraft({ totalAmount: e.target.value })}
                        inputMode="decimal"
                      />
                    </article>
                    </div>

                  </section>
                ) : null}
            </section>
          </div>

            <section className="bom-panel bom-panel-side bom-panel-sow mt-4">
              <h2 className="bom-side-title">Scope of Work</h2>
              <p className="bom-side-subtitle">
                Edit titles and details (one line per bullet in the details field).
              </p>

              <div className="bom-sow-body">
                {draft ? (
                  <>
                    {draft.scopeOfWork.map((item, index) => (
                      <div key={`scope-${index}-${baseline}`} className="bom-scope-item bom-scope-item-edit">
                        <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
                          <span className="small text-muted">Deliverable {index + 1}</span>
                          <button
                            type="button"
                            className="btn btn-link btn-sm text-danger p-0"
                            onClick={() => removeScopeBlock(index)}
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          className="bom-input form-control form-control-sm mb-2"
                          placeholder="Title"
                          value={item.title}
                          onChange={(e) => updateScopeTitle(index, e.target.value)}
                        />
                        <div className="row g-2 mb-2">
                          <div className="col-md-6">
                            <label
                              className="form-label small text-muted mb-0"
                              htmlFor={`bom-sow-department-${index}`}
                            >
                              Department *
                            </label>
                            <select
                              id={`bom-sow-department-${index}`}
                              className="bom-input form-select form-select-sm"
                              value={item.departmentId ?? ""}
                              onChange={(e) =>
                                updateScopeMoneyField(index, "departmentId", e.target.value)
                              }
                              disabled={departmentsLoading}
                              required
                            >
                              <option value="">
                                {departmentsLoading
                                  ? "Loading departments..."
                                  : departmentsLoadError
                                    ? "Unable to load departments"
                                    : "Select department"}
                              </option>
                              {departments.map((dept) => (
                                <option key={String(dept._id)} value={String(dept._id)}>
                                  {dept.departmentName}
                                </option>
                              ))}
                            </select>
                            {departmentsLoadError ? (
                              <p className="small text-warning mb-0 mt-1">{departmentsLoadError}</p>
                            ) : null}
                            {scopeDepartmentErrorIndices.includes(index + 1) ? (
                              <p className="small text-danger mb-0 mt-1">
                                Department is required for Deliverable {index + 1}.
                              </p>
                            ) : null}
                          </div>
                          <div className="col-md-6">
                            <label
                              className="form-label small text-muted mb-0"
                              htmlFor={`bom-sow-vendor-${index}`}
                            >
                              Vendor
                            </label>
                            <select
                              id={`bom-sow-vendor-${index}`}
                              className="bom-input form-select form-select-sm"
                              value={item.vendorId ?? ""}
                              onChange={(e) =>
                                updateScopeMoneyField(index, "vendorId", e.target.value)
                              }
                              disabled={vendorsLoading}
                            >
                              <option value="">
                                {vendorsLoading
                                  ? "Loading vendors..."
                                  : vendorsLoadError
                                    ? "Unable to load vendors"
                                    : "Select vendor"}
                              </option>
                              {(() => {
                                const selectedId = String(item.vendorId ?? "").trim();
                                const selectedVendor = findVendorById(vendors, selectedId);
                                const showSavedExpired =
                                  selectedId &&
                                  selectedVendor &&
                                  isLicenseExpired(selectedVendor.licenseExpiryDate);
                                return (
                                  <>
                                    {showSavedExpired ? (
                                      <option value={selectedId}>
                                        {selectedVendor.vendorName} (license expired)
                                      </option>
                                    ) : null}
                                    {vendors.map((vendor) => (
                                      <option
                                        key={String(vendor._id)}
                                        value={String(vendor._id)}
                                        disabled={isLicenseExpired(vendor.licenseExpiryDate)}
                                      >
                                        {vendor.vendorName}
                                        {isLicenseExpired(vendor.licenseExpiryDate)
                                          ? " (license expired)"
                                          : ""}
                                      </option>
                                    ))}
                                  </>
                                );
                              })()}
                            </select>
                            {vendorsLoadError ? (
                              <p className="small text-warning mb-0 mt-1">{vendorsLoadError}</p>
                            ) : null}
                            {isScopeVendorExpired(vendors, item.vendorId) ||
                            scopeExpiredVendorErrorIndices.includes(index + 1) ? (
                              <p className="small text-danger mb-0 mt-1">
                                This vendor&apos;s license is expired. Please select another vendor.
                              </p>
                            ) : null}
                          </div>
                          <div className="col-6">
                            <label className="form-label small text-muted mb-0" htmlFor={`bom-sow-tax-${index}`}>
                              Tax amount (5%)
                            </label>
                            <input
                              id={`bom-sow-tax-${index}`}
                              className="bom-input form-control form-control-sm"
                              inputMode="decimal"
                              placeholder="—"
                              value={item.taxAmount ?? ""}
                              onChange={(e) => updateScopeMoneyField(index, "taxAmount", e.target.value)}
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label small text-muted mb-0" htmlFor={`bom-sow-line-total-${index}`}>
                              Total amount
                            </label>
                            <input
                              id={`bom-sow-line-total-${index}`}
                              className="bom-input form-control form-control-sm"
                              inputMode="decimal"
                              placeholder="—"
                              value={item.totalAmount ?? ""}
                              onChange={(e) => updateScopeMoneyField(index, "totalAmount", e.target.value)}
                            />
                          </div>
                        </div>
                        <ScopeDetailsRichText
                          key={`scope-details-${index}-${baseline}`}
                          details={item.details || []}
                          editorId={`bom-sow-${index}`}
                          onDetailsChange={(lines) => updateScopeDetailsLines(index, lines)}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm mt-2"
                      onClick={addScopeBlock}
                    >
                      Add deliverable
                    </button>
                  </>
                ) : (
                  <p className="bom-history-empty">
                    Upload and extract an invoice PDF to view Scope of Work here.
                  </p>
                )}
              </div>
            </section>

            <section className="bom-panel bom-panel-side mt-4">
              <h2 className="bom-side-title">Terms &amp; Conditions</h2>
              <p className="bom-side-subtitle">
                Extracted from the PDF footer when present. Edit before saving if needed.
              </p>
              {draft ? (
                <textarea
                  className="bom-input form-control form-control-sm"
                  rows={5}
                  value={draft.termsAndConditions}
                  onChange={(e) => updateDraft({ termsAndConditions: e.target.value })}
                  placeholder="Payment terms and other conditions from the service order"
                />
              ) : (
                <p className="bom-history-empty mb-0">
                  Upload and extract an invoice PDF to view terms here.
                </p>
              )}
            </section>

            {result?.savedId ? (
              <div className="d-flex flex-wrap justify-content-end gap-2 mt-3">
                {!result.approved ? (
                  <button
                    type="button"
                    className="bom-btn bom-btn-success"
                      disabled={approveLoading || isDirty || missingDepartmentIndices.length > 0 || expiredVendorIndices.length > 0}
                    title={
                      isDirty
                        ? "Save your edits before approving"
                          : missingDepartmentIndices.length > 0
                            ? "Select Department for all deliverables before approving"
                          : expiredVendorIndices.length > 0
                            ? "Replace expired vendors before approving"
                        : "Mark this PDF upload as approved"
                    }
                    onClick={handleApprove}
                  >
                    {approveLoading ? "Approving…" : "Approve"}
                  </button>
                ) : (
                  <span className="bom-approved-badge" title="This upload has been approved">
                    <i className="fa fa-check-circle me-1" aria-hidden />
                    Approved
                  </span>
                )}
              </div>
            ) : null}
          </section>
        </main>

        <section className="bom-invoice-full-wrapper bom-invoice-list-below px-3 px-md-4 px-xl-5">
            <div className="row g-0">
              <div className="col-12">
                <div className="card bom-invoice-card border-0 shadow-sm">
                  <div className="card-header bom-invoice-card-header d-flex flex-wrap align-items-center justify-content-between gap-2 py-3">
                    <div>
                      <h3 className="bom-sow-main-heading mb-1">Scope of Work (SOW)</h3>
                      <p className="text-muted small mb-0">Invoice records, SOW headings, and PDF export</p>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={loadInvoiceList}
                        disabled={listLoading}
                        title="Refresh list"
                      >
                        <i className={`fa fa-refresh me-1 ${listLoading ? "fa-spin" : ""}`} />
                        Refresh
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    {listError ? (
                      <div className="alert alert-danger d-flex align-items-center justify-content-between mb-3">
                        <span>
                          <i className="fa fa-exclamation-circle me-2" />
                          {listError}
                        </span>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadInvoiceList}>
                          Retry
                        </button>
                      </div>
                    ) : null}

                    {!listLoading && !listError ? (
                      <div className="row mb-3 align-items-center bom-invoice-filters-row">
                        <div className="col-md-5 col-lg-4 bom-filter-search">
                          <div className="input-group">
                            <span className="input-group-text bg-white">
                              <i className="fa fa-search text-muted" />
                            </span>
                            <input
                              type="search"
                              className="form-control"
                              placeholder="Search by client, project, invoice no., SOW, or file name..."
                              value={invoiceSearch}
                              onChange={(e) => setInvoiceSearch(e.target.value)}
                              aria-label="Search invoices"
                            />
                            {invoiceSearch ? (
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => setInvoiceSearch("")}
                                aria-label="Clear search"
                              >
                                <i className="fa fa-times" />
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <div className="col-md-3 col-lg-2 mt-2 mt-md-0 bom-filter-from">
                          <label className="form-label small text-muted mb-1">Start date</label>
                          <input
                            type="date"
                            className="form-control"
                            value={invoiceOrderDateFrom}
                            onChange={(e) => setInvoiceOrderDateFrom(e.target.value)}
                            aria-label="Filter from order date"
                            title="From date"
                          />
                        </div>
                        <div className="col-md-3 col-lg-2 mt-2 mt-md-0 bom-filter-to">
                          <label className="form-label small text-muted mb-1">End date</label>
                          <input
                            type="date"
                            className="form-control"
                            value={invoiceOrderDateTo}
                            onChange={(e) => setInvoiceOrderDateTo(e.target.value)}
                            aria-label="Filter to order date"
                            title="To date"
                          />
                        </div>
                        <div className="col-md-2 col-lg-1 mt-2 mt-md-0 bom-filter-clear">
                          <label className="form-label small text-muted mb-1 d-block"> </label>
                          {invoiceOrderDateFrom || invoiceOrderDateTo ? (
                            <button
                              type="button"
                              className="btn btn-outline-secondary w-100"
                              onClick={() => {
                                setInvoiceOrderDateFrom("");
                                setInvoiceOrderDateTo("");
                              }}
                            >
                              Clear
                            </button>
                          ) : null}
                        </div>
                        <div className="col-md-12 col-lg-5 text-md-end mt-2 mt-md-0 bom-filter-meta">
                          <small className="text-muted">
                            {filteredSortedInvoices.length === 0
                              ? "No results"
                              : `Showing ${(invoicePage - 1) * INVOICE_LIST_PAGE_SIZE + 1}–${Math.min(
                                  invoicePage * INVOICE_LIST_PAGE_SIZE,
                                  filteredSortedInvoices.length
                                )} of ${filteredSortedInvoices.length} invoice(s)`}
                          </small>
                          {invoiceOrderDateFrom || invoiceOrderDateTo ? (
                            <div className="small text-muted mt-1">
                              Date filter: {invoiceOrderDateFrom || "Any"} to{" "}
                              {invoiceOrderDateTo || "Any"}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {listLoading ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2 text-muted mb-0">Loading invoices…</p>
                      </div>
                    ) : (
                      <>
                        <div className="table-responsive bom-invoice-table-wrap">
                          <table className="table table-striped align-middle mb-0 bom-invoice-table">
                            <thead>
                              <tr>
                                <th className="bom-invoice-th-style" style={{ width: 44 }}>
                                  #
                                </th>
                                <th
                                  className="bom-invoice-th-style bom-invoice-th-sort"
                                  onClick={() => handleInvoiceSort("clientName")}
                                >
                                  Client name <InvoiceSortIcon field="clientName" />
                                </th>
                                <th
                                  className="bom-invoice-th-style bom-invoice-th-sort"
                                  onClick={() => handleInvoiceSort("projectName")}
                                >
                                  Project <InvoiceSortIcon field="projectName" />
                                </th>
                                <th className="bom-invoice-th-style text-center" style={{ width: 96 }}>
                                  Status
                                </th>
                                <th
                                  className="bom-invoice-th-style bom-invoice-th-sort"
                                  style={{ minWidth: 120 }}
                                  onClick={() => handleInvoiceSort("invoiceNumber")}
                                >
                                  SO No <InvoiceSortIcon field="invoiceNumber" />
                                </th>
                                <th
                                  className="bom-invoice-th-style bom-invoice-th-sort"
                                  style={{ minWidth: 130 }}
                                  onClick={() => handleInvoiceSort("purchaseOrderDate")}
                                >
                                  Order Date <InvoiceSortIcon field="purchaseOrderDate" />
                                </th>
                                <th
                                  className="bom-invoice-th-style bom-invoice-th-sort bom-invoice-th-sow"
                                  onClick={() => handleInvoiceSort("sowHeading")}
                                >
                                  SOW{" "}
                                  <span className="text-lowercase fw-normal">(main)</span>{" "}
                                  <InvoiceSortIcon field="sowHeading" />
                                </th>
                                <th
                                  className="bom-invoice-th-style text-end bom-invoice-th-sort"
                                  onClick={() => handleInvoiceSort("totalAmount")}
                                >
                                  Total amt <InvoiceSortIcon field="totalAmount" />
                                </th>
                                <th className="bom-invoice-th-style text-center bom-invoice-th-pdf">PDF</th>
                                <th className="bom-invoice-th-style text-center bom-invoice-th-actions">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoicePaginated.length === 0 ? (
                                <tr>
                                  <td colSpan={10} className="text-center py-5">
                                    <div className="d-flex flex-column align-items-center text-muted">
                                      <i className="fa fa-file fa-3x mb-3 opacity-50" />
                                      <h5 className="mb-1">
                                        {invoiceSearch ? "No invoices match your search" : "No invoices yet"}
                                      </h5>
                                      <p className="mb-3 small">
                                        {invoiceSearch
                                          ? `No results for "${invoiceSearch}"`
                                          : "Upload a PDF above to create your first invoice record."}
                                      </p>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                invoicePaginated.map((row, idx) => (
                                  <tr key={row.id}>
                                    <td className="text-muted small" data-label="#">
                                      {(invoicePage - 1) * INVOICE_LIST_PAGE_SIZE + idx + 1}
                                    </td>
                                    <td data-label="Client name">
                                      <span className="fw-semibold">
                                        {row.clientName?.trim() ? row.clientName : "—"}
                                      </span>
                                      {row.originalFileName ? (
                                        <div className="small text-muted text-truncate" style={{ maxWidth: 260 }}>
                                          {row.originalFileName}
                                        </div>
                                      ) : null}
                                    </td>
                                    <td className="small text-break" data-label="Project">
                                      {row.projectName?.trim() ? row.projectName : "—"}
                                    </td>
                                    <td className="text-center" data-label="Status">
                                      {row.approved ? (
                                        <span className="badge bg-success">Approved</span>
                                      ) : (
                                        <span className="badge bg-secondary">Pending</span>
                                      )}
                                    </td>
                                    <td className="small text-break bom-invoice-cell-invoice-no" data-label="SO No">
                                      {row.invoiceNumber?.trim() ? row.invoiceNumber : "—"}
                                    </td>
                                    <td className="small text-nowrap" data-label="Order date">
                                      {row.purchaseOrderDate?.trim() ? row.purchaseOrderDate : "—"}
                                    </td>
                                    <td className="bom-invoice-sow-cell" data-label="SOW (main)">
                                      <span className="text-truncate d-inline-block" style={{ maxWidth: 280 }} title={row.sowHeading || ""}>
                                        {row.sowHeading?.trim() ? row.sowHeading : "—"}
                                      </span>
                                    </td>
                                    <td className="text-end text-nowrap fw-semibold" data-label="Total amt">
                                      {formatListAmount(row.totalAmount)}
                                    </td>
                                    <td className="text-center" data-label="PDF">
                                      <div className="d-flex flex-column align-items-center gap-1">
                                        <button
                                          type="button"
                                          className="btn btn-outline-secondary btn-sm bom-invoice-pdf-btn"
                                          title="Download SOW summary PDF (includes scope, tax amount, and line totals)"
                                          disabled={pdfDownloadingId === row.id}
                                          onClick={() => handleDownloadPdf(row, "summary")}
                                        >
                                          {pdfDownloadingId === row.id ? (
                                            <i className="fa fa-spinner fa-spin" aria-hidden />
                                          ) : (
                                            <i className="fa fa-download me-1" aria-hidden />
                                          )}
                                          PDF
                                        </button>
                                      </div>
                                    </td>
                                    <td className="text-center bom-invoice-icon-actions" data-label="Actions">
                                      <div className="bom-invoice-action-btns" role="group" aria-label="Invoice actions">
                                        <button
                                          type="button"
                                          className="btn btn-info bom-invoice-action-btn"
                                          title="View"
                                          onClick={() => openInvoiceView(row)}
                                        >
                                          <i className="fa fa-eye" aria-hidden />
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-primary bom-invoice-action-btn"
                                          title="Edit"
                                          onClick={() => handleListEdit(row.id)}
                                        >
                                          <i className="fa fa-edit" aria-hidden />
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-danger bom-invoice-action-btn"
                                          title="Delete"
                                          disabled={deleteLoading === row.id}
                                          onClick={() => handleListDelete(row.id)}
                                        >
                                          <i className="fa fa-trash" aria-hidden />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        {invoiceTotalPages > 1 ? (
                          <div className="d-flex justify-content-end mt-3">
                            <nav aria-label="Invoice list pages">
                              <ul className="pagination pagination-sm mb-0">
                                <li className={`page-item ${invoicePage === 1 ? "disabled" : ""}`}>
                                  <button
                                    type="button"
                                    className="page-link"
                                    onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
                                    disabled={invoicePage === 1}
                                  >
                                    <i className="fa fa-chevron-left" />
                                  </button>
                                </li>
                                {renderInvoicePagination()}
                                <li className={`page-item ${invoicePage === invoiceTotalPages ? "disabled" : ""}`}>
                                  <button
                                    type="button"
                                    className="page-link"
                                    onClick={() => setInvoicePage((p) => Math.min(invoiceTotalPages, p + 1))}
                                    disabled={invoicePage === invoiceTotalPages}
                                  >
                                    <i className="fa fa-chevron-right" />
                                  </button>
                                </li>
                              </ul>
                            </nav>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
        </section>
      </div>

      <Modal show={viewRow != null} onHide={closeInvoiceView} size="lg" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Invoice details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewLoading ? (
            <p className="text-muted mb-0">Loading…</p>
          ) : viewDetail?.error ? (
            <p className="text-danger mb-0">{viewDetail.error}</p>
          ) : viewDetail ? (
            <div className="bom-view-modal-body">
              <p>
                <strong>File</strong>{" "}
                {viewDetail.originalFileName || viewRow?.originalFileName || "—"}
              </p>
              <p>
                <strong>Client</strong> {viewDetail.clientName || "—"}
              </p>
              <p>
                <strong>Project</strong> {viewDetail.projectName?.trim() ? viewDetail.projectName : "—"}
              </p>
              <p>
                <strong>BO no.</strong> {viewDetail.boNo?.trim() ? viewDetail.boNo : "—"}
              </p>
              <p>
                <strong>Approval</strong>{" "}
                {viewDetail.approved ? (
                  <>
                    Approved
                    {viewDetail.approvedAt ? ` · ${formatListDate(viewDetail.approvedAt)}` : ""}
                  </>
                ) : (
                  "Pending"
                )}
              </p>
              <p>
                <strong>Address</strong> {viewDetail.clientAddress?.trim() ? viewDetail.clientAddress : "—"}
              </p>
              <p>
                <strong>SO No</strong> {viewDetail.invoiceNumber || "—"}
              </p>
              <p>
                <strong>Purchase no</strong> {viewDetail.purchaseOrderNumber?.trim() ? viewDetail.purchaseOrderNumber : "—"}
              </p>
              <p>
                <strong>Order date</strong> {viewDetail.purchaseOrderDate?.trim() ? viewDetail.purchaseOrderDate : "—"}
              </p>
              <p>
                <strong>Sales person</strong> {viewDetail.salesPerson?.trim() ? viewDetail.salesPerson : "—"}
              </p>
              <p>
                <strong>TRN</strong> {viewDetail.trn || "—"}
              </p>
              <p>
                <strong>Subtotal</strong>{" "}
                {formatListAmount(viewDetail.amountsNumeric?.subtotal ?? viewDetail.subtotal)}
              </p>
              <p>
                <strong>Standard rate (5%)</strong>{" "}
                {formatListAmount(
                  viewDetail.amountsNumeric?.standardRateAmount ?? viewDetail.standardRateAmount
                )}
              </p>
              <p>
                <strong>Total</strong>{" "}
                {formatListAmount(viewDetail.amountsNumeric?.totalAmount ?? viewDetail.totalAmount)}
              </p>
              <p className="mb-1">
                <strong>Scope of work</strong>
              </p>
              <ul className="small">
                {(viewDetail.scopeOfWork || []).map((block, i) => {
                  const blockTax =
                    block.taxAmount != null && block.taxAmount !== ""
                      ? block.taxAmount
                      : block.serviceTax;
                  const blockLineTotal =
                    block.totalAmount != null && block.totalAmount !== ""
                      ? block.totalAmount
                      : block.amount;
                  const vendorLabel =
                    block.vendorId != null && String(block.vendorId).trim()
                      ? vendors.find((v) => String(v._id) === String(block.vendorId))?.vendorName ||
                        block.vendorId
                      : "";
                  return (
                  <li key={i} className="mb-2">
                    <span className="fw-semibold">{block.title || "(No title)"}</span>
                    {vendorLabel ? (
                      <div className="small text-muted mt-1">Vendor: {vendorLabel}</div>
                    ) : null}
                    {(blockTax != null && blockTax !== "") ||
                    (blockLineTotal != null && blockLineTotal !== "") ? (
                      <div className="small text-muted mt-1">
                        {blockTax != null && blockTax !== "" ? (
                          <span className="me-2">Tax amount (5%): {formatListAmount(blockTax)}</span>
                        ) : null}
                        {blockLineTotal != null && blockLineTotal !== "" ? (
                          <span>Total amount: {formatListAmount(blockLineTotal)}</span>
                        ) : null}
                      </div>
                    ) : null}
                    {Array.isArray(block.details) && block.details.length ? (
                      <ul>
                        {block.details.map((line, j) => (
                          <li key={j}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                  );
                })}
              </ul>
              {viewDetail.termsAndConditions?.trim() ? (
                <>
                  <p className="mb-1 mt-3">
                    <strong>Terms &amp; conditions</strong>
                  </p>
                  <p className="small mb-0" style={{ whiteSpace: "pre-wrap" }}>
                    {viewDetail.termsAndConditions}
                  </p>
                </>
              ) : null}
              <p className="text-muted small mb-0">Saved {formatListDate(viewRow?.createdAt)}</p>
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-secondary" onClick={closeInvoiceView}>
            Close
          </button>
          {viewRow ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                handleListEdit(viewRow.id);
                closeInvoiceView();
              }}
            >
              Edit
            </button>
          ) : null}
        </Modal.Footer>
      </Modal>
    </Fragment>
  );
};

export default BusinessOrdersManagement;
