import React, { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import { ALLOCATION_STATUSES } from "./mockData";
import { validateAllocation } from "../../../services/assignmentApi";

/* ── Helpers ──────────────────────────────────────────────── */
const normalizeId = (val) =>
  val && typeof val === "object" ? val._id : val;

const getClientId = (project) => normalizeId(project.clientId);

const toOrdinal = (dateStr) => {
  if (!dateStr) return "";
  const d   = new Date(dateStr + "T00:00:00");
  const day = d.getDate();
  const sfx =
    ["th", "st", "nd", "rd"][
      day % 100 > 10 && day % 100 < 14 ? 0 : Math.min(day % 10, 4)
    ] || "th";
  return `${day}${sfx} ${d.toLocaleDateString("en-GB", {
    month: "long",
    year:  "numeric",
  })}`;
};

/* ── Empty slot factory ───────────────────────────────────── */
const emptySlot = () => ({
  key:       Date.now() + Math.random(),
  startDate: "",
  endDate:   "",
  notes:     "",
  status:    "AVAILABLE",
  error:     "",
});

const emptyForm = (preProjectId = "") => ({
  clientId:        "",
  projectId:       preProjectId,
  departmentId:    "",
  employeeId:      "",
  taskDescription: "",
});

/* ── Conflict-check statuses ──────────────────────────────── */
const STATUSES_REQUIRING_VALIDATION = ["BOOKED", "ON_LEAVE"];

const AssignmentModal = ({
  show,
  onHide,
  editingAssignment,
  clients,
  projects,
  departments,
  employees,
  onSubmit,
  selectedProjectId = "",
}) => {
  const [form,       setForm]       = useState(emptyForm(selectedProjectId));
  const [slots,      setSlots]      = useState([emptySlot()]);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);

  /* ── Seed form when modal opens ───────────────────────── */
  useEffect(() => {
    if (!show) return;
    if (editingAssignment) {
      setForm({
        clientId:        normalizeId(editingAssignment.clientId),
        projectId:       normalizeId(editingAssignment.projectId),
        departmentId:    normalizeId(editingAssignment.departmentId),
        employeeId:      normalizeId(editingAssignment.employeeId),
        taskDescription: editingAssignment.taskDescription,
      });
      setSlots(
        (editingAssignment.allocations || []).map((al) => ({
          key:       al._id || al.id || Date.now() + Math.random(),
          startDate: al.startDate,
          endDate:   al.endDate,
          notes:     al.notes || "",
          status:    al.status || "AVAILABLE",
          error:     "",
        }))
      );
    } else {
      setForm(emptyForm(selectedProjectId));
      setSlots([emptySlot()]);
    }
    setFormErrors({});
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Filtered dropdowns ───────────────────────────────── */
  const filteredProjects = form.clientId
    ? projects.filter((p) => getClientId(p) === form.clientId)
    : projects;

  const filteredEmployees = form.departmentId
    ? employees.filter((e) => normalizeId(e.departmentId) === form.departmentId)
    : employees;

  /* ── Form field handlers ──────────────────────────────── */
  const handleFormChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "clientId")     next.projectId  = "";
      if (field === "departmentId") next.employeeId = "";
      return next;
    });
    setFormErrors((prev) => ({ ...prev, [field]: "" }));
  };

  /* ── Slot handlers ────────────────────────────────────── */
  const updateSlot = (key, field, value) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.key === key ? { ...s, [field]: value, error: "" } : s
      )
    );
  };

  const addSlot    = () => setSlots((prev) => [...prev, emptySlot()]);
  const removeSlot = (key) => {
    if (slots.length === 1) return;
    setSlots((prev) => prev.filter((s) => s.key !== key));
  };

  /* ── Async validation ─────────────────────────────────── */
  const runValidation = async () => {
    /* 1 — Required field checks */
    const errors = {};
    if (!form.clientId)              errors.clientId        = "Please select a client.";
    if (!form.projectId)             errors.projectId       = "Please select a project.";
    if (!form.departmentId)          errors.departmentId    = "Please select a department.";
    if (!form.employeeId)            errors.employeeId      = "Please select a resource.";
    if (!form.taskDescription.trim()) errors.taskDescription = "Task description is required.";

    /* 2 — Per-slot date + status validation + API conflict check */
    let hasSlotError = false;

    const updatedSlots = await Promise.all(
      slots.map(async (slot) => {
        /* Basic date checks */
        if (!slot.startDate) {
          hasSlotError = true;
          return { ...slot, error: "Start date is required." };
        }
        if (!slot.endDate) {
          hasSlotError = true;
          return { ...slot, error: "End date is required." };
        }
        if (slot.endDate < slot.startDate) {
          hasSlotError = true;
          return { ...slot, error: "End date must be on or after start date." };
        }
        if (!slot.status) {
          hasSlotError = true;
          return { ...slot, error: "Status is required." };
        }

        /* API conflict check for BOOKED and ON_LEAVE */
        if (
          form.employeeId &&
          STATUSES_REQUIRING_VALIDATION.includes(slot.status)
        ) {
          try {
            const result = await validateAllocation({
              employeeId:          form.employeeId,
              startDate:           slot.startDate,
              endDate:             slot.endDate,
              status:              slot.status,
              excludeAssignmentId: editingAssignment?._id ?? null,
            });
            if (result.conflict) {
              hasSlotError = true;
              return {
                ...slot,
                error:
                  result.message ||
                  "Resource already booked for this date. Choose another date or resource.",
              };
            }
          } catch {
            /* Network error on validate — allow submission to proceed */
          }
        }

        return { ...slot, error: "" };
      })
    );

    setSlots(updatedSlots);
    setFormErrors(errors);
    return Object.keys(errors).length === 0 && !hasSlotError;
  };

  /* ── Submit ───────────────────────────────────────────── */
  const handleSubmit = async () => {
    setValidating(true);
    let valid = false;
    try {
      valid = await runValidation();
    } finally {
      setValidating(false);
    }
    if (!valid) return;

    setSubmitting(true);
    try {
      await onSubmit({
        clientId:        form.clientId,
        projectId:       form.projectId,
        departmentId:    form.departmentId,
        employeeId:      form.employeeId,
        taskDescription: form.taskDescription,
        allocations:     slots.map(({ startDate, endDate, notes, status }) => ({
          startDate, endDate, notes, status,
        })),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || validating;

  /* ── Render ───────────────────────────────────────────── */
  return (
    <Modal show={show} onHide={onHide} centered size="xl" backdrop="static">
      <Modal.Header closeButton className="border-bottom pb-3">
        <Modal.Title>
          <i className="fa fa-calendar me-2 text-primary" />
          {editingAssignment ? "Edit Resource Allocation" : "Add Resource"}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        {/* ── Top dropdowns ── */}
        <div className="row g-3 mb-3">
          {/* Client */}
          <div className="col-md-6">
            <label className="form-label text-muted" style={{ fontSize: 12 }}>
              Client <span className="text-danger">*</span>
            </label>
            <select
              className={`form-control ${formErrors.clientId ? "is-invalid" : ""}`}
              value={form.clientId}
              onChange={(e) => handleFormChange("clientId", e.target.value)}
            >
              <option value="">Select Client</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.clientName}
                </option>
              ))}
            </select>
            {formErrors.clientId && (
              <div className="invalid-feedback">{formErrors.clientId}</div>
            )}
          </div>

          {/* Project */}
          <div className="col-md-6">
            <label className="form-label text-muted" style={{ fontSize: 12 }}>
              Project <span className="text-danger">*</span>
            </label>
            <select
              className={`form-control ${formErrors.projectId ? "is-invalid" : ""}`}
              value={form.projectId}
              onChange={(e) => handleFormChange("projectId", e.target.value)}
            >
              <option value="">Select Project</option>
              {filteredProjects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.projectName}
                </option>
              ))}
            </select>
            {formErrors.projectId && (
              <div className="invalid-feedback">{formErrors.projectId}</div>
            )}
          </div>

          {/* Department */}
          <div className="col-md-6">
            <label className="form-label text-muted" style={{ fontSize: 12 }}>
              Department <span className="text-danger">*</span>
            </label>
            <select
              className={`form-control ${formErrors.departmentId ? "is-invalid" : ""}`}
              value={form.departmentId}
              onChange={(e) => handleFormChange("departmentId", e.target.value)}
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.departmentName}
                </option>
              ))}
            </select>
            {formErrors.departmentId && (
              <div className="invalid-feedback">{formErrors.departmentId}</div>
            )}
          </div>

          {/* Resource (Employee) */}
          <div className="col-md-6">
            <label className="form-label text-muted" style={{ fontSize: 12 }}>
              Resource <span className="text-danger">*</span>
            </label>
            <select
              className={`form-control ${formErrors.employeeId ? "is-invalid" : ""}`}
              value={form.employeeId}
              onChange={(e) => handleFormChange("employeeId", e.target.value)}
            >
              <option value="">Select Resource</option>
              {filteredEmployees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name}{e.jobTitle && e.jobTitle !== "—" ? ` — ${e.jobTitle}` : ""}
                </option>
              ))}
            </select>
            {formErrors.employeeId && (
              <div className="invalid-feedback">{formErrors.employeeId}</div>
            )}
          </div>

          {/* Task Description */}
          <div className="col-12">
            <label className="form-label text-muted" style={{ fontSize: 12 }}>
              Task Description <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${formErrors.taskDescription ? "is-invalid" : ""}`}
              placeholder="Task Description"
              value={form.taskDescription}
              onChange={(e) => handleFormChange("taskDescription", e.target.value)}
            />
            {formErrors.taskDescription && (
              <div className="invalid-feedback">{formErrors.taskDescription}</div>
            )}
          </div>
        </div>

        {/* ── Time Slots Section ── */}
        <div
          className="rounded p-3"
          style={{ border: "1px solid #e5e7eb", background: "#fafafa" }}
        >
          <p className="text-muted mb-3" style={{ fontSize: 13 }}>
            Fill in the date slots for this resource allocation. Add as many date
            ranges as needed.
          </p>

          {/* Add Date button */}
          <div
            className="d-flex align-items-center justify-content-center rounded mb-3"
            style={{
              border:     "2px dashed #6418c3",
              padding:    "10px",
              cursor:     "pointer",
              background: "#f9f5ff",
              userSelect: "none",
            }}
            onClick={addSlot}
          >
            <span className="text-primary fw-semibold">
              <i className="fa fa-plus me-1" /> Add Date
            </span>
          </div>

          {/* Slot table header */}
          <div
            className="row g-0 fw-semibold mb-2"
            style={{ fontSize: 13, color: "#6b7280" }}
          >
            <div className="col">Start Date</div>
            <div className="col">End Date</div>
            <div className="col" style={{ minWidth: 120 }}>Status <span className="text-danger">*</span></div>
            <div className="col">Notes</div>
            <div className="col-auto" style={{ width: 64 }}>Del</div>
          </div>

          {/* Slot rows */}
          {slots.map((slot) => (
            <div key={slot.key} className="mb-2">
              <div className="row g-2 align-items-center">
                {/* Start Date */}
                <div className="col">
                  <div className="input-group input-group-sm">
                    <input
                      type="date"
                      className={`form-control ${slot.error ? "is-invalid border-danger" : ""}`}
                      value={slot.startDate}
                      onChange={(e) => updateSlot(slot.key, "startDate", e.target.value)}
                    />
                    <span className="input-group-text">
                      <i className="fa fa-calendar" style={{ fontSize: 12 }} />
                    </span>
                  </div>
                  {slot.startDate && (
                    <small className="text-muted" style={{ fontSize: 11 }}>
                      {toOrdinal(slot.startDate)}
                    </small>
                  )}
                </div>

                {/* End Date */}
                <div className="col">
                  <div className="input-group input-group-sm">
                    <input
                      type="date"
                      className={`form-control ${slot.error ? "is-invalid border-danger" : ""}`}
                      value={slot.endDate}
                      min={slot.startDate || undefined}
                      onChange={(e) => updateSlot(slot.key, "endDate", e.target.value)}
                    />
                    <span className="input-group-text">
                      <i className="fa fa-calendar" style={{ fontSize: 12 }} />
                    </span>
                  </div>
                  {slot.endDate && (
                    <small className="text-muted" style={{ fontSize: 11 }}>
                      {toOrdinal(slot.endDate)}
                    </small>
                  )}
                </div>

                {/* Status */}
                <div className="col" style={{ minWidth: 120 }}>
                  <select
                    className={`form-control form-control-sm ${slot.error ? "is-invalid border-danger" : ""}`}
                    value={slot.status}
                    onChange={(e) => updateSlot(slot.key, "status", e.target.value)}
                  >
                    {ALLOCATION_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div className="col">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Notes (optional)"
                    value={slot.notes}
                    onChange={(e) => updateSlot(slot.key, "notes", e.target.value)}
                  />
                </div>

                {/* Remove */}
                <div className="col-auto" style={{ width: 64 }}>
                  <button
                    type="button"
                    className="btn btn-sm p-1"
                    style={{ color: "#ef4444" }}
                    title="Remove this slot"
                    onClick={() => removeSlot(slot.key)}
                    disabled={slots.length === 1}
                  >
                    <i className="fa fa-trash" />
                  </button>
                </div>
              </div>

              {/* Inline slot error */}
              {slot.error && (
                <div className="mt-1 px-1" style={{ fontSize: 12, color: "#ef4444" }}>
                  <i className="fa fa-exclamation-circle me-1" />
                  {slot.error}
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal.Body>

      <Modal.Footer className="border-top pt-3 justify-content-end">
        <button className="btn btn-light me-2" onClick={onHide} disabled={busy}>
          Cancel
        </button>
        <button className="btn btn-primary px-4" onClick={handleSubmit} disabled={busy}>
          {validating ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" />
              Validating…
            </>
          ) : submitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" />
              Saving…
            </>
          ) : (
            <>
              <i className="fa fa-check me-1" />
              Allocate Resource
            </>
          )}
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default AssignmentModal;