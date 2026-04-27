import { Fragment, useState, useEffect, useRef } from "react";
import { Formik, useFormikContext } from "formik";
import { useRoles } from "../../../hooks/useRoles";
import { resolveUploadedAssetUrl } from "../../../config/api";
import * as Yup from "yup";

const FILE_SIZE_LIMIT = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const EMPLOYEE_ROLE_ID = "69c7b75917b4fa98eaad4144";

const buildSchema = (isEditMode) =>
    Yup.object().shape({
        userName: Yup.string()
            .min(3, "User Name must be at least 3 characters")
            .max(50, "User Name must not exceed 50 characters")
            .required("User Name is required"),
        email: Yup.string()
            .email("Enter a valid email address")
            .required("Email is required"),
        mobileNumber: Yup.string()
            .matches(/^\d{10}$/, "Mobile Number must be exactly 10 digits")
            .required("Mobile Number is required"),
        dob: Yup.string().required("Date of Birth is required"),
        gender: Yup.string().required("Gender is required"),
        roleId: Yup.string().nullable(),
        departmentId: Yup.string().when("roleId", {
            is: (val) => val === EMPLOYEE_ROLE_ID,
            then: (s) => s.required("Department is required"),
            otherwise: (s) => s.nullable(),
        }),
        password: isEditMode
            ? Yup.string()
                .nullable()
                .test("password-strength", "Must include uppercase, lowercase, number and special character", (value) => {
                    if (!value) return true;
                    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/.test(value);
                })
                .test("password-min", "Password must be at least 6 characters", (value) => {
                    if (!value) return true;
                    return value.length >= 6;
                })
            : Yup.string()
                .min(8, "Password must be at least 8 characters")
                .max(20, "Password must be at most 20 characters")
                .matches(
                    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])/,
                    "Must include uppercase, lowercase, number, and a special character"
                )
                .required("Password is required"),
        confirmPassword: isEditMode
            ? Yup.string()
                .nullable()
                .test("passwords-match", "Passwords do not match", function (value) {
                    const { password } = this.parent;
                    if (!password) return true;
                    return value === password;
                })
            : Yup.string()
                .oneOf([Yup.ref("password"), null], "Passwords do not match")
                .required("Please confirm your password"),
        image: Yup.mixed()
            .nullable()
            .test("fileType", "Only JPG or PNG images are allowed", (value) => {
                if (!value) return true;
                return ALLOWED_TYPES.includes(value.type);
            })
            .test("fileSize", "Image must be smaller than 2 MB", (value) => {
                if (!value) return true;
                return value.size <= FILE_SIZE_LIMIT;
            }),
    });

/**
 * Sync Formik's roleId once roles finish loading.
 *
 * Important: this must NOT override a user's manual selection in the edit modal.
 * So we only push the initial role when the field is still empty.
 */
const RoleSync = ({ roles, rolesLoading, targetRoleId, targetRoleName }) => {
    const { values, setFieldValue } = useFormikContext();
    useEffect(() => {
        if (rolesLoading) return;
        if (!Array.isArray(roles) || roles.length === 0) return;
        // Only initialise if the field hasn't been set yet.
        if (values.roleId) return;

        const byId = roles.find((r) => String(r.id || r._id || "") === String(targetRoleId || ""));
        if (byId) {
            setFieldValue("roleId", String(byId.id || byId._id), false);
            return;
        }

        if (targetRoleName) {
            const wanted = String(targetRoleName).trim().toLowerCase();
            const byName = roles.find((r) => {
                const current = String(r.name || r.roleName || "").trim().toLowerCase();
                return current && current === wanted;
            });
            if (byName) {
                setFieldValue("roleId", String(byName.id || byName._id), false);
            }
        }
    }, [rolesLoading, roles, targetRoleId, targetRoleName, values.roleId, setFieldValue]);
    return null;
};

const UserMgmtForm = ({
    initialValues,
    onSubmit,
    onCancel,
    isEditMode,
    externalSubmitting,
    departments = [],
    depsLoading = false,
    depsError = null,
}) => {
    // Load roles inside the form so pre-selection never depends on parent timing
    const { roles, loading: rolesLoading, error: rolesError } = useRoles();

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const fileInputRef = useRef(null);
    const [imagePreview, setImagePreview] = useState(() =>
        resolveUploadedAssetUrl(initialValues?.imageUrl)
    );

    useEffect(() => {
        setImagePreview(resolveUploadedAssetUrl(initialValues?.imageUrl));
    }, [initialValues?.imageUrl]);

    const schema = buildSchema(isEditMode);

    const defaultValues = {
        userName: "",
        email: "",
        mobileNumber: "",
        roleId: "",
        departmentId: "",
        imageUrl: "",
        ...initialValues,
        // Normalise gender to lowercase so pre-selection works even when the API
        // returns legacy capitalised values ("Male" → "male").
        gender: (initialValues?.gender ?? "").toLowerCase(),
        // Strip time portion from ISO timestamps so <input type="date"> renders correctly.
        dob: initialValues?.dob ? initialValues.dob.split("T")[0] : "",
        // Always reset sensitive/file fields — never pre-fill from server
        password: "",
        confirmPassword: "",
        image: null,
    };

    const handleImageChange = (e, setFieldValue) => {
        const file = e.target.files[0];
        if (file) {
            setFieldValue("image", file);
            const reader = new FileReader();
            reader.onload = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const fieldClass = (touched, error) =>
        `form-group mb-3 ${touched ? (error ? "is-invalid" : "is-valid") : ""}`;

    const errBlock = (touched, error) =>
        touched && error ? (
            <div
                className="invalid-feedback animated fadeInUp"
                style={{ display: "block" }}
            >
                {error}
            </div>
        ) : null;

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
                    setFieldValue,
                    setFieldTouched,
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
                            {/* Re-sync roleId once roles finish loading asynchronously */}
                            <RoleSync
                                roles={roles}
                                rolesLoading={rolesLoading}
                                targetRoleId={defaultValues.roleId}
                                targetRoleName={defaultValues.roleName}
                            />
                            <div className="row">
                                {/* ── Column 1 ── */}
                                <div className="col-xl-6 col-lg-6">

                                    {/* User Name */}
                                    <div className={fieldClass(touched.userName, errors.userName)}>
                                        <label className="text-label">
                                            User Name <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text">
                                                <i className="fa fa-user" />
                                            </span>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="userName"
                                                placeholder="Enter full name"
                                                value={values.userName}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                            />
                                            {errBlock(touched.userName, errors.userName)}
                                        </div>
                                    </div>


                                    {/* Mobile Number */}
                                    <div className={fieldClass(touched.mobileNumber, errors.mobileNumber)}>
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
                                                placeholder="10-digit mobile number"
                                                value={values.mobileNumber}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                maxLength={10}
                                            />
                                            {errBlock(touched.mobileNumber, errors.mobileNumber)}
                                        </div>
                                    </div>


                                    {/* Gender */}
                                    <div className={fieldClass(touched.gender, errors.gender)}>
                                        <label className="text-label d-block">
                                            Gender <span className="text-danger">*</span>
                                        </label>
                                        <div className="d-flex gap-4 mt-1">
                                            {[
                                                { value: "male", label: "Male" },
                                                { value: "female", label: "Female" },
                                                { value: "other", label: "Other" },
                                            ].map(({ value, label }) => (
                                                <div className="form-check" key={value}>
                                                    <input
                                                        className="form-check-input"
                                                        type="radio"
                                                        name="gender"
                                                        id={`gender-${value}`}
                                                        value={value}
                                                        checked={values.gender === value}
                                                        onChange={handleChange}
                                                        onBlur={handleBlur}
                                                    />
                                                    <label
                                                        className="form-check-label"
                                                        htmlFor={`gender-${value}`}
                                                    >
                                                        {label}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                        {errBlock(touched.gender, errors.gender)}
                                    </div>

                                    {/* Role */}
                                    <div className={fieldClass(touched.roleId, errors.roleId)}>
                                        <label className="text-label">
                                            Role <small className="text-muted">(optional)</small>
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text">
                                                <i className="fa fa-id-badge" />
                                            </span>
                                            <select
                                                className="form-control"
                                                name="roleId"
                                                value={values.roleId}
                                                onChange={handleRoleChange}
                                                onBlur={handleBlur}
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
                                            {errBlock(touched.roleId, errors.roleId)}
                                        </div>
                                    </div>

                                    {/* Department — visible only when Employee role is selected */}
                                    {isEmployee && (
                                        <div className={fieldClass(touched.departmentId, errors.departmentId)}>
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
                                                    value={values.departmentId}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
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
                                                {errBlock(touched.departmentId, errors.departmentId)}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ── Column 2 ── */}
                                <div className="col-xl-6 col-lg-6">
                                    {/* Email */}
                                    <div className={fieldClass(touched.email, errors.email)}>
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
                                                value={values.email}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                            />
                                            {errBlock(touched.email, errors.email)}
                                        </div>
                                    </div>

                                    {/* DOB */}
                                    <div className={fieldClass(touched.dob, errors.dob)}>
                                        <label className="text-label">
                                            Date of Birth <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text">
                                                <i className="fa fa-calendar" />
                                            </span>
                                            <input
                                                type="date"
                                                className="form-control"
                                                name="dob"
                                                value={values.dob}
                                                max={new Date().toISOString().split("T")[0]}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                            />
                                            {errBlock(touched.dob, errors.dob)}
                                        </div>
                                    </div>


                                    {/* Password */}
                                    <div className={fieldClass(touched.password, errors.password)}>
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
                                                type={showPassword ? "text" : "password"}
                                                className="form-control"
                                                name="password"
                                                placeholder={
                                                    isEditMode
                                                        ? "Leave blank to keep current"
                                                        : "Enter password"
                                                }
                                                value={values.password}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary py-0"
                                                tabIndex={-1}
                                                onClick={() => setShowPassword((v) => !v)}
                                            >
                                                <i className={`fa ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
                                            </button>
                                            {errBlock(touched.password, errors.password)}
                                        </div>
                                    </div>

                                    {/* Confirm Password */}
                                    <div className={fieldClass(touched.confirmPassword, errors.confirmPassword)}>
                                        <label className="text-label">
                                            Confirm Password{" "}
                                            {!isEditMode && <span className="text-danger">*</span>}
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text">
                                                <i className="fa fa-lock" />
                                            </span>
                                            <input
                                                type={showConfirm ? "text" : "password"}
                                                className="form-control"
                                                name="confirmPassword"
                                                placeholder="Re-enter password"
                                                value={values.confirmPassword}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary py-0"
                                                tabIndex={-1}
                                                onClick={() => setShowConfirm((v) => !v)}
                                            >
                                                <i className={`fa ${showConfirm ? "fa-eye-slash" : "fa-eye"}`} />
                                            </button>
                                            {errBlock(touched.confirmPassword, errors.confirmPassword)}
                                        </div>
                                    </div>

                                    {/* Image Upload */}
                                    <div className={fieldClass(touched.image, errors.image)}>
                                        <label className="text-label">
                                            Profile Image{" "}
                                            <small className="text-muted">(JPG / PNG, max 2 MB, optional)</small>
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text">
                                                <i className="fa fa-image" />
                                            </span>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                className="form-control"
                                                accept="image/jpeg,image/jpg,image/png"
                                                onChange={(e) => {
                                                    handleImageChange(e, setFieldValue);
                                                    setFieldTouched("image", true);
                                                }}
                                            />
                                            {errBlock(touched.image, errors.image)}
                                        </div>

                                        {/* Image Preview */}
                                        {imagePreview && (
                                            <div className="mt-2 d-flex align-items-center gap-3">
                                                <img
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    style={{
                                                        width: 80,
                                                        height: 80,
                                                        objectFit: "cover",
                                                        borderRadius: "50%",
                                                        border: "2px solid #dee2e6",
                                                    }}
                                                />
                                                <div className="d-flex align-items-center gap-1">
                                                    <a
                                                        href={imagePreview}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn btn-sm btn-outline-primary"
                                                        title="Preview image"
                                                    >
                                                        <i className="fa fa-eye" aria-hidden />
                                                    </a>
                                                    <a
                                                        href={imagePreview}
                                                        download="profile-image"
                                                        className="btn btn-sm btn-outline-secondary"
                                                        title="Download image"
                                                    >
                                                        <i className="fa fa-download" aria-hidden />
                                                    </a>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-danger"
                                                        title="Delete image"
                                                        onClick={() => {
                                                            setFieldValue("image", null);
                                                            setFieldValue("imageUrl", "");
                                                            setImagePreview(null);
                                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                                        }}
                                                    >
                                                        <i className="fa fa-trash" aria-hidden />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="form-group mb-0 mt-4 d-flex gap-2 flex-wrap">
                                        <button
                                            type="submit"
                                            className="btn btn-primary py-2"
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
                                                "Update User"
                                            ) : (
                                                "Add User"
                                            )}
                                        </button>
                                        {!isEditMode && (
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary py-2"
                                                onClick={() => {
                                                    resetForm();
                                                    setImagePreview(null);
                                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                                }}
                                            >
                                                Reset
                                            </button>
                                        )}
                                        {onCancel && (
                                            <button
                                                type="button"
                                                className="btn btn-light py-2"
                                                onClick={onCancel}
                                            >
                                                Cancel
                                            </button>
                                        )}
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

export default UserMgmtForm;
