import { Fragment, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import UserMgmtForm from "./UserMgmtForm";
import { createUser } from "../../../services/userMgmtApi";
import { fetchDepartments } from "../../../services/departmentApi";

const AddUserMgmt = () => {
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [depsLoading, setDepsLoading] = useState(true);
  const [depsError,   setDepsError]   = useState(null);

  useEffect(() => {
    fetchDepartments()
      .then((data) => setDepartments(data))
      .catch((err) => setDepsError(err.message || "Failed to load departments"))
      .finally(() => setDepsLoading(false));
  }, []);

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      await createUser(values);

      Swal.fire({
        icon:               "success",
        title:              "User Added",
        text:               `"${values.userName}" has been added successfully.`,
        confirmButtonColor: "#6418c3",
      }).then(() => navigate("/mgmt-user-list"));

      resetForm();
    } catch (err) {
      Swal.fire({
        icon:               "error",
        title:              "Failed to Add User",
        text:               err.message || "Something went wrong. Please try again.",
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
              <h4 className="card-title">Add New User</h4>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => navigate("/mgmt-user-list")}
              >
                <i className="fa fa-list me-1" /> Manage Users
              </button>
            </div>
            <div className="card-body">
              <UserMgmtForm
                onSubmit={handleSubmit}
                isEditMode={false}
                onCancel={() => navigate("/mgmt-user-list")}
                departments={departments}
                depsLoading={depsLoading}
                depsError={depsError}
              />
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default AddUserMgmt;