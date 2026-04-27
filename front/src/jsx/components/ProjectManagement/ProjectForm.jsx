import React, { Fragment, useState, useEffect } from "react";
import { Formik } from "formik";
import Select from "react-select";

/* ── react-select custom styles (Bootstrap-compatible) ────── */
const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? "#6418c3" : "#ced4da",
    boxShadow: state.isFocused ? "0 0 0 0.2rem rgba(100,24,195,.15)" : "none",
    "&:hover": { borderColor: "#6418c3" },
    minHeight: "calc(1.5em + 0.75rem + 2px)",
    fontSize: "0.875rem",
  }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#6418c3"
      : state.isFocused
        ? "rgba(100,24,195,.08)"
        : "white",
    color: state.isSelected ? "#fff" : "#212529",
    fontSize: "0.875rem",
  }),
  placeholder: (base) => ({ ...base, color: "#6c757d" }),
  singleValue: (base) => ({ ...base, color: "#212529" }),
};

const fg = "form-group mb-3";

const ProjectForm = ({
  initialValues,
  onSubmit,
  onCancel,
  isEditMode,
  externalSubmitting,
  clients = [],
  clientsLoading = false,
  clientsFetchError = null,
  onAddClient,
}) => {
  const [imagePreview, setImagePreview] = useState(
    initialValues?.projectImage || null,
  );

  useEffect(() => {
    setImagePreview(initialValues?.projectImage || null);
  }, [initialValues?.projectImage]);

  const defaultValues = {
    clientId: "",
    projectName: "",
    ...initialValues,
    projectImage: null,
  };

  const clientOptions = clients.map((c) => ({
    value: c._id,
    label: c.clientName,
  }));

  const handleImageChange = (e, setFieldValue) => {
    const file = e.currentTarget.files[0];
    if (file) {
      setFieldValue("projectImage", file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <Fragment>
      <Formik
        initialValues={defaultValues}
        enableReinitialize
        onSubmit={onSubmit}
      >
        {({
          values,
          handleChange,
          handleBlur,
          handleSubmit,
          isSubmitting,
          resetForm,
          setFieldValue,
          setFieldTouched,
        }) => {
          const selectedClient =
            clientOptions.find((o) => o.value === values.clientId) || null;

          return (
            <form onSubmit={handleSubmit}>
              <div className="row mb-1">
                <div className="col-12">
                  <div className={fg}>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="text-label mb-0">Client</label>
                      {onAddClient && (
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-xs"
                          onClick={onAddClient}
                          title="Add a new client"
                        >
                          <i className="fa fa-plus me-1" />
                          Add Client
                        </button>
                      )}
                    </div>

                    {clientsFetchError ? (
                      <div className="alert alert-warning py-2 mb-1">
                        <i className="fa fa-exclamation-triangle me-1" />
                        {clientsFetchError} — client list unavailable
                      </div>
                    ) : null}

                    <Select
                      inputId="clientId"
                      options={clientOptions}
                      value={selectedClient}
                      onChange={(opt) => {
                        setFieldValue("clientId", opt ? opt.value : "");
                        setFieldTouched("clientId", true);
                      }}
                      onBlur={() => setFieldTouched("clientId", true)}
                      placeholder={
                        clientsLoading ? "Loading clients…" : "Select Client"
                      }
                      isLoading={clientsLoading}
                      isDisabled={clientsLoading}
                      isClearable
                      styles={selectStyles}
                      noOptionsMessage={() =>
                        clientsFetchError
                          ? "Could not load clients"
                          : "No clients found"
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-xl-8 col-lg-10">
                  <div className={fg}>
                    <label className="text-label">Project Name</label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fa fa-folder-open" />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        name="projectName"
                        placeholder="Enter project name"
                        value={values.projectName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </div>
                  </div>

                  <div className={fg}>
                    <label className="text-label">
                      Project Image{" "}
                      <small className="text-muted">(optional)</small>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fa fa-image" />
                      </span>
                      <input
                        type="file"
                        className="form-control"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={(e) => handleImageChange(e, setFieldValue)}
                      />
                    </div>
                    {imagePreview && (
                      <div className="mt-2 d-flex align-items-center gap-3">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          style={{
                            width: 80,
                            height: 80,
                            objectFit: "cover",
                            borderRadius: "8px",
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
                            download="project-image"
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
                              setFieldValue("projectImage", null);
                              setImagePreview(null);
                            }}
                          >
                            <i className="fa fa-trash" aria-hidden />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-group mb-0 d-flex gap-2 flex-wrap">
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
                        "Update Project"
                      ) : (
                        "Add Project"
                      )}
                    </button>
                    {!isEditMode && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary py-2"
                        onClick={() => {
                          resetForm();
                          setImagePreview(null);
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

export default ProjectForm;
