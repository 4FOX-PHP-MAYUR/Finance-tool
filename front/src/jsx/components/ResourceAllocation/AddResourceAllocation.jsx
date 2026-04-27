import React, { Fragment, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import PageTitle from "../../layouts/PageTitle";
import ResourceAllocationForm from "./ResourceAllocationForm";
import { createResourceAllocation } from "../../../services/resourceAllocationApi";
import { fetchProjects } from "../../../services/projectApi";
import { fetchDepartments } from "../../../services/departmentApi";

const AddResourceAllocation = () => {
  const navigate = useNavigate();

  const [projects,    setProjects]    = useState([]);
  const [departments, setDepartments] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    setDataLoading(true);
    Promise.all([fetchProjects(), fetchDepartments()])
      .then(([p, d]) => {
        setProjects(p);
        setDepartments(d);
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401) { navigate("/login"); return; }
        Swal.fire({ icon: "error", title: "Load Error", text: err.message || "Failed to load form data." });
      })
      .finally(() => setDataLoading(false));
  }, [navigate]);

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await createResourceAllocation({
        projectId:            values.projectId,
        departmentId:         values.departmentId,
        resourceId:           values.resourceId,
        startDate:            values.startDate,
        endDate:              values.endDate,
        allocationPercentage: Number(values.allocationPercentage),
        status:               values.status,
        description:          values.description || "",
      });
      await Swal.fire({
        icon:  "success",
        title: "Allocation Added",
        text:  "Resource allocation created successfully.",
        timer: 1800,
        showConfirmButton: false,
      });
      navigate("/resource-allocation-list");
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) { navigate("/login"); return; }
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err.message ||
        "Failed to create allocation.";
      Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Fragment>
      <PageTitle
        activeMenu="Add Allocation"
        motherMenu="Resource Allocation"
        pageContent="Add Resource Allocation"
      />

      <div className="row">
        <div className="col-xl-10 col-lg-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title">
                <i className="fa fa-plus-circle me-2 text-primary" />
                New Resource Allocation
              </h4>
            </div>
            <div className="card-body">
              {dataLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status" />
                  <p className="mt-2 text-muted">Loading form data…</p>
                </div>
              ) : (
                <ResourceAllocationForm
                  onSubmit={handleSubmit}
                  onCancel={() => navigate("/resource-allocation-list")}
                  isEditMode={false}
                  projects={projects}
                  departments={departments}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default AddResourceAllocation;