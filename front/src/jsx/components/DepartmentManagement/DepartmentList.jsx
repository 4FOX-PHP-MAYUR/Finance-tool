import React, { Fragment, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import DepartmentForm from "./DepartmentForm";
import {
  fetchDepartments,
  updateDepartment,
  deleteDepartment,
} from "../../../services/departmentApi";

const ITEMS_PER_PAGE = 10;

const DepartmentList = () => {
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: "departmentName",
    direction: "asc",
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  /* ── Load ───────────────────────────────────────────────── */
  const loadDepartments = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchDepartments()
      .then((data) => {
        setDepartments(data);
        setCurrentPage(1);
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401) { navigate("/login"); return; }
        setError(
          status === 403
            ? "Access denied — you don't have permission to view departments."
            : err.message || "Failed to load departments."
        );
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  /* ── Sort ───────────────────────────────────────────────── */
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

  /* ── Filter + Sort ──────────────────────────────────────── */
  const filtered = departments
    .filter((d) =>
      (d.departmentName || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = (a[sortConfig.key] || "").toString().toLowerCase();
      const bVal = (b[sortConfig.key] || "").toString().toLowerCase();
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  /* ── Pagination ─────────────────────────────────────────── */
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
          <button className="page-link" onClick={() => setCurrentPage(i)}>
            {i}
          </button>
        </li>
      );
    }
    return pages;
  };

  /* ── Edit ───────────────────────────────────────────────── */
  const openEdit = (dept) => {
    setEditingDept(dept);
    setShowEditModal(true);
  };

  const closeEdit = () => {
    setShowEditModal(false);
    setEditingDept(null);
  };

  const handleEditSubmit = async (values, { setSubmitting }) => {
    setEditSubmitting(true);
    try {
      await updateDepartment(editingDept._id, {
        departmentName: values.departmentName,
        departmentDescription: values.departmentDescription,
      });

      toast.success(`"${values.departmentName}" updated successfully.`, {
        position: "top-right",
        autoClose: 3000,
      });
      closeEdit();
      loadDepartments();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) { navigate("/login"); return; }
      toast.error(
        status === 403
          ? "Access denied — cannot update this department."
          : err.message || "Failed to update department.",
        { position: "top-right", autoClose: 4000 }
      );
    } finally {
      setSubmitting(false);
      setEditSubmitting(false);
    }
  };

  /* ── Delete ─────────────────────────────────────────────── */
  const handleDelete = (dept) => {
    Swal.fire({
      title: "Delete Department?",
      html: `Are you sure you want to delete <strong>"${dept.departmentName}"</strong>?<br/><small class="text-muted">This action cannot be undone.</small>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6418c3",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDepartment(dept._id);
          toast.success(`"${dept.departmentName}" deleted successfully.`, {
            position: "top-right",
            autoClose: 3000,
          });
          loadDepartments();
        } catch (err) {
          const status = err?.response?.status;
          if (status === 401) { navigate("/login"); return; }
          toast.error(
            status === 403
              ? "Access denied — cannot delete this department."
              : err.message || "Failed to delete department.",
            { position: "top-right", autoClose: 4000 }
          );
        }
      }
    });
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <Fragment>
      <div className="row">
        <div className="col-xl-12">
          <div className="card">
            {/* Card Header */}
            <div className="card-header">
              <h4 className="card-title">Departments</h4>
              <Link to="/department-add" className="btn btn-primary btn-sm">
                <i className="fa fa-plus me-1" /> Add Department
              </Link>
            </div>

            <div className="card-body">
              {/* Error */}
              {error && (
                <div className="alert alert-danger d-flex align-items-center justify-content-between">
                  <span>
                    <i className="fa fa-exclamation-circle me-2" />
                    {error}
                  </span>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={loadDepartments}
                  >
                    <i className="fa fa-refresh me-1" /> Retry
                  </button>
                </div>
              )}

              {/* Summary badge */}
              {!loading && !error && departments.length > 0 && (
                <div className="d-flex gap-3 mb-3 flex-wrap">
                  <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2">
                    <i className="fa fa-building me-1" />
                    Total Departments: {departments.length}
                  </span>
                </div>
              )}

              {/* Search */}
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
                        placeholder="Search by department name..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                      {searchQuery && (
                        <button
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
                          )} of ${filtered.length} department(s)`}
                    </small>
                  </div>
                </div>
              )}

              {/* Loader */}
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading departments...</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-striped align-middle mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: 44, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}>#</th>
                          <th
                            style={{ cursor: "pointer", minWidth: 180, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}
                            onClick={() => handleSort("departmentName")}
                          >
                            Department Name <SortIcon field="departmentName" />
                          </th>
                          <th
                            style={{ cursor: "pointer", minWidth: 260, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}
                            onClick={() => handleSort("departmentDescription")}
                          >
                            Description <SortIcon field="departmentDescription" />
                          </th>
                          <th style={{ width: 90, textAlign: "center", whiteSpace: "nowrap", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-5">
                              <div className="d-flex flex-column align-items-center text-muted">
                                <i className="fa fa-building fa-3x mb-3 opacity-50" />
                                <h5 className="mb-1">
                                  {searchQuery
                                    ? "No departments match your search"
                                    : "No departments found"}
                                </h5>
                                <p className="mb-3">
                                  {searchQuery
                                    ? `No results for "${searchQuery}"`
                                    : "Get started by adding your first department."}
                                </p>
                                {!searchQuery && (
                                  <Link
                                    to="/department-add"
                                    className="btn btn-primary btn-sm"
                                  >
                                    <i className="fa fa-plus me-1" /> Add Department
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          paginated.map((dept, idx) => (
                            <tr key={dept._id}>
                              <td className="text-muted">
                                {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                              </td>
                              <td>
                                <span className="fw-semibold">
                                  {dept.departmentName || "—"}
                                </span>
                              </td>
                              <td>
                                {dept.departmentDescription ? (
                                  <span
                                    className="text-muted"
                                    style={{
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                      maxWidth: 360,
                                    }}
                                  >
                                    {dept.departmentDescription}
                                  </span>
                                ) : (
                                  <span className="text-muted fst-italic">—</span>
                                )}
                              </td>
                              <td className="text-center" style={{ whiteSpace: "nowrap" }}>
                                <button
                                  className="btn btn-primary shadow btn-xs sharp me-1"
                                  title="Edit Department"
                                  onClick={() => openEdit(dept)}
                                >
                                  <i className="fas fa-pencil-alt" />
                                </button>
                                <button
                                  className="btn btn-danger shadow btn-xs sharp"
                                  title="Delete Department"
                                  onClick={() => handleDelete(dept)}
                                >
                                  <i className="fa fa-trash" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-end mt-3">
                      <nav>
                        <ul className="pagination pagination-sm mb-0">
                          <li
                            className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                          >
                            <button
                              className="page-link"
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            >
                              <i className="fa fa-chevron-left" />
                            </button>
                          </li>
                          {renderPages()}
                          <li
                            className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}
                          >
                            <button
                              className="page-link"
                              onClick={() =>
                                setCurrentPage((p) => Math.min(totalPages, p + 1))
                              }
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

      {/* Edit Department Modal */}
      <Modal show={showEditModal} onHide={closeEdit} centered size="lg">
        <Modal.Header closeButton className="border-bottom pb-3">
          <Modal.Title>
            <i className="fa fa-edit me-2 text-primary" />
            Edit Department
            {editingDept ? ` — ${editingDept.departmentName}` : ""}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-4">
          {editingDept && (
            <DepartmentForm
              key={editingDept._id}
              initialValues={{
                departmentName: editingDept.departmentName || "",
                departmentDescription: editingDept.departmentDescription || "",
              }}
              onSubmit={handleEditSubmit}
              onCancel={closeEdit}
              isEditMode={true}
              externalSubmitting={editSubmitting}
              existingDepartments={departments}
              editingId={editingDept._id}
            />
          )}
        </Modal.Body>
      </Modal>
    </Fragment>
  );
};

export default DepartmentList;