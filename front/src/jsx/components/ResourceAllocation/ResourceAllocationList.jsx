import React, { Fragment, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import PageTitle from "../../layouts/PageTitle";
import ResourceAllocationForm from "./ResourceAllocationForm";
import {
  fetchResourceAllocations,
  updateResourceAllocation,
  deleteResourceAllocation,
} from "../../../services/resourceAllocationApi";
import { fetchProjects } from "../../../services/projectApi";
import { fetchDepartments } from "../../../services/departmentApi";

const ITEMS_PER_PAGE = 10;

const STATUS_BADGE = {
  Active:    "badge bg-success",
  Completed: "badge bg-secondary",
  "On Hold": "badge bg-warning text-dark",
};

const fmt = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const resolveId = (val) => (val && typeof val === "object" ? String(val._id) : val);

const ResourceAllocationList = () => {
  const navigate = useNavigate();

  /* ── reference data ── */
  const [projects,    setProjects]    = useState([]);
  const [departments, setDepartments] = useState([]);

  /* ── list data ── */
  const [allocations, setAllocations] = useState([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  /* ── filters ── */
  const [searchQuery,      setSearchQuery]      = useState("");
  const [filterProject,    setFilterProject]    = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterStatus,     setFilterStatus]     = useState("");
  const [currentPage,      setCurrentPage]      = useState(1);

  /* ── edit modal ── */
  const [showEditModal,  setShowEditModal]  = useState(false);
  const [editingRecord,  setEditingRecord]  = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  /* ── Load reference data once ── */
  useEffect(() => {
    Promise.all([fetchProjects(), fetchDepartments()])
      .then(([p, d]) => { setProjects(p); setDepartments(d); })
      .catch((err) => {
        if (err?.response?.status === 401) navigate("/login");
      });
  }, [navigate]);

  /* ── Load allocations ── */
  const loadAllocations = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = { page: currentPage, limit: ITEMS_PER_PAGE };
    if (filterProject)    params.projectId    = filterProject;
    if (filterDepartment) params.departmentId = filterDepartment;
    if (filterStatus)     params.status       = filterStatus;
    if (searchQuery)      params.search       = searchQuery;

    fetchResourceAllocations(params)
      .then((res) => {
        setAllocations(res.data || []);
        setTotal(res.total || 0);
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401) { navigate("/login"); return; }
        setError(
          status === 403
            ? "Access denied — you don't have permission to view allocations."
            : err.message || "Failed to load allocations."
        );
      })
      .finally(() => setLoading(false));
  }, [currentPage, filterProject, filterDepartment, filterStatus, searchQuery, navigate]);

  useEffect(() => { loadAllocations(); }, [loadAllocations]);

  /* ── Display helpers — populated objects from the backend ── */
  const resourceName = (rec) => {
    const r = rec.resourceId;
    if (!r) return "—";
    if (typeof r === "object") {
      return r.firstName && r.lastName
        ? `${r.firstName} ${r.lastName}`
        : r.userName || r.email || "—";
    }
    return r;
  };

  const projectName = (rec) => {
    const p = rec.projectId;
    if (!p) return "—";
    if (typeof p === "object") return p.projectName || "—";
    return projects.find((x) => x._id === p)?.projectName || p;
  };

  const departmentName = (rec) => {
    const d = rec.departmentId;
    if (!d) return "—";
    if (typeof d === "object") return d.departmentName || "—";
    return departments.find((x) => x._id === d)?.departmentName || d;
  };

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const renderPages = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end   = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) {
      pages.push(
        <li key={i} className={`page-item ${currentPage === i ? "active" : ""}`}>
          <button className="page-link" onClick={() => setCurrentPage(i)}>{i}</button>
        </li>
      );
    }
    return pages;
  };

  /* ── Edit ── */
  const openEdit  = (rec) => { setEditingRecord(rec); setShowEditModal(true); };
  const closeEdit = ()    => { setShowEditModal(false); setEditingRecord(null); };

  const handleEditSubmit = async (values, { setSubmitting }) => {
    setEditSubmitting(true);
    try {
      await updateResourceAllocation(editingRecord._id, {
        projectId:            values.projectId,
        departmentId:         values.departmentId,
        resourceId:           values.resourceId,
        startDate:            values.startDate,
        endDate:              values.endDate,
        allocationPercentage: Number(values.allocationPercentage),
        status:               values.status,
        description:          values.description || "",
      });
      toast.success("Allocation updated successfully.", { position: "top-right", autoClose: 3000 });
      closeEdit();
      loadAllocations();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) { navigate("/login"); return; }
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err.message ||
        "Failed to update.";
      toast.error(status === 403 ? "Access denied." : msg, { position: "top-right", autoClose: 4000 });
    } finally {
      setSubmitting(false);
      setEditSubmitting(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = (rec) => {
    Swal.fire({
      title: "Delete Allocation?",
      html:  `Are you sure you want to delete the allocation for <strong>${resourceName(rec)}</strong>?<br/><small class="text-muted">This cannot be undone.</small>`,
      icon:  "warning",
      showCancelButton:   true,
      confirmButtonColor: "#d33",
      cancelButtonColor:  "#6418c3",
      confirmButtonText:  "Yes, delete",
      cancelButtonText:   "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteResourceAllocation(rec._id);
          toast.success("Allocation deleted.", { position: "top-right", autoClose: 3000 });
          loadAllocations();
        } catch (err) {
          const status = err?.response?.status;
          if (status === 401) { navigate("/login"); return; }
          toast.error(
            status === 403 ? "Access denied." : err.message || "Failed to delete.",
            { position: "top-right", autoClose: 4000 }
          );
        }
      }
    });
  };

  /* ── Edit initial values — resolve populated objects to plain ID strings ── */
  const editInitialValues = editingRecord
    ? {
        projectId:            resolveId(editingRecord.projectId),
        departmentId:         resolveId(editingRecord.departmentId),
        resourceId:           resolveId(editingRecord.resourceId),
        startDate:            editingRecord.startDate ? new Date(editingRecord.startDate) : null,
        endDate:              editingRecord.endDate   ? new Date(editingRecord.endDate)   : null,
        allocationPercentage: editingRecord.allocationPercentage ?? "",
        status:               editingRecord.status || "Active",
        description:          editingRecord.description || "",
      }
    : {};

  /* ── Render ── */
  return (
    <Fragment>
      <PageTitle
        activeMenu="Allocation List"
        motherMenu="Resource Allocation"
        pageContent="Resource Allocation List"
      />

      <div className="row">
        <div className="col-xl-12">
          <div className="card">

            <div className="card-header">
              <h4 className="card-title">Resource Allocations</h4>
              <Link to="/resource-allocation-add" className="btn btn-primary btn-sm">
                <i className="fa fa-plus me-1" /> Add Allocation
              </Link>
            </div>

            <div className="card-body">
              {/* Error */}
              {error && (
                <div className="alert alert-danger d-flex align-items-center justify-content-between">
                  <span><i className="fa fa-exclamation-circle me-2" />{error}</span>
                  <button className="btn btn-sm btn-outline-danger" onClick={loadAllocations}>
                    <i className="fa fa-refresh me-1" /> Retry
                  </button>
                </div>
              )}

              {/* Filters */}
              {!loading && !error && (
                <div className="row mb-3 g-2 align-items-end">
                  <div className="col-md-3">
                    <div className="input-group">
                      <span className="input-group-text"><i className="fa fa-search" /></span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search resource or project…"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      />
                      {searchQuery && (
                        <button className="btn btn-outline-secondary" onClick={() => { setSearchQuery(""); setCurrentPage(1); }}>
                          <i className="fa fa-times" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <select
                      className="form-control"
                      value={filterProject}
                      onChange={(e) => { setFilterProject(e.target.value); setCurrentPage(1); }}
                    >
                      <option value="">All Projects</option>
                      {projects.map((p) => (
                        <option key={p._id} value={p._id}>{p.projectName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-2">
                    <select
                      className="form-control"
                      value={filterDepartment}
                      onChange={(e) => { setFilterDepartment(e.target.value); setCurrentPage(1); }}
                    >
                      <option value="">All Departments</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>{d.departmentName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-2">
                    <select
                      className="form-control"
                      value={filterStatus}
                      onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                    >
                      <option value="">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </div>

                  <div className="col-md-2 text-end">
                    <small className="text-muted">
                      {total === 0 ? "No results" : `${total} allocation(s)`}
                    </small>
                  </div>
                </div>
              )}

              {/* Loader */}
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status" />
                  <p className="mt-2 text-muted">Loading allocations…</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover table-bordered align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: 44 }}>#</th>
                          <th>Project</th>
                          <th>Department</th>
                          <th>Resource</th>
                          <th style={{ width: 80 }}>Alloc %</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th style={{ width: 100 }}>Status</th>
                          <th style={{ width: 90, textAlign: "center" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocations.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-center py-5">
                              <div className="d-flex flex-column align-items-center text-muted">
                                <i className="fa fa-users fa-3x mb-3 opacity-50" />
                                <h5 className="mb-1">No allocations found</h5>
                                <p className="mb-3">Get started by adding your first resource allocation.</p>
                                <Link to="/resource-allocation-add" className="btn btn-primary btn-sm">
                                  <i className="fa fa-plus me-1" /> Add Allocation
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          allocations.map((rec, idx) => (
                            <tr key={rec._id}>
                              <td className="text-muted">
                                {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                              </td>
                              <td className="fw-semibold">{projectName(rec)}</td>
                              <td>{departmentName(rec)}</td>
                              <td className="fw-semibold">{resourceName(rec)}</td>
                              <td className="text-center">
                                <span className="badge bg-info text-dark">
                                  {rec.allocationPercentage}%
                                </span>
                              </td>
                              <td>{fmt(rec.startDate)}</td>
                              <td>{fmt(rec.endDate)}</td>
                              <td>
                                <span className={STATUS_BADGE[rec.status] || "badge bg-secondary"}>
                                  {rec.status}
                                </span>
                              </td>
                              <td className="text-center" style={{ whiteSpace: "nowrap" }}>
                                <button
                                  className="btn btn-primary btn-xs me-1"
                                  title="Edit"
                                  onClick={() => openEdit(rec)}
                                >
                                  <i className="fa fa-edit" />
                                </button>
                                <button
                                  className="btn btn-danger btn-xs"
                                  title="Delete"
                                  onClick={() => handleDelete(rec)}
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

                  {totalPages > 1 && (
                    <div className="d-flex justify-content-end mt-3">
                      <nav>
                        <ul className="pagination pagination-sm mb-0">
                          <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                            <button className="page-link" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                              <i className="fa fa-chevron-left" />
                            </button>
                          </li>
                          {renderPages()}
                          <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                            <button className="page-link" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
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

      {/* ── Edit Modal ── */}
      <Modal show={showEditModal} onHide={closeEdit} centered size="xl">
        <Modal.Header closeButton className="border-bottom pb-3">
          <Modal.Title>
            <i className="fa fa-edit me-2 text-primary" />
            Edit Resource Allocation
            {editingRecord ? ` — ${resourceName(editingRecord)}` : ""}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-4">
          {editingRecord && (
            <ResourceAllocationForm
              key={editingRecord._id}
              initialValues={editInitialValues}
              onSubmit={handleEditSubmit}
              onCancel={closeEdit}
              isEditMode={true}
              externalSubmitting={editSubmitting}
              projects={projects}
              departments={departments}
            />
          )}
        </Modal.Body>
      </Modal>
    </Fragment>
  );
};

export default ResourceAllocationList;