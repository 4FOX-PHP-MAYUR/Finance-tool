import React, { Fragment, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import RoleForm from "./RoleForm";
import { fetchRolesList, updateRole, deleteRole } from "../../../services/roleApi";

const ITEMS_PER_PAGE = 10;
const getRoleId = (role) => String(role?._id || role?.id || "").trim();

const RoleList = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: "roleName", direction: "asc" });

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);

  const loadRoles = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchRolesList()
      .then((data) => {
        setRoles(data);
        setCurrentPage(1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // --- Sorting ---
  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
    setCurrentPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortConfig.key !== field) return <i className="fa fa-sort ms-1 text-muted" />;
    return sortConfig.direction === "asc" ? (
      <i className="fa fa-sort-asc ms-1 text-primary" />
    ) : (
      <i className="fa fa-sort-desc ms-1 text-primary" />
    );
  };

  // --- Filter + Sort ---
  const filteredRoles = roles
    .filter((r) =>
      (r.roleName || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = (a[sortConfig.key] || "").toLowerCase();
      const bVal = (b[sortConfig.key] || "").toLowerCase();
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  // --- Pagination ---
  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / ITEMS_PER_PAGE));
  const paginatedRoles = filteredRoles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // --- Edit ---
  const openEditModal = (role) => {
    setEditError(null);
    setEditingRole(role);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingRole(null);
    setEditError(null);
  };

  const handleEditSubmit = async (values, { setSubmitting }) => {
    setEditSubmitting(true);
    try {
      const roleId = getRoleId(editingRole);
      if (!roleId) {
        throw new Error("Role id missing. Please refresh and try again.");
      }
      await updateRole(roleId, {
        roleName: values.roleName,
        description: values.description,
      });
      toast.success(`Role "${values.roleName}" updated successfully.`, {
        position: "top-right",
        autoClose: 3000,
      });
      closeEditModal();
      loadRoles();
    } catch (err) {
      setEditError(err.message || "Failed to update role.");
    } finally {
      setSubmitting(false);
      setEditSubmitting(false);
    }
  };

  // --- Delete ---
  const handleDelete = (role) => {
    Swal.fire({
      title: "Delete Role?",
      html: `Are you sure you want to delete the role <strong>"${role.roleName}"</strong>?<br/><small class="text-muted">This action cannot be undone.</small>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6418c3",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const roleId = getRoleId(role);
          if (!roleId) {
            throw new Error("Role id missing. Please refresh and try again.");
          }
          await deleteRole(roleId);
          toast.success(`Role "${role.roleName}" deleted successfully.`, {
            position: "top-right",
            autoClose: 3000,
          });
          loadRoles();
        } catch (err) {
          toast.error(err.message || "Failed to delete role.", {
            position: "top-right",
            autoClose: 4000,
          });
        }
      }
    });
  };

  // --- Pagination helpers ---
  const renderPaginationItems = () => {
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

  return (
    <Fragment>
      <div className="row">
        <div className="col-xl-12">
          <div className="card">
            {/* Card Header */}
            <div className="card-header">
              <h4 className="card-title">Roles</h4>
              <Link to="/role-add" className="btn btn-primary btn-sm">
                <i className="fa fa-plus me-1" /> Add Role
              </Link>
            </div>

            <div className="card-body">
              {/* Error Alert */}
              {error && (
                <div className="alert alert-danger d-flex align-items-center justify-content-between">
                  <span>
                    <i className="fa fa-exclamation-circle me-2" />
                    Failed to load roles: {error}
                  </span>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={loadRoles}
                  >
                    <i className="fa fa-refresh me-1" /> Retry
                  </button>
                </div>
              )}

              {/* Search */}
              {!loading && !error && (
                <div className="row mb-3">
                  <div className="col-md-4">
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fa fa-search" />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by role name..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                      />
                      {searchQuery && (
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                        >
                          <i className="fa fa-times" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="col-md-8 d-flex align-items-center justify-content-end">
                    <small className="text-muted">
                      Showing {filteredRoles.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}–
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredRoles.length)} of {filteredRoles.length} role(s)
                    </small>
                  </div>
                </div>
              )}

              {/* Loading */}
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading roles...</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover table-bordered mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: 50 }}>#</th>
                          <th
                            style={{ cursor: "pointer", minWidth: 160 }}
                            onClick={() => handleSort("roleName")}
                          >
                            Role Name <SortIcon field="roleName" />
                          </th>
                          <th
                            style={{ cursor: "pointer" }}
                            onClick={() => handleSort("description")}
                          >
                            Description <SortIcon field="description" />
                          </th>
                          <th style={{ width: 90, textAlign: "center", whiteSpace: "nowrap" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRoles.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-5">
                              <div className="d-flex flex-column align-items-center text-muted">
                                <i className="fa fa-inbox fa-3x mb-3 opacity-50" />
                                <h5 className="mb-1">
                                  {searchQuery
                                    ? "No roles match your search"
                                    : "No roles found"}
                                </h5>
                                <p className="mb-3">
                                  {searchQuery
                                    ? `No results for "${searchQuery}"`
                                    : "Get started by adding your first role."}
                                </p>
                                {!searchQuery && (
                                  <Link to="/role-add" className="btn btn-primary btn-sm">
                                    <i className="fa fa-plus me-1" /> Add Role
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          paginatedRoles.map((role, index) => (
                            <tr key={getRoleId(role) || index}>
                              <td className="text-muted">
                                {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                              </td>
                              <td>
                                <span className="fw-semibold">{role.roleName || "-"}</span>
                              </td>
                              <td>
                                {role.description ? (
                                  <span className="text-truncate d-inline-block" style={{ maxWidth: 400 }}>
                                    {role.description}
                                  </span>
                                ) : (
                                  <span className="text-muted fst-italic">—</span>
                                )}
                              </td>
                              <td className="text-center" style={{ whiteSpace: "nowrap" }}>
                                <button
                                  className="btn btn-primary btn-xs me-1"
                                  title="Edit Role"
                                  onClick={() => openEditModal(role)}
                                >
                                  <i className="fa fa-edit" />
                                </button>
                                <button
                                  className="btn btn-danger btn-xs"
                                  title="Delete Role"
                                  onClick={() => handleDelete(role)}
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
                          <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                            <button
                              className="page-link"
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            >
                              <i className="fa fa-chevron-left" />
                            </button>
                          </li>
                          {renderPaginationItems()}
                          <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                            <button
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

      {/* Edit Role Modal */}
      <Modal show={showEditModal} onHide={closeEditModal} centered size="md">
        <Modal.Header closeButton className="border-bottom pb-3">
          <Modal.Title>
            <i className="fa fa-edit me-2 text-primary" />
            Edit Role
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-4">
          {editError && (
            <div className="alert alert-danger d-flex align-items-center justify-content-between py-2 mb-3">
              <span>
                <i className="fa fa-exclamation-circle me-2" />
                {editError}
              </span>
              <button
                type="button"
                className="btn-close btn-sm"
                onClick={() => setEditError(null)}
              />
            </div>
          )}
          {editingRole && (
            <RoleForm
              key={getRoleId(editingRole)}
              initialValues={{
                roleName: editingRole.roleName || "",
                description: editingRole.description || "",
              }}
              onSubmit={handleEditSubmit}
              onCancel={closeEditModal}
              isEditMode={true}
              isSubmitting={editSubmitting}
            />
          )}
        </Modal.Body>
      </Modal>
    </Fragment>
  );
};

export default RoleList;