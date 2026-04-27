import React, { Fragment } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import RoleForm from "./RoleForm";
import { createRole } from "../../../services/roleApi";

const AddRole = () => {
  const navigate = useNavigate();

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      await createRole({
        roleName: values.roleName,
        description: values.description,
      });
      Swal.fire({
        icon: "success",
        title: "Role Created",
        text: `Role "${values.roleName}" has been created successfully.`,
        confirmButtonColor: "#6418c3",
      }).then(() => {
        navigate("/role-list");
      });
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
        <div className="col-xl-8 col-lg-10 col-md-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title">Add New Role</h4>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => navigate("/role-list")}
              >
                <i className="fa fa-list me-1" /> Manage Roles
              </button>
            </div>
            <div className="card-body">
              <RoleForm
                onSubmit={handleSubmit}
                isEditMode={false}
                onCancel={() => navigate("/role-list")}
              />
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default AddRole;