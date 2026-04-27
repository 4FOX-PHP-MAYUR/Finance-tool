import React, { Fragment } from "react";
import { Formik } from "formik";
import * as Yup from "yup";

/* Build schema dynamically so duplicate-check can access the existing list */
const buildSchema = (existingDepts = [], editingId = null) =>
  Yup.object().shape({
    departmentName: Yup.string()
      .trim()
      .min(2, "Department Name must be at least 2 characters")
      .max(100, "Department Name must not exceed 100 characters")
      .test(
        "not-blank",
        "Department Name cannot be only spaces",
        (val) => !!val && val.trim().length > 0
      )
      .test("no-duplicate", "A department with this name already exists", (val) => {
        if (!val) return true;
        const norm = val.trim().toLowerCase();
        return !existingDepts.some(
          (d) =>
            d.departmentName.trim().toLowerCase() === norm &&
            d._id !== editingId
        );
      })
      .required("Department Name is required"),
    departmentDescription: Yup.string()
      .max(200, "Description must not exceed 200 characters"),
  });

const fieldClass = (touched, error) =>
  `form-group mb-3 ${touched ? (error ? "is-invalid" : "is-valid") : ""}`;

const errBlock = (touched, error) =>
  touched && error ? (
    <div className="invalid-feedback animated fadeInUp" style={{ display: "block" }}>
      {error}
    </div>
  ) : null;

const DepartmentForm = ({
  initialValues,
  onSubmit,
  onCancel,
  isEditMode,
  externalSubmitting,
  existingDepartments = [],
  editingId = null,
}) => {
  const defaultValues = {
    departmentName: "",
    departmentDescription: "",
    ...initialValues,
  };

  const schema = buildSchema(existingDepartments, editingId);

  return (
    <Fragment>
      <Formik
        initialValues={defaultValues}
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
        }) => (
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-xl-6 col-lg-8 col-md-10">

                {/* Department Name */}
                <div className={fieldClass(touched.departmentName, errors.departmentName)}>
                  <label className="text-label">
                    Department Name <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fa fa-building" />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      name="departmentName"
                      placeholder="Enter department name"
                      value={values.departmentName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {errBlock(touched.departmentName, errors.departmentName)}
                  </div>
                  <small className="text-muted">Min 2, max 100 characters</small>
                </div>

                {/* Department Description */}
                <div
                  className={fieldClass(
                    touched.departmentDescription,
                    errors.departmentDescription
                  )}
                >
                  <label className="text-label">
                    Department Description{" "}
                    <small className="text-muted">(optional)</small>
                  </label>
                  <textarea
                    className="form-control"
                    name="departmentDescription"
                    placeholder="Describe the department's responsibilities..."
                    rows={4}
                    value={values.departmentDescription}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <div className="d-flex justify-content-between mt-1">
                    {errBlock(
                      touched.departmentDescription,
                      errors.departmentDescription
                    )}
                    <small
                      className={`ms-auto ${
                        values.departmentDescription.length > 180
                          ? "text-danger"
                          : "text-muted"
                      }`}
                    >
                      {values.departmentDescription.length}/200
                    </small>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="form-group mb-0 d-flex gap-2 flex-wrap mt-4">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting || externalSubmitting}
                  >
                    {isSubmitting || externalSubmitting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        />
                        {isEditMode ? "Updating..." : "Saving..."}
                      </>
                    ) : isEditMode ? (
                      <>
                        <i className="fa fa-save me-1" /> Update Department
                      </>
                    ) : (
                      <>
                        <i className="fa fa-plus me-1" /> Add Department
                      </>
                    )}
                  </button>

                  {!isEditMode && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => resetForm()}
                    >
                      <i className="fa fa-refresh me-1" /> Reset
                    </button>
                  )}

                  {onCancel && (
                    <button
                      type="button"
                      className="btn btn-light"
                      onClick={onCancel}
                    >
                      Cancel
                    </button>
                  )}
                </div>

              </div>
            </div>
          </form>
        )}
      </Formik>
    </Fragment>
  );
};

export default DepartmentForm;