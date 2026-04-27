import React, { Fragment, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import PageTitle from "../../layouts/PageTitle";
import UserForm from "./UserForm";
import { useRoles } from "../../../hooks/useRoles";
import { fetchUserById, updateUser } from "../../../services/userApi";
import { fetchDepartments } from "../../../services/departmentApi";

const EMPLOYEE_ROLE_ID = "69c7b75917b4fa98eaad4144";

const extractId = (val) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val._id ?? val.id ?? "";
};

const extractRoleName = (val) => {
  if (!val || typeof val === "string") return "";
  return val.roleName || val.name || "";
};

const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { roles, loading: rolesLoading, error: rolesError } = useRoles();

  const [userData,    setUserData]    = useState(null);
  const [fetchError,  setFetchError]  = useState(null);
  const [fetchLoading,setFetchLoading]= useState(true);

  const [departments, setDepartments] = useState([]);
  const [depsLoading, setDepsLoading] = useState(true);
  const [depsError,   setDepsError]   = useState(null);

  useEffect(() => {
    fetchDepartments()
      .then((data) => setDepartments(data))
      .catch((err) => setDepsError(err.message || "Failed to load departments"))
      .finally(() => setDepsLoading(false));
  }, []);

  useEffect(() => {
    fetchUserById(id)
      .then((data) => {
        setUserData({
          firstName:    data.firstName || data.first_name || "",
          email:        data.email || "",
          password:     "",
          mobileNumber: data.mobileNumber || data.mobile_number || data.phone || "",
          roleId:       extractId(data.roleId) || extractId(data.role) || "",
          roleName:     extractRoleName(data.roleId) || extractRoleName(data.role) || "",
          departmentId: extractId(data.departmentId) || extractId(data.department) || "",
        });
      })
      .catch((err) => setFetchError(err.message))
      .finally(() => setFetchLoading(false));
  }, [id]);

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      const payload = {
        firstName:    values.firstName,
        email:        values.email,
        mobileNumber: values.mobileNumber,
        roleId:       values.roleId,
      };
      if (values.password) {
        payload.password = values.password;
      }
      if (values.roleId === EMPLOYEE_ROLE_ID) {
        payload.departmentId = values.departmentId || null;
      }
      await updateUser(id, payload);
      Swal.fire({
        icon:               "success",
        title:              "User Updated",
        text:               "User has been updated successfully.",
        confirmButtonColor: "#6418c3",
      }).then(() => {
        navigate("/user-list");
      });
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

  if (fetchLoading) {
    return (
      <Fragment>
        <PageTitle activeMenu="Edit User" motherMenu="Users" pageContent="Edit User" />
        <div className="row">
          <div className="col-xl-12">
            <div className="card">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Loading user details...</p>
              </div>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }

  if (fetchError) {
    return (
      <Fragment>
        <PageTitle activeMenu="Edit User" motherMenu="Users" pageContent="Edit User" />
        <div className="row">
          <div className="col-xl-12">
            <div className="alert alert-danger">
              Failed to load user: {fetchError}
            </div>
          </div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <PageTitle activeMenu="Edit User" motherMenu="Users" pageContent="Edit User" />
      <div className="row">
        <div className="col-xl-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title">Edit User</h4>
            </div>
            <div className="card-body">
              {rolesError && (
                <div className="alert alert-warning">
                  Could not load roles: {rolesError}
                </div>
              )}
              <UserForm
                initialValues={userData}
                roles={roles}
                rolesLoading={rolesLoading}
                rolesError={rolesError}
                departments={departments}
                depsLoading={depsLoading}
                depsError={depsError}
                onSubmit={handleSubmit}
                isEditMode={true}
              />
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default EditUser;