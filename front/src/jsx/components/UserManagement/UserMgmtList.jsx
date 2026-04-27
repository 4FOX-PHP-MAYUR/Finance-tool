import React, { Fragment, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import UserMgmtForm from "./UserMgmtForm";
import {
  getUsers,
  getDeletedUsers,
  updateUser,
  softDeleteUser,
  restoreUser,
} from "../../../services/userMgmtApi";
import { resolveUploadedAssetUrl } from "../../../config/api";
import { getRoles } from "../../../services/roleService";
import { fetchDepartments } from "../../../services/departmentApi";

const ITEMS_PER_PAGE = 10;

// ── helpers ────────────────────────────────────────────────────────────────────

// A user is considered deleted only when the flag is explicitly true OR
// deletedAt is a non-empty truthy value.  Using !! avoids false-positives
// when the API returns  deletedAt: ""  or  deletedAt: null  on active users.
const isDeleted = (u) => !!u.isDeleted || !!u.deletedAt;

const Avatar = ({ src, name }) => {
  const resolved = resolveUploadedAssetUrl(src);
  if (resolved) {
    return (
      <img
        src={resolved}
        alt={name}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
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
        width: 36,
        height: 36,
        borderRadius: "50%",
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

// Resolve user ID regardless of whether the API returns  _id  (MongoDB) or  id.
const uid = (user) => user?._id ?? user?.id ?? "";


// ── component ──────────────────────────────────────────────────────────────────

const UserMgmtList = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  const [departments, setDepartments] = useState([]);
  const [depsLoading, setDepsLoading] = useState(true);
  const [depsError,   setDepsError]   = useState(null);

  // tab: "active" | "deleted"
  const [activeTab, setActiveTab] = useState("active");

  // Search + pagination + sort
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: "userName", direction: "asc" });

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // ── data loading ─────────────────────────────────────────────────────────────

  const loadUsers = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getUsers(),
      getDeletedUsers().catch(() => []), // silently ignore if backend doesn't support ?isDeleted=true
    ])
      .then(([active, deleted]) => {
        // Merge: prefer the deleted-list entry when the same ID appears in both
        const deletedIds = new Set(deleted.map((u) => u._id ?? u.id ?? ""));
        const merged = [
          ...active.filter((u) => !deletedIds.has(u._id ?? u.id ?? "")),
          ...deleted,
        ];
        setAllUsers(merged);
        setCurrentPage(1);
      })
      .catch((err) => setError(err.message || "Failed to load users."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  useEffect(() => {
    getRoles()
      .then(setRoles)
      .catch(() => setRoles([]))
      .finally(() => setRolesLoading(false));
  }, []);

  useEffect(() => {
    fetchDepartments()
      .then((data) => setDepartments(data))
      .catch((err) => setDepsError(err.message || "Failed to load departments"))
      .finally(() => setDepsLoading(false));
  }, []);

  // ── derived lists ─────────────────────────────────────────────────────────────

  const getRoleName = (roleId) => {
    if (roleId && typeof roleId === "object") {
      return roleId.roleName ?? roleId.name ?? "—";
    }
    const role = roles.find((r) => r.id === roleId || r._id === roleId);
    return role?.name ?? role?.roleName ?? "—";
  };

  const formatCreatedAt = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const tabUsers = allUsers.filter((u) =>
    activeTab === "deleted" ? isDeleted(u) : !isDeleted(u)
  );

  const filtered = tabUsers
    .filter((u) => {
      const q = searchQuery.toLowerCase();
      return (
        (u.userName || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
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

  // ── sorting ───────────────────────────────────────────────────────────────────

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
    setCurrentPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortConfig.key !== field) return null;
    return sortConfig.direction === "asc" ? (
      <i className="fa fa-arrow-up ms-1" />
    ) : (
      <i className="fa fa-arrow-down ms-1" />
    );
  };

  // ── pagination renderer ───────────────────────────────────────────────────────

  const renderPages = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
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

  // ── edit ──────────────────────────────────────────────────────────────────────

  const openEdit = (user) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const closeEdit = () => {
    setShowEditModal(false);
    setEditingUser(null);
  };

  const handleEditSubmit = async (values, { setSubmitting }) => {
    setEditSubmitting(true);
    try {
      await updateUser(uid(editingUser), values);
      toast.success(`"${values.userName}" updated successfully.`, {
        position: "top-right",
        autoClose: 3000,
      });
      closeEdit();
      loadUsers();
    } catch (err) {
      toast.error(err.message || "Failed to update user.", {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setSubmitting(false);
      setEditSubmitting(false);
    }
  };

  // ── soft delete ───────────────────────────────────────────────────────────────

  const handleDelete = (user) => {
    Swal.fire({
      title: "Delete User?",
      html: `Are you sure you want to delete <strong>"${user.userName}"</strong>?<br/><small class="text-muted">The user will be soft-deleted and can be restored later.</small>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6418c3",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await softDeleteUser(uid(user));
          toast.success(`"${user.userName}" has been deleted.`, {
            position: "top-right",
            autoClose: 3000,
          });
          setAllUsers((prev) =>
            prev.map((u) =>
              uid(u) === uid(user)
                ? { ...u, isDeleted: true, deletedAt: new Date().toISOString() }
                : u
            )
          );
        } catch (err) {
          toast.error(err.message || "Failed to delete user.", {
            position: "top-right",
            autoClose: 4000,
          });
        }
      }
    });
  };

  // ── restore ───────────────────────────────────────────────────────────────────

  const handleRestore = (user) => {
    Swal.fire({
      title: "Restore User?",
      html: `Restore <strong>"${user.userName}"</strong> to active users?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#6418c3",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, restore",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await restoreUser(uid(user));
          toast.success(`"${user.userName}" has been restored.`, {
            position: "top-right",
            autoClose: 3000,
          });
          loadUsers();
        } catch (err) {
          toast.error(err.message || "Failed to restore user.", {
            position: "top-right",
            autoClose: 4000,
          });
        }
      }
    });
  };

  // ── counts ────────────────────────────────────────────────────────────────────

  const activeCount = allUsers.filter((u) => !isDeleted(u)).length;
  const deletedCount = allUsers.filter((u) => isDeleted(u)).length;

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <Fragment>
      <div className="row">
        <div className="col-xl-12">
          <div className="card">
            {/* Header */}
            <div className="card-header">
              <h4 className="card-title">Users</h4>
              <Link to="/mgmt-user-add" className="btn btn-primary btn-sm">
                <i className="fa fa-plus me-1" /> Add User
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
                  <button className="btn btn-sm btn-outline-danger" onClick={loadUsers}>
                    <i className="fa fa-refresh me-1" /> Retry
                  </button>
                </div>
              )}

              {/* Tabs */}
              {!loading && !error && (
                <ul className="nav nav-tabs mb-3">
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === "active" ? "active" : ""}`}
                      onClick={() => { setActiveTab("active"); setCurrentPage(1); setSearchQuery(""); }}
                    >
                      Active Users
                      <span className="badge bg-primary ms-2">{activeCount}</span>
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === "deleted" ? "active" : ""}`}
                      onClick={() => { setActiveTab("deleted"); setCurrentPage(1); setSearchQuery(""); }}
                    >
                      Deleted Users
                      {deletedCount > 0 && (
                        <span className="badge bg-danger ms-2">{deletedCount}</span>
                      )}
                    </button>
                  </li>
                </ul>
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
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
                  <div className="col-md-8 text-end">
                    <small className="text-muted">
                      {filtered.length === 0
                        ? "No results"
                        : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(
                            currentPage * ITEMS_PER_PAGE,
                            filtered.length
                          )} of ${filtered.length} user(s)`}
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
                  <p className="mt-2 text-muted">Loading users...</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-striped align-middle mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: 50, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}>#</th>
                          <th style={{ minWidth: 200, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d", cursor: "pointer" }} onClick={() => handleSort("userName")}>
                            Full Name <SortIcon field="userName" />
                          </th>
                          <th style={{ minWidth: 200, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d", cursor: "pointer" }} onClick={() => handleSort("email")}>
                            Email <SortIcon field="email" />
                          </th>
                          <th style={{ minWidth: 120, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}>Role</th>
                          <th style={{ minWidth: 100, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}>Status</th>
                          <th style={{ minWidth: 120, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}>Created Date</th>
                          <th style={{ width: 110, textAlign: "center", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d", whiteSpace: "nowrap" }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="text-center py-5"
                            >
                              <div className="d-flex flex-column align-items-center text-muted">
                                <i className="fa fa-users fa-3x mb-3 opacity-50" />
                                <h5 className="mb-1">
                                  {searchQuery
                                    ? "No users match your search"
                                    : activeTab === "deleted"
                                    ? "No deleted users"
                                    : "No users found"}
                                </h5>
                                <p className="mb-3">
                                  {searchQuery
                                    ? `No results for "${searchQuery}"`
                                    : activeTab === "deleted"
                                    ? "Deleted users will appear here."
                                    : "Get started by adding your first user."}
                                </p>
                                {!searchQuery && activeTab === "active" && (
                                  <Link to="/mgmt-user-add" className="btn btn-primary btn-sm">
                                    <i className="fa fa-plus me-1" /> Add User
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          paginated.map((user, idx) => (
                            <tr key={uid(user)}>
                              {/* # */}
                              <td className="text-muted text-center" style={{ fontSize: 13 }}>
                                {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                              </td>

                              {/* Full Name + avatar */}
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <Avatar src={user.imageUrl} name={user.userName} />
                                  <div>
                                    <div className="fw-semibold" style={{ fontSize: 14 }}>
                                      {user.userName || "—"}
                                    </div>
                                    {user.mobileNumber && (
                                      <div className="text-muted" style={{ fontSize: 11 }}>
                                        {user.mobileNumber}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Email */}
                              <td style={{ fontSize: 13 }}>{user.email || "—"}</td>

                              {/* Role */}
                              <td>
                                {rolesLoading ? (
                                  <span className="text-muted" style={{ fontSize: 12 }}>…</span>
                                ) : (
                                  <span className="badge bg-info bg-opacity-10 text-info fw-normal px-2 py-1">
                                    {getRoleName(user.roleId)}
                                  </span>
                                )}
                              </td>

                              {/* Status */}
                              <td>
                                {isDeleted(user) ? (
                                  <span className="badge bg-danger bg-opacity-10 text-danger fw-semibold px-2 py-1">
                                    <i className="fa fa-circle me-1" style={{ fontSize: 7 }} />
                                    Inactive
                                  </span>
                                ) : (
                                  <span className="badge bg-success bg-opacity-10 text-success fw-semibold px-2 py-1">
                                    <i className="fa fa-circle me-1" style={{ fontSize: 7 }} />
                                    Active
                                  </span>
                                )}
                              </td>

                              {/* Created Date */}
                              <td style={{ fontSize: 13, color: "#6c757d" }}>
                                {formatCreatedAt(user.createdAt)}
                              </td>

                              {/* Actions */}
                              <td className="text-center" style={{ whiteSpace: "nowrap" }}>
                                {activeTab === "active" ? (
                                  <>
                                    <button
                                      className="btn btn-primary shadow btn-xs sharp me-1"
                                      title="Edit User"
                                      onClick={() => openEdit(user)}
                                    >
                                      <i className="fas fa-pencil-alt" /> 
                                    </button>
                                    <button
                                      className="btn btn-primary shadow btn-xs sharp me-1"
                                      title="Delete User"
                                      onClick={() => handleDelete(user)}
                                    >
                                      <i className="fa fa-trash" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    className="btn btn-success btn-xs"
                                    title="Restore User"
                                    onClick={() => handleRestore(user)}
                                  >
                                    <i className="fa fa-undo me-1" />Restore
                                  </button>
                                )}
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
                          {renderPages()}
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

      {/* Edit User Modal */}
      <Modal show={showEditModal} onHide={closeEdit} centered size="xl">
        <Modal.Header closeButton className="border-bottom pb-3">
          <Modal.Title>
            <i className="fa fa-edit me-2 text-primary" />
            Edit User{editingUser ? ` — ${editingUser.userName}` : ""}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-4">
          {editingUser && (
            <UserMgmtForm
              key={uid(editingUser)}
              initialValues={{
                userName: editingUser.userName || "",
                email: editingUser.email || "",
                mobileNumber: editingUser.mobileNumber || "",
                dob: editingUser.dob || "",
                gender: (editingUser.gender || "").toLowerCase(),
                // roleId may come back as a populated object { _id, roleName }
                // or as a plain ID string — extract the actual ID either way.
                roleId: String(
                  typeof editingUser.roleId === "object"
                    ? (editingUser.roleId?._id ?? editingUser.roleId?.id ?? "")
                    : (editingUser.roleId ?? "")
                ) || "",
                roleName:
                  typeof editingUser.roleId === "object"
                    ? (editingUser.roleId?.roleName || editingUser.roleId?.name || "")
                    : "",
                departmentId: String(
                  typeof editingUser.departmentId === "object"
                    ? (editingUser.departmentId?._id ?? editingUser.departmentId?.id ?? "")
                    : (editingUser.departmentId ?? "")
                ) || "",
                imageUrl: editingUser.imageUrl || "",
              }}
              onSubmit={handleEditSubmit}
              onCancel={closeEdit}
              isEditMode={true}
              externalSubmitting={editSubmitting}
              departments={departments}
              depsLoading={depsLoading}
              depsError={depsError}
            />
          )}
        </Modal.Body>
      </Modal>
    </Fragment>
  );
};

export default UserMgmtList;
