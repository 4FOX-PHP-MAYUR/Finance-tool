import React, { Fragment, useEffect, useMemo, useState } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fetchUsersByDepartment } from "../../../services/userApi";

const STATUS_OPTIONS = ["Active", "Completed", "On Hold"];

const buildSchema = () =>
  Yup.object().shape({
    projectId: Yup.string().required("Project is required"),
    departmentId: Yup.string().required("Department is required"),
    resourceId: Yup.string().required("Resource is required"),
    startDate: Yup.date().nullable().required("Start Date is required"),
    endDate: Yup.date()
      .nullable()
      .required("End Date is required")
      .min(Yup.ref("startDate"), "End Date must be on or after Start Date"),
    allocationPercentage: Yup.number()
      .typeError("Must be a number")
      .required("Allocation Percentage is required")
      .min(0, "Minimum is 0")
      .max(100, "Maximum is 100"),
    status: Yup.string()
      .oneOf(STATUS_OPTIONS, "Invalid status")
      .required("Status is required"),
    description: Yup.string().max(500, "Maximum 500 characters"),
  });

const fieldClass = (touched, error) =>
  `form-control${touched ? (error ? " is-invalid" : " is-valid") : ""}`;

const errBlock = (touched, error) =>
  touched && error ? (
    <div className="invalid-feedback animated fadeInUp" style={{ display: "block" }}>
      {error}
    </div>
  ) : null;

const ResourceAllocationForm = ({
  initialValues,
  onSubmit,
  onCancel,
  isEditMode,
  externalSubmitting,
  projects = [],
  departments = [],
}) => {
  const schema = useMemo(() => buildSchema(), []);

  // ── Tracks which department is currently selected so a useEffect can
  //    react to changes and fetch users — this is the idiomatic React pattern
  //    for side-effects driven by state changes.
  const [selectedDeptId,    setSelectedDeptId]    = useState(initialValues?.departmentId || "");
  const [filteredResources, setFilteredResources] = useState([]);
  const [resourcesLoading,  setResourcesLoading]  = useState(false);
  const [resourcesError,    setResourcesError]    = useState(null);

  // Fetch users whenever selectedDeptId changes (includes initial edit-mode value).
  // The cleanup function cancels stale responses if the user changes dept quickly.
  useEffect(() => {
    if (!selectedDeptId) {
      setFilteredResources([]);
      setResourcesError(null);
      return;
    }

    let cancelled = false;
    setResourcesLoading(true);
    setResourcesError(null);

    fetchUsersByDepartment(selectedDeptId)
      .then((users) => {
        if (!cancelled) setFilteredResources(Array.isArray(users) ? users : []);
      })
      .catch(() => {
        if (!cancelled) {
          setResourcesError("Could not load resources for this department.");
          setFilteredResources([]);
        }
      })
      .finally(() => {
        if (!cancelled) setResourcesLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedDeptId]);

  const defaults = {
    projectId: "",
    departmentId: "",
    resourceId: "",
    startDate: null,
    endDate: null,
    allocationPercentage: "",
    status: "Active",
    description: "",
    ...initialValues,
  };

  return (
    <Fragment>
      <Formik
        initialValues={defaults}
        enableReinitialize
        validationSchema={schema}
        onSubmit={onSubmit}
      >
        {({
          values,
          errors,
          touched,
          handleChange,
          handleBlur,
          handleSubmit,
          isSubmitting,
          resetForm,
          setFieldValue,
          setFieldTouched,
        }) => (
          <form onSubmit={handleSubmit}>
            <div className="row">

              {/* ── Project ── */}
              <div className="col-md-6 mb-3">
                <label className="text-label fw-semibold">
                  Project <span className="text-danger">*</span>
                </label>
                <select
                  name="projectId"
                  className={fieldClass(touched.projectId, errors.projectId)}
                  value={values.projectId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  <option value="">-- Select Project --</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.projectName}
                    </option>
                  ))}
                </select>
                {errBlock(touched.projectId, errors.projectId)}
              </div>

              {/* ── Department ── */}
              <div className="col-md-6 mb-3">
                <label className="text-label fw-semibold">
                  Department <span className="text-danger">*</span>
                </label>
                <select
                  name="departmentId"
                  className={fieldClass(touched.departmentId, errors.departmentId)}
                  value={values.departmentId}
                  onChange={(e) => {
                    const deptId = e.target.value;
                    setFieldValue("departmentId", deptId);
                    setFieldValue("resourceId", "");   // reset resource on dept change
                    setSelectedDeptId(deptId);          // triggers useEffect → API call
                  }}
                  onBlur={handleBlur}
                >
                  <option value="">-- Select Department --</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.departmentName}
                    </option>
                  ))}
                </select>
                {errBlock(touched.departmentId, errors.departmentId)}
              </div>

              {/* ── Resource (Employee) ── */}
              <div className="col-md-6 mb-3">
                <label className="text-label fw-semibold">
                  Resource <span className="text-danger">*</span>
                </label>

                {resourcesLoading ? (
                  <div
                    className="form-control d-flex align-items-center gap-2 text-muted"
                    style={{ height: 38 }}
                  >
                    <span className="spinner-border spinner-border-sm" role="status" />
                    <span>Loading resources…</span>
                  </div>
                ) : (
                  <select
                    name="resourceId"
                    className={fieldClass(touched.resourceId, errors.resourceId)}
                    value={values.resourceId}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={!values.departmentId}
                  >
                    {!values.departmentId ? (
                      <option value="">Select Department First</option>
                    ) : resourcesError ? (
                      <option value="">{resourcesError}</option>
                    ) : filteredResources.length === 0 ? (
                      <option value="">No resources found in this department</option>
                    ) : (
                      <>
                        <option value="">-- Select Resource --</option>
                        {filteredResources.map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.firstName && u.lastName
                              ? `${u.firstName} ${u.lastName}`
                              : u.userName || u.email}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                )}
                {errBlock(touched.resourceId, errors.resourceId)}
              </div>

              {/* ── Allocation % ── */}
              <div className="col-md-6 mb-3">
                <label className="text-label fw-semibold">
                  Allocation % <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <input
                    type="number"
                    name="allocationPercentage"
                    min={0}
                    max={100}
                    className={fieldClass(touched.allocationPercentage, errors.allocationPercentage)}
                    placeholder="0 – 100"
                    value={values.allocationPercentage}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <span className="input-group-text">%</span>
                </div>
                {errBlock(touched.allocationPercentage, errors.allocationPercentage)}
              </div>

              {/* ── Start Date ── */}
              <div className="col-md-6 mb-3">
                <label className="text-label fw-semibold">
                  Start Date <span className="text-danger">*</span>
                </label>
                <ReactDatePicker
                  selected={values.startDate ? new Date(values.startDate) : null}
                  onChange={(date) => {
                    setFieldValue("startDate", date);
                    if (values.endDate && date && new Date(values.endDate) < date) {
                      setFieldValue("endDate", null);
                    }
                  }}
                  onBlur={() => setFieldTouched("startDate", true)}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Select start date"
                  className={fieldClass(touched.startDate, errors.startDate)}
                  wrapperClassName="d-block"
                  autoComplete="off"
                />
                {errBlock(touched.startDate, errors.startDate)}
              </div>

              {/* ── End Date ── */}
              <div className="col-md-6 mb-3">
                <label className="text-label fw-semibold">
                  End Date <span className="text-danger">*</span>
                </label>
                <ReactDatePicker
                  selected={values.endDate ? new Date(values.endDate) : null}
                  onChange={(date) => setFieldValue("endDate", date)}
                  onBlur={() => setFieldTouched("endDate", true)}
                  minDate={values.startDate ? new Date(values.startDate) : null}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Select end date"
                  className={fieldClass(touched.endDate, errors.endDate)}
                  wrapperClassName="d-block"
                  autoComplete="off"
                />
                {errBlock(touched.endDate, errors.endDate)}
              </div>

              {/* ── Status ── */}
              <div className="col-md-6 mb-3">
                <label className="text-label fw-semibold">
                  Status <span className="text-danger">*</span>
                </label>
                <select
                  name="status"
                  className={fieldClass(touched.status, errors.status)}
                  value={values.status}
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {errBlock(touched.status, errors.status)}
              </div>

              {/* ── Description ── */}
              <div className="col-12 mb-3">
                <label className="text-label fw-semibold">
                  Description <small className="text-muted">(optional)</small>
                </label>
                <textarea
                  name="description"
                  rows={3}
                  className={fieldClass(touched.description, errors.description)}
                  placeholder="Brief notes about this allocation…"
                  value={values.description}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                <div className="d-flex justify-content-between mt-1">
                  {errBlock(touched.description, errors.description)}
                  <small
                    className={`ms-auto ${
                      (values.description || "").length > 450 ? "text-danger" : "text-muted"
                    }`}
                  >
                    {(values.description || "").length}/500
                  </small>
                </div>
              </div>

              {/* ── Actions ── */}
              <div className="col-12 d-flex gap-2 flex-wrap mt-2">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || externalSubmitting}
                >
                  {isSubmitting || externalSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      {isEditMode ? "Updating…" : "Saving…"}
                    </>
                  ) : isEditMode ? (
                    <><i className="fa fa-save me-1" /> Update Allocation</>
                  ) : (
                    <><i className="fa fa-plus me-1" /> Add Allocation</>
                  )}
                </button>

                {!isEditMode && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      resetForm();
                      setSelectedDeptId("");
                      setFilteredResources([]);
                    }}
                  >
                    <i className="fa fa-refresh me-1" /> Reset
                  </button>
                )}

                {onCancel && (
                  <button type="button" className="btn btn-light" onClick={onCancel}>
                    Cancel
                  </button>
                )}
              </div>

            </div>
          </form>
        )}
      </Formik>
    </Fragment>
  );
};

export default ResourceAllocationForm;
