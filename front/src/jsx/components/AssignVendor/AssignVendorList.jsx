import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import PageTitle from "../../layouts/PageTitle";
import {
  fetchAssignVendors,
  fetchBusinessOrdersForProject,
  updateAssignVendor,
} from "../../../services/assignVendorApi";
import { fetchClients } from "../../../services/clientApi";
import { fetchProjects } from "../../../services/projectApi";
import { fetchVendors } from "../../../services/vendorApi";
import Select from "react-select";
import "./AssignVendorList.css";

/** Compact searchable dropdowns for list filters (Assigned vendors). */
const FILTER_SELECT_STYLES = {
  container: (base) => ({ ...base, width: "100%" }),
  control: (base, state) => ({
    ...base,
    width: "100%",
    minHeight: 28,
    borderColor: state.isFocused ? "#2563eb" : "#ced4da",
    boxShadow: state.isFocused ? "0 0 0 0.12rem rgba(37,99,235,.15)" : "none",
    "&:hover": { borderColor: "#94a3b8" },
    fontSize: "0.75rem",
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0 6px",
    fontSize: "0.75rem",
  }),
  input: (base) => ({ ...base, margin: 0, padding: 0, fontSize: "0.75rem" }),
  indicatorsContainer: (base) => ({ ...base, height: 26 }),
  dropdownIndicator: (base) => ({ ...base, padding: "0 4px" }),
  clearIndicator: (base) => ({ ...base, padding: "0 4px" }),
  placeholder: (base) => ({ ...base, color: "#6c757d", fontSize: "0.75rem" }),
  singleValue: (base) => ({ ...base, color: "#212529", fontSize: "0.75rem" }),
  menu: (base) => ({ ...base, zIndex: 9999, fontSize: "0.75rem" }),
  menuPortal: (base) => ({ ...base, zIndex: 10050 }),
  menuList: (base) => ({ ...base, padding: 4 }),
  option: (base, state) => ({
    ...base,
    fontSize: "0.75rem",
    padding: "4px 8px",
    backgroundColor: state.isSelected
      ? "#2563eb"
      : state.isFocused
        ? "rgba(37,99,235,.08)"
        : "white",
    color: state.isSelected ? "#fff" : "#212529",
  }),
};

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

const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const nameOf = (ref, key = "clientName") => {
  if (!ref) return "—";
  if (typeof ref === "object") return ref[key] || ref.projectName || "—";
  return "—";
};

const boLabel = (ref) => {
  if (!ref) return "";
  if (typeof ref === "object") {
    const p = [ref.boNo, ref.invoiceNumber].filter(Boolean).join(" · ");
    return p || ref.originalFileName || "";
  }
  return "";
};

const boLabelDisplay = (ref) => {
  const s = boLabel(ref);
  return s || "—";
};

function hodReviewListStatusBadge(rec) {
  const status = rec?.hodReviewStatus;
  if (status === "approved") {
    return <span className="badge bg-success">Approved</span>;
  }
  if (status === "rejected") {
    return <span className="badge bg-danger">Rejected</span>;
  }
  if (rec?.sendToHodReview === "yes") {
    return <span className="badge bg-warning text-dark">Pending</span>;
  }
  return <span className="text-muted">—</span>;
}

function financeReviewListStatusBadge(rec) {
  const status = rec?.financeReviewStatus;
  if (status === "paid" || status === "approved") {
    return <span className="badge bg-success">Paid</span>;
  }
  if (status === "overdue") {
    return <span className="badge bg-warning text-dark">Overdue</span>;
  }
  if (status === "unpaid") {
    return <span className="badge bg-secondary">Unpaid</span>;
  }
  if (status === "rejected") {
    return <span className="badge bg-danger">Reject</span>;
  }
  return <span className="badge bg-secondary">Unpaid</span>;
}

function clientPaidBadge(rec) {
  return rec?.clientPaidValue === "paid" ? (
    <span className="badge bg-success">Paid</span>
  ) : (
    <span className="badge bg-secondary">Unpaid</span>
  );
}

/** Group key: sales order only (SO-based groups). */
function assignGroupKey(rec) {
  const bid = normalizeId(rec.businessOrderId);
  return bid || "__none__";
}

function normalizeOrderDateForCompare(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";

  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

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

function getSoOrderDate(rec) {
  const b = rec?.businessOrderId;
  if (b && typeof b === "object") {
    return String(b.purchaseOrderDate || "").trim();
  }
  return "";
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

/** Parse a cost field (freeform text) to a number; ignores commas and common currency symbols. */
function parseCostString(s) {
  if (s == null || s === "") return NaN;
  const cleaned = String(s)
    .trim()
    .replace(/[,\s]/g, "")
    .replace(/[₹$€£]/g, "")
    .replace(/[^\d.-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return NaN;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function sumCostsValue(values) {
  let total = 0;
  let any = false;
  for (const v of values) {
    const n = parseCostString(v);
    if (!Number.isNaN(n)) {
      total += n;
      any = true;
    }
  }
  return any ? total : NaN;
}

function formatNumberDisplay(value) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCostDisplay(value) {
  return formatNumberDisplay(parseCostString(value));
}

/** Profit amount = cost to client - cost to agency; Profit % = pending part of agency/client, i.e. (client-agency)/client. */
function calculateProfitMetrics(agencyValue, clientValue) {
  if (!Number.isFinite(agencyValue) || !Number.isFinite(clientValue)) {
    return { amount: NaN, percent: NaN };
  }
  const amount = clientValue - agencyValue;
  const percent =
    Number.isFinite(clientValue) && clientValue !== 0
      ? ((clientValue - agencyValue) / clientValue) * 100
      : NaN;
  return { amount, percent };
}

function isPendingHodRec(rec) {
  return (
    rec?.sendToHodReview === "yes" &&
    rec?.hodReviewStatus !== "approved" &&
    rec?.hodReviewStatus !== "rejected"
  );
}

function isPendingFinanceRec(rec) {
  if (rec?.hodReviewStatus !== "approved") return false;
  const f = rec?.financeReviewStatus || "unpaid";
  return f === "unpaid" || f === "overdue" || f === "";
}

function isApprovedLineRec(rec) {
  const f = rec?.financeReviewStatus;
  return rec?.hodReviewStatus === "approved" && (f === "paid" || f === "approved");
}

function isRejectedLineRec(rec) {
  return rec?.hodReviewStatus === "rejected" || rec?.financeReviewStatus === "rejected";
}

function passesDashboardStatusFilter(rec, filter) {
  if (!filter || filter === "all") return true;
  if (filter === "pending_hod") return isPendingHodRec(rec);
  if (filter === "pending_finance") return isPendingFinanceRec(rec);
  if (filter === "approved") return isApprovedLineRec(rec);
  if (filter === "rejected") return isRejectedLineRec(rec);
  return true;
}

function passesDashboardAgingFilter(rec, filter) {
  if (!filter || filter === "all") return true;
  const t = new Date(rec?.createdAt || 0).getTime();
  if (Number.isNaN(t)) return false;
  const d = (Date.now() - t) / 86400000;
  if (filter === "lt1") return d < 1;
  if (filter === "d1_3") return d >= 1 && d < 3;
  if (filter === "gt3") return d >= 3;
  return true;
}

/** Page numbers with ellipses (1 … 4 5 6 … 20) for dashboard pagination. */
function buildDashPaginationRange(currentPage, totalPages) {
  if (totalPages <= 1) return [1];
  const delta = 2;
  const range = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      range.push(i);
    }
  }
  const out = [];
  let prev = 0;
  for (const i of range) {
    if (prev && i - prev > 1) {
      out.push("ellipsis");
    }
    out.push(i);
    prev = i;
  }
  return out;
}

function WorkflowStrip({ rec }) {
  const hodApproved = rec?.hodReviewStatus === "approved";
  const hodRejected = rec?.hodReviewStatus === "rejected";
  const hodWait = isPendingHodRec(rec);
  const fin = rec?.financeReviewStatus || "unpaid";
  const finOk = fin === "paid" || fin === "approved";
  const finReject = fin === "rejected";
  const finOver = fin === "overdue";
  const finWait =
    hodApproved && !finOk && !finReject;

  const finClass = finOk
    ? "ok"
    : finReject || finOver
      ? finReject
        ? "bad"
        : "pending"
      : hodApproved
        ? "pending"
        : "info";

  const hodClass = hodApproved ? "ok" : hodRejected ? "bad" : hodWait ? "pending" : "info";

  const finLabel = finOk ? "✓" : finReject ? "✗" : finOver ? "!" : finWait ? "…" : "—";

  const hodLabel = hodApproved ? "✓" : hodRejected ? "✗" : hodWait ? "…" : "—";

  return (
    <span className="avl-workflow">
      <span className={`avl-workflow__step avl-workflow__step--${hodClass}`}>
        HOD {hodLabel}
      </span>
      <span className="avl-workflow__arrow" aria-hidden>
        →
      </span>
      <span className={`avl-workflow__step avl-workflow__step--${finClass}`}>
        Finance {finLabel}
      </span>
    </span>
  );
}

/** listVariant: "manage" = full assignment edit; "hod" | "finance" = dedicated review modules only. */
const AssignVendorList = ({ listVariant = "manage" }) => {
  const navigate = useNavigate();
  const isManage = listVariant === "manage";
  const isHod = listVariant === "hod";
  const isFinance = listVariant === "finance";
  const isAdminApproval = listVariant === "admin";
  const selectSuffix = listVariant;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [ctxClientId, setCtxClientId] = useState("");
  const [ctxProjectId, setCtxProjectId] = useState("");
  const [ctxBusinessOrderId, setCtxBusinessOrderId] = useState("");
  const [ctxVendorId, setCtxVendorId] = useState("");
  const [orderDateFrom, setOrderDateFrom] = useState("");
  const [orderDateTo, setOrderDateTo] = useState("");
  const [searchText, setSearchText] = useState("");
  const [boOptions, setBoOptions] = useState([]);
  const [boLoading, setBoLoading] = useState(false);
  const [boError, setBoError] = useState(null);

  const [dashStatusFilter, setDashStatusFilter] = useState("all");
  const [dashAgingFilter, setDashAgingFilter] = useState("all");
  const [dashViewMode, setDashViewMode] = useState("list");
  const [dashPage, setDashPage] = useState(1);
  const [dashPerPage, setDashPerPage] = useState(5);
  const [expandedSoKeys, setExpandedSoKeys] = useState({});
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const dashTotalPagesRef = useRef(1);

  /** Guards list fetch so rapid context changes do not apply stale results. */
  const loadGen = useRef(0);

  const contextComplete = Boolean(
    normalizeId(ctxClientId) &&
      normalizeId(ctxProjectId) &&
      normalizeId(ctxBusinessOrderId),
  );

  const filteredProjects = useMemo(() => {
    if (!ctxClientId) return [];
    return projects.filter((p) => projectClientId(p) === normalizeId(ctxClientId));
  }, [projects, ctxClientId]);

  const vendorOptions = useMemo(
    () =>
      (Array.isArray(vendors) ? vendors : []).filter(
        (v) => v && v.isActive !== false,
      ),
    [vendors],
  );

  const ctxClientHasMatch = useMemo(
    () =>
      !ctxClientId ||
      clients.some((c) => normalizeId(c._id) === normalizeId(ctxClientId)),
    [clients, ctxClientId],
  );

  const ctxProjectHasMatch = useMemo(
    () =>
      !ctxProjectId ||
      filteredProjects.some((p) => normalizeId(p._id) === normalizeId(ctxProjectId)),
    [filteredProjects, ctxProjectId],
  );

  const ctxBoHasMatch = useMemo(
    () =>
      !ctxBusinessOrderId ||
      boOptions.some((o) => normalizeId(o.id) === normalizeId(ctxBusinessOrderId)),
    [boOptions, ctxBusinessOrderId],
  );

  const ctxVendorFilterHasMatch = useMemo(
    () =>
      !ctxVendorId ||
      vendorOptions.some((v) => normalizeId(v._id) === normalizeId(ctxVendorId)),
    [vendorOptions, ctxVendorId],
  );

  const clientFilterOptions = useMemo(() => {
    const opts = clients.map((c) => ({
      value: normalizeId(c._id),
      label: c.clientName || "—",
    }));
    const id = normalizeId(ctxClientId);
    if (id && !ctxClientHasMatch && !opts.some((o) => o.value === id)) {
      return [{ value: id, label: `Saved client (${id.slice(0, 8)}…)` }, ...opts];
    }
    return opts;
  }, [clients, ctxClientId, ctxClientHasMatch]);

  const clientSelectValue = useMemo(() => {
    const id = normalizeId(ctxClientId);
    if (!id) return null;
    return clientFilterOptions.find((o) => o.value === id) ?? null;
  }, [ctxClientId, clientFilterOptions]);

  const projectFilterOptions = useMemo(() => {
    const opts = filteredProjects.map((p) => ({
      value: normalizeId(p._id),
      label: p.projectName || "—",
    }));
    const id = normalizeId(ctxProjectId);
    if (
      id &&
      !ctxProjectHasMatch &&
      normalizeId(ctxClientId) &&
      !opts.some((o) => o.value === id)
    ) {
      return [{ value: id, label: `Saved project (${id.slice(0, 8)}…)` }, ...opts];
    }
    return opts;
  }, [filteredProjects, ctxProjectId, ctxProjectHasMatch, ctxClientId]);

  const projectSelectValue = useMemo(() => {
    const id = normalizeId(ctxProjectId);
    if (!id) return null;
    return projectFilterOptions.find((o) => o.value === id) ?? null;
  }, [ctxProjectId, projectFilterOptions]);

  const boFilterOptions = useMemo(() => {
    const opts = boOptions.map((o) => ({
      value: normalizeId(o.id),
      label: `${o.label || "—"}${o.isAfterFourWeeksFromOrderDate ? " (after 4 weeks)" : ""}`,
    }));
    const id = normalizeId(ctxBusinessOrderId);
    if (
      id &&
      !ctxBoHasMatch &&
      normalizeId(ctxProjectId) &&
      !opts.some((o) => o.value === id)
    ) {
      return [{ value: id, label: `Saved SO (${id.slice(0, 8)}…)` }, ...opts];
    }
    return opts;
  }, [boOptions, ctxBusinessOrderId, ctxBoHasMatch, ctxProjectId]);

  const boSelectValue = useMemo(() => {
    const id = normalizeId(ctxBusinessOrderId);
    if (!id) return null;
    return boFilterOptions.find((o) => o.value === id) ?? null;
  }, [ctxBusinessOrderId, boFilterOptions]);

  const selectedBoIsAfterFourWeeks = useMemo(() => {
    const selected = boOptions.find(
      (o) => normalizeId(o.id) === normalizeId(ctxBusinessOrderId),
    );
    if (!selected) return false;
    if (typeof selected.isAfterFourWeeksFromOrderDate === "boolean") {
      return selected.isAfterFourWeeksFromOrderDate;
    }
    return isAfterFourWeeksFromOrderDate(selected.purchaseOrderDate);
  }, [boOptions, ctxBusinessOrderId]);

  const vendorFilterOptions = useMemo(() => {
    const opts = vendorOptions.map((v) => ({
      value: normalizeId(v._id),
      label: v.vendorName || "—",
    }));
    const id = normalizeId(ctxVendorId);
    if (id && !ctxVendorFilterHasMatch && !opts.some((o) => o.value === id)) {
      return [{ value: id, label: `Saved vendor (${id.slice(0, 8)}…)` }, ...opts];
    }
    return opts;
  }, [vendorOptions, ctxVendorId, ctxVendorFilterHasMatch]);

  const vendorSelectValue = useMemo(() => {
    const id = normalizeId(ctxVendorId);
    if (!id) return null;
    return vendorFilterOptions.find((o) => o.value === id) ?? null;
  }, [ctxVendorId, vendorFilterOptions]);

  const contextSummary = useMemo(() => {
    if (!contextComplete) return null;
    const cn = clients.find((c) => normalizeId(c._id) === normalizeId(ctxClientId));
    const pn = filteredProjects.find(
      (p) => normalizeId(p._id) === normalizeId(ctxProjectId),
    );
    const bo = boOptions.find(
      (o) => normalizeId(o.id) === normalizeId(ctxBusinessOrderId),
    );
    const parts = [
      cn?.clientName,
      pn?.projectName,
      bo?.label ||
        (ctxBusinessOrderId
          ? `SO (${normalizeId(ctxBusinessOrderId).slice(0, 8)}…)`
          : ""),
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  }, [
    contextComplete,
    clients,
    filteredProjects,
    boOptions,
    ctxClientId,
    ctxProjectId,
    ctxBusinessOrderId,
  ]);

  const hasFilters = useMemo(
    () =>
      Boolean(
        normalizeId(ctxClientId) ||
          normalizeId(ctxProjectId) ||
          normalizeId(ctxBusinessOrderId) ||
          normalizeId(ctxVendorId) ||
          orderDateFrom ||
          orderDateTo ||
          (isManage && dashStatusFilter !== "all") ||
          (isManage && dashAgingFilter !== "all"),
      ),
    [
      ctxClientId,
      ctxProjectId,
      ctxBusinessOrderId,
      ctxVendorId,
      orderDateFrom,
      orderDateTo,
      isManage,
      dashStatusFilter,
      dashAgingFilter,
    ],
  );

  const displayRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    let scoped = rows;
    if (orderDateFrom || orderDateTo) {
      scoped = scoped.filter((rec) => {
        const d = normalizeOrderDateForCompare(getSoOrderDate(rec));
        if (!d) return false;
        if (orderDateFrom && d < orderDateFrom) return false;
        if (orderDateTo && d > orderDateTo) return false;
        return true;
      });
    }
    if (isManage) {
      scoped = scoped.filter(
        (rec) =>
          passesDashboardStatusFilter(rec, dashStatusFilter) &&
          passesDashboardAgingFilter(rec, dashAgingFilter),
      );
    }
    if (!q) return scoped;
    return scoped.filter((rec) => {
      const hay = [
        nameOf(rec.vendorId, "vendorName"),
        typeof rec.vendorId === "object" ? rec.vendorId?.vendorEmail || "" : "",
        nameOf(rec.clientId, "clientName"),
        nameOf(rec.projectId, "projectName"),
        boLabel(rec.businessOrderId),
        getSoOrderDate(rec),
        rec.costToAgency,
        rec.costToClient,
        rec.clientPaidValue,
        fmt(rec.createdAt),
        String(rec._id || ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [
    rows,
    searchText,
    orderDateFrom,
    orderDateTo,
    isManage,
    dashStatusFilter,
    dashAgingFilter,
  ]);

  const queueSortedFlat = useMemo(() => {
    if (!isManage || dashViewMode !== "queue") return [];
    const rank = (rec) => {
      if (isRejectedLineRec(rec)) return 2;
      if (isApprovedLineRec(rec)) return 1;
      return 0;
    };
    return [...displayRows].sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
    });
  }, [isManage, dashViewMode, displayRows]);

  const groupedForDash = useMemo(() => {
    if (!isManage || dashViewMode !== "list") return null;
    const bySo = new Map();
    for (const rec of displayRows) {
      const k = assignGroupKey(rec);
      if (!bySo.has(k)) bySo.set(k, []);
      bySo.get(k).push(rec);
    }
    const groups = [...bySo.entries()].map(([key, gr]) => {
      const sortedRows = [...gr].sort((a, b) => {
        const va = nameOf(a.vendorId, "vendorName");
        const vb = nameOf(b.vendorId, "vendorName");
        if (va !== vb) return va.localeCompare(vb);
        return String(a._id || "").localeCompare(String(b._id || ""));
      });
      return { key, rows: sortedRows };
    });
    groups.sort((ga, gb) => {
      const a = ga.rows[0];
      const b = gb.rows[0];
      const ba = boLabelDisplay(a.businessOrderId);
      const bb = boLabelDisplay(b.businessOrderId);
      if (ba !== bb) return ba.localeCompare(bb);
      const ca = nameOf(a.clientId, "clientName");
      const cb = nameOf(b.clientId, "clientName");
      if (ca !== cb) return ca.localeCompare(cb);
      const pa = nameOf(a.projectId, "projectName");
      const pb = nameOf(b.projectId, "projectName");
      if (pa !== pb) return pa.localeCompare(pb);
      return ga.key.localeCompare(gb.key);
    });
    return groups;
  }, [isManage, dashViewMode, displayRows]);

  const dashTotalPages = useMemo(() => {
    if (!isManage) return 1;
    if (dashViewMode === "queue") {
      return Math.max(1, Math.ceil(queueSortedFlat.length / dashPerPage));
    }
    return Math.max(1, Math.ceil((groupedForDash?.length || 0) / dashPerPage));
  }, [isManage, dashViewMode, queueSortedFlat.length, groupedForDash, dashPerPage]);

  dashTotalPagesRef.current = dashTotalPages;

  const pagedQueueRows = useMemo(() => {
    if (!isManage || dashViewMode !== "queue") return [];
    const start = (dashPage - 1) * dashPerPage;
    return queueSortedFlat.slice(start, start + dashPerPage);
  }, [isManage, dashViewMode, dashPage, queueSortedFlat, dashPerPage]);

  const pagedSoGroups = useMemo(() => {
    if (!isManage || dashViewMode !== "list" || !groupedForDash) return [];
    const start = (dashPage - 1) * dashPerPage;
    return groupedForDash.slice(start, start + dashPerPage);
  }, [isManage, dashViewMode, dashPage, groupedForDash, dashPerPage]);

  const dashPaginationItems = useMemo(
    () => buildDashPaginationRange(dashPage, dashTotalPages),
    [dashPage, dashTotalPages],
  );

  const goDashPrevPage = useCallback(() => {
    setDashPage((p) => Math.max(1, p - 1));
  }, []);

  const goDashNextPage = useCallback(() => {
    setDashPage((p) => Math.min(dashTotalPagesRef.current, p + 1));
  }, []);

  useEffect(() => {
    setDashPage((p) => Math.min(p, dashTotalPages));
  }, [dashTotalPages]);

  useEffect(() => {
    setDashPage(1);
  }, [
    dashStatusFilter,
    dashAgingFilter,
    dashViewMode,
    dashPerPage,
    searchText,
    ctxClientId,
    ctxProjectId,
    ctxBusinessOrderId,
    ctxVendorId,
    orderDateFrom,
    orderDateTo,
  ]);

  const toggleSoExpanded = useCallback((key) => {
    setExpandedSoKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  /** HOD / Finance lists: one row per vendor assignment. (Manage uses groupedForDash.) */
  const groupedDisplayRows = useMemo(() => {
    if (isManage) return [];
    const reviewRows = [...displayRows];
    if (isFinance) {
      const rank = (rec) => {
        if (rec?.financeReviewStatus === "unpaid" || !rec?.financeReviewStatus) return 0;
        if (rec?.financeReviewStatus === "overdue") return 1;
        if (rec?.financeReviewStatus === "paid" || rec?.financeReviewStatus === "approved")
          return 2;
        if (rec?.financeReviewStatus === "rejected") return 3;
        return 4;
      };
      reviewRows.sort((a, b) => {
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;
        return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
      });
    }
    return reviewRows.map((rec) => ({
      key: String(rec._id || assignGroupKey(rec)),
      rows: [rec],
    }));
  }, [displayRows, isManage, isFinance]);

  const clearFilters = () => {
    setCtxClientId("");
    setCtxProjectId("");
    setCtxBusinessOrderId("");
    setCtxVendorId("");
    setOrderDateFrom("");
    setOrderDateTo("");
    setSearchText("");
    setBoOptions([]);
    setDashStatusFilter("all");
    setDashAgingFilter("all");
    setDashPage(1);
  };

  useEffect(() => {
    if (!ctxProjectId) {
      setBoOptions([]);
      return;
    }
    let cancelled = false;
    setBoLoading(true);
    setBoError(null);
    fetchBusinessOrdersForProject(normalizeId(ctxProjectId))
      .then((items) => {
        if (cancelled) return;
        const list = Array.isArray(items) ? items : [];
        setCtxBusinessOrderId((prev) => {
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
  }, [ctxProjectId]);

  const load = useCallback(() => {
    const gen = ++loadGen.current;
    setLoading(true);
    const params = {};
    const cid = normalizeId(ctxClientId);
    const pid = normalizeId(ctxProjectId);
    const bid = normalizeId(ctxBusinessOrderId);
    const vid = normalizeId(ctxVendorId);
    if (cid) params.clientId = cid;
    if (pid) params.projectId = pid;
    if (bid) params.businessOrderId = bid;
    if (vid) params.vendorId = vid;
    if (isHod) params.sendToHodReview = "yes";
    if (isFinance) params.hodReviewStatus = "approved";
    if (isAdminApproval) params.adminApprovalStatus = "pending";
    fetchAssignVendors(params)
      .then((data) => {
        if (gen !== loadGen.current) return;
        setRows(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (gen !== loadGen.current) return;
        if (err?.response?.status === 401) navigate("/login");
        else
          Swal.fire({
            icon: "error",
            title: "Error",
            text: err.message || "Failed to load list.",
          });
      })
      .finally(() => {
        if (gen === loadGen.current) setLoading(false);
      });
  }, [navigate, ctxClientId, ctxProjectId, ctxBusinessOrderId, ctxVendorId, isHod, isFinance, isAdminApproval]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([fetchClients(), fetchProjects(), fetchVendors()])
      .then(([c, p, v]) => {
        setClients(c);
        setProjects(p);
        setVendors(v);
      })
      .catch(() => {});
  }, []);

  const emptyTableMessage = (() => {
    if (loading) return "";
    if (rows.length > 0 && displayRows.length === 0) {
      if (searchText.trim()) return "No rows match your search.";
      if (isManage && (dashStatusFilter !== "all" || dashAgingFilter !== "all")) {
        return "No assignments match the selected status or aging filters.";
      }
      return "No rows match your filters.";
    }
    if (rows.length === 0) {
      if (hasFilters) return "No records match your filters.";
      if (isAdminApproval) {
        return "No pending Admin/Superadmin approvals.";
      }
      if (!contextComplete) {
        return "Select client, project, and sales order (SO) above to load assignments.";
      }
      return "No vendor assignments for this context yet.";
    }
    return "";
  })();

  const pageMeta =
    isHod
      ? {
          activeMenu: "HOD review",
          motherMenu: "Vendor",
          pageContent: "HOD review — vendor assignments",
        }
      : isFinance
        ? {
            activeMenu: "Finance review",
            motherMenu: "Vendor",
            pageContent: "Finance review — vendor assignments",
          }
        : isAdminApproval
          ? {
              activeMenu: "Admin approval",
              motherMenu: "Vendor",
              pageContent: "Admin approval — vendor assignments",
            }
        : {
            activeMenu: "Assigned Vendors",
            motherMenu: "Vendor",
            pageContent: "Assigned Vendors",
          };

  const cardSubBlurb = isHod
    ? "Use HOD review to open assignments for an SO, then complete review on each vendor row."
    : isFinance
      ? "Use Finance review to open assignments for an SO, then complete review on each vendor row."
      : isAdminApproval
        ? "Only pending Admin/Superadmin approvals are listed here."
      : "Use List view to group by SO, or Queue view for a flat pending-first list. Edit opens bulk assignment for that SO.";

  const mainActionLabel = isHod
    ? "HOD review"
    : isFinance
      ? "Finance review"
      : "View";

  const handleAdminApprovalAction = async (record, nextStatus) => {
    const actionLabel = nextStatus === "approved" ? "Approve" : "Reject";
    const result = await Swal.fire({
      icon: "question",
      title: `${actionLabel} this request?`,
      text:
        nextStatus === "approved"
          ? "This will mark admin approval as approved."
          : "This will mark admin approval as rejected.",
      showCancelButton: true,
      confirmButtonText: actionLabel,
      confirmButtonColor: nextStatus === "approved" ? "#198754" : "#dc3545",
    });
    if (!result.isConfirmed) return;
    try {
      await updateAssignVendor(record._id, { adminApprovalStatus: nextStatus });
      await Swal.fire({
        icon: "success",
        title: `Request ${actionLabel.toLowerCase()}d`,
        timer: 1200,
        showConfirmButton: false,
      });
      load();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Action failed",
        text: err?.response?.data?.message || err.message || "Could not update admin approval.",
      });
    }
  };

  const goManageBulk = (groupRows, options = {}) => {
    const { viewOnly = false } = options;
    navigate("/assign-vendor-bulk-edit", {
      state: {
        rows: groupRows,
        businessOrderId: normalizeId(groupRows[0]?.businessOrderId),
        listVariant,
        viewOnly,
      },
    });
  };

  const downloadManageRow = (rec) => {
    const payload = {
      so: boLabelDisplay(rec?.businessOrderId),
      client: nameOf(rec?.clientId, "clientName"),
      project: nameOf(rec?.projectId, "projectName"),
      vendor: nameOf(rec?.vendorId, "vendorName"),
      costToAgency: rec?.costToAgency || "",
      costToClient: rec?.costToClient || "",
      orderDate: getSoOrderDate(rec) || "",
      financeReviewStatus: rec?.financeReviewStatus || "",
      hodReviewStatus: rec?.hodReviewStatus || "",
      createdAt: rec?.createdAt || "",
      id: String(rec?._id || ""),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fallbackId = String(rec?._id || "assignment");
    const safeSo = boLabelDisplay(rec?.businessOrderId)
      .replace(/[^\w.-]+/g, "_")
      .replace(/^_+|_+$/g, "");
    a.href = url;
    a.download = `${safeSo || "assignment"}_${fallbackId.slice(-6)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const manageDashTableColCount = 12;

  const countLineStatus = (groupRows) => {
    let pend = 0;
    let ok = 0;
    let rej = 0;
    for (const r of groupRows) {
      if (isRejectedLineRec(r)) rej += 1;
      else if (isApprovedLineRec(r)) ok += 1;
      else pend += 1;
    }
    return { pend, ok, rej };
  };

  const dashPaginationUnits =
    isManage && dashViewMode === "queue"
      ? queueSortedFlat.length
      : isManage
        ? groupedForDash?.length || 0
        : 0;
  const dashRangeFrom =
    dashPaginationUnits === 0 ? 0 : (dashPage - 1) * dashPerPage + 1;
  const dashRangeTo = Math.min(dashPage * dashPerPage, dashPaginationUnits);
  const dashCanPrev = dashPage > 1;
  const dashCanNext = dashPage < dashTotalPages;
  const overallFilteredTotals = useMemo(() => {
    if (!isManage || displayRows.length === 0) return null;
    const vendorCost = sumCostsValue(displayRows.map((r) => r.costToAgency));
    const clientCost = sumCostsValue(displayRows.map((r) => r.costToClient));
    const totalAmount =
      Number.isFinite(vendorCost) && Number.isFinite(clientCost)
        ? vendorCost + clientCost
        : NaN;
    const profitAmount =
      Number.isFinite(vendorCost) && Number.isFinite(clientCost)
        ? clientCost - vendorCost
        : NaN;
    return {
      vendorCost: formatNumberDisplay(vendorCost),
      clientCost: formatNumberDisplay(clientCost),
      totalAmount: formatNumberDisplay(totalAmount),
      profitAmount: formatNumberDisplay(profitAmount),
    };
  }, [isManage, displayRows]);

  const renderManageAssignmentRow = (rec, groupRows, firstBo) => {
    const agency = parseCostString(rec.costToAgency);
    const client = parseCostString(rec.costToClient);
    const profit = calculateProfitMetrics(agency, client);
    const totalAmount =
      Number.isFinite(agency) && Number.isFinite(client) ? agency + client : NaN;
    return (
      <tr key={String(rec._id)}>
        <td>
          <button
            type="button"
            className="avl-so-link"
            onClick={() => goManageBulk(groupRows)}
          >
            {boLabelDisplay(firstBo.businessOrderId)}
          </button>
        </td>
        <td>{nameOf(rec.clientId, "clientName")}</td>
        <td>{nameOf(rec.projectId, "projectName")}</td>
        <td>
          <span className="text-truncate d-inline-block align-middle" style={{ maxWidth: 200 }} title={nameOf(rec.vendorId, "vendorName")}>
            {nameOf(rec.vendorId, "vendorName")}
          </span>
        </td>
        <td className="text-muted small">{formatCostDisplay(rec.costToAgency)}</td>
        <td className="text-muted small">{formatCostDisplay(rec.costToClient)}</td>
        <td className="small">
          {Number.isFinite(totalAmount) ? formatNumberDisplay(totalAmount) : "—"}
        </td>
        <td className="small">{formatNumberDisplay(profit.amount)}</td>
        <td className="small">
          {Number.isFinite(profit.percent)
            ? `${formatNumberDisplay(profit.percent)}%`
            : "—"}
        </td>
        <td className="small text-center">{clientPaidBadge(rec)}</td>
        <td className="small">{getSoOrderDate(rec) || "—"}</td>
        <td>
          <WorkflowStrip rec={rec} />
        </td>
        <td className="text-end text-nowrap">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary py-0 px-2 me-1"
            style={{ fontSize: 11 }}
            title="View"
            aria-label="View"
            onClick={() => goManageBulk(groupRows, { viewOnly: true })}
          >
            <i className="fa fa-eye" aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary py-0 px-2 me-1"
            style={{ fontSize: 11 }}
            title="Download"
            aria-label="Download"
            onClick={() => downloadManageRow(rec)}
          >
            <i className="fa fa-download" aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary py-0 px-2"
            style={{ fontSize: 11 }}
            onClick={() => goManageBulk(groupRows, { viewOnly: false })}
          >
            Edit
          </button>
        </td>
      </tr>
    );
  };

  return (
    <Fragment>
      <PageTitle
        activeMenu={pageMeta.activeMenu}
        motherMenu={pageMeta.motherMenu}
        pageContent={pageMeta.pageContent}
      />

      <div className="row">
        {!isManage ? (
          <div className="col-12 mb-3">
            <div className="card border shadow-sm">
              <div className="py-3 px-3">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                    onClick={() => setFiltersDrawerOpen((v) => !v)}
                    aria-expanded={filtersDrawerOpen}
                  >
                    <i
                      className={`fa fa-chevron-${filtersDrawerOpen ? "down" : "right"} me-1`}
                      aria-hidden
                    />
                    Filters
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={clearFilters}
                    disabled={!hasFilters && !searchText.trim()}
                  >
                    Clear all
                  </button>
                </div>

                {filtersDrawerOpen ? (
                <>
                <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-5 g-2 align-items-end w-100 mx-0">
                <div className="col min-w-0">
                  <label className="form-label text-muted mb-0 small" style={{ fontSize: 11 }}>
                    Client
                  </label>
                  <Select
                    instanceId={`avl-filter-client-${selectSuffix}`}
                    inputId={`avl-filter-client-input-${selectSuffix}`}
                    styles={FILTER_SELECT_STYLES}
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    menuPosition="fixed"
                    isClearable
                    isSearchable
                    placeholder="Search or select…"
                    noOptionsMessage={() => "No matches"}
                    options={clientFilterOptions}
                    value={clientSelectValue}
                    onChange={(opt) => {
                      setCtxClientId(opt?.value ?? "");
                      setCtxProjectId("");
                      setCtxBusinessOrderId("");
                      setBoOptions([]);
                    }}
                  />
                </div>
                <div className="col min-w-0">
                  <label className="form-label text-muted mb-0 small" style={{ fontSize: 11 }}>
                    Project
                  </label>
                  <Select
                    instanceId={`avl-filter-project-${selectSuffix}`}
                    inputId={`avl-filter-project-input-${selectSuffix}`}
                    styles={FILTER_SELECT_STYLES}
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    menuPosition="fixed"
                    isClearable
                    isSearchable
                    isDisabled={!ctxClientId}
                    placeholder={
                      !ctxClientId
                        ? "Select client first…"
                        : "Search or select…"
                    }
                    noOptionsMessage={() => "No matches"}
                    options={projectFilterOptions}
                    value={projectSelectValue}
                    onChange={(opt) => {
                      const v = opt?.value ?? "";
                      setCtxProjectId(v);
                      setCtxBusinessOrderId("");
                      if (!v) setBoOptions([]);
                    }}
                  />
                </div>
                <div className="col min-w-0">
                  <label className="form-label text-muted mb-0 small" style={{ fontSize: 11 }}>
                    SO (Sales order)
                  </label>
                  <Select
                    instanceId={`avl-filter-bo-${selectSuffix}`}
                    inputId={`avl-filter-bo-input-${selectSuffix}`}
                    styles={FILTER_SELECT_STYLES}
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    menuPosition="fixed"
                    isClearable
                    isSearchable
                    isLoading={boLoading}
                    isDisabled={!ctxProjectId || boLoading}
                    placeholder={
                      boLoading
                        ? "Loading…"
                        : !ctxProjectId
                          ? "Select project first…"
                          : "Search or select…"
                    }
                    noOptionsMessage={() => "No matches"}
                    options={boFilterOptions}
                    value={boSelectValue}
                    onChange={(opt) => setCtxBusinessOrderId(opt?.value ?? "")}
                  />
                </div>
                <div className="col min-w-0">
                  <label className="form-label text-muted mb-0 small" style={{ fontSize: 11 }}>
                    Vendor (optional)
                  </label>
                  <Select
                    instanceId={`avl-filter-vendor-${selectSuffix}`}
                    inputId={`avl-filter-vendor-input-${selectSuffix}`}
                    styles={FILTER_SELECT_STYLES}
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : null
                    }
                    menuPosition="fixed"
                    isClearable
                    isSearchable
                    placeholder="All vendors…"
                    noOptionsMessage={() => "No matches"}
                    options={vendorFilterOptions}
                    value={vendorSelectValue}
                    onChange={(opt) => setCtxVendorId(opt?.value ?? "")}
                  />
                </div>
                <div className="col min-w-0">
                  <label className="form-label text-muted mb-0 small" style={{ fontSize: 11 }}>
                    Start date
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-sm w-100"
                    style={{ fontSize: "0.75rem", minHeight: 28 }}
                    value={orderDateFrom}
                    onChange={(e) => setOrderDateFrom(e.target.value)}
                  />
                </div>
                <div className="col min-w-0">
                  <label className="form-label text-muted mb-0 small" style={{ fontSize: 11 }}>
                    End date
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-sm w-100"
                    style={{ fontSize: "0.75rem", minHeight: 28 }}
                    value={orderDateTo}
                    onChange={(e) => setOrderDateTo(e.target.value)}
                  />
                </div>
                <div className="col min-w-0">
                  <label className="form-label text-muted mb-0 small" style={{ fontSize: 11 }}>
                    Search rows
                  </label>
                  <input
                    type="search"
                    className="form-control form-control-sm w-100"
                    style={{ fontSize: "0.75rem", minHeight: 28 }}
                    placeholder="Filter table…"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>
              {boError ? (
                <div className="text-warning small mt-2 mb-0" style={{ fontSize: 11 }}>
                  {boError}
                </div>
              ) : null}
              {selectedBoIsAfterFourWeeks ? (
                <div className="text-warning small mt-2 mb-0" style={{ fontSize: 11 }}>
                  This SO is after 4 weeks from Order Date. It will be sent for Admin/Superadmin approval.
                </div>
              ) : null}

              {contextSummary ? (
                <div className="alert alert-light border py-2 px-3 mt-3 mb-0 small">
                  <span className="text-muted me-1">Active context:</span>
                  <span className="fw-medium">{contextSummary}</span>
                  {orderDateFrom || orderDateTo ? (
                    <span className="text-muted ms-2">
                      · Date: {orderDateFrom || "Any"} to {orderDateTo || "Any"}
                    </span>
                  ) : null}
                </div>
              ) : null}
              </>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {isManage ? (
          <div className="col-12">
            <div className="avl-dash-wrap avl-dash">
              <div className="avl-toolbar avl-filters-merged">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                    onClick={() => setFiltersDrawerOpen((v) => !v)}
                    aria-expanded={filtersDrawerOpen}
                  >
                    <i
                      className={`fa fa-chevron-${filtersDrawerOpen ? "down" : "right"} me-1`}
                      aria-hidden
                    />
                    Filters
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={clearFilters}
                    disabled={!hasFilters && !searchText.trim()}
                  >
                    Clear all
                  </button>
                </div>

                {filtersDrawerOpen ? (
                <>
                <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-5 g-2 align-items-end w-100 mx-0">
                  <div className="col min-w-0">
                    <label className="avl-field-label">Client</label>
                    <Select
                      instanceId={`avl-filter-client-${selectSuffix}`}
                      inputId={`avl-filter-client-input-${selectSuffix}`}
                      styles={FILTER_SELECT_STYLES}
                      menuPortalTarget={
                        typeof document !== "undefined" ? document.body : null
                      }
                      menuPosition="fixed"
                      isClearable
                      isSearchable
                      placeholder="Search or select…"
                      noOptionsMessage={() => "No matches"}
                      options={clientFilterOptions}
                      value={clientSelectValue}
                      onChange={(opt) => {
                        setCtxClientId(opt?.value ?? "");
                        setCtxProjectId("");
                        setCtxBusinessOrderId("");
                        setBoOptions([]);
                      }}
                    />
                  </div>
                  <div className="col min-w-0">
                    <label className="avl-field-label">Project</label>
                    <Select
                      instanceId={`avl-filter-project-${selectSuffix}`}
                      inputId={`avl-filter-project-input-${selectSuffix}`}
                      styles={FILTER_SELECT_STYLES}
                      menuPortalTarget={
                        typeof document !== "undefined" ? document.body : null
                      }
                      menuPosition="fixed"
                      isClearable
                      isSearchable
                      isDisabled={!ctxClientId}
                      placeholder={
                        !ctxClientId
                          ? "Select client first…"
                          : "Search or select…"
                      }
                      noOptionsMessage={() => "No matches"}
                      options={projectFilterOptions}
                      value={projectSelectValue}
                      onChange={(opt) => {
                        const v = opt?.value ?? "";
                        setCtxProjectId(v);
                        setCtxBusinessOrderId("");
                        if (!v) setBoOptions([]);
                      }}
                    />
                  </div>
                  <div className="col min-w-0">
                    <label className="avl-field-label">SO (Sales order)</label>
                    <Select
                      instanceId={`avl-filter-bo-${selectSuffix}`}
                      inputId={`avl-filter-bo-input-${selectSuffix}`}
                      styles={FILTER_SELECT_STYLES}
                      menuPortalTarget={
                        typeof document !== "undefined" ? document.body : null
                      }
                      menuPosition="fixed"
                      isClearable
                      isSearchable
                      isLoading={boLoading}
                      isDisabled={!ctxProjectId || boLoading}
                      placeholder={
                        boLoading
                          ? "Loading…"
                          : !ctxProjectId
                            ? "Select project first…"
                            : "Search or select…"
                      }
                      noOptionsMessage={() => "No matches"}
                      options={boFilterOptions}
                      value={boSelectValue}
                      onChange={(opt) => setCtxBusinessOrderId(opt?.value ?? "")}
                    />
                  </div>
                  <div className="col min-w-0">
                    <label className="avl-field-label">Vendor (optional)</label>
                    <Select
                      instanceId={`avl-filter-vendor-${selectSuffix}`}
                      inputId={`avl-filter-vendor-input-${selectSuffix}`}
                      styles={FILTER_SELECT_STYLES}
                      menuPortalTarget={
                        typeof document !== "undefined" ? document.body : null
                      }
                      menuPosition="fixed"
                      isClearable
                      isSearchable
                      placeholder="All vendors…"
                      noOptionsMessage={() => "No matches"}
                      options={vendorFilterOptions}
                      value={vendorSelectValue}
                      onChange={(opt) => setCtxVendorId(opt?.value ?? "")}
                    />
                  </div>
                  <div className="col min-w-0">
                    <label className="avl-field-label">Start date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm w-100"
                      style={{ fontSize: "0.8rem", minHeight: 32 }}
                      value={orderDateFrom}
                      onChange={(e) => setOrderDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="col min-w-0">
                    <label className="avl-field-label">End date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm w-100"
                      style={{ fontSize: "0.8rem", minHeight: 32 }}
                      value={orderDateTo}
                      onChange={(e) => setOrderDateTo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="avl-filters-merged__divider">
                  <div className="avl-toolbar__row w-100">
                    <div style={{ minWidth: 150 }}>
                      <label
                        className="avl-field-label"
                        htmlFor={`avl-dash-status-${selectSuffix}`}
                      >
                        Status
                      </label>
                      <select
                        id={`avl-dash-status-${selectSuffix}`}
                        className="form-select form-select-sm"
                        value={dashStatusFilter}
                        onChange={(e) => setDashStatusFilter(e.target.value)}
                      >
                        <option value="all">All</option>
                        <option value="pending_hod">Pending HOD review</option>
                        <option value="pending_finance">Pending finance approval</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected / rework</option>
                      </select>
                    </div>
                    <div style={{ minWidth: 140 }}>
                      <label
                        className="avl-field-label"
                        htmlFor={`avl-dash-aging-${selectSuffix}`}
                      >
                        Aging
                      </label>
                      <select
                        id={`avl-dash-aging-${selectSuffix}`}
                        className="form-select form-select-sm"
                        value={dashAgingFilter}
                        onChange={(e) => setDashAgingFilter(e.target.value)}
                      >
                        <option value="all">All</option>
                        <option value="lt1">Under 1 day</option>
                        <option value="d1_3">1–3 days</option>
                        <option value="gt3">Over 3 days</option>
                      </select>
                    </div>
                    <div className="avl-toolbar__search">
                      <label
                        className="avl-field-label"
                        htmlFor={`avl-dash-so-search-${selectSuffix}`}
                      >
                        SO number
                      </label>
                      <div className="avl-search-wrap">
                        <i className="fa fa-search" aria-hidden />
                        <input
                          id={`avl-dash-so-search-${selectSuffix}`}
                          type="search"
                          className="form-control form-control-sm"
                          placeholder="Search SO, vendor, project…"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                    <div className="avl-view-toggle ms-auto align-self-end pb-1">
                      <button
                        type="button"
                        className={dashViewMode === "list" ? "active" : ""}
                        onClick={() => setDashViewMode("list")}
                      >
                        List view
                      </button>
                      <button
                        type="button"
                        className={dashViewMode === "queue" ? "active" : ""}
                        onClick={() => setDashViewMode("queue")}
                      >
                        Queue view
                      </button>
                    </div>
                  </div>
                </div>

                {boError ? (
                  <div className="text-warning small mt-2 mb-0" style={{ fontSize: 11 }}>
                    {boError}
                  </div>
                ) : null}
                {selectedBoIsAfterFourWeeks ? (
                  <div className="text-warning small mt-2 mb-0" style={{ fontSize: 11 }}>
                    This SO is after 4 weeks from Order Date. It will be sent for Admin/Superadmin approval.
                  </div>
                ) : null}

                {contextSummary ? (
                  <div className="alert alert-light border py-2 px-3 mt-3 mb-0 small">
                    <span className="text-muted me-1">Active context:</span>
                    <span className="fw-medium">{contextSummary}</span>
                    {orderDateFrom || orderDateTo ? (
                      <span className="text-muted ms-2">
                        · Date: {orderDateFrom || "Any"} to {orderDateTo || "Any"}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                </>
                ) : null}
              </div>

              <div className="avl-table-panel">
                {loading ? (
                  <div className="text-center py-5">
                    <div
                      className="spinner-border spinner-border-sm text-primary"
                      role="status"
                    />
                  </div>
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table align-middle">
                        <thead>
                          <tr>
                            <th>SO</th>
                            <th>Client</th>
                            <th>Project</th>
                            <th>Vendors</th>
                            <th>Total (vendor)</th>
                            <th>Total (client)</th>
                            <th>Total amount</th>
                            <th>Profit amount</th>
                            <th>Profit %</th>
                            <th>Client Paid</th>
                            <th>Order date</th>
                            <th>HOD / Finance</th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!loading && displayRows.length === 0 ? (
                            <tr>
                              <td
                                colSpan={manageDashTableColCount}
                                className="text-center text-muted py-4 small"
                              >
                                {emptyTableMessage}
                              </td>
                            </tr>
                          ) : dashViewMode === "list" ? (
                            pagedSoGroups.flatMap(({ key, rows: groupRows }) => {
                              const first = groupRows[0];
                              const expanded = Boolean(expandedSoKeys[key]);
                              const agencyTotal = sumCostsValue(
                                groupRows.map((r) => r.costToAgency),
                              );
                              const clientTotal = sumCostsValue(
                                groupRows.map((r) => r.costToClient),
                              );
                              const { pend, ok, rej } = countLineStatus(groupRows);
                              const vendorSummary = groupRows
                                .map((r) => nameOf(r.vendorId, "vendorName"))
                                .filter(Boolean)
                                .join(", ");
                              const paidCount = groupRows.filter(
                                (r) => r?.clientPaidValue === "paid",
                              ).length;
                              const profit = calculateProfitMetrics(agencyTotal, clientTotal);
                              const out = [
                                <tr
                                  key={`h-${key}`}
                                  className="avl-so-header"
                                  onClick={() => toggleSoExpanded(key)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      toggleSoExpanded(key);
                                    }
                                  }}
                                  tabIndex={0}
                                  role="button"
                                >
                                  <td>
                                    <i
                                      className={`fa fa-chevron-${expanded ? "down" : "right"}`}
                                      aria-hidden
                                      style={{ width: 14, display: "inline-block" }}
                                    />
                                    <strong className="ms-1">
                                      {boLabelDisplay(first.businessOrderId)}
                                    </strong>
                                  </td>
                                  <td>{nameOf(first.clientId, "clientName")}</td>
                                  <td>{nameOf(first.projectId, "projectName")}</td>
                                  <td>
                                    <span className="badge bg-secondary me-1">
                                      {groupRows.length}
                                    </span>
                                    <span
                                      className="text-truncate d-inline-block align-middle"
                                      style={{ maxWidth: 220 }}
                                      title={vendorSummary}
                                    >
                                      {vendorSummary || "—"}
                                    </span>
                                  </td>
                                  <td className="small">{formatNumberDisplay(agencyTotal)}</td>
                                  <td className="small">{formatNumberDisplay(clientTotal)}</td>
                                  <td className="small">
                                    {formatNumberDisplay(agencyTotal + clientTotal)}
                                  </td>
                                  <td className="small">{formatNumberDisplay(profit.amount)}</td>
                                  <td className="small">
                                    {Number.isFinite(profit.percent)
                                      ? `${formatNumberDisplay(profit.percent)}%`
                                      : "—"}
                                  </td>
                                  <td className="small text-center">
                                    {paidCount === groupRows.length ? (
                                      <span className="badge bg-success">Paid</span>
                                    ) : paidCount === 0 ? (
                                      <span className="badge bg-secondary">Unpaid</span>
                                    ) : (
                                      <span className="badge bg-warning text-dark">
                                        Mixed
                                      </span>
                                    )}
                                  </td>
                                  <td className="small">{getSoOrderDate(first) || "—"}</td>
                                  <td className="small">
                                    <span className="text-muted">
                                      {pend} Pending | {ok} Approved{rej ? ` | ${rej} Rejected` : ""}
                                    </span>
                                  </td>
                                  <td className="text-end text-nowrap">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary py-0 px-2 me-1"
                                      style={{ fontSize: 11 }}
                                      title="View"
                                      aria-label="View"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        goManageBulk(groupRows, { viewOnly: true });
                                      }}
                                    >
                                      <i className="fa fa-eye" aria-hidden />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary py-0 px-2"
                                      style={{ fontSize: 11 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        goManageBulk(groupRows, { viewOnly: false });
                                      }}
                                    >
                                      Edit
                                    </button>
                                  </td>
                                </tr>,
                              ];
                              if (expanded) {
                                for (const rec of groupRows) {
                                  out.push(
                                    renderManageAssignmentRow(rec, groupRows, first),
                                  );
                                }
                              }
                              return out;
                            })
                          ) : (
                            pagedQueueRows.map((rec) =>
                              renderManageAssignmentRow(rec, [rec], rec),
                            )
                          )}
                        </tbody>
                        {overallFilteredTotals && !loading && displayRows.length > 0 ? (
                          <tfoot>
                            <tr className="avl-totals-footer-row">
                              <td colSpan={4} className="text-end">
                                <span className="avl-totals-footer-label">All vendors total</span>
                              </td>
                              <td>{overallFilteredTotals.vendorCost}</td>
                              <td>{overallFilteredTotals.clientCost}</td>
                              <td>{overallFilteredTotals.totalAmount}</td>
                              <td>{overallFilteredTotals.profitAmount}</td>
                              <td colSpan={5} />
                            </tr>
                          </tfoot>
                        ) : null}
                      </table>
                    </div>
                    {dashPaginationUnits > 0 ? (
                      <div className="avl-pagination-bar">
                        <div className="d-flex flex-wrap align-items-center gap-3">
                          <span>
                            Showing {dashRangeFrom} to {dashRangeTo} of{" "}
                            {dashPaginationUnits}
                            {dashViewMode === "list" ? " orders" : " entries"}
                          </span>
                          <div className="d-flex align-items-center gap-2">
                            <label
                              className="small text-muted mb-0"
                              htmlFor={`avl-per-page-${selectSuffix}`}
                            >
                              Per page
                            </label>
                            <select
                              id={`avl-per-page-${selectSuffix}`}
                              className="form-select form-select-sm"
                              style={{ width: "4.75rem" }}
                              value={dashPerPage}
                              onChange={(e) =>
                                setDashPerPage(Number(e.target.value))
                              }
                            >
                              {[5, 10, 25, 50].map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <nav aria-label="Assignments pagination">
                          <ul className="avl-pagination">
                            <li
                              className={`page-item ${!dashCanPrev ? "disabled" : ""}`}
                            >
                              {!dashCanPrev ? (
                                <span className="page-link">Previous</span>
                              ) : (
                                <button
                                  type="button"
                                  className="page-link"
                                  onClick={goDashPrevPage}
                                >
                                  Previous
                                </button>
                              )}
                            </li>
                            {dashPaginationItems.map((item, idx) =>
                              item === "ellipsis" ? (
                                <li
                                  key={`dash-ellipsis-${idx}`}
                                  className="page-item disabled"
                                >
                                  <span className="page-link">…</span>
                                </li>
                              ) : (
                                <li
                                  key={item}
                                  className={`page-item ${item === dashPage ? "active" : ""}`}
                                >
                                  <button
                                    type="button"
                                    className="page-link"
                                    onClick={() => setDashPage(item)}
                                  >
                                    {item}
                                  </button>
                                </li>
                              ),
                            )}
                            <li
                              className={`page-item ${!dashCanNext ? "disabled" : ""}`}
                            >
                              {!dashCanNext ? (
                                <span className="page-link">Next</span>
                              ) : (
                                <button
                                  type="button"
                                  className="page-link"
                                  onClick={goDashNextPage}
                                >
                                  Next
                                </button>
                              )}
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
        ) : (
          <div className="col-12">
            <div className="card border shadow-sm">
              <div className="card-header py-2 px-3">
                <h6 className="mb-0 fw-semibold">Vendor assignments</h6>
                {contextComplete ? (
                  <div className="small text-muted mt-1">{cardSubBlurb}</div>
                ) : null}
              </div>
              <div className="card-body p-0">
                {loading ? (
                  <div className="text-center py-4">
                    <div
                      className="spinner-border spinner-border-sm text-primary"
                      role="status"
                    />
                  </div>
                ) : (
                  <div className="table-responsive avl-table-panel">
                    <table className="table table-sm table-hover mb-0 align-middle">
                      <thead className="table-light">
                        <tr className="small text-muted">
                          <th className="py-1">SO</th>
                          <th className="py-1">Client</th>
                          <th className="py-1">Project</th>
                          <th className="py-1">Vendors</th>
                          {isHod ? <th className="py-1">HOD review</th> : null}
                          {isFinance || isHod ? (
                            <th className="py-1">Finance review</th>
                          ) : null}
                          <th className="py-1">Client Paid</th>
                          {isAdminApproval ? <th className="py-1">Admin approval</th> : null}
                          <th className="py-1">Total (vendor)</th>
                          <th className="py-1">Total (client)</th>
                          <th className="py-1">Total amount</th>
                          <th className="py-1">Profit amount</th>
                          <th className="py-1">Profit %</th>
                          <th className="py-1">Order date</th>
                          <th className="text-end py-1">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="small">
                        {!loading && groupedDisplayRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={isHod ? 16 : isFinance ? 16 : isAdminApproval ? 16 : 15}
                              className="text-center text-muted py-3"
                              style={{ fontSize: 12 }}
                            >
                              {emptyTableMessage}
                            </td>
                          </tr>
                        ) : (
                          groupedDisplayRows.map(({ key, rows: groupRows }) => {
                            const first = groupRows[0];
                            const vendorSummary = groupRows
                              .map((r) => nameOf(r.vendorId, "vendorName"))
                              .join(", ");
                            const agencyTotal = sumCostsValue(
                              groupRows.map((r) => r.costToAgency),
                            );
                            const clientTotal = sumCostsValue(
                              groupRows.map((r) => r.costToClient),
                            );
                            const profit = calculateProfitMetrics(
                              agencyTotal,
                              clientTotal,
                            );
                            return (
                              <tr key={key}>
                                <td className="py-1 align-middle fw-medium">
                                  {boLabelDisplay(first.businessOrderId)}
                                </td>
                                <td className="py-1 align-middle">
                                  {nameOf(first.clientId, "clientName")}
                                </td>
                                <td className="py-1 align-middle">
                                  {nameOf(first.projectId, "projectName")}
                                </td>
                                <td className="py-1 align-middle">
                                  <span className="badge bg-secondary me-1">
                                    {groupRows.length}
                                  </span>
                                  <span
                                    className="text-truncate d-inline-block align-middle"
                                    style={{ maxWidth: 220 }}
                                    title={vendorSummary}
                                  >
                                    {vendorSummary}
                                  </span>
                                </td>
                                {isHod ? (
                                  <td className="py-1 align-middle text-center">
                                    {hodReviewListStatusBadge(first)}
                                  </td>
                                ) : null}
                                {isFinance || isHod ? (
                                  <td className="py-1 align-middle text-center">
                                    {financeReviewListStatusBadge(first)}
                                  </td>
                                ) : null}
                                <td className="py-1 align-middle text-center">
                                  {clientPaidBadge(first)}
                                </td>
                                {isAdminApproval ? (
                                  <td className="py-1 align-middle text-center">
                                    {first?.adminApprovalStatus === "pending" ? (
                                      <span className="badge bg-warning text-dark">Pending</span>
                                    ) : first?.adminApprovalStatus === "approved" ? (
                                      <span className="badge bg-success">Approved</span>
                                    ) : first?.adminApprovalStatus === "rejected" ? (
                                      <span className="badge bg-danger">Rejected</span>
                                    ) : (
                                      <span className="text-muted">—</span>
                                    )}
                                  </td>
                                ) : null}
                                <td className="py-1 align-middle small">
                                  {formatNumberDisplay(agencyTotal)}
                                </td>
                                <td className="py-1 align-middle small">
                                  {formatNumberDisplay(clientTotal)}
                                </td>
                                <td className="py-1 align-middle small">
                                  {formatNumberDisplay(agencyTotal + clientTotal)}
                                </td>
                                <td className="py-1 align-middle small">
                                  {formatNumberDisplay(profit.amount)}
                                </td>
                                <td className="py-1 align-middle small">
                                  {Number.isFinite(profit.percent)
                                    ? `${formatNumberDisplay(profit.percent)}%`
                                    : "—"}
                                </td>
                                <td className="py-1 align-middle">
                                  {getSoOrderDate(first) || "—"}
                                </td>
                                <td className="text-end text-nowrap py-1 align-middle">
                                  <div className="d-inline-flex flex-wrap align-items-center justify-content-end gap-1">
                                    <button
                                      type="button"
                                      className="btn btn-outline-primary btn-sm py-0 px-2"
                                      style={{ fontSize: 11 }}
                                      onClick={() => {
                                        const targetPath = isHod
                                          ? "/assign-vendor-hod-bulk-edit"
                                          : isFinance
                                            ? "/assign-vendor-finance-bulk-edit"
                                            : "/assign-vendor-bulk-edit";
                                        navigate(targetPath, {
                                          state: {
                                            rows: groupRows,
                                            businessOrderId: normalizeId(
                                              groupRows[0]?.businessOrderId,
                                            ),
                                            listVariant,
                                          },
                                        });
                                      }}
                                    >
                                      {mainActionLabel}
                                    </button>
                                    {isAdminApproval ? (
                                      <>
                                        <button
                                          type="button"
                                          className="btn btn-success btn-sm py-0 px-2"
                                          style={{ fontSize: 11 }}
                                          onClick={() => handleAdminApprovalAction(first, "approved")}
                                        >
                                          Approve
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-danger btn-sm py-0 px-2"
                                          style={{ fontSize: 11 }}
                                          onClick={() => handleAdminApprovalAction(first, "rejected")}
                                        >
                                          Reject
                                        </button>
                                      </>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Fragment>
  );
};

export default AssignVendorList;
