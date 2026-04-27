import React, { Fragment, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import {
  fetchAllRolePermissions,
  resetRolePermissions,
  PERMS,
} from "../../../services/permissionService";

const permLabel = {
  view: "View",
  add: "Add",
  update: "Update",
  delete: "Delete",
};

/* ── Summarise a grid row into active-permission labels ───── */
const rowSummary = (row) =>
  PERMS.filter((p) => row[p]).map((p) => permLabel[p]);

const ManagePermissions = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAllRolePermissions()
      .then(setEntries)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Reset handler ────────────────────────────────────── */
  const handleReset = (entry) => {
    Swal.fire({
      title: `Reset "${entry.role.roleName}" Permissions?`,
      html: `All permissions for <strong>${entry.role.roleName}</strong> will be cleared.<br/><small class="text-muted">This cannot be undone.</small>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6418c3",
      confirmButtonText: "Yes, reset",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await resetRolePermissions(entry.role._id);
          toast.success(
            `Permissions for "${entry.role.roleName}" have been reset.`,
            { position: "top-right", autoClose: 3000 }
          );
          load();
        } catch (err) {
          toast.error(err.message || "Failed to reset permissions.", {
            position: "top-right",
            autoClose: 4000,
          });
        }
      }
    });
  };

  /* ── Render ───────────────────────────────────────────── */
  return (
    <Fragment>
      <div className="row">
        <div className="col-xl-12">
          <div className="card">
            {/* Header */}
            <div className="card-header">
              <h4 className="card-title">Role Permissions</h4>
              <Link
                to="/permissions-assign"
                className="btn btn-primary btn-sm"
              >
                <i className="fa fa-plus me-1" /> Assign Permissions
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
                    onClick={load}
                  >
                    <i className="fa fa-refresh me-1" /> Retry
                  </button>
                </div>
              )}

              {/* Loader */}
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading…</span>
                  </div>
                  <p className="mt-2 text-muted">Loading permissions…</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-bordered align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: 44 }}>#</th>
                        <th style={{ minWidth: 140 }}>Role</th>
                        <th>Permissions Summary</th>
                        <th style={{ width: 90, textAlign: "center", whiteSpace: "nowrap" }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry, idx) => {
                        const hasAnyPermission = entry.grid.some((row) =>
                          PERMS.some((p) => row[p])
                        );

                        return (
                          <tr key={entry.role._id}>
                            <td className="text-muted">{idx + 1}</td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="d-flex align-items-center justify-content-center rounded-circle"
                                  style={{
                                    width: 34,
                                    height: 34,
                                    background: hasAnyPermission
                                      ? "rgba(100,24,195,0.12)"
                                      : "#f3f4f6",
                                    flexShrink: 0,
                                  }}
                                >
                                  <i
                                    className="fa fa-shield"
                                    style={{
                                      color: hasAnyPermission ? "#6418c3" : "#9ca3af",
                                      fontSize: 14,
                                    }}
                                  />
                                </div>
                                <div>
                                  <span className="fw-semibold d-block">
                                    {entry.role.roleName}
                                  </span>
                                  {!hasAnyPermission && (
                                    <small className="text-muted">
                                      No permissions assigned
                                    </small>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              {!hasAnyPermission ? (
                                <span className="text-muted small">
                                  <i className="fa fa-ban me-1" />
                                  None assigned
                                </span>
                              ) : (
                                <div className="d-flex flex-column gap-2">
                                  {entry.grid
                                    .filter((row) =>
                                      PERMS.some((p) => row[p])
                                    )
                                    .map((row) => {
                                      const activePerms = rowSummary(row);
                                      return (
                                        <div
                                          key={row.module}
                                          className="d-flex flex-wrap align-items-baseline gap-2"
                                        >
                                          <span
                                            className="fw-semibold text-body"
                                            style={{
                                              minWidth: 120,
                                              fontSize: 13,
                                            }}
                                          >
                                            {row.module}
                                          </span>
                                          <span
                                            className="text-muted"
                                            style={{ fontSize: 13 }}
                                          >
                                            {activePerms.join(", ")}
                                          </span>
                                        </div>
                                      );
                                    })}
                                </div>
                              )}
                            </td>
                            <td className="text-center" style={{ whiteSpace: "nowrap" }}>
                              <button
                                className="btn btn-primary btn-xs me-1"
                                title="Edit Permissions"
                                onClick={() =>
                                  navigate(
                                    `/permissions-assign?roleId=${entry.role._id}`
                                  )
                                }
                              >
                                <i className="fa fa-edit me-1" />
                                Edit
                              </button>
                              <button
                                className="btn btn-danger btn-xs"
                                title="Reset Permissions"
                                onClick={() => handleReset(entry)}
                                disabled={!hasAnyPermission}
                              >
                                <i className="fa fa-refresh me-1" />
                                Reset
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default ManagePermissions;