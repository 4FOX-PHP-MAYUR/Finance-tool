import React, { Fragment } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import VendorForm from "./VendorForm";
import { createVendor } from "../../../services/vendorApi";

const AddVendor = () => {
  const navigate = useNavigate();

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await createVendor({
        vendorName: values.vendorName,
        vendorEmail: values.vendorEmail || "",
        accountsContactName: values.accountsContactName || "",
        accountsContactEmail: values.accountsContactEmail || "",
        accountsContactPhone: values.accountsContactPhone || "",
        accountsContactAddress: values.accountsContactAddress || "",
        regularContactName: values.regularContactName || "",
        regularContactEmail: values.regularContactEmail || "",
        regularContactPhone: values.regularContactPhone || "",
        regularContactAddress: values.regularContactAddress || "",
        vendorAddress: values.vendorAddress || "",
        description: values.description || "",
        currency: values.currency || "",
        country: values.country || "",
        taxRate: values.taxRate || "",
        licenseNo: values.licenseNo || "",
        licenseExpiryDate: values.licenseExpiryDate || "",
        taxCertificate: Boolean(values.taxCertificate),
        licenseUpload: values.licenseUpload || null,
        taxLaterCertificate: values.taxLaterCertificate || null,
        companyRegistrationDocs: values.companyRegistrationDocs || [],
        bankDetailsDocs: values.bankDetailsDocs || [],
      });

      Swal.fire({
        icon: "success",
        title: "Vendor added",
        text: `"${values.vendorName}" has been saved.`,
        confirmButtonColor: "#6418c3",
      }).then(() => navigate("/vendor-list"));

      setSubmitting(false);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || err.message || "Something went wrong.",
        confirmButtonColor: "#6418c3",
      });
      setSubmitting(false);
    }
  };

  return (
    <Fragment>
      <div className="row">
        <div className="col-xl-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title">Add vendor</h4>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => navigate("/vendor-list")}
              >
                <i className="fa fa-list me-1" /> Manage vendors
              </button>
            </div>
            <div className="card-body">
              <VendorForm onSubmit={handleSubmit} isEditMode={false} onCancel={() => navigate("/vendor-list")} />
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default AddVendor;
