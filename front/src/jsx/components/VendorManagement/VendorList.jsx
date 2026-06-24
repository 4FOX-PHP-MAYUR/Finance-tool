import React, { Fragment, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import VendorForm from "./VendorForm";
import {
  fetchVendors,
  updateVendor,
  deleteVendor,
  getVendorDocUrl,
} from "../../../services/vendorApi";

const ITEMS_PER_PAGE = 10;

const VendorList = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: "vendorName",
    direction: "asc",
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [docsVendor, setDocsVendor] = useState(null);

  const loadVendors = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchVendors()
      .then((data) => {
        setVendors(data);
        setCurrentPage(1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
    setCurrentPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortConfig.key !== field)
      return <i className="fa fa-sort ms-1 text-muted" style={{ fontSize: 11 }} />;
    return sortConfig.direction === "asc" ? (
      <i className="fa fa-sort-asc ms-1 text-primary" style={{ fontSize: 11 }} />
    ) : (
      <i className="fa fa-sort-desc ms-1 text-primary" style={{ fontSize: 11 }} />
    );
  };

  const filtered = vendors
    .filter((v) => {
      const q = searchQuery.toLowerCase();
      return (
        (v.vendorName || "").toLowerCase().includes(q) ||
        (v.vendorEmail || "").toLowerCase().includes(q) ||
        (v.vendorAddress || "").toLowerCase().includes(q) ||
        (v.regularContactName || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const aVal = (a[sortConfig.key] || "").toLowerCase();
      const bVal = (b[sortConfig.key] || "").toLowerCase();
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const renderPages = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) {
      pages.push(
        <li key={i} className={`page-item ${currentPage === i ? "active" : ""}`}>
          <button type="button" className="page-link" onClick={() => setCurrentPage(i)}>
            {i}
          </button>
        </li>
      );
    }
    return pages;
  };

  const openEdit = (v) => {
    setEditingVendor(v);
    setShowEditModal(true);
  };
  const closeEdit = () => {
    setShowEditModal(false);
    setEditingVendor(null);
  };
  const openDocs = (vendor) => setDocsVendor(vendor);
  const closeDocs = () => setDocsVendor(null);

  const handleEditSubmit = async (values, { setSubmitting }) => {
    setEditSubmitting(true);
    try {
      await updateVendor(editingVendor._id, {
        vendorName: values.vendorName,
        vendorEmail: values.vendorEmail || "",
        accountsContactName: values.accountsContactName || "",
        accountsContactEmail: values.accountsContactEmail || "",
        accountsContactPhone: values.accountsContactPhone || "",
        accountsContactAddress: values.accountsContactAddress || "",
        regularContactName: values.regularContactName || "",
        regularContactEmail: values.regularContactEmail || "",
        regularContactPhone: values.regularContactPhone || "",
        regularContactAddress: values.regularContactAddress || "",
        vendorAddress: values.vendorAddress || "",
        description: values.description || "",
        currency: values.currency || "",
        country: values.country || "",
        taxRate: values.taxRate || "",
        licenseNo: values.licenseNo || "",
        licenseExpiryDate: values.licenseExpiryDate || "",
        taxCertificate: Boolean(values.taxCertificate),
        licenseUpload: values.licenseUpload || null,
        licenseUploadRetain: Boolean(values.licenseUploadRetain),
        taxLaterCertificate: values.taxLaterCertificate || null,
        taxLaterCertificateRetain: Boolean(values.taxLaterCertificateRetain),
        companyRegistrationDocs: values.companyRegistrationDocs || [],
        companyRegistrationDocsRetain: values.companyRegistrationDocsRetain || [],
        bankDetailsDocs: values.bankDetailsDocs || [],
        bankDetailsDocsRetain: values.bankDetailsDocsRetain || [],
      });

      toast.success(`"${values.vendorName}" updated.`, {
        position: "top-right",
        autoClose: 3000,
      });
      closeEdit();
      loadVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Update failed.", {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setSubmitting(false);
      setEditSubmitting(false);
    }
  };

  const handleDelete = (v) => {
    Swal.fire({
      title: "Delete vendor?",
      html: `Delete <strong>"${v.vendorName}"</strong>?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6418c3",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteVendor(v._id);
          toast.success(`"${v.vendorName}" deleted.`, {
            position: "top-right",
            autoClose: 3000,
          });
          loadVendors();
        } catch (err) {
          toast.error(err.response?.data?.message || err.message || "Delete failed.", {
            position: "top-right",
            autoClose: 4000,
          });
        }
      }
    });
  };

  return (
    <Fragment>
      <div className="row">
        <div className="col-xl-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title">Vendors</h4>
              <Link to="/vendor-add" className="btn btn-primary btn-sm">
                <i className="fa fa-plus me-1" /> Add vendor
              </Link>
            </div>

            <div className="card-body">
              {error && (
                <div className="alert alert-danger d-flex align-items-center justify-content-between">
                  <span>
                    <i className="fa fa-exclamation-circle me-2" />
                    {error}
                  </span>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadVendors}>
                    <i className="fa fa-refresh me-1" /> Retry
                  </button>
                </div>
              )}

              {!loading && !error && (
                <div className="row mb-3 align-items-center">
                  <div className="col-md-4">
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fa fa-search" />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search vendors..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => {
                            setSearchQuery("");
                            setCurrentPage(1);
                          }}
                        >
                          <i className="fa fa-times" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="col-md-8 text-end">
                    <small className="text-muted">
                      {filtered.length === 0
                        ? "No results"
                        : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(
                            currentPage * ITEMS_PER_PAGE,
                            filtered.length
                          )} of ${filtered.length}`}
                    </small>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading vendors...</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-striped align-middle mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: 44 }}>#</th>
                          <th
                            style={{ cursor: "pointer", minWidth: 160 }}
                            onClick={() => handleSort("vendorName")}
                          >
                            Vendor <SortIcon field="vendorName" />
                          </th>
                          <th
                            style={{ cursor: "pointer", minWidth: 180 }}
                            onClick={() => handleSort("vendorEmail")}
                          >
                            Email <SortIcon field="vendorEmail" />
                          </th>
                          <th style={{ minWidth: 140 }}>Regular contact</th>
                          <th style={{ minWidth: 120 }}>Docs</th>
                          <th style={{ width: 90, textAlign: "center" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-5 text-muted">
                              {searchQuery ? `No matches for "${searchQuery}"` : "No vendors yet."}
                              {!searchQuery && (
                                <div className="mt-2">
                                  <Link to="/vendor-add" className="btn btn-primary btn-sm">
                                    Add vendor
                                  </Link>
                                </div>
                              )}
                            </td>
                          </tr>
                        ) : (
                          paginated.map((v, idx) => {
                            const docCount =
                              (v.companyRegistrationDocs || []).length +
                              (v.bankDetailsDocs || []).length;
                            return (
                              <tr key={v._id}>
                                <td className="text-muted">
                                  {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                                </td>
                                <td className="fw-semibold">{v.vendorName || "—"}</td>
                                <td className="text-muted">{v.vendorEmail || "—"}</td>
                                <td>{v.regularContactName || "—"}</td>
                                <td>
                                  {docCount === 0 ? (
                                    "—"
                                  ) : (
                                    <span className="badge bg-light text-dark border">
                                      {docCount} file{docCount !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                </td>
                                <td className="text-center" style={{ whiteSpace: "nowrap" }}>
                                  <button
                                    type="button"
                                    className="btn btn-primary shadow btn-xs sharp me-1"
                                    title="Edit"
                                    onClick={() => openEdit(v)}
                                  >
                                    <i className="fas fa-pencil-alt" />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-info shadow btn-xs sharp me-1"
                                    title="View all docs"
                                    onClick={() => {
                                      if (docCount) openDocs(v);
                                    }}
                                    style={{
                                      pointerEvents: docCount ? "auto" : "none",
                                      opacity: docCount ? 1 : 0.4,
                                    }}
                                  >
                                    <i className="fa fa-eye" />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-danger shadow btn-xs sharp"
                                    title="Delete"
                                    onClick={() => handleDelete(v)}
                                  >
                                    <i className="fa fa-trash" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="d-flex justify-content-end mt-3">
                      <nav>
                        <ul className="pagination pagination-sm mb-0">
                          <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                            <button
                              type="button"
                              className="page-link"
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            >
                              <i className="fa fa-chevron-left" />
                            </button>
                          </li>
                          {renderPages()}
                          <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                            <button
                              type="button"
                              className="page-link"
                              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            >
                              <i className="fa fa-chevron-right" />
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal show={showEditModal} onHide={closeEdit} centered size="xl">
        <Modal.Header closeButton className="border-bottom pb-3">
          <Modal.Title>
            <i className="fa fa-edit me-2 text-primary" />
            Edit vendor{editingVendor ? ` — ${editingVendor.vendorName}` : ""}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-4">
          {editingVendor && (
            <VendorForm
              key={editingVendor._id}
              initialValues={{
                vendorName: editingVendor.vendorName || "",
                vendorEmail: editingVendor.vendorEmail || "",
                accountsContactName: editingVendor.accountsContactName || "",
                accountsContactEmail: editingVendor.accountsContactEmail || "",
                accountsContactPhone: editingVendor.accountsContactPhone || "",
                accountsContactAddress: editingVendor.accountsContactAddress || "",
                regularContactName: editingVendor.regularContactName || "",
                regularContactEmail: editingVendor.regularContactEmail || "",
                regularContactPhone: editingVendor.regularContactPhone || "",
                regularContactAddress: editingVendor.regularContactAddress || "",
                vendorAddress: editingVendor.vendorAddress || "",
                description: editingVendor.description || "",
                currency: editingVendor.currency || "",
                country: editingVendor.country || "",
                taxRate: editingVendor.taxRate || "",
                licenseNo: editingVendor.licenseNo || "",
                licenseExpiryDate: editingVendor.licenseExpiryDate || "",
                taxCertificate: Boolean(editingVendor.taxCertificate),
                licenseUpload: editingVendor.licenseUpload || null,
                taxLaterCertificate: editingVendor.taxLaterCertificate || null,
                companyRegistrationDocs: editingVendor.companyRegistrationDocs || [],
                bankDetailsDocs: editingVendor.bankDetailsDocs || [],
                _id: editingVendor._id,
              }}
              onSubmit={handleEditSubmit}
              onCancel={closeEdit}
              isEditMode
              externalSubmitting={editSubmitting}
            />
          )}
        </Modal.Body>
      </Modal>

      <Modal show={!!docsVendor} onHide={closeDocs} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fa fa-folder-open me-2 text-primary" />
            Vendor documents{docsVendor?.vendorName ? ` — ${docsVendor.vendorName}` : ""}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {(docsVendor?.companyRegistrationDocs || []).length === 0 &&
          (docsVendor?.bankDetailsDocs || []).length === 0 ? (
            <p className="text-muted mb-0">No documents found.</p>
          ) : (
            <>
              {(docsVendor?.companyRegistrationDocs || []).length > 0 ? (
                <>
                  <h6 className="text-primary mb-2">
                    <i className="fa fa-file-text me-2" />
                    Company registration
                  </h6>
                  <ul className="list-group mb-3">
                    {(docsVendor?.companyRegistrationDocs || []).map((doc, idx) => (
                      <li
                        key={doc.path || `${doc.originalName || "doc"}-${idx}`}
                        className="list-group-item d-flex align-items-center justify-content-between gap-2"
                      >
                        <span className="text-truncate me-2" title={doc.originalName || doc.path}>
                          {doc.originalName || doc.path || `Document ${idx + 1}`}
                        </span>
                        <div className="d-flex align-items-center gap-1">
                          <a
                            href={getVendorDocUrl(doc.path) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary"
                            title="Preview file"
                            onClick={(e) => {
                              if (!getVendorDocUrl(doc.path)) e.preventDefault();
                            }}
                          >
                            <i className="fa fa-eye" aria-hidden />
                          </a>
                          <a
                            href={getVendorDocUrl(doc.path) || "#"}
                            download={doc.originalName || "document"}
                            className="btn btn-sm btn-outline-secondary"
                            title="Download file"
                            onClick={(e) => {
                              if (!getVendorDocUrl(doc.path)) e.preventDefault();
                            }}
                          >
                            <i className="fa fa-download" aria-hidden />
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {(docsVendor?.bankDetailsDocs || []).length > 0 ? (
                <>
                  <h6 className="text-primary mb-2">
                    <i className="fa fa-university me-2" />
                    Bank details
                  </h6>
                  <ul className="list-group">
                    {(docsVendor?.bankDetailsDocs || []).map((doc, idx) => (
                      <li
                        key={doc.path || `${doc.originalName || "bank"}-${idx}`}
                        className="list-group-item d-flex align-items-center justify-content-between gap-2"
                      >
                        <span className="text-truncate me-2" title={doc.originalName || doc.path}>
                          {doc.originalName || doc.path || `Document ${idx + 1}`}
                        </span>
                        <div className="d-flex align-items-center gap-1">
                          <a
                            href={getVendorDocUrl(doc.path) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary"
                            title="Preview file"
                            onClick={(e) => {
                              if (!getVendorDocUrl(doc.path)) e.preventDefault();
                            }}
                          >
                            <i className="fa fa-eye" aria-hidden />
                          </a>
                          <a
                            href={getVendorDocUrl(doc.path) || "#"}
                            download={doc.originalName || "document"}
                            className="btn btn-sm btn-outline-secondary"
                            title="Download file"
                            onClick={(e) => {
                              if (!getVendorDocUrl(doc.path)) e.preventDefault();
                            }}
                          >
                            <i className="fa fa-download" aria-hidden />
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          )}
        </Modal.Body>
      </Modal>
    </Fragment>
  );
};

export default VendorList;
