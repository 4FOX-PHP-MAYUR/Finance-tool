import React, { Fragment, useState, useEffect } from "react";
import { Formik } from "formik";
import Select, { components } from "react-select";
import BomTextarea from "../common/BomTextarea";
import { getVendorDocUrl } from "../../../services/vendorApi";
import "./VendorManagement.css";

const fg = "form-group mb-3";

const VENDOR_CURRENCY_OPTIONS = [
  { value: "USD", label: "US Dollar", symbol: "$" },
  { value: "EUR", label: "Euro", symbol: "€" },
  { value: "GBP", label: "British Pound", symbol: "£" },
  { value: "INR", label: "Indian Rupee", symbol: "₹" },
  { value: "AED", label: "UAE Dirham", symbol: "د.إ" },
  { value: "EGP", label: "Egyptian Pound", symbol: "E£" },
  { value: "AUD", label: "Australian Dollar", symbol: "A$" },
  { value: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { value: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { value: "CNY", label: "Chinese Yuan", symbol: "¥" },
  { value: "JPY", label: "Japanese Yen", symbol: "¥" },
  { value: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { value: "HKD", label: "Hong Kong Dollar", symbol: "HK$" },
  { value: "SAR", label: "Saudi Riyal", symbol: "﷼" },
  { value: "ZAR", label: "South African Rand", symbol: "R" },
];

const currencySelectStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? "#6418c3" : "#ced4da",
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
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
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }),
  placeholder: (base) => ({ ...base, color: "#6c757d" }),
  singleValue: (base) => ({ ...base, color: "#212529", display: "flex", alignItems: "center", gap: "8px" }),
};

const CurrencyOption = (props) => (
  <components.Option {...props}>
    <span className="vendor-currency-symbol">{props.data.symbol}</span>
    <span>
      {props.data.value} — {props.data.label}
    </span>
  </components.Option>
);

const CurrencySingleValue = (props) => (
  <components.SingleValue {...props}>
    <span className="vendor-currency-symbol vendor-currency-symbol--selected">
      {props.data.symbol}
    </span>
    <span>
      {props.data.value} — {props.data.label}
    </span>
  </components.SingleValue>
);

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
  const [bankFilesToUpload, setBankFilesToUpload] = useState([]);
  const [retainedBankDocs, setRetainedBankDocs] = useState([]);
  const [licenseUploadFile, setLicenseUploadFile] = useState(null);
  const [retainedLicenseUpload, setRetainedLicenseUpload] = useState(null);
  const [taxLaterCertificateFile, setTaxLaterCertificateFile] = useState(null);
  const [retainedTaxLaterCertificate, setRetainedTaxLaterCertificate] = useState(null);

  useEffect(() => {
    const docs = initialValues?.companyRegistrationDocs;
    setRetainedDocs(Array.isArray(docs) ? [...docs] : []);
    const bankDocs = initialValues?.bankDetailsDocs;
    setRetainedBankDocs(Array.isArray(bankDocs) ? [...bankDocs] : []);
    setRetainedLicenseUpload(initialValues?.licenseUpload || null);
    setRetainedTaxLaterCertificate(initialValues?.taxLaterCertificate || null);
    setFilesToUpload([]);
    setBankFilesToUpload([]);
    setLicenseUploadFile(null);
    setTaxLaterCertificateFile(null);
  }, [
    initialValues?.companyRegistrationDocs,
    initialValues?.bankDetailsDocs,
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
    description: "",
    currency: "",
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

  const handleAddBankFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length) {
      setBankFilesToUpload((prev) => [...prev, ...picked]);
    }
    e.target.value = "";
  };

  const removeNewFile = (index) => {
    setFilesToUpload((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewBankFile = (index) => {
    setBankFilesToUpload((prev) => prev.filter((_, i) => i !== index));
  };

  const removeRetained = (path) => {
    setRetainedDocs((prev) => prev.filter((d) => d.path !== path));
  };

  const removeRetainedBank = (path) => {
    setRetainedBankDocs((prev) => prev.filter((d) => d.path !== path));
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
              bankDetailsDocs: bankFilesToUpload,
              bankDetailsDocsRetain: retainedBankDocs.map((d) => d.path),
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
          setFieldValue,
          setFieldTouched,
        }) => {
          const selectedCurrency =
            VENDOR_CURRENCY_OPTIONS.find((o) => o.value === values.currency) || null;

          return (
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
                  <label className="text-label">Description</label>
                  <div className="input-group align-items-start">
                    <span className="input-group-text">
                      <i className="fa fa-align-left" />
                    </span>
                    <BomTextarea
                      className="flex-grow-1"
                      name="description"
                      rows={3}
                      placeholder="Brief description of the vendor or services"
                      value={values.description}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      variant="scope"
                    />
                  </div>
                </div>
                <div className={fg}>
                  <label className="text-label">Currency</label>
                  <div className="input-group vendor-currency-select">
                    <span className="input-group-text vendor-currency-prefix">
                      {selectedCurrency ? (
                        <span className="vendor-currency-symbol vendor-currency-symbol--prefix">
                          {selectedCurrency.symbol}
                        </span>
                      ) : (
                        <i className="fa fa-money" />
                      )}
                    </span>
                    <div className="flex-grow-1">
                      <Select
                        inputId="currency"
                        options={VENDOR_CURRENCY_OPTIONS}
                        value={selectedCurrency}
                        onChange={(opt) => {
                          setFieldValue("currency", opt ? opt.value : "");
                          setFieldTouched("currency", true);
                        }}
                        onBlur={() => setFieldTouched("currency", true)}
                        placeholder="Select currency"
                        isClearable
                        styles={currencySelectStyles}
                        components={{
                          Option: CurrencyOption,
                          SingleValue: CurrencySingleValue,
                        }}
                        noOptionsMessage={() => "No currencies found"}
                      />
                    </div>
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
                  <i className="fa fa-university me-2" />
                  Bank details documents
                </h6>
                <p className="text-muted small mb-2">
                  Upload cancelled cheques, bank statements, or other bank detail files. You may attach multiple files.
                </p>
                <div className={fg}>
                  <input
                    type="file"
                    className="form-control"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx"
                    onChange={handleAddBankFiles}
                  />
                </div>

                {retainedBankDocs.length > 0 && (
                  <ul className="list-group mb-3 vendor-doc-list">
                    {retainedBankDocs.map((doc) => (
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
                            onClick={() => removeRetainedBank(doc.path)}
                          >
                            <i className="fa fa-trash" aria-hidden />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {bankFilesToUpload.length > 0 && (
                  <ul className="list-group mb-3 vendor-doc-list">
                    {bankFilesToUpload.map((file, idx) => (
                      <li
                        key={`bank-${file.name}-${idx}`}
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
                            onClick={() => removeNewBankFile(idx)}
                          >
                            <i className="fa fa-trash" aria-hidden />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
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
                        setBankFilesToUpload([]);
                        setRetainedDocs([]);
                        setRetainedBankDocs([]);
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
          );
        }}
      </Formik>
      </div>
    </Fragment>
  );
};

export default VendorForm;
