import React, { Fragment, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import PageTitle from "../../layouts/PageTitle";
import UserForm from "./UserForm";
import { useRoles } from "../../../hooks/useRoles";
import { createUser } from "../../../services/userApi";
import { fetchDepartments } from "../../../services/departmentApi";

const EMPLOYEE_ROLE_ID = "69c7b75917b4fa98eaad4144";
 
const AddUser = () => {
  const navigate = useNavigate();
  const { roles, loading: rolesLoading, error: rolesError } = useRoles();

  const [departments, setDepartments]   = useState([]);
  const [depsLoading, setDepsLoading]   = useState(true);
  const [depsError,   setDepsError]     = useState(null);

  useEffect(() => {
    fetchDepartments()
      .then((data) => setDepartments(data))
      .catch((err) => setDepsError(err.message || "Failed to load departments"))
      .finally(() => setDepsLoading(false));
  }, []);

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const payload = {
        firstName:    values.firstName,
        email:        values.email,
        password:     values.password,
        mobileNumber: values.mobileNumber,
        roleId:       values.roleId,
      };
      if (values.roleId === EMPLOYEE_ROLE_ID && values.departmentId) {
        payload.departmentId = values.departmentId;
      }
      await createUser(payload);
      Swal.fire({
        icon:               "success",
        title:              "User Added",
        text:               "User has been created successfully.",
        confirmButtonColor: "#6418c3",
      }).then(() => {
        navigate("/user-list");
      });
      resetForm();
    } catch (err) {
      Swal.fire({
        icon:               "error",
        title:              "Error",
        text:               err.message || "Something went wrong. Please try again.",
        confirmButtonColor: "#6418c3",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Fragment>
      <PageTitle
        activeMenu="Add User"
        motherMenu="Users"
        pageContent="Add User"
      />
      <div className="row">
        <div className="col-xl-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title">Add New User</h4>
            </div>
            <div className="card-body">
              {rolesError && (
                <div className="alert alert-warning">
                  Could not load roles: {rolesError}
                </div>
              )}
              <UserForm
                roles={roles}
                rolesLoading={rolesLoading}
                rolesError={rolesError}
                departments={departments}
                depsLoading={depsLoading}
                depsError={depsError}
                onSubmit={handleSubmit}
                isEditMode={false}
              />
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default AddUser;