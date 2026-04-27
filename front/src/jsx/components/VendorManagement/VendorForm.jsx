import React, { Fragment, useState, useEffect } from "react";
import { Formik } from "formik";
import BomTextarea from "../common/BomTextarea";
import { getVendorDocUrl } from "../../../services/vendorApi";
import "./VendorManagement.css";

const fg = "form-group mb-3";

/** Open a local File in a new tab (PDF/images work with the browser viewer). */
function openBlobFileInNewTab(file) {
  const blobUrl = URL.createObjectURL(file);
  const w = window.open(blobUrl, "_blank", "noopener,noreferrer");
  if (w) {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
  } else {
    URL.revokeObjectURL(blobUrl);
  }
}

const VendorForm = ({
  initialValues,
  onSubmit,
  onCancel,
  isEditMode,
  externalSubmitting,
}) => {
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [retainedDocs, setRetainedDocs] = useState([]);
  const [licenseUploadFile, setLicenseUploadFile] = useState(null);
  const [retainedLicenseUpload, setRetainedLicenseUpload] = useState(null);
  const [taxLaterCertificateFile, setTaxLaterCertificateFile] = useState(null);
  const [retainedTaxLaterCertificate, setRetainedTaxLaterCertificate] = useState(null);

  useEffect(() => {
    const docs = initialValues?.companyRegistrationDocs;
    setRetainedDocs(Array.isArray(docs) ? [...docs] : []);
    setRetainedLicenseUpload(initialValues?.licenseUpload || null);
    setRetainedTaxLaterCertificate(initialValues?.taxLaterCertificate || null);
    setFilesToUpload([]);
    setLicenseUploadFile(null);
    setTaxLaterCertificateFile(null);
  }, [
    initialValues?.companyRegistrationDocs,
    initialValues?.licenseUpload,
    initialValues?.taxLaterCertificate,
    initialValues?._id,
  ]);

  const defaultValues = {
    vendorName: "",
    vendorEmail: "",
    accountsContactName: "",
    accountsContactEmail: "",
    accountsContactPhone: "",
    accountsContactAddress: "",
    regularContactName: "",
    regularContactEmail: "",
    regularContactPhone: "",
    regularContactAddress: "",
    vendorAddress: "",
    country: "",
    taxRate: "",
    licenseNo: "",
    licenseExpiryDate: "",
    taxCertificate: false,
    ...initialValues,
  };

  const handleAddFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length) {
      setFilesToUpload((prev) => [...prev, ...picked]);
    }
    e.target.value = "";
  };

  const removeNewFile = (index) => {
    setFilesToUpload((prev) => prev.filter((_, i) => i !== index));
  };

  const removeRetained = (path) => {
    setRetainedDocs((prev) => prev.filter((d) => d.path !== path));
  };

  return (
    <Fragment>
      <div className="vendor-form-root">
      <Formik
        initialValues={defaultValues}
        enableReinitialize
        onSubmit={(values, helpers) =>
          onSubmit(
            {
              ...values,
              companyRegistrationDocs: filesToUpload,
              companyRegistrationDocsRetain: retainedDocs.map((d) => d.path),
              licenseUpload: licenseUploadFile,
              licenseUploadRetain: Boolean(retainedLicenseUpload),
              taxLaterCertificate: taxLaterCertificateFile,
              taxLaterCertificateRetain: Boolean(retainedTaxLaterCertificate),
            },
            helpers
          )
        }
      >
        {({
          values,
          handleChange,
          handleBlur,
          handleSubmit,
          isSubmitting,
          resetForm,
        }) => (
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-12">
                <h6 className="text-primary mb-3">
                  <i className="fa fa-building me-2" />
                  Vendor
                </h6>
              </div>
              <div className="col-xl-6 col-lg-6">
                <div className={fg}>
                  <label className="text-label">Vendor name *</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fa fa-building" />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      name="vendorName"
                      required
                      placeholder="Company / vendor name"
                      value={values.vendorName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>
                <div className={fg}>
                  <label className="text-label">Vendor email</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fa fa-envelope" />
                    </span>
                    <input
                      type="email"
                      className="form-control"
                      name="vendorEmail"
                      placeholder="vendor@company.com"
                      value={values.vendorEmail}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>
                <div className={fg}>
                  <label className="text-label">Vendor address</label>
                  <div className="input-group align-items-start">
                    <span className="input-group-text">
                      <i className="fa fa-map-marker" />
                    </span>
                    <BomTextarea
                      className="flex-grow-1"
                      name="vendorAddress"
                      rows={5}
                      placeholder="Registered / primary address"
                      value={values.vendorAddress}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      variant="scope"
                    />
                  </div>
                </div>
                <div className={fg}>
                  <label className="text-label">Country</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fa fa-globe" />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      name="country"
                      placeholder="Country"
                      value={values.country}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>
                <div className={fg}>
                  <label className="text-label">Tax rate (%)</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fa fa-percent" />
                    </span>
                    <input
                      type="number"
                      className="form-control"
                      name="taxRate"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="e.g. 18"
                      value={values.taxRate}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>
              </div>

              <div className="col-xl-6 col-lg-6">
                <h6 className="text-primary mb-3 mt-xl-0 mt-3">
                  <i className="fa fa-briefcase me-2" />
                  Accounts contact
                </h6>
                <div className={fg}>
                  <label className="text-label">Contact person name</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fa fa-user" />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      name="accountsContactName"
                      placeholder="Name"
                      value={values.accountsContactName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>
                <div className={fg}>
                  <label className="text-label">Email</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fa fa-envelope" />
                    </span>
                    <input
                      type="email"
                      className="form-control"
                      name="accountsContactEmail"
                      placeholder="Email"
                      value={values.accountsContactEmail}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>
                <div className={fg}>
                  <label className="text-label">Phone</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fa fa-phone" />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      name="accountsContactPhone"
                      placeholder="Phone"
                      value={values.accountsContactPhone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>
                <div className={fg}>
                  <label className="text-label">Address</label>
                  <div className="input-group align-items-start">
                    <span className="input-group-text">
                      <i className="fa fa-map-marker" />
                    </span>
                    <BomTextarea
                      className="flex-grow-1"
                      name="accountsContactAddress"
                      rows={5}
                      placeholder="Address"
                      value={values.accountsContactAddress}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      variant="scope"
                    />
                  </div>
                </div>
              </div>

              <div className="col-12">
                <hr className="my-3" />
                <h6 className="text-primary mb-3">
                  <i className="fa fa-users me-2" />
                  Regular contact
                </h6>
              </div>
              <div className="col-xl-6 col-lg-6">
                <div className={fg}>
                  <label className="text-label">Contact person name</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fa fa-user" />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      name="regularContactName"
                      placeholder="Name"
                      value={values.regularContactName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>
                <div className={fg}>
                  <label className="text-label">Email</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fa fa-envelope" />
                    </span>
                    <input
                      type="email"
                      className="form-control"
                      name="regularContactEmail"
                      placeholder="Email"
                      value={values.regularContactEmail}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>
              </div>
              <div className="col-xl-6 col-lg-6">
                <div className={fg}>
                  <label className="text-label">Phone</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fa fa-phone" />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      name="regularContactPhone"
                      placeholder="Phone"
                      value={values.regularContactPhone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>
                <div className={fg}>
                  <label className="text-label">Address</label>
                  <div className="input-group align-items-start">
                    <span className="input-group-text">
                      <i className="fa fa-map-marker" />
                    </span>
                    <BomTextarea
                      className="flex-grow-1"
                      name="regularContactAddress"
                      rows={5}
                      placeholder="Address"
                      value={values.regularContactAddress}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      variant="scope"
                    />
                  </div>
                </div>
              </div>

              <div className="col-12">
                <hr className="my-3" />
                <h6 className="text-primary mb-3">
                  <i className="fa fa-certificate me-2" />
                  License & tax certificate
                </h6>
              </div>
              <div className="col-xl-6 col-lg-6">
                <div className={fg}>
                  <label className="text-label">License no</label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fa fa-id-card" />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      name="licenseNo"
                      placeholder="License number"
                      value={values.licenseNo}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>
                <div className={fg}>
                  <label className="text-label">License expiry date</label>
                  <input
                    type="date"
                    className="form-control"
                    name="licenseExpiryDate"
                    value={values.licenseExpiryDate ? String(values.licenseExpiryDate).slice(0, 10) : ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>
                <div className={fg}>
                  <label className="text-label">License upload</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx"
                    onChange={(e) => setLicenseUploadFile(e.target.files?.[0] || null)}
                  />
                  {retainedLicenseUpload && !licenseUploadFile ? (
                    <div className="d-flex align-items-center gap-2 mt-2 small">
                      <a
                        href={getVendorDocUrl(retainedLicenseUpload.path) || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {retainedLicenseUpload.originalName || "Existing file"}
                      </a>
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger p-0"
                        onClick={() => setRetainedLicenseUpload(null)}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                  {licenseUploadFile ? (
                    <div className="small text-muted mt-2">
                      New file: {licenseUploadFile.name}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="col-xl-6 col-lg-6">
                <div className={fg}>
                  <label className="text-label d-block">Tax certificate</label>
                  <div className="form-check mt-2">
                    <input
                      id="tax-certificate-check"
                      type="checkbox"
                      className="form-check-input"
                      name="taxCertificate"
                      checked={Boolean(values.taxCertificate)}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <label className="form-check-label" htmlFor="tax-certificate-check">
                      Available
                    </label>
                  </div>
                </div>
                {Boolean(values.taxCertificate) ? (
                  <div className={fg}>
                    <label className="text-label">Tax certificate</label>
                    <input
                      type="file"
                      className="form-control"
                      accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx"
                      onChange={(e) => setTaxLaterCertificateFile(e.target.files?.[0] || null)}
                    />
                    {retainedTaxLaterCertificate && !taxLaterCertificateFile ? (
                      <div className="d-flex align-items-center gap-2 mt-2 small">
                        <a
                          href={getVendorDocUrl(retainedTaxLaterCertificate.path) || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {retainedTaxLaterCertificate.originalName || "Existing file"}
                        </a>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-danger p-0"
                          onClick={() => setRetainedTaxLaterCertificate(null)}
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}
                    {taxLaterCertificateFile ? (
                      <div className="small text-muted mt-2">
                        New file: {taxLaterCertificateFile.name}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="col-12">
                <hr className="my-3" />
                <h6 className="text-primary mb-2">
                  <i className="fa fa-file-text me-2" />
                  Company registration documents
                </h6>
                <p className="text-muted small mb-2">
                  Upload PDF, images, or Word files. You may attach multiple files.
                </p>
                <div className={fg}>
                  <input
                    type="file"
                    className="form-control"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx"
                    onChange={handleAddFiles}
                  />
                </div>

                {retainedDocs.length > 0 && (
                  <ul className="list-group mb-3 vendor-doc-list">
                    {retainedDocs.map((doc) => (
                      <li
                        key={doc.path}
                        className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2 vendor-doc-item"
                      >
                        <span className="text-truncate me-2 flex-grow-1 min-w-0" title={doc.originalName}>
                          <i className="fa fa-paperclip me-2 text-muted" />
                          {doc.originalName || doc.path}
                        </span>
                        <div className="d-flex gap-1 flex-shrink-0 vendor-doc-actions">
                          <a
                            className="btn btn-outline-primary vendor-doc-action-btn"
                            title="Preview in new tab"
                            href={getVendorDocUrl(doc.path) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              if (!getVendorDocUrl(doc.path)) e.preventDefault();
                            }}
                          >
                            <i className="fa fa-eye" aria-hidden />
                          </a>
                          <a
                            className="btn btn-outline-secondary vendor-doc-action-btn"
                            title="Download file"
                            href={getVendorDocUrl(doc.path) || "#"}
                            download={doc.originalName || "document"}
                            onClick={(e) => {
                              if (!getVendorDocUrl(doc.path)) e.preventDefault();
                            }}
                          >
                            <i className="fa fa-download" aria-hidden />
                          </a>
                          <button
                            type="button"
                            className="btn btn-outline-danger vendor-doc-action-btn"
                            title="Delete file"
                            onClick={() => removeRetained(doc.path)}
                          >
                            <i className="fa fa-trash" aria-hidden />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {filesToUpload.length > 0 && (
                  <ul className="list-group mb-3 vendor-doc-list">
                    {filesToUpload.map((file, idx) => (
                      <li
                        key={`${file.name}-${idx}`}
                        className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2 vendor-doc-item"
                      >
                        <span className="text-truncate me-2 flex-grow-1 min-w-0">
                          <i className="fa fa-plus-circle me-2 text-success" />
                          {file.name}{" "}
                          <small className="text-muted">(new)</small>
                        </span>
                        <div className="d-flex gap-1 flex-shrink-0 vendor-doc-actions">
                          <button
                            type="button"
                            className="btn btn-outline-primary vendor-doc-action-btn"
                            title="Preview in new tab"
                            onClick={() => openBlobFileInNewTab(file)}
                          >
                            <i className="fa fa-eye" aria-hidden />
                          </button>
                          <a
                            href={URL.createObjectURL(file)}
                            download={file.name || "document"}
                            className="btn btn-outline-secondary vendor-doc-action-btn"
                            title="Download file"
                            onClick={(e) => {
                              const url = e.currentTarget.href;
                              setTimeout(() => URL.revokeObjectURL(url), 120000);
                            }}
                          >
                            <i className="fa fa-download" aria-hidden />
                          </a>
                          <button
                            type="button"
                            className="btn btn-outline-danger vendor-doc-action-btn"
                            title="Delete file"
                            onClick={() => removeNewFile(idx)}
                          >
                            <i className="fa fa-trash" aria-hidden />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="form-group mb-0 mt-3 d-flex gap-2 flex-wrap">
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
                      "Update vendor"
                    ) : (
                      "Add vendor"
                    )}
                  </button>
                  {!isEditMode && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary py-2"
                      onClick={() => {
                        resetForm();
                        setFilesToUpload([]);
                        setRetainedDocs([]);
                        setLicenseUploadFile(null);
                        setTaxLaterCertificateFile(null);
                        setRetainedLicenseUpload(null);
                        setRetainedTaxLaterCertificate(null);
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
        )}
      </Formik>
      </div>
    </Fragment>
  );
};

export default VendorForm;
