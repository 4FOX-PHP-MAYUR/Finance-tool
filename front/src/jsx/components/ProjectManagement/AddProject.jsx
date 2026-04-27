import React, { Fragment, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import ProjectForm from "./ProjectForm";
import ClientForm from "../ClientManagement/ClientForm";
import { createProject } from "../../../services/projectApi";
import { fetchClients, createClient } from "../../../services/clientApi";

/** API still requires start/end dates — use a sensible default when the form omits them. */
function defaultProjectDateRange() {
  const start = new Date();
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

const AddProject = () => {
    const navigate = useNavigate();

    const [clients, setClients] = useState([]);
    const [clientsLoading, setClientsLoading] = useState(true);
    const [clientsFetchError, setClientsFetchError] = useState(null);

    /* ── Add-Client quick modal ──────────────────────────────── */
    const [showAddClient, setShowAddClient] = useState(false);
    const [addClientSubmitting, setAddClientSubmitting] = useState(false);

    /* ── Load clients from real API ──────────────────────────── */
    const loadClients = () => {
        setClientsLoading(true);
        setClientsFetchError(null);
        fetchClients()
            .then(setClients)
            .catch((err) => {
                const status = err?.response?.status;
                if (status === 401) {
                    navigate("/login");
                    return;
                }
                if (status === 403) {
                    setClientsFetchError("Access denied — you don't have permission to view clients.");
                } else {
                    setClientsFetchError(err.message || "Failed to load clients.");
                }
            })
            .finally(() => setClientsLoading(false));
    };

    useEffect(() => {
        loadClients();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Add-Client modal submit ─────────────────────────────── */
    const handleAddClientSubmit = async (values, { setSubmitting, resetForm }) => {
        setAddClientSubmitting(true);
        try {
            await createClient({
                clientName: values.clientName,
                contactPerson: values.contactPerson,
                clientEmail: values.clientEmail,
                clientMobile: values.clientMobile,
                clientImage: values.clientImage || null,
            });
            toast.success(`"${values.clientName}" added successfully.`, {
                position: "top-right",
                autoClose: 3000,
            });
            resetForm();
            setShowAddClient(false);
            loadClients(); // refresh dropdown
        } catch (err) {
            toast.error(err.message || "Failed to add client.", {
                position: "top-right",
                autoClose: 4000,
            });
        } finally {
            setSubmitting(false);
            setAddClientSubmitting(false);
        }
    };

    /* ── Add-Project submit ──────────────────────────────────── */
    const handleSubmit = async (values, { setSubmitting, resetForm }) => {
        try {
            const dates = defaultProjectDateRange();
            await createProject({
                clientId: values.clientId,
                projectName: values.projectName,
                projectDescription: "",
                projectImage: values.projectImage instanceof File ? values.projectImage : null,
                isCompleted: false,
                projectPercentageCompleted: 0,
                startDate: dates.startDate,
                endDate: dates.endDate,
            });

            Swal.fire({
                icon: "success",
                title: "Project Added",
                text: `"${values.projectName}" has been added successfully.`,
                confirmButtonColor: "#6418c3",
            }).then(() => navigate("/project-list"));

            resetForm();
        } catch (err) {
            const status = err?.response?.status;
            if (status === 401) { navigate("/login"); return; }
            Swal.fire({
                icon: "error",
                title: status === 403 ? "Access Denied" : "Error",
                text: status === 403
                    ? "You don't have permission to create projects."
                    : err.message || "Something went wrong. Please try again.",
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
                            <h4 className="card-title">Add New Project</h4>
                            <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => navigate("/project-list")}
                            >
                                <i className="fa fa-list me-1" /> Manage Projects
                            </button>
                        </div>
                        <div className="card-body">
                            <ProjectForm
                                onSubmit={handleSubmit}
                                isEditMode={false}
                                onCancel={() => navigate("/project-list")}
                                clients={clients}
                                clientsLoading={clientsLoading}
                                clientsFetchError={clientsFetchError}
                                onAddClient={() => setShowAddClient(true)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Quick "Add Client" Modal ────────────────────────── */}
            <Modal
                show={showAddClient}
                onHide={() => setShowAddClient(false)}
                centered
                size="lg"
            >
                <Modal.Header closeButton className="border-bottom pb-3">
                    <Modal.Title>
                        <i className="fa fa-user-plus me-2 text-primary" />
                        Add New Client
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-4">
                    <ClientForm
                        onSubmit={handleAddClientSubmit}
                        onCancel={() => setShowAddClient(false)}
                        isEditMode={false}
                        externalSubmitting={addClientSubmitting}
                    />
                </Modal.Body>
            </Modal>
        </Fragment>
    );
};

export default AddProject;
