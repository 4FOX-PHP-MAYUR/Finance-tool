import React, { Fragment, useState, useEffect } from "react";
import { Formik } from "formik";

const ClientForm = ({
    initialValues,
    onSubmit,
    onCancel,
    isEditMode,
    externalSubmitting,
}) => {
    const [imagePreview, setImagePreview] = useState(
        initialValues?.clientImage || null
    );

    useEffect(() => {
        setImagePreview(initialValues?.clientImage || null);
    }, [initialValues?.clientImage]);

    const defaultValues = {
        clientName: "",
        contactPerson: "",
        clientEmail: "",
        clientMobile: "",
        clientAddress: "",
        trn: "",
        ...initialValues,
        clientImage: null,
    };

    const handleImageChange = (e, setFieldValue) => {
        const file = e.currentTarget.files[0];
        if (file) {
            setFieldValue("clientImage", file);
            const reader = new FileReader();
            reader.onload = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const fg = "form-group mb-3";

    return (
        <Fragment>
            <Formik initialValues={defaultValues} enableReinitialize onSubmit={onSubmit}>
                {({
                    values,
                    handleChange,
                    handleBlur,
                    handleSubmit,
                    isSubmitting,
                    resetForm,
                    setFieldValue,
                }) => (
                    <form onSubmit={handleSubmit}>
                        <div className="row">
                            <div className="col-xl-6 col-lg-6">
                                <div className={fg}>
                                    <label className="text-label">Client Name</label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <i className="fa fa-building" />
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="clientName"
                                            placeholder="Enter client / company name"
                                            value={values.clientName}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />
                                    </div>
                                </div>

                                <div className={fg}>
                                    <label className="text-label">Contact Person</label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <i className="fa fa-user" />
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="contactPerson"
                                            placeholder="Enter contact person name"
                                            value={values.contactPerson}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />
                                    </div>
                                </div>

                                <div className={fg}>
                                    <label className="text-label">Client Email</label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <i className="fa fa-envelope" />
                                        </span>
                                        <input
                                            type="email"
                                            className="form-control"
                                            name="clientEmail"
                                            placeholder="Enter client email"
                                            value={values.clientEmail}
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
                                        <textarea
                                            className="form-control"
                                            name="clientAddress"
                                            rows={3}
                                            placeholder="Billing / registered address"
                                            value={values.clientAddress}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="col-xl-6 col-lg-6">
                                <div className={fg}>
                                    <label className="text-label">Client Mobile</label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <i className="fa fa-phone" />
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="clientMobile"
                                            placeholder="Mobile number"
                                            value={values.clientMobile}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />
                                    </div>
                                </div>

                                <div className={fg}>
                                    <label className="text-label">TRN</label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <i className="fa fa-id-card" />
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="trn"
                                            placeholder="Tax registration number"
                                            value={values.trn}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />
                                    </div>
                                </div>

                                <div className={fg}>
                                    <label className="text-label">
                                        Client Image{" "}
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
                                            onChange={(e) =>
                                                handleImageChange(e, setFieldValue)
                                            }
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
                                            <div>
                                                <p className="mb-1 text-muted" style={{ fontSize: 12 }}>
                                                    Image preview
                                                </p>
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
                                                        download="client-image"
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
                                                            setFieldValue("clientImage", null);
                                                            setImagePreview(null);
                                                        }}
                                                    >
                                                        <i className="fa fa-trash" aria-hidden />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

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
                                            "Update Client"
                                        ) : (
                                            "Add Client"
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
                )}
            </Formik>
        </Fragment>
    );
};

export default ClientForm;
