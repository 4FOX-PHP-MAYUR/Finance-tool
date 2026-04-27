import React, { Fragment } from "react";
import { Formik } from "formik";
import * as Yup from "yup";

const roleSchema = Yup.object().shape({
  roleName: Yup.string()
    .min(3, "Role Name must be at least 3 characters")
    .max(50, "Role Name must not exceed 50 characters")
    .matches(/^[A-Za-z @&]+$/, "Role name can only contain letters, spaces, @ and &")
    .required("Role Name is required"),
  description: Yup.string()
    .max(200, "Description must not exceed 200 characters"),
});

const RoleForm = ({ initialValues, onSubmit, onCancel, isEditMode, isSubmitting: externalSubmitting }) => {
  const defaultValues = {
    roleName: "",
    description: "",
    ...initialValues,
  };

  return (
    <Fragment>
      <Formik
        initialValues={defaultValues}
        enableReinitialize
        validationSchema={roleSchema}
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
            {/* Role Name */}
            <div
              className={`form-group mb-3 ${
                touched.roleName
                  ? errors.roleName
                    ? "is-invalid"
                    : "is-valid"
                  : ""
              }`}
            >
              <label className="text-label">
                Role Name <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fa fa-shield" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  name="roleName"
                  placeholder="Enter role name (3–50 characters)"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.roleName}
                />
                {touched.roleName && errors.roleName && (
                  <div
                    className="invalid-feedback animated fadeInUp"
                    style={{ display: "block" }}
                  >
                    {errors.roleName}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div
              className={`form-group mb-4 ${
                touched.description
                  ? errors.description
                    ? "is-invalid"
                    : "is-valid"
                  : ""
              }`}
            >
              <label className="text-label">
                Description{" "}
                <small className="text-muted">(optional, max 200 characters)</small>
              </label>
              <textarea
                className="form-control"
                name="description"
                placeholder="Enter role description"
                rows={4}
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.description}
              />
              <div className="d-flex justify-content-between mt-1">
                {touched.description && errors.description ? (
                  <div
                    className="invalid-feedback animated fadeInUp"
                    style={{ display: "block" }}
                  >
                    {errors.description}
                  </div>
                ) : (
                  <span />
                )}
                <small
                  className={`text-${
                    values.description.length > 190 ? "danger" : "muted"
                  }`}
                >
                  {values.description.length}/200
                </small>
              </div>
            </div>

            {/* Buttons */}
            <div className="form-group mb-0 d-flex gap-2">
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
                  "Update Role"
                ) : (
                  "Add Role"
                )}
              </button>
              {!isEditMode && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => resetForm()}
                >
                  Reset
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
          </form>
        )}
      </Formik>
    </Fragment>
  );
};

export default RoleForm;