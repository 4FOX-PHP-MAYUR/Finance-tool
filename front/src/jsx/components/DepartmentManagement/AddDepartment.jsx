import React, { Fragment, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import DepartmentForm from "./DepartmentForm";
import { fetchDepartments, createDepartment } from "../../../services/departmentApi";

const AddDepartment = () => {
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);

  /* Load existing departments once for duplicate-name validation */
  useEffect(() => {
    fetchDepartments()
      .then(setDepartments)
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401) navigate("/login");
      });
  }, [navigate]);

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      await createDepartment({
        departmentName: values.departmentName,
        departmentDescription: values.departmentDescription,
      });

      Swal.fire({
        icon: "success",
        title: "Department Added",
        text: `"${values.departmentName}" has been added successfully.`,
        confirmButtonColor: "#6418c3",
      }).then(() => navigate("/department-list"));

      resetForm();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) { navigate("/login"); return; }
      const apiMessage =
        err?.response?.data?.errors?.[0]?.msg ||
        err?.response?.data?.error ||
        err?.response?.data?.message;
      Swal.fire({
        icon: "error",
        title: status === 403 ? "Access Denied" : "Error",
        text:
          status === 403
            ? "You don't have permission to create departments."
            : apiMessage || err.message || "Something went wrong. Please try again.",
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
              <h4 className="card-title">Add New Department</h4>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => navigate("/department-list")}
              >
                <i className="fa fa-list me-1" /> Manage Departments
              </button>
            </div>
            <div className="card-body">
              <DepartmentForm
                onSubmit={handleSubmit}
                isEditMode={false}
                onCancel={() => navigate("/department-list")}
                existingDepartments={departments}
              />
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default AddDepartment;