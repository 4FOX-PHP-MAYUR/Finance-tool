import React, { Fragment } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import ClientForm from "./ClientForm";
import { createClient } from "../../../services/clientApi";

const AddClient = () => {
    const navigate = useNavigate();

    const handleSubmit = async (values, { setSubmitting, resetForm }) => {
        try {
            await createClient({
                clientName: values.clientName,
                contactPerson: values.contactPerson,
                clientEmail: values.clientEmail,
                clientMobile: values.clientMobile,
                clientAddress: values.clientAddress || "",
                trn: values.trn || "",
                clientImage: values.clientImage || null,
            });

            Swal.fire({
                icon: "success",
                title: "Client Added",
                text: `"${values.clientName}" has been added successfully.`,
                confirmButtonColor: "#6418c3",
            }).then(() => navigate("/client-list"));

            resetForm();
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: err.message || "Something went wrong. Please try again.",
                confirmButtonColor: "#6418c3",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Fragment>
            <div className="row">
                <div className="col-xl-12">
                    <div className="card">
                        <div className="card-header">
                            <h4 className="card-title">Add New Client</h4>
                            <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => navigate("/client-list")}
                            >
                                <i className="fa fa-list me-1" /> Manage Clients
                            </button>
                        </div>
                        <div className="card-body">
                            <ClientForm
                                onSubmit={handleSubmit}
                                isEditMode={false}
                                onCancel={() => navigate("/client-list")}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default AddClient;
