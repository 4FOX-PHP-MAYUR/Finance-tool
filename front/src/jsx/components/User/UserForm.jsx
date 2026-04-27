import React, { Fragment } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import { Link } from "react-router-dom";

const EMPLOYEE_ROLE_ID = "69c7b75917b4fa98eaad4144";

const buildSchema = (isEditMode) =>
  Yup.object().shape({
    firstName: Yup.string()
      .min(2, "First Name must be at least 2 characters")
      .required("First Name is required"),
    email: Yup.string()
      .email("Enter a valid email address")
      .required("Email is required"),
    password: isEditMode
      ? Yup.string().min(6, "Password must be at least 6 characters")
      : Yup.string()
          .min(6, "Password must be at least 6 characters")
          .required("Password is required"),
    mobileNumber: Yup.string()
      .matches(/^\d{10}$/, "Mobile Number must be exactly 10 digits")
      .required("Mobile Number is required"),
    roleId: Yup.string().nullable(),
    departmentId: Yup.string().when("roleId", {
      is: (val) => val === EMPLOYEE_ROLE_ID,
      then: (s) => s.required("Department is required"),
      otherwise: (s) => s.nullable(),
    }),
  });

const UserForm = ({
  initialValues,
  onSubmit,
  roles,
  rolesLoading,
  rolesError,
  departments,
  depsLoading,
  depsError,
  isEditMode,
}) => {
  const schema = buildSchema(isEditMode);

  const defaultValues = {
    firstName: "",
    email: "",
    password: "",
    mobileNumber: "",
    roleId: "",
    departmentId: "",
    ...initialValues,
  };

  if (!defaultValues.roleId && defaultValues.roleName && Array.isArray(roles)) {
    const target = String(defaultValues.roleName).trim().toLowerCase();
    const matched = roles.find(
      (r) => String(r.name || r.roleName || "").trim().toLowerCase() === target,
    );
    if (matched) {
      defaultValues.roleId = String(matched.id || matched._id || "");
    }
  }

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
          setFieldValue,
          isSubmitting,
        }) => {
          const isEmployee = values.roleId === EMPLOYEE_ROLE_ID;

          const handleRoleChange = (e) => {
            handleChange(e);
            if (e.target.value !== EMPLOYEE_ROLE_ID) {
              setFieldValue("departmentId", "");
            }
          };

          return (
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-xl-6">
                  {/* First Name */}
                  <div
                    className={`form-group mb-3 ${
                      touched.firstName
                        ? errors.firstName
                          ? "is-invalid"
                          : "is-valid"
                        : ""
                    }`}
                  >
                    <label className="text-label">
                      First Name <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fa fa-user" />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        name="firstName"
                        placeholder="Enter first name"
                        onChange={handleChange}
                        onBlur={handleBlur}
                        value={values.firstName}
                      />
                      {touched.firstName && errors.firstName && (
                        <div
                          className="invalid-feedback animated fadeInUp"
                          style={{ display: "block" }}
                        >
                          {errors.firstName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div
                    className={`form-group mb-3 ${
                      touched.email
                        ? errors.email
                          ? "is-invalid"
                          : "is-valid"
                        : ""
                    }`}
                  >
                    <label className="text-label">
                      Email <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fa fa-envelope" />
                      </span>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        placeholder="Enter email address"
                        onChange={handleChange}
                        onBlur={handleBlur}
                        value={values.email}
                      />
                      {touched.email && errors.email && (
                        <div
                          className="invalid-feedback animated fadeInUp"
                          style={{ display: "block" }}
                        >
                          {errors.email}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Password */}
                  <div
                    className={`form-group mb-3 ${
                      touched.password
                        ? errors.password
                          ? "is-invalid"
                          : "is-valid"
                        : ""
                    }`}
                  >
                    <label className="text-label">
                      Password{" "}
                      {!isEditMode && <span className="text-danger">*</span>}
                      {isEditMode && (
                        <small className="text-muted"> (leave blank to keep current)</small>
                      )}
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fa fa-lock" />
                      </span>
                      <input
                        type="password"
                        className="form-control"
                        name="password"
                        placeholder={isEditMode ? "Leave blank to keep current" : "Enter password"}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        value={values.password}
                      />
                      {touched.password && errors.password && (
                        <div
                          className="invalid-feedback animated fadeInUp"
                          style={{ display: "block" }}
                        >
                          {errors.password}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-xl-6">
                  {/* Mobile Number */}
                  <div
                    className={`form-group mb-3 ${
                      touched.mobileNumber
                        ? errors.mobileNumber
                          ? "is-invalid"
                          : "is-valid"
                        : ""
                    }`}
                  >
                    <label className="text-label">
                      Mobile Number <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fa fa-phone" />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        name="mobileNumber"
                        placeholder="Enter 10-digit mobile number"
                        onChange={handleChange}
                        onBlur={handleBlur}
                        value={values.mobileNumber}
                      />
                      {touched.mobileNumber && errors.mobileNumber && (
                        <div
                          className="invalid-feedback animated fadeInUp"
                          style={{ display: "block" }}
                        >
                          {errors.mobileNumber}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Role Dropdown */}
                  <div
                    className={`form-group mb-3 ${
                      touched.roleId
                        ? errors.roleId
                          ? "is-invalid"
                          : "is-valid"
                        : ""
                    }`}
                  >
                    <label className="text-label">
                      Role <small className="text-muted">(optional)</small>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fa fa-shield" />
                      </span>
                      <select
                        className="form-control"
                        name="roleId"
                        onChange={handleRoleChange}
                        onBlur={handleBlur}
                        value={values.roleId}
                        disabled={rolesLoading || !!rolesError}
                      >
                        <option value="">
                          {rolesLoading
                            ? "Loading roles..."
                            : rolesError
                            ? "Unable to load roles"
                            : "Select a role"}
                        </option>
                        {!rolesError &&
                          roles.map((role) => (
                            <option
                              key={role.id || role._id}
                              value={role.id || role._id || ""}
                            >
                              {role.name || role.roleName || "Role"}
                            </option>
                          ))}
                      </select>
                      {rolesError && (
                        <div
                          className="invalid-feedback animated fadeInUp"
                          style={{ display: "block" }}
                        >
                          Unable to load roles. Please refresh and try again.
                        </div>
                      )}
                      {touched.roleId && errors.roleId && (
                        <div
                          className="invalid-feedback animated fadeInUp"
                          style={{ display: "block" }}
                        >
                          {errors.roleId}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Department Dropdown — only for Employee role */}
                  {isEmployee && (
                    <div
                      className={`form-group mb-3 ${
                        touched.departmentId
                          ? errors.departmentId
                            ? "is-invalid"
                            : "is-valid"
                          : ""
                      }`}
                    >
                      <label className="text-label">
                        Department <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="fa fa-building" />
                        </span>
                        <select
                          className="form-control"
                          name="departmentId"
                          onChange={handleChange}
                          onBlur={handleBlur}
                          value={values.departmentId}
                          disabled={depsLoading || !!depsError}
                        >
                          <option value="">
                            {depsLoading
                              ? "Loading departments..."
                              : depsError
                              ? "Unable to load departments"
                              : departments.length === 0
                              ? "No departments found"
                              : "Select a department"}
                          </option>
                          {!depsError &&
                            departments.map((dept) => (
                              <option key={dept._id} value={dept._id}>
                                {dept.departmentName}
                              </option>
                            ))}
                        </select>
                        {depsError && (
                          <div
                            className="invalid-feedback animated fadeInUp"
                            style={{ display: "block" }}
                          >
                            Unable to load departments. Please refresh and try again.
                          </div>
                        )}
                        {touched.departmentId && errors.departmentId && (
                          <div
                            className="invalid-feedback animated fadeInUp"
                            style={{ display: "block" }}
                          >
                            {errors.departmentId}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="form-group mb-3 mt-4">
                    <button
                      type="submit"
                      className="btn btn-primary me-2"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          />
                          {isEditMode ? "Updating..." : "Saving..."}
                        </>
                      ) : isEditMode ? (
                        "Update User"
                      ) : (
                        "Add User"
                      )}
                    </button>
                    <Link to="/user-list" className="btn btn-light">
                      Cancel
                    </Link>
                  </div>
                </div>
              </div>
            </form>
          );
        }}
      </Formik>
    </Fragment>
  );
};

export default UserForm;