import React, { Fragment, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import Select from "react-select";
import ProjectForm from "./ProjectForm";
import {
  fetchProjects,
  updateProject,
  deleteProject,
  getProjectImageSrc,
} from "../../../services/projectApi";
import { fetchClients } from "../../../services/clientApi";

const ITEMS_PER_PAGE = 10;

/* ── Helpers ────────────────────────────────────────────── */
const getClientName = (project, clients) => {
  if (project.clientId && typeof project.clientId === "object")
    return project.clientId.clientName || "—";
  if (project.clientName) return project.clientName;
  if (project.clientId && clients.length) {
    const match = clients.find((c) => c._id === project.clientId);
    return match ? match.clientName : "—";
  }
  return "—";
};

const getClientId = (project) =>
  project.clientId && typeof project.clientId === "object"
    ? project.clientId._id || ""
    : project.clientId || "";

// Store only YYYY-MM-DD for API payloads when preserving existing project dates
const toInputDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  return d.toISOString().slice(0, 10);
};

/* ── Project thumbnail / initials ───────────────────────── */
const ProjectAvatar = ({ src, name }) => {
  const imgSrc = getProjectImageSrc(src);
  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt={name}
        style={{
          width: 40,
          height: 40,
          borderRadius: "8px",
          objectFit: "cover",
          border: "2px solid #dee2e6",
        }}
      />
    );
  }
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: "8px",
        background: "linear-gradient(135deg, #6418c3 0%, #e040fb 100%)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 13,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
};

function defaultProjectDateRange() {
  const start = new Date();
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

/* ── react-select styles (compact) ─────────────────────── */
const filterSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: "36px",
    fontSize: "0.8125rem",
    borderColor: "#ced4da",
  }),
  menu: (base) => ({ ...base, zIndex: 9999, fontSize: "0.8125rem" }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#6418c3"
      : state.isFocused
      ? "rgba(100,24,195,.08)"
      : "white",
    color: state.isSelected ? "#fff" : "#212529",
  }),
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const ProjectList = () => {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsFetchError, setClientsFetchError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterClientId, setFilterClientId] = useState(null); // react-select option
  const [filterStatus, setFilterStatus] = useState(STATUS_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: "projectName",
    direction: "asc",
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  /* ── Load clients ──────────────────────────────────────── */
  const loadClients = useCallback(() => {
    setClientsLoading(true);
    setClientsFetchError(null);
    fetchClients()
      .then(setClients)
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401) { navigate("/login"); return; }
        setClientsFetchError(
          status === 403
            ? "Access denied — cannot load clients."
            : err.message || "Failed to load clients."
        );
      })
      .finally(() => setClientsLoading(false));
  }, [navigate]);

  /* ── Load projects (real API) ──────────────────────────── */
  const loadProjects = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchProjects()
      .then((data) => {
        setProjects(data);
        setCurrentPage(1);
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401) { navigate("/login"); return; }
        setError(
          status === 403
            ? "Access denied — you don't have permission to view projects."
            : err.message || "Failed to load projects."
        );
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    loadProjects();
    loadClients();
  }, [loadProjects, loadClients]);

  /* ── Sort ──────────────────────────────────────────────── */
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

  /* ── Client filter options ─────────────────────────────── */
  const clientFilterOptions = [
    { value: "", label: "All Clients" },
    ...clients.map((c) => ({ value: c._id, label: c.clientName })),
  ];

  /* ── Filter + Sort ─────────────────────────────────────── */
  const filtered = projects
    .filter((p) =>
      (p.projectName || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((p) => {
      if (!filterClientId || !filterClientId.value) return true;
      return getClientId(p) === filterClientId.value;
    })
    .filter((p) => {
      if (!filterStatus || filterStatus.value === "all") return true;
      return filterStatus.value === "completed" ? p.isCompleted : !p.isCompleted;
    })
    .sort((a, b) => {
      let aVal = (a[sortConfig.key] || "").toString().toLowerCase();
      let bVal = (b[sortConfig.key] || "").toString().toLowerCase();
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  /* ── Pagination ────────────────────────────────────────── */
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

  /* ── Edit ──────────────────────────────────────────────── */
  const openEdit = (project) => {
    setEditingProject(project);
    setShowEditModal(true);
  };
  const closeEdit = () => {
    setShowEditModal(false);
    setEditingProject(null);
  };

  const handleEditSubmit = async (values, { setSubmitting }) => {
    setEditSubmitting(true);
    try {
      const dates = defaultProjectDateRange();
      await updateProject(editingProject._id, {
        clientId: values.clientId,
        projectName: values.projectName,
        projectDescription: editingProject.projectDescription ?? "",
        projectImage: values.projectImage instanceof File ? values.projectImage : undefined,
        isCompleted: Boolean(editingProject.isCompleted),
        projectPercentageCompleted:
          Number(editingProject.projectPercentageCompleted) || 0,
        startDate: toInputDate(editingProject.startDate) || dates.startDate,
        endDate: toInputDate(editingProject.endDate) || dates.endDate,
      });

      toast.success(`"${values.projectName}" updated successfully.`, {
        position: "top-right",
        autoClose: 3000,
      });
      closeEdit();
      loadProjects();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) { navigate("/login"); return; }
      toast.error(
        status === 403
          ? "Access denied — cannot update this project."
          : err.message || "Failed to update project.",
        { position: "top-right", autoClose: 4000 }
      );
    } finally {
      setSubmitting(false);
      setEditSubmitting(false);
    }
  };

  /* ── Delete ────────────────────────────────────────────── */
  const handleDelete = (project) => {
    Swal.fire({
      title: "Delete Project?",
      html: `Are you sure you want to delete <strong>"${project.projectName}"</strong>?<br/><small class="text-muted">This action cannot be undone.</small>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6418c3",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteProject(project._id);
          toast.success(`"${project.projectName}" deleted successfully.`, {
            position: "top-right",
            autoClose: 3000,
          });
          loadProjects();
        } catch (err) {
          const status = err?.response?.status;
          if (status === 401) { navigate("/login"); return; }
          toast.error(
            status === 403
              ? "Access denied — cannot delete this project."
              : err.message || "Failed to delete project.",
            { position: "top-right", autoClose: 4000 }
          );
        }
      }
    });
  };

  /* ── Render ────────────────────────────────────────────── */
  return (
    <Fragment>
      <div className="row">
        <div className="col-xl-12">
          <div className="card">
            {/* Header */}
            <div className="card-header">
              <h4 className="card-title">Projects</h4>
              <Link to="/project-add" className="btn btn-primary btn-sm">
                <i className="fa fa-plus me-1" /> Add Project
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
                    onClick={loadProjects}
                  >
                    <i className="fa fa-refresh me-1" /> Retry
                  </button>
                </div>
              )}

              {/* Search + Filters */}
              {!loading && !error && (
                <div className="row mb-3 align-items-center g-2">
                  {/* Search */}
                  <div className="col-md-4">
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fa fa-search" />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by project name..."
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

                  {/* Filter: Client */}
                  <div className="col-md-3">
                    <Select
                      options={clientFilterOptions}
                      value={filterClientId || clientFilterOptions[0]}
                      onChange={(opt) => {
                        setFilterClientId(opt?.value ? opt : null);
                        setCurrentPage(1);
                      }}
                      styles={filterSelectStyles}
                      isLoading={clientsLoading}
                      placeholder="Filter by client"
                    />
                  </div>

                  {/* Filter: Status */}
                  <div className="col-md-2">
                    <Select
                      options={STATUS_OPTIONS}
                      value={filterStatus}
                      onChange={(opt) => {
                        setFilterStatus(opt);
                        setCurrentPage(1);
                      }}
                      styles={filterSelectStyles}
                    />
                  </div>

                  <div className="col-md-3 text-end">
                    <small className="text-muted">
                      {filtered.length === 0
                        ? "No results"
                        : `Showing ${
                            (currentPage - 1) * ITEMS_PER_PAGE + 1
                          }–${Math.min(
                            currentPage * ITEMS_PER_PAGE,
                            filtered.length
                          )} of ${filtered.length} project(s)`}
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
                  <p className="mt-2 text-muted">Loading projects...</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-striped align-middle mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: 44, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}>#</th>
                          <th style={{ width: 52, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}>Image</th>
                          <th
                            style={{ cursor: "pointer", minWidth: 160, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}
                            onClick={() => handleSort("projectName")}
                          >
                            Project Name <SortIcon field="projectName" />
                          </th>
                          <th style={{ minWidth: 130, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}>Client</th>
                          <th style={{ width: 90, textAlign: "center", whiteSpace: "nowrap", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-5">
                              <div className="d-flex flex-column align-items-center text-muted">
                                <i className="fa fa-folder-open fa-3x mb-3 opacity-50" />
                                <h5 className="mb-1">
                                  {searchQuery || filterClientId || filterStatus.value !== "all"
                                    ? "No projects match your filters"
                                    : "No projects found"}
                                </h5>
                                <p className="mb-3">
                                  {searchQuery || filterClientId || filterStatus.value !== "all"
                                    ? "Try adjusting your search or filter."
                                    : "Get started by adding your first project."}
                                </p>
                                {!searchQuery && !filterClientId && filterStatus.value === "all" && (
                                  <Link
                                    to="/project-add"
                                    className="btn btn-primary btn-sm"
                                  >
                                    <i className="fa fa-plus me-1" /> Add Project
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          paginated.map((project, idx) => (
                            <tr key={project._id}>
                              <td className="text-muted">
                                {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                              </td>
                              <td>
                                <ProjectAvatar
                                  src={project.projectImage}
                                  name={project.projectName}
                                />
                              </td>
                              <td>
                                <span className="fw-semibold">
                                  {project.projectName || "—"}
                                </span>
                              </td>
                              <td className="text-muted">
                                {getClientName(project, clients)}
                              </td>
                              <td className="text-center" style={{ whiteSpace: "nowrap" }}>
                                <button
                                  className="btn btn-primary shadow btn-xs sharp me-1"
                                  title="Edit Project"
                                  onClick={() => openEdit(project)}
                                >
                                  <i className="fas fa-pencil-alt" />
                                </button>
                                <button
                                  className="btn btn-danger shadow btn-xs sharp"
                                  title="Delete Project"
                                  onClick={() => handleDelete(project)}
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

      {/* Edit Project Modal */}
      <Modal show={showEditModal} onHide={closeEdit} centered size="xl">
        <Modal.Header closeButton className="border-bottom pb-3">
          <Modal.Title>
            <i className="fa fa-edit me-2 text-primary" />
            Edit Project{editingProject ? ` — ${editingProject.projectName}` : ""}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-4">
          {editingProject && (
            <ProjectForm
              key={editingProject._id}
              initialValues={{
                clientId: getClientId(editingProject),
                projectName: editingProject.projectName || "",
                projectImage: editingProject.projectImage || "",
              }}
              onSubmit={handleEditSubmit}
              onCancel={closeEdit}
              isEditMode={true}
              externalSubmitting={editSubmitting}
              clients={clients}
              clientsLoading={clientsLoading}
              clientsFetchError={clientsFetchError}
            />
          )}
        </Modal.Body>
      </Modal>
    </Fragment>
  );
};

export default ProjectList;