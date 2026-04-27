import React, { Fragment, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MDBDataTable } from "mdbreact";
import PageTitle from "../../layouts/PageTitle";
import { fetchUsers } from "../../../services/userApi";

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setLoading(true);
    fetchUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const data = {
    columns: [
      { label: "#", field: "index", sort: "asc", width: 50 },
      { label: "Name", field: "firstName", sort: "asc" },
      { label: "Email", field: "email", sort: "asc" },
      { label: "Mobile", field: "mobileNumber", sort: "asc" },
      { label: "Role", field: "role", sort: "asc" },
      { label: "Actions", field: "actions", sort: "disabled" },
    ],
    rows: users.map((user, index) => ({
      index: index + 1,
      firstName: user.firstName || user.first_name || "-",
      email: user.email || "-",
      mobileNumber: user.mobileNumber || user.mobile_number || "-",
      role: user.roleId?.roleName || user.role?.roleName || "-",
      actions: (
        <Link
          to={`/user-edit/${user._id}`}
          className="btn btn-primary btn-sm"
        >
          <i className="fas fa-pencil-alt" /> 
        </Link>
      ),
    })),
  };

  return (
    <Fragment>
      <PageTitle
        activeMenu="User List"
        motherMenu="Users"
        pageContent="User List"
      />
      <div className="row">
        <div className="col-xl-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title">Users</h4>
              <Link to="/user-add" className="btn btn-primary btn-sm">
                <i className="fa fa-plus me-1" /> Add User
              </Link>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger">
                  Failed to load users: {error}{" "}
                  <button
                    className="btn btn-sm btn-outline-danger ms-2"
                    onClick={loadUsers}
                  >
                    Retry
                  </button>
                </div>
              )}
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading users...</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <div className="display mb-4 dataTablesCard customer-list-table">
                    <MDBDataTable data={data} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default UserList;
