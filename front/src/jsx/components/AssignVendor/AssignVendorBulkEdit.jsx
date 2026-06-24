import React, { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import PageTitle from "../../layouts/PageTitle";
import {
  deleteAssignVendor,
  fetchAssignVendors,
  fileUrl,
  updateAssignVendor,
} from "../../../services/assignVendorApi";
import { fetchUsers } from "../../../services/userApi";

function normalizeId(v) {
  if (v == null || v === "") return "";
  if (typeof v === "object") {
    if (v._id != null) return normalizeId(v._id);
    if (v.$oid != null) return normalizeId(v.$oid);
    return "";
  }
  return String(v).trim();
}

function nameOf(ref, key) {
  if (!ref) return "—";
  if (typeof ref === "object") return ref[key] || "—";
  return "—";
}

function boLabel(ref) {
  if (!ref) return "—";
  if (typeof ref === "object") {
    const p = [ref.boNo, ref.invoiceNumber].filter(Boolean).join(" · ");
    return p || ref.originalFileName || "—";
  }
  return "—";
}

function hodUserLabel(ref) {
  if (!ref) return "—";
  if (typeof ref === "object") {
    return ref.userName || ref.email || ref.mobileNumber || "—";
  }
  return "—";
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

function formatCostDisplay(value) {
  return formatNumberDisplay(parseCostString(value));
}

const VAT_OPTIONS = ["5", "10", "15", "20", "25"];
const EMPTY_STATE_ROWS = [];

const AssignVendorBulkEdit = ({ fixedVariant = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [hodUsers, setHodUsers] = useState([]);

  const stateRows = useMemo(
    () =>
      Array.isArray(location.state?.rows) ? location.state.rows : EMPTY_STATE_ROWS,
    [location.state?.rows],
  );
  const boIdFromState = normalizeId(location.state?.businessOrderId);
  const boIdFromQuery = normalizeId(searchParams.get("boId"));
  const businessOrderId = boIdFromState || boIdFromQuery;
  const listVariant = fixedVariant || location.state?.listVariant || "manage";
  const isViewOnly = Boolean(location.state?.viewOnly) || searchParams.get("view") === "1";
  const isHodPage = listVariant === "hod";
  const isFinancePage = listVariant === "finance";
  const lockAssignmentFields = isHodPage || isFinancePage || isViewOnly;
  const backPath =
    listVariant === "hod"
      ? "/assign-vendor-hod-review"
      : listVariant === "finance"
        ? "/assign-vendor-finance-review"
        : "/assign-vendor-list";

  useEffect(() => {
    if (stateRows.length > 0) {
      setRows(
        stateRows.map((r) => ({
          _id: r._id,
          clientId: r.clientId,
          projectId: r.projectId,
          businessOrderId: r.businessOrderId,
          vendorId: r.vendorId,
          hodAssignUserId: r.hodAssignUserId || null,
          costToAgency: r.costToAgency ?? "",
          costToClient: r.costToClient ?? "",
          vatNeeded:
            typeof r.vatNeeded === "boolean"
              ? r.vatNeeded
              : VAT_OPTIONS.includes(String(r.vatPercent ?? "")),
          vatPercent: VAT_OPTIONS.includes(String(r.vatPercent ?? ""))
            ? String(r.vatPercent)
            : "",
          vatAmount: r.vatAmount ?? "",
          sow: r.sow ?? "",
          sendToHodReview:
            r.sendToHodReview === "yes"
              ? "yes"
              : r.sendToHodReview === "no"
                ? "no"
                : "",
          hodReviewStatus:
            r.hodReviewStatus === "approved" || r.hodReviewStatus === "rejected"
              ? r.hodReviewStatus
              : "",
          hodReviewReason: r.hodReviewReason ?? "",
          financeReviewStatus:
            r.financeReviewStatus === "paid" ||
            r.financeReviewStatus === "unpaid" ||
            r.financeReviewStatus === "overdue" ||
            r.financeReviewStatus === "rejected"
              ? r.financeReviewStatus
              : r.financeReviewStatus === "approved"
                ? "paid"
                : "unpaid",
          financeReviewReason: r.financeReviewReason ?? "",
          clientPaidValue:
            r.clientPaidValue === "paid" || r.clientPaidValue === "unpaid"
              ? r.clientPaidValue
              : "unpaid",
          existingInvoice: Array.isArray(r.vendorInvoiceFiles) ? r.vendorInvoiceFiles : [],
          existingReport: Array.isArray(r.vendorReportFiles) ? r.vendorReportFiles : [],
          existingPaymentSlips: Array.isArray(r.paymentSlipFiles) ? r.paymentSlipFiles : [],
          newInvoiceFiles: [],
          newReportFiles: [],
          newPaymentSlipFiles: [],
        })),
      );
      return;
    }
    if (!businessOrderId) return;
    setLoading(true);
    fetchAssignVendors({ businessOrderId })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setRows(
          list.map((r) => ({
            _id: r._id,
            clientId: r.clientId,
            projectId: r.projectId,
            businessOrderId: r.businessOrderId,
            vendorId: r.vendorId,
            hodAssignUserId: r.hodAssignUserId || null,
            costToAgency: r.costToAgency ?? "",
            costToClient: r.costToClient ?? "",
            vatNeeded:
              typeof r.vatNeeded === "boolean"
                ? r.vatNeeded
                : VAT_OPTIONS.includes(String(r.vatPercent ?? "")),
            vatPercent: VAT_OPTIONS.includes(String(r.vatPercent ?? ""))
              ? String(r.vatPercent)
              : "",
            vatAmount: r.vatAmount ?? "",
            sow: r.sow ?? "",
            sendToHodReview:
              r.sendToHodReview === "yes"
                ? "yes"
                : r.sendToHodReview === "no"
                  ? "no"
                  : "",
            hodReviewStatus:
              r.hodReviewStatus === "approved" || r.hodReviewStatus === "rejected"
                ? r.hodReviewStatus
                : "",
            hodReviewReason: r.hodReviewReason ?? "",
            financeReviewStatus:
              r.financeReviewStatus === "paid" ||
              r.financeReviewStatus === "unpaid" ||
              r.financeReviewStatus === "overdue" ||
              r.financeReviewStatus === "rejected"
                ? r.financeReviewStatus
                : r.financeReviewStatus === "approved"
                  ? "paid"
                  : "unpaid",
            financeReviewReason: r.financeReviewReason ?? "",
            clientPaidValue:
              r.clientPaidValue === "paid" || r.clientPaidValue === "unpaid"
                ? r.clientPaidValue
                : "unpaid",
            existingInvoice: Array.isArray(r.vendorInvoiceFiles) ? r.vendorInvoiceFiles : [],
            existingReport: Array.isArray(r.vendorReportFiles) ? r.vendorReportFiles : [],
            existingPaymentSlips: Array.isArray(r.paymentSlipFiles) ? r.paymentSlipFiles : [],
            newInvoiceFiles: [],
            newReportFiles: [],
            newPaymentSlipFiles: [],
          })),
        );
      })
      .catch((err) => {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: err?.response?.data?.message || err.message || "Failed to load assignments.",
        });
      })
      .finally(() => setLoading(false));
  }, [businessOrderId, stateRows]);

  useEffect(() => {
    let cancelled = false;
    fetchUsers()
      .then((users) => {
        if (cancelled) return;
        const allUsers = Array.isArray(users) ? users : [];
        const hodOnly = allUsers.filter((u) => {
          const roleName = String(
            u?.roleId?.roleName || u?.role?.roleName || u?.roleName || "",
          )
            .trim()
            .toLowerCase();
          return roleName.includes("hod") || roleName.includes("head of department");
        });
        setHodUsers(hodOnly);
      })
      .catch(() => {
        if (!cancelled) setHodUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const context = useMemo(() => {
    if (!rows.length) return null;
    const first = rows[0];
    return {
      client: nameOf(first.clientId, "clientName"),
      project: nameOf(first.projectId, "projectName"),
      so: boLabel(first.businessOrderId),
    };
  }, [rows]);

  const totals = useMemo(() => {
    let agency = 0;
    let client = 0;
    let hasAgency = false;
    let hasClient = false;
    rows.forEach((r) => {
      const a = parseCostString(r.costToAgency);
      const c = parseCostString(r.costToClient);
      if (!Number.isNaN(a)) {
        agency += a;
        hasAgency = true;
      }
      if (!Number.isNaN(c)) {
        client += c;
        hasClient = true;
      }
    });
    const fmt = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return {
      agency: hasAgency ? fmt.format(agency) : "—",
      client: hasClient ? fmt.format(client) : "—",
    };
  }, [rows]);

  const updateRow = (id, key, value) => {
    setRows((prev) =>
      prev.map((r) => (String(r._id) === String(id) ? { ...r, [key]: value } : r)),
    );
  };

  const removeExistingFile = (id, key, path) => {
    setRows((prev) =>
      prev.map((r) => {
        if (String(r._id) !== String(id)) return r;
        return {
          ...r,
          [key]: (Array.isArray(r[key]) ? r[key] : []).filter((f) => f.path !== path),
        };
      }),
    );
  };

  const setNewFiles = (id, key, files) => {
    setRows((prev) =>
      prev.map((r) => (String(r._id) === String(id) ? { ...r, [key]: files } : r)),
    );
  };

  const handleDeleteVendorBlock = async (id) => {
    if (isViewOnly) return;
    const row = rows.find((r) => String(r._id) === String(id));
    if (!row) return;
    const vendorName = nameOf(row.vendorId, "vendorName");
    const result = await Swal.fire({
      title: `Delete ${vendorName}?`,
      text: "This vendor assignment row will be deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteAssignVendor(id);
      setRows((prev) => prev.filter((r) => String(r._id) !== String(id)));
      await Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.response?.data?.message || err.message || "Delete failed.",
      });
    }
  };

  const handleSave = async () => {
    if (isViewOnly) return;
    if (!rows.length) return;
    if (isHodPage) {
      const missing = rows.find((r) => !String(r.hodReviewReason || "").trim());
      if (missing) {
        Swal.fire({
          icon: "warning",
          title: "HOD review",
          text: "Reason is mandatory for all rows.",
        });
        return;
      }
    }
    if (isFinancePage) {
      const missing = rows.find((r) => !String(r.financeReviewReason || "").trim());
      if (missing) {
        Swal.fire({
          icon: "warning",
          title: "Finance review",
          text: "Description is mandatory for all rows.",
        });
        return;
      }
    }
    setSaving(true);
    try {
      await Promise.all(
        rows.map((r) =>
          updateAssignVendor(r._id, {
            clientId: normalizeId(r.clientId),
            projectId: normalizeId(r.projectId),
            businessOrderId: normalizeId(r.businessOrderId),
            vendorId: normalizeId(r.vendorId),
            hodAssignUserId: normalizeId(r.hodAssignUserId),
            costToAgency: r.costToAgency ?? "",
            costToClient: r.costToClient ?? "",
            vatNeeded: Boolean(r.vatNeeded),
            vatPercent: r.vatNeeded ? r.vatPercent ?? "" : "",
            vatAmount: r.vatNeeded ? r.vatAmount ?? "" : "",
            sow: r.sow ?? "",
            sendToHodReview: r.sendToHodReview === "yes" ? "yes" : "no",
            hodReviewStatus: r.hodReviewStatus ?? "",
            hodReviewReason: r.hodReviewReason ?? "",
            financeReviewStatus: r.financeReviewStatus ?? "",
            financeReviewReason: r.financeReviewReason ?? "",
            clientPaidValue: r.clientPaidValue ?? "unpaid",
            vendorInvoiceFiles: r.newInvoiceFiles || [],
            vendorReportFiles: r.newReportFiles || [],
            paymentSlipFiles: r.newPaymentSlipFiles || [],
            vendorInvoiceFilesRetain: (r.existingInvoice || []).map((f) => f.path),
            vendorReportFilesRetain: (r.existingReport || []).map((f) => f.path),
            paymentSlipFilesRetain: (r.existingPaymentSlips || []).map((f) => f.path),
          }),
        ),
      );
      await Swal.fire({
        icon: "success",
        title: "Saved",
        timer: 1500,
        showConfirmButton: false,
      });
      navigate(backPath);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.response?.data?.message || err.message || "Bulk update failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Fragment>
      <PageTitle
        activeMenu={
          listVariant === "hod"
            ? "HOD review"
            : listVariant === "finance"
              ? "Finance review"
              : "Assigned vendors"
        }
        motherMenu="Vendor"
        pageContent={
          listVariant === "hod"
            ? "HOD review — edit vendors"
            : listVariant === "finance"
              ? "Finance review — edit vendors"
              : "Edit assigned vendors"
        }
      />

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header py-2 px-3">
              <h6 className="mb-0 fw-semibold">Edit all vendors for selected SO</h6>
              <div className="small text-muted mt-1">
                Client / Project / SO are fixed. Update vendor blocks and save.
              </div>
            </div>
            <div className="card-body">
              {context ? (
                <div className="alert alert-light border py-2 px-3 small">
                  <strong>Client:</strong> {context.client} {" · "}
                  <strong>Project:</strong> {context.project} {" · "}
                  <strong>SO:</strong> {context.so}
                </div>
              ) : null}
              <div className="alert alert-light border py-2 px-3 small mt-2">
                <strong>Total cost to agent:</strong> {totals.agency} {" · "}
                <strong>Total cost to client:</strong> {totals.client}
              </div>

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm text-primary" role="status" />
                </div>
              ) : rows.length === 0 ? (
                <div className="text-muted small">No vendor assignments found for this SO.</div>
              ) : (
                <fieldset
                  disabled={isViewOnly || saving}
                  className="row g-3 border-0 p-0 m-0"
                >
                  {rows.map((r, idx) => (
                    <div className="col-12" key={r._id}>
                      <div className="border rounded p-3">
                        <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                          <div className="fw-semibold">
                            Vendor {idx + 1}: {nameOf(r.vendorId, "vendorName")}
                          </div>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            disabled={saving || lockAssignmentFields}
                            title="Delete this vendor block"
                            onClick={() => handleDeleteVendorBlock(r._id)}
                          >
                            <i className="fa fa-trash" />
                          </button>
                        </div>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label text-muted" style={{ fontSize: 12 }}>
                              Cost of vendor
                            </label>
                            {lockAssignmentFields ? (
                              <div className="border rounded px-3 py-2 small bg-light">
                                {formatCostDisplay(r.costToAgency)}
                              </div>
                            ) : (
                              <input
                                type="text"
                                className="form-control"
                                value={r.costToAgency}
                                disabled={saving}
                                onChange={(e) =>
                                  updateRow(r._id, "costToAgency", e.target.value)
                                }
                              />
                            )}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label text-muted" style={{ fontSize: 12 }}>
                              Cost to client
                            </label>
                            {lockAssignmentFields ? (
                              <div className="border rounded px-3 py-2 small bg-light">
                                {formatCostDisplay(r.costToClient)}
                              </div>
                            ) : (
                              <input
                                type="text"
                                className="form-control"
                                value={r.costToClient}
                                disabled={saving}
                                onChange={(e) =>
                                  updateRow(r._id, "costToClient", e.target.value)
                                }
                              />
                            )}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label text-muted" style={{ fontSize: 12 }}>
                              Profit amount
                            </label>
                            <div className="border rounded px-3 py-2 small bg-light">
                              {(() => {
                                const agency = parseCostString(r.costToAgency);
                                const client = parseCostString(r.costToClient);
                                if (!Number.isFinite(agency) || !Number.isFinite(client)) {
                                  return "—";
                                }
                                return formatNumberDisplay(client - agency);
                              })()}
                            </div>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label text-muted" style={{ fontSize: 12 }}>
                              Profit %
                            </label>
                            <div className="border rounded px-3 py-2 small bg-light">
                              {(() => {
                                const agency = parseCostString(r.costToAgency);
                                const client = parseCostString(r.costToClient);
                                if (
                                  !Number.isFinite(agency) ||
                                  !Number.isFinite(client) ||
                                  client === 0
                                ) {
                                  return "—";
                                }
                                const percent = ((client - agency) / client) * 100;
                                return `${formatNumberDisplay(percent)}%`;
                              })()}
                            </div>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label text-muted d-block" style={{ fontSize: 12 }}>
                              VAT needed
                            </label>
                            {lockAssignmentFields ? (
                              <div className="border rounded px-3 py-2 small bg-light">
                                {r.vatNeeded ? "Yes" : "No"}
                              </div>
                            ) : (
                              <div className="form-check mt-2">
                                <input
                                  id={`vat-needed-${r._id}`}
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={Boolean(r.vatNeeded)}
                                  disabled={saving}
                                  onChange={(e) => updateRow(r._id, "vatNeeded", e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor={`vat-needed-${r._id}`}>
                                  Yes, VAT is needed
                                </label>
                              </div>
                            )}
                          </div>
                          {r.vatNeeded ? (
                            <>
                              <div className="col-md-3">
                                <label className="form-label text-muted" style={{ fontSize: 12 }}>
                                  VAT %
                                </label>
                                {lockAssignmentFields ? (
                                  <div className="border rounded px-3 py-2 small bg-light">
                                    {String(r.vatPercent || "").trim()
                                      ? `${String(r.vatPercent).trim()}%`
                                      : "—"}
                                  </div>
                                ) : (
                                  <select
                                    className="form-control"
                                    value={r.vatPercent || ""}
                                    disabled={saving}
                                    onChange={(e) => updateRow(r._id, "vatPercent", e.target.value)}
                                  >
                                    <option value="">Please select</option>
                                    {VAT_OPTIONS.map((rate) => (
                                      <option key={rate} value={rate}>
                                        {rate}%
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                              <div className="col-md-3">
                                <label className="form-label text-muted" style={{ fontSize: 12 }}>
                                  VAT amount
                                </label>
                                {lockAssignmentFields ? (
                                  <div className="border rounded px-3 py-2 small bg-light">
                                    {String(r.vatAmount || "").trim() || "—"}
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={r.vatAmount || ""}
                                    disabled={saving}
                                    onChange={(e) => updateRow(r._id, "vatAmount", e.target.value)}
                                    placeholder="e.g. 2500"
                                  />
                                )}
                              </div>
                            </>
                          ) : null}
                          <div className="col-12">
                            <label className="form-label text-muted" style={{ fontSize: 12 }}>
                              SOW
                            </label>
                            {lockAssignmentFields ? (
                              <div className="border rounded px-3 py-2 small bg-light">
                                {String(r.sow || "").trim() || "—"}
                              </div>
                            ) : (
                              <textarea
                                className="form-control"
                                rows={3}
                                value={r.sow}
                                disabled={saving}
                                onChange={(e) => updateRow(r._id, "sow", e.target.value)}
                              />
                            )}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label text-muted" style={{ fontSize: 12 }}>
                              Vendor invoice files
                            </label>
                            {!lockAssignmentFields ? (
                              <input
                                type="file"
                                className="form-control"
                                multiple
                                disabled={saving}
                                onChange={(e) =>
                                  setNewFiles(
                                    r._id,
                                    "newInvoiceFiles",
                                    Array.from(e.target.files || []),
                                  )
                                }
                              />
                            ) : null}
                            {r.existingInvoice.length > 0 ? (
                              <ul className="list-unstyled small mt-2 mb-0">
                                {r.existingInvoice.map((f) => (
                                  <li
                                    key={f.path}
                                    className="d-flex align-items-center justify-content-between gap-2 mb-1"
                                  >
                                    <a href={fileUrl(f.path)} target="_blank" rel="noopener noreferrer">
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
                                      {!lockAssignmentFields ? (
                                        <button
                                          type="button"
                                          className="btn btn-link btn-sm text-danger p-0"
                                          disabled={saving}
                                          title="Delete file"
                                          aria-label="Delete file"
                                          onClick={() =>
                                            removeExistingFile(r._id, "existingInvoice", f.path)
                                          }
                                        >
                                          <i className="fa fa-trash" aria-hidden />
                                        </button>
                                      ) : null}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="small text-muted mt-2">No invoice files.</div>
                            )}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label text-muted" style={{ fontSize: 12 }}>
                              Vendor report files
                            </label>
                            {!lockAssignmentFields ? (
                              <input
                                type="file"
                                className="form-control"
                                multiple
                                disabled={saving}
                                onChange={(e) =>
                                  setNewFiles(
                                    r._id,
                                    "newReportFiles",
                                    Array.from(e.target.files || []),
                                  )
                                }
                              />
                            ) : null}
                            {r.existingReport.length > 0 ? (
                              <ul className="list-unstyled small mt-2 mb-0">
                                {r.existingReport.map((f) => (
                                  <li
                                    key={f.path}
                                    className="d-flex align-items-center justify-content-between gap-2 mb-1"
                                  >
                                    <a href={fileUrl(f.path)} target="_blank" rel="noopener noreferrer">
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
                                      {!lockAssignmentFields ? (
                                        <button
                                          type="button"
                                          className="btn btn-link btn-sm text-danger p-0"
                                          disabled={saving}
                                          title="Delete file"
                                          aria-label="Delete file"
                                          onClick={() =>
                                            removeExistingFile(r._id, "existingReport", f.path)
                                          }
                                        >
                                          <i className="fa fa-trash" aria-hidden />
                                        </button>
                                      ) : null}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="small text-muted mt-2">No report files.</div>
                            )}
                          </div>
                          <div className="col-12">
                            <div
                              className="border rounded p-3"
                              style={{ backgroundColor: "#f8f9ff", borderColor: "#d8ccff" }}
                            >
                              <h6 className="text-muted mb-2" style={{ fontSize: 13 }}>
                                HOD review
                              </h6>
                              <div className="row g-3">
                                <div className="col-md-6">
                                  <label className="form-label text-muted" style={{ fontSize: 12 }}>
                                    HOD users
                                  </label>
                                  {!lockAssignmentFields ? (
                                    <select
                                      className="form-control"
                                      value={normalizeId(r.hodAssignUserId)}
                                      disabled={saving}
                                      onChange={(e) =>
                                        updateRow(r._id, "hodAssignUserId", e.target.value)
                                      }
                                    >
                                      <option value="">Please select</option>
                                      {hodUsers.map((u) => (
                                        <option
                                          key={normalizeId(u._id)}
                                          value={normalizeId(u._id)}
                                        >
                                          {u.userName || u.email || u.mobileNumber || normalizeId(u._id)}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <div className="border rounded px-3 py-2 small bg-light">
                                      {hodUserLabel(r.hodAssignUserId)}
                                    </div>
                                  )}
                                </div>
                                <div className="col-md-6">
                                  <label className="form-label text-muted" style={{ fontSize: 12 }}>
                                    Send to HOD review
                                  </label>
                                  {!isFinancePage && !isHodPage ? (
                                    <select
                                      className="form-control"
                                      value={r.sendToHodReview}
                                      disabled={saving}
                                      onChange={(e) =>
                                        updateRow(r._id, "sendToHodReview", e.target.value)
                                      }
                                    >
                                      <option value="">Please select</option>
                                      <option value="no">No</option>
                                      <option value="yes">Yes</option>
                                    </select>
                                  ) : (
                                    <div className="border rounded px-3 py-2 small bg-light">
                                      {r.sendToHodReview === "yes"
                                        ? "Yes"
                                        : r.sendToHodReview === "no"
                                          ? "No"
                                          : "—"}
                                    </div>
                                  )}
                                </div>
                                <div className="col-md-6">
                                  <label className="form-label text-muted" style={{ fontSize: 12 }}>
                                    Review
                                  </label>
                                  {isHodPage ? (
                                    <select
                                      className="form-control"
                                      value={r.hodReviewStatus}
                                      disabled={saving}
                                      onChange={(e) =>
                                        updateRow(r._id, "hodReviewStatus", e.target.value)
                                      }
                                    >
                                      <option value="">Please select</option>
                                      <option value="approved">Approve</option>
                                      <option value="rejected">Reject</option>
                                    </select>
                                  ) : (
                                    <div className="border rounded px-3 py-2 small bg-light">
                                      {r.hodReviewStatus === "approved"
                                        ? "Approve"
                                        : r.hodReviewStatus === "rejected"
                                          ? "Reject"
                                          : "—"}
                                    </div>
                                  )}
                                </div>
                                <div className="col-12">
                                  <label className="form-label text-muted" style={{ fontSize: 12 }}>
                                    Reason
                                    {isHodPage ? <span className="text-danger ms-1">*</span> : null}
                                  </label>
                                  {isHodPage ? (
                                    <textarea
                                      className="form-control"
                                      rows={2}
                                      value={r.hodReviewReason}
                                      disabled={saving}
                                      required={isHodPage}
                                      onChange={(e) =>
                                        updateRow(r._id, "hodReviewReason", e.target.value)
                                      }
                                      placeholder="HOD reason"
                                    />
                                  ) : (
                                    <div className="border rounded px-3 py-2 small bg-light">
                                      {String(r.hodReviewReason || "").trim() || "—"}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="col-12">
                            <div
                              className="border rounded p-3"
                              style={{ backgroundColor: "#f4fbf7", borderColor: "#bfe7cf" }}
                            >
                              <h6 className="text-muted mb-2" style={{ fontSize: 13 }}>
                                Finance review
                              </h6>
                              <div className="row g-3">
                                <div className="col-md-6">
                                  <label className="form-label text-muted" style={{ fontSize: 12 }}>
                                    Finance status
                                  </label>
                                  {isFinancePage ? (
                                    <select
                                      className="form-control"
                                      value={r.financeReviewStatus}
                                      disabled={saving}
                                      onChange={(e) =>
                                        updateRow(r._id, "financeReviewStatus", e.target.value)
                                      }
                                    >
                                      <option value="unpaid">Unpaid</option>
                                      <option value="paid">Paid</option>
                                      <option value="overdue">Overdue</option>
                                      <option value="rejected">Reject</option>
                                    </select>
                                  ) : (
                                    <div className="border rounded px-3 py-2 small bg-light">
                                      {String(r.financeReviewStatus || "").trim() || "—"}
                                    </div>
                                  )}
                                </div>
                                <div className="col-md-6">
                                  <label className="form-label text-muted" style={{ fontSize: 12 }}>
                                    Client Paid
                                  </label>
                                  {isFinancePage ? (
                                    <select
                                      className="form-control"
                                      value={r.clientPaidValue || "unpaid"}
                                      disabled={saving}
                                      onChange={(e) =>
                                        updateRow(r._id, "clientPaidValue", e.target.value)
                                      }
                                    >
                                      <option value="unpaid">Unpaid</option>
                                      <option value="paid">Paid</option>
                                    </select>
                                  ) : (
                                    <div className="border rounded px-3 py-2 small bg-light">
                                      {r.clientPaidValue === "paid" ? "Paid" : "Unpaid"}
                                    </div>
                                  )}
                                </div>
                                <div className="col-md-6">
                                  <label className="form-label text-muted" style={{ fontSize: 12 }}>
                                    Finance description
                                    {isFinancePage ? <span className="text-danger ms-1">*</span> : null}
                                  </label>
                                  {isFinancePage ? (
                                    <textarea
                                      className="form-control"
                                      rows={2}
                                      value={r.financeReviewReason}
                                      disabled={saving}
                                      required={isFinancePage}
                                      onChange={(e) =>
                                        updateRow(r._id, "financeReviewReason", e.target.value)
                                      }
                                      placeholder="Add finance note for paid, unpaid, overdue, or reject"
                                    />
                                  ) : (
                                    <div className="border rounded px-3 py-2 small bg-light">
                                      {String(r.financeReviewReason || "").trim() || "—"}
                                    </div>
                                  )}
                                </div>
                                <div className="col-12">
                                  <label className="form-label text-muted" style={{ fontSize: 12 }}>
                                    <i className="fa fa-file-text me-1" aria-hidden />
                                    Upload payment slip
                                  </label>
                                  {isFinancePage ? (
                                    <input
                                      type="file"
                                      className="form-control"
                                      multiple
                                      disabled={saving}
                                      onChange={(e) =>
                                        setNewFiles(
                                          r._id,
                                          "newPaymentSlipFiles",
                                          Array.from(e.target.files || []),
                                        )
                                      }
                                    />
                                  ) : null}
                                  {r.existingPaymentSlips.length > 0 ? (
                                    <ul className="list-unstyled small mt-2 mb-0">
                                      {r.existingPaymentSlips.map((f) => (
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
                                            {isFinancePage ? (
                                              <button
                                                type="button"
                                                className="btn btn-link btn-sm text-danger p-0"
                                                disabled={saving}
                                                title="Delete file"
                                                aria-label="Delete file"
                                                onClick={() =>
                                                  removeExistingFile(
                                                    r._id,
                                                    "existingPaymentSlips",
                                                    f.path,
                                                  )
                                                }
                                              >
                                                <i className="fa fa-trash" aria-hidden />
                                              </button>
                                            ) : null}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="small text-muted mt-2">No payment slip files.</div>
                                  )}
                                  {Array.isArray(r.newPaymentSlipFiles) &&
                                  r.newPaymentSlipFiles.length > 0 ? (
                                    <ul className="list-unstyled small mt-2 mb-0">
                                      {r.newPaymentSlipFiles.map((file, idx) => (
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
                                              onClick={() => {
                                                const blobUrl = URL.createObjectURL(file);
                                                const w = window.open(
                                                  blobUrl,
                                                  "_blank",
                                                  "noopener,noreferrer",
                                                );
                                                if (w) {
                                                  setTimeout(
                                                    () => URL.revokeObjectURL(blobUrl),
                                                    120000,
                                                  );
                                                } else {
                                                  URL.revokeObjectURL(blobUrl);
                                                }
                                              }}
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
                                              disabled={!isFinancePage || saving}
                                              title="Delete file"
                                              aria-label="Delete file"
                                              onClick={() =>
                                                setNewFiles(
                                                  r._id,
                                                  "newPaymentSlipFiles",
                                                  r.newPaymentSlipFiles.filter(
                                                    (_, i) => i !== idx,
                                                  ),
                                                )
                                              }
                                            >
                                              <i className="fa fa-trash" aria-hidden />
                                            </button>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </fieldset>
              )}

              <div className="d-flex gap-2 mt-4">
                {!isViewOnly ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving || rows.length === 0}
                    onClick={handleSave}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={saving}
                  onClick={() => navigate(backPath)}
                >
                  {isViewOnly ? "Back" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default AssignVendorBulkEdit;
