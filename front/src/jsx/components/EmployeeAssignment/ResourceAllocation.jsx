import React, { Fragment, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import PageTitle from "../../layouts/PageTitle";
import AssignmentModal from "./AssignmentModal";
import CalendarView from "./CalendarView";
import ListView from "./ListView";
import {
  fetchAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  fetchEmployees,
} from "../../../services/assignmentApi";
import { fetchClients } from "../../../services/clientApi";
import { fetchProjects } from "../../../services/projectApi";
import { fetchDepartments } from "../../../services/departmentApi";

/* ── Date helpers ──────────────────────────────────────────── */
const getMonday = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d;
};

export const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const normalizeId = (val) =>
  val && typeof val === "object" ? val._id : val;

/* ── Component ─────────────────────────────────────────────── */
const ResourceAllocation = () => {
  const navigate = useNavigate();

  /* ── Dropdown data ──────────────────────────────────────── */
  const [clients,     setClients]     = useState([]);
  const [projects,    setProjects]    = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees,   setEmployees]   = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  /* ── Assignment data ────────────────────────────────────── */
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [assignments,       setAssignments]        = useState([]);
  const [loading,           setLoading]            = useState(false);

  /* ── UI state ───────────────────────────────────────────── */
  const [showModal,         setShowModal]         = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [resourceFilter,    setResourceFilter]    = useState("");
  const [weekStart,         setWeekStart]         = useState(() => getMonday(new Date()));

  /* ── Load reference data once ───────────────────────────── */
  useEffect(() => {
    setDataLoading(true);
    Promise.all([
      fetchClients(),
      fetchProjects(),
      fetchDepartments(),
      fetchEmployees(),
    ])
      .then(([c, p, d, e]) => {
        setClients(c);
        setProjects(p);
        setDepartments(d);
        setEmployees(e);
        // default to first project
        if (p.length > 0 && !selectedProjectId) {
          setSelectedProjectId(p[0]._id);
        }
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401) { navigate("/login"); return; }
        toast.error(
          status === 403
            ? "Access denied — cannot load reference data."
            : err.message || "Failed to load data.",
          { position: "top-right", autoClose: 4000 }
        );
      })
      .finally(() => setDataLoading(false));
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Load assignments when project changes ──────────────── */
  const loadAssignments = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const data = await fetchAssignments(selectedProjectId);
      setAssignments(data);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) { navigate("/login"); return; }
      toast.error(
        status === 403
          ? "Access denied — cannot load assignments."
          : err.message || "Failed to load assignments.",
        { position: "top-right", autoClose: 4000 }
      );
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, navigate]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  /* ── Modal helpers ──────────────────────────────────────── */
  const openNew  = () => { setEditingAssignment(null); setShowModal(true); };
  const openEdit = (assignmentId) => {
    const found = assignments.find(
      (a) => (a._id || a.id) === assignmentId
    );
    if (found) { setEditingAssignment(found); setShowModal(true); }
  };
  const closeModal = () => { setShowModal(false); setEditingAssignment(null); };

  /* ── Submit ─────────────────────────────────────────────── */
  const handleSubmit = async (formData) => {
    try {
      if (editingAssignment) {
        await updateAssignment(editingAssignment._id || editingAssignment.id, formData);
        toast.success("Assignment updated successfully.", {
          position: "top-right", autoClose: 3000,
        });
      } else {
        await createAssignment(formData);
        toast.success("Resource allocated successfully.", {
          position: "top-right", autoClose: 3000,
        });
      }
      closeModal();
      loadAssignments();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) { navigate("/login"); return; }
      toast.error(
        status === 403
          ? "Access denied — cannot save assignment."
          : err.message || "Failed to save assignment.",
        { position: "top-right", autoClose: 4000 }
      );
    }
  };

  /* ── Delete ─────────────────────────────────────────────── */
  const handleDelete = (assignmentId) => {
    const asgn    = assignments.find((a) => (a._id || a.id) === assignmentId);
    const empId   = normalizeId(asgn?.employeeId);
    const empName = employees.find((e) => e._id === empId)?.name || "this employee";

    Swal.fire({
      title: "Delete Assignment?",
      html:  `Remove all allocations for <strong>${empName}</strong> from this project?<br/><small class="text-muted">This cannot be undone.</small>`,
      icon:  "warning",
      showCancelButton:    true,
      confirmButtonColor:  "#d33",
      cancelButtonColor:   "#6418c3",
      confirmButtonText:   "Yes, delete",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteAssignment(assignmentId);
          toast.success("Assignment deleted.", {
            position: "top-right", autoClose: 2500,
          });
          loadAssignments();
        } catch (err) {
          const status = err?.response?.status;
          if (status === 401) { navigate("/login"); return; }
          toast.error(
            status === 403
              ? "Access denied — cannot delete assignment."
              : err.message || "Failed to delete.",
            { position: "top-right" }
          );
        }
      }
    });
  };

  /* ── Derived project info ───────────────────────────────── */
  const currentProject = projects.find((p) => p._id === selectedProjectId) || {};
  const currentClient  = clients.find(
    (c) => c._id === normalizeId(currentProject.clientId)
  ) || {};
  const resourceCount = assignments.length;

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <Fragment>
      <PageTitle
        activeMenu="Resource Allocation"
        motherMenu="Employee Assignment"
        pageContent="Resource Allocation"
      />

      {/* ── Project header ── */}
      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div>
              {/* Project selector */}
              <div className="d-flex align-items-center gap-2 mb-1">
                {dataLoading ? (
                  <span className="text-muted" style={{ fontSize: 16 }}>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Loading projects…
                  </span>
                ) : (
                  <select
                    className="form-control fw-bold"
                    style={{
                      maxWidth:   320,
                      fontSize:   18,
                      fontWeight: 700,
                      border:     "none",
                      padding:    "0 8px 0 0",
                      height:     "auto",
                      background: "transparent",
                    }}
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setResourceFilter("");
                    }}
                  >
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.projectName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="d-flex flex-wrap gap-3" style={{ fontSize: 13, color: "#6b7280" }}>
                <span>
                  <span className="fw-semibold text-dark">Client:</span>{" "}
                  {currentClient.clientName || "—"}
                </span>
                <span>
                  <span className="fw-semibold text-dark">Resources Allocated:</span>{" "}
                  {resourceCount} Team Member{resourceCount !== 1 ? "s" : ""}
                </span>
                <span>
                  <span className="fw-semibold text-dark">Description:</span>{" "}
                  {currentProject.projectDescription || "—"}
                </span>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-primary btn-sm"
                onClick={openNew}
                disabled={dataLoading}
              >
                <i className="fa fa-plus me-1" /> ALLOCATE RESOURCE
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted">Loading assignments…</p>
        </div>
      ) : (
        <>
          {/* ── Calendar View ── */}
          <CalendarView
            assignments={assignments}
            employees={employees}
            departments={departments}
            resourceFilter={resourceFilter}
            onResourceFilterChange={setResourceFilter}
            onEditAssignment={openEdit}
            weekStart={weekStart}
            onWeekChange={setWeekStart}
            resourceCount={resourceCount}
          />

          {/* ── List View ── */}
          <div className="card mt-4">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fa fa-list me-2 text-primary" />
                List View
              </h5>
            </div>
            <div className="card-body p-0">
              <ListView
                assignments={assignments}
                employees={employees}
                departments={departments}
                onEdit={openEdit}
                onDelete={handleDelete}
                weekStart={weekStart}
                onWeekChange={setWeekStart}
              />
            </div>
          </div>
        </>
      )}

      {/* ── Assignment Modal ── */}
      {!dataLoading && (
        <AssignmentModal
          show={showModal}
          onHide={closeModal}
          editingAssignment={editingAssignment}
          clients={clients}
          projects={projects}
          departments={departments}
          employees={employees}
          onSubmit={handleSubmit}
          selectedProjectId={selectedProjectId}
        />
      )}
    </Fragment>
  );
};

export default ResourceAllocation;