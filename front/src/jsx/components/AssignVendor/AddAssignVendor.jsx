import React, { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import PageTitle from "../../layouts/PageTitle";
import AssignVendorForm from "./AssignVendorForm";
import { createAssignVendor } from "../../../services/assignVendorApi";
import { fetchClients } from "../../../services/clientApi";
import { fetchProjects } from "../../../services/projectApi";
import { fetchVendors } from "../../../services/vendorApi";
import { fetchUsers } from "../../../services/userApi";

const AddAssignVendor = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [hodUsers, setHodUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchClients(), fetchProjects(), fetchVendors(), fetchUsers()])
      .then(([c, p, v, users]) => {
        setClients(c);
        setProjects(p);
        setVendors(v);
        const allUsers = Array.isArray(users) ? users : [];
        const hodOnly = allUsers.filter((u) => {
          const roleName = String(
            u?.roleId?.roleName ||
              u?.role?.roleName ||
              u?.roleName ||
              "",
          )
            .trim()
            .toLowerCase();
          return roleName.includes("hod") || roleName.includes("head of department");
        });
        setHodUsers(hodOnly);
      })
      .catch((err) => {
        if (err?.response?.status === 401) {
          navigate("/login");
          return;
        }
        Swal.fire({
          icon: "error",
          title: "Load error",
          text: err.message || "Failed to load clients or projects.",
        });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSubmit = async (payloadOrPayloads) => {
    const list = Array.isArray(payloadOrPayloads)
      ? payloadOrPayloads
      : [payloadOrPayloads];
    setSubmitting(true);
    try {
      for (const payload of list) {
        await createAssignVendor(payload);
      }
      await Swal.fire({
        icon: "success",
        title: "Saved",
        text:
          list.length === 1
            ? "Assign vendor record created."
            : `${list.length} vendor assignments created.`,
        timer: 1800,
        showConfirmButton: false,
      });
      navigate("/assign-vendor-list");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err.message ||
        "Failed to save.";
      Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Fragment>
      <PageTitle
        activeMenu="Assign vendor"
        motherMenu="Vendor"
        pageContent="Assign vendor"
      />

      <div className="row">
        <div className="col-xl-10 col-lg-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h4 className="card-title mb-0">
                <i className="fa fa-link me-2 text-primary" />
                Assign vendor
              </h4>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => navigate("/assign-vendor-list")}
              >
                <i className="fa fa-list me-1" />
                View list
              </button>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status" />
                  <p className="mt-2 text-muted">Loading…</p>
                </div>
              ) : (
                <AssignVendorForm
                  clients={clients}
                  projects={projects}
                  vendors={vendors}
                  hodUsers={hodUsers}
                  onSubmit={handleSubmit}
                  onCancel={() => navigate("/assign-vendor-list")}
                  isSubmitting={submitting}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default AddAssignVendor;
