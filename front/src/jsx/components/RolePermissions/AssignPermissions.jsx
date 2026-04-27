import React, { Fragment, useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import {
  fetchPermissionRoles,
  fetchRolePermissions,
  saveRolePermissions,
  fetchModules,
  mergeModulesWithPermissions,
  buildDefaultGridFromModules,
  formatParentSectionLabel,
  PERMS,
} from "../../../services/permissionService";

/* ── Module icon map (slug → icon) ───────────────────────── */
const moduleIconBySlug = {
  dashboard: "fa-dashboard",
  so: "fa-file-text-o",
  users: "fa-users",
  roles: "fa-shield",
  permissions: "fa-key",
  clients: "fa-briefcase",
  vendors: "fa-truck",
  projects: "fa-folder-open",
  departments: "fa-building",
  resource_allocation: "fa-random",
};

function resolveModuleIcon(slug) {
  if (moduleIconBySlug[slug]) return moduleIconBySlug[slug];
  if (/^(vendor_|assign_|assigned_)/.test(slug)) return "fa-truck";
  if (slug.startsWith("users_")) return "fa-users";
  if (slug.startsWith("roles_")) return "fa-shield";
  if (slug.startsWith("permissions_")) return "fa-key";
  if (slug.startsWith("clients_")) return "fa-briefcase";
  if (slug.startsWith("projects_")) return "fa-folder-open";
  return "fa-puzzle-piece";
}

/* ── Permission label / colour ───────────────────────────── */
const permMeta = {
  view:   { label: "View",   color: "primary", icon: "fa-eye" },
  add:    { label: "Add",    color: "info",    icon: "fa-plus" },
  update: { label: "Update", color: "warning", icon: "fa-pencil" },
  delete: { label: "Delete", color: "danger",  icon: "fa-trash" },
};

const AssignPermissions = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedRoleId = searchParams.get("roleId") || "";

  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(preselectedRoleId);
  const [grid, setGrid] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [gridLoading, setGridLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [, setTouched] = useState(false);
  const [roleError, setRoleError] = useState("");

  /* ── Load roles + module master list ──────────────────── */
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchPermissionRoles(), fetchModules()])
      .then(([r, m]) => {
        if (cancelled) return;
        setRoles(r);
        setModules(m);
        setGrid(buildDefaultGridFromModules(m));
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load roles or modules.");
      })
      .finally(() => {
        if (!cancelled) setRolesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Load permissions when role changes ───────────────── */
  const loadPermissions = useCallback(
    (roleId) => {
      if (!modules.length) return;
      if (!roleId) {
        setGrid(buildDefaultGridFromModules(modules));
        return;
      }
      setGridLoading(true);
      fetchRolePermissions(roleId)
        .then((doc) => {
          setGrid(
            mergeModulesWithPermissions(modules, doc.permissions || [])
          );
          setTouched(false);
        })
        .catch((err) => {
          toast.error(err.message || "Failed to load permissions.");
        })
        .finally(() => setGridLoading(false));
    },
    [modules]
  );

  useEffect(() => {
    if (!modules.length) return;
    if (preselectedRoleId) loadPermissions(preselectedRoleId);
  }, [preselectedRoleId, loadPermissions, modules.length]);

  const handleRoleChange = (e) => {
    const id = e.target.value;
    setSelectedRoleId(id);
    setRoleError("");
    loadPermissions(id);
  };

  /* ── Individual checkbox toggle ───────────────────────── */
  const toggleCell = (rowIdx, perm) => {
    setTouched(true);
    setGrid((prev) =>
      prev.map((row, i) => {
        if (i !== rowIdx) return row;
        const next = { ...row, [perm]: !row[perm] };
        if (perm === "view" && !next.view) {
          next.add = false;
          next.update = false;
          next.delete = false;
        }
        if (
          (perm === "add" || perm === "update" || perm === "delete") &&
          next[perm]
        ) {
          next.view = true;
        }
        return next;
      })
    );
  };

  /* ── Select All per row ───────────────────────────────── */
  const toggleRow = (rowIdx) => {
    setTouched(true);
    setGrid((prev) =>
      prev.map((row, i) => {
        if (i !== rowIdx) return row;
        const allChecked = PERMS.every((p) => row[p]);
        if (allChecked) {
          return {
            ...row,
            view: false,
            add: false,
            update: false,
            delete: false,
          };
        }
        return { ...row, view: true, add: true, update: true, delete: true };
      })
    );
  };

  /* ── Select All per column ────────────────────────────── */
  const toggleColumn = (perm) => {
    setTouched(true);
    setGrid((prev) => {
      const allChecked = prev.every((row) => row[perm]);
      return prev.map((row) => {
        const next = { ...row, [perm]: !allChecked };
        // view → uncheck cascades down
        if (perm === "view" && !next.view) {
          next.update = false;
          next.delete = false;
        }
        // update/delete → auto enable view
        if ((perm === "update" || perm === "delete") && next[perm]) {
          next.view = true;
        }
        return next;
      });
    });
  };

  /* ── Select All everything ────────────────────────────── */
  const toggleAll = () => {
    setTouched(true);
    const allChecked = grid.every((row) => PERMS.every((p) => row[p]));
    setGrid((prev) =>
      prev.map((row) => ({
        ...row,
        view: !allChecked,
        add: !allChecked,
        update: !allChecked,
        delete: !allChecked,
      }))
    );
  };

  /* ── Reset form ───────────────────────────────────────── */
  const handleReset = () => {
    Swal.fire({
      title: "Reset Permissions?",
      text: "All checkboxes will be cleared.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#6418c3",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, reset",
    }).then((result) => {
      if (result.isConfirmed) {
        setGrid(buildDefaultGridFromModules(modules));
        setTouched(false);
      }
    });
  };

  /* ── Submit ───────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedRoleId) {
      setRoleError("Please select a role before saving.");
      return;
    }

    const anyChecked = grid.some((row) => PERMS.some((p) => row[p]));
    if (!anyChecked) {
      toast.warn("Please select at least one permission before saving.", {
        position: "top-right",
        autoClose: 3500,
      });
      return;
    }

    setSaving(true);
    try {
      await saveRolePermissions(selectedRoleId, grid);
      const role = roles.find((r) => String(r._id) === String(selectedRoleId));
      toast.success(
        `Permissions for "${role?.roleName || "role"}" saved successfully.`,
        { position: "top-right", autoClose: 3000 }
      );
      setTouched(false);
    } catch (err) {
      toast.error(err.message || "Failed to save permissions.", {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  /* ── Derived helpers ──────────────────────────────────── */
  const isRowAllChecked = (row) => PERMS.every((p) => row[p]);
  const isRowPartialChecked = (row) =>
    PERMS.some((p) => row[p]) && !PERMS.every((p) => row[p]);
  const isColAllChecked = (perm) => grid.every((row) => row[perm]);
  const isAllChecked = () => grid.every((row) => PERMS.every((p) => row[p]));

  const selectedRole = roles.find(
    (r) => String(r._id) === String(selectedRoleId)
  );
  const totalSelected = grid.reduce(
    (acc, row) => acc + PERMS.filter((p) => row[p]).length,
    0
  );

  return (
    <Fragment>

      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-xl-12">
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">Assign Role Permissions</h4>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => navigate("/permissions-manage")}
                >
                  <i className="fa fa-list me-1" /> Manage Permissions
                </button>
              </div>

              <div className="card-body">
                {/* Role Selector */}
                <div className="row mb-4">
                  <div className="col-xl-4 col-lg-5 col-md-6">
                    <div className={`form-group mb-0 ${roleError ? "is-invalid" : ""}`}>
                      <label className="text-label fw-semibold">
                        Select Role <span className="text-danger">*</span>
                      </label>
                      <div className="input-group mt-1">
                        <span className="input-group-text">
                          <i className="fa fa-shield" />
                        </span>
                        <select
                          className="form-control"
                          value={selectedRoleId}
                          onChange={handleRoleChange}
                          disabled={rolesLoading}
                        >
                          <option value="">
                            {rolesLoading ? "Loading roles…" : "— Select a role —"}
                          </option>
                          {roles.map((r) => (
                            <option key={r._id} value={r._id}>
                              {r.roleName}
                            </option>
                          ))}
                        </select>
                      </div>
                      {roleError && (
                        <div
                          className="invalid-feedback animated fadeInUp"
                          style={{ display: "block" }}
                        >
                          {roleError}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedRole && (
                    <div className="col d-flex align-items-end gap-2 flex-wrap pb-1">
                      <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2">
                        <i className="fa fa-shield me-1" />
                        {selectedRole.roleName}
                      </span>
                      <span className="badge bg-secondary bg-opacity-10 text-secondary px-3 py-2">
                        <i className="fa fa-check-square-o me-1" />
                        {totalSelected} permission{totalSelected !== 1 ? "s" : ""} selected
                      </span>
                    </div>
                  )}
                </div>

                {/* Grid loader */}
                {gridLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading…</span>
                    </div>
                    <p className="mt-2 text-muted">Loading permissions…</p>
                  </div>
                ) : (
                  <>
                    {/* Permissions Table */}
                    <div className="table-responsive">
                      <table className="table table-bordered align-middle mb-0"
                        style={{ tableLayout: "fixed" }}>
                        <thead>
                          <tr className="table-light">
                            <th style={{ width: "24%" }}>
                              <div className="d-flex align-items-center gap-2">
                                <span>Module</span>
                              </div>
                            </th>
                            {PERMS.map((perm) => (
                              <th
                                key={perm}
                                className="text-center"
                                style={{ width: "14%" }}
                              >
                                <div className="d-flex flex-column align-items-center gap-1">
                                  <span className={`text-${permMeta[perm].color}`}>
                                    <i className={`fa ${permMeta[perm].icon} me-1`} />
                                    {permMeta[perm].label}
                                  </span>
                                  {/* Select-all column checkbox */}
                                  <div className="form-check mb-0 mt-1">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      id={`col-all-${perm}`}
                                      title={`Select all ${permMeta[perm].label}`}
                                      checked={isColAllChecked(perm)}
                                      onChange={() => toggleColumn(perm)}
                                      style={{ cursor: "pointer", width: 16, height: 16 }}
                                    />
                                    <label
                                      htmlFor={`col-all-${perm}`}
                                      className="form-check-label text-muted"
                                      style={{ fontSize: 11, cursor: "pointer" }}
                                    >
                                      All
                                    </label>
                                  </div>
                                </div>
                              </th>
                            ))}
                            {/* Select all column header */}
                            <th className="text-center" style={{ width: "16%" }}>
                              <div className="d-flex flex-column align-items-center gap-1">
                                <span className="text-muted" style={{ fontSize: 13 }}>
                                  Select All
                                </span>
                                <div className="form-check mb-0 mt-1">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="select-all-master"
                                    title="Select / deselect all permissions"
                                    checked={isAllChecked()}
                                    onChange={toggleAll}
                                    style={{ cursor: "pointer", width: 16, height: 16 }}
                                  />
                                  <label
                                    htmlFor="select-all-master"
                                    className="form-check-label text-muted"
                                    style={{ fontSize: 11, cursor: "pointer" }}
                                  >
                                    All
                                  </label>
                                </div>
                              </div>
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {(() => {
                            const rows = [];
                            let lastParent = null;
                            grid.forEach((row, rowIdx) => {
                              const pKey = row.parentModule || "";
                              if (pKey !== lastParent) {
                                lastParent = pKey;
                                rows.push(
                                  <tr key={`grp-${pKey || "root"}-${rowIdx}`} className="table-light">
                                    <td colSpan={6} className="py-2 ps-3 fw-semibold text-muted small">
                                      <i className="fa fa-folder-o me-2" aria-hidden="true" />
                                      {formatParentSectionLabel(row.parentModule)}
                                    </td>
                                  </tr>
                                );
                              }
                              const rowAll = isRowAllChecked(row);
                              const rowPartial = isRowPartialChecked(row);
                              const rowHasAny = PERMS.some((p) => row[p]);
                              const slug = row.moduleSlug || "";

                              rows.push(
                                <tr
                                  key={row.moduleId || row.module}
                                  className={rowHasAny ? "table-primary" : ""}
                                  style={{ transition: "background 0.2s" }}
                                >
                                  <td>
                                    <div className="d-flex align-items-center gap-2">
                                      <div
                                        className="d-flex align-items-center justify-content-center rounded"
                                        style={{
                                          width: 32,
                                          height: 32,
                                          background: rowHasAny
                                            ? "rgba(100,24,195,0.12)"
                                            : "#f3f4f6",
                                          flexShrink: 0,
                                        }}
                                      >
                                        <i
                                          className={`fa ${resolveModuleIcon(slug)}`}
                                          style={{
                                            color: rowHasAny ? "#6418c3" : "#9ca3af",
                                            fontSize: 14,
                                          }}
                                        />
                                      </div>
                                      <span className={`fw-semibold ${rowHasAny ? "text-primary" : ""}`}>
                                        {row.module}
                                      </span>
                                    </div>
                                  </td>
                                  {PERMS.map((perm) => {
                                    const isDisabled =
                                      (perm === "add" ||
                                        perm === "update" ||
                                        perm === "delete") &&
                                      !row.view;
                                    return (
                                      <td key={perm} className="text-center">
                                        <div className="form-check d-inline-flex align-items-center mb-0">
                                          <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id={`perm-${rowIdx}-${perm}`}
                                            checked={row[perm]}
                                            onChange={() => toggleCell(rowIdx, perm)}
                                            disabled={isDisabled}
                                            style={{
                                              cursor: isDisabled ? "not-allowed" : "pointer",
                                              width: 18,
                                              height: 18,
                                              opacity: isDisabled ? 0.4 : 1,
                                            }}
                                          />
                                        </div>
                                      </td>
                                    );
                                  })}
                                  <td className="text-center">
                                    <div className="form-check d-inline-flex align-items-center gap-1 mb-0">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id={`row-all-${rowIdx}`}
                                        checked={rowAll}
                                        ref={(el) => {
                                          if (el) el.indeterminate = rowPartial;
                                        }}
                                        onChange={() => toggleRow(rowIdx)}
                                        style={{ cursor: "pointer", width: 18, height: 18 }}
                                      />
                                      <label
                                        htmlFor={`row-all-${rowIdx}`}
                                        className="form-check-label text-muted"
                                        style={{ fontSize: 11, cursor: "pointer" }}
                                      >
                                        All
                                      </label>
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                            return rows;
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* Helper note */}
                    <p className="text-muted mt-2 mb-4" style={{ fontSize: 12 }}>
                      <i className="fa fa-info-circle me-1" />
                      Add, Update, and Delete require View. Unchecking View clears them.
                    </p>

                    {/* Action buttons */}
                    <div className="d-flex gap-2 flex-wrap">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm me-2"
                              role="status"
                              aria-hidden="true"
                            />
                            Saving…
                          </>
                        ) : (
                          <>
                            <i className="fa fa-save me-1" /> Save Permissions
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={handleReset}
                        disabled={saving}
                      >
                        <i className="fa fa-refresh me-1" /> Reset
                      </button>
                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={() => navigate("/permissions-manage")}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </Fragment>
  );
};

export default AssignPermissions;