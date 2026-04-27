import React, { Fragment, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import ClientForm from "./ClientForm";
import {
  fetchClients,
  updateClient,
  deleteClient,
  getClientImageSrc,
} from "../../../services/clientApi";

const ITEMS_PER_PAGE = 10;

/* ── Avatar / logo thumbnail ─────────────────────────────── */
const ClientAvatar = ({ src, name }) => {
  const imgSrc = getClientImageSrc(src);
  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt={name}
        style={{
          width: 38,
          height: 38,
          borderRadius: "8px",
          objectFit: "cover",
          border: "2px solid #dee2e6",
        }}
      />
    );
  }
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: "8px",
        background: "linear-gradient(135deg, #6418c3 0%, #e040fb 100%)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 13,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
};

const ClientList = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: "clientName",
    direction: "asc",
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  /* ── Data Loading ──────────────────────────────────────── */
  const loadClients = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchClients()
      .then((data) => {
        setClients(data);
        setCurrentPage(1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  /* ── Sorting ───────────────────────────────────────────── */
  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
    setCurrentPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortConfig.key !== field)
      return <i className="fa fa-sort ms-1 text-muted" style={{ fontSize: 11 }} />;
    return sortConfig.direction === "asc" ? (
      <i className="fa fa-sort-asc ms-1 text-primary" style={{ fontSize: 11 }} />
    ) : (
      <i className="fa fa-sort-desc ms-1 text-primary" style={{ fontSize: 11 }} />
    );
  };

  /* ── Filter + Sort ─────────────────────────────────────── */
  const filtered = clients
    .filter(() => true) // keep all, then apply search
    .filter((c) => {
      const q = searchQuery.toLowerCase();
      return (
        (c.clientName || "").toLowerCase().includes(q) ||
        (c.clientAddress || "").toLowerCase().includes(q) ||
        (c.trn || "").toLowerCase().includes(q) ||
        (c.clientEmail || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const aVal = (a[sortConfig.key] || "").toLowerCase();
      const bVal = (b[sortConfig.key] || "").toLowerCase();
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  /* ── Pagination ────────────────────────────────────────── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const renderPages = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) {
      pages.push(
        <li
          key={i}
          className={`page-item ${currentPage === i ? "active" : ""}`}
        >
          <button className="page-link" onClick={() => setCurrentPage(i)}>
            {i}
          </button>
        </li>
      );
    }
    return pages;
  };

  /* ── Edit ──────────────────────────────────────────────── */
  const openEdit = (client) => {
    setEditingClient(client);
    setShowEditModal(true);
  };
  const closeEdit = () => {
    setShowEditModal(false);
    setEditingClient(null);
  };

  const handleEditSubmit = async (values, { setSubmitting }) => {
    setEditSubmitting(true);
    try {
      // Pass File directly for multipart upload; omit clientImage to keep existing
      const payload = {
        clientName: values.clientName,
        contactPerson: values.contactPerson,
        clientEmail: values.clientEmail,
        clientMobile: values.clientMobile,
        clientAddress: values.clientAddress || "",
        trn: values.trn || "",
      };
      if (values.clientImage instanceof File) {
        payload.clientImage = values.clientImage;
      }

      await updateClient(editingClient._id, payload);

      toast.success(`"${values.clientName}" updated successfully.`, {
        position: "top-right",
        autoClose: 3000,
      });
      closeEdit();
      loadClients();
    } catch (err) {
      toast.error(err.message || "Failed to update client.", {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setSubmitting(false);
      setEditSubmitting(false);
    }
  };

  /* ── Delete ────────────────────────────────────────────── */
  const handleDelete = (client) => {
    Swal.fire({
      title: "Delete Client?",
      html: `Are you sure you want to delete <strong>"${client.clientName}"</strong>?<br/><small class="text-muted">This action cannot be undone.</small>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6418c3",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteClient(client._id);
          toast.success(`"${client.clientName}" deleted successfully.`, {
            position: "top-right",
            autoClose: 3000,
          });
          loadClients();
        } catch (err) {
          toast.error(err.message || "Failed to delete client.", {
            position: "top-right",
            autoClose: 4000,
          });
        }
      }
    });
  };

  /* ── Render ────────────────────────────────────────────── */
  return (
    <Fragment>
      <div className="row">
        <div className="col-xl-12">
          <div className="card">
            {/* Header */}
            <div className="card-header">
              <h4 className="card-title">Clients</h4>
              <Link to="/client-add" className="btn btn-primary btn-sm">
                <i className="fa fa-plus me-1" /> Add Client
              </Link>
            </div>

            <div className="card-body">
              {/* Error */}
              {error && (
                <div className="alert alert-danger d-flex align-items-center justify-content-between">
                  <span>
                    <i className="fa fa-exclamation-circle me-2" />
                    {error}
                  </span>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={loadClients}
                  >
                    <i className="fa fa-refresh me-1" /> Retry
                  </button>
                </div>
              )}

              {/* Search */}
              {!loading && !error && (
                <div className="row mb-3 align-items-center">
                  <div className="col-md-4">
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fa fa-search" />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by client name or email..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                      {searchQuery && (
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => {
                            setSearchQuery("");
                            setCurrentPage(1);
                          }}
                        >
                          <i className="fa fa-times" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="col-md-8 text-end">
                    <small className="text-muted">
                      {filtered.length === 0
                        ? "No results"
                        : `Showing ${
                            (currentPage - 1) * ITEMS_PER_PAGE + 1
                          }–${Math.min(
                            currentPage * ITEMS_PER_PAGE,
                            filtered.length
                          )} of ${filtered.length} client(s)`}
                    </small>
                  </div>
                </div>
              )}

              {/* Loader */}
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading clients...</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-striped align-middle mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: 44, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}>#</th>
                          <th style={{ width: 56, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}>Logo</th>
                          <th
                            style={{ cursor: "pointer", minWidth: 160, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}
                            onClick={() => handleSort("clientName")}
                          >
                            Client Name <SortIcon field="clientName" />
                          </th>
                          <th
                            style={{ cursor: "pointer", minWidth: 140, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}
                            onClick={() => handleSort("contactPerson")}
                          >
                            Contact Person <SortIcon field="contactPerson" />
                          </th>
                          <th
                            style={{ cursor: "pointer", minWidth: 190, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}
                            onClick={() => handleSort("clientEmail")}
                          >
                            Email <SortIcon field="clientEmail" />
                          </th>
                          <th style={{ minWidth: 130, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}>Mobile</th>
                          <th style={{ width: 90, textAlign: "center", whiteSpace: "nowrap", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6c757d" }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-5">
                              <div className="d-flex flex-column align-items-center text-muted">
                                <i
                                  className="fa fa-briefcase fa-3x mb-3 opacity-50"
                                />
                                <h5 className="mb-1">
                                  {searchQuery
                                    ? "No clients match your search"
                                    : "No clients found"}
                                </h5>
                                <p className="mb-3">
                                  {searchQuery
                                    ? `No results for "${searchQuery}"`
                                    : "Get started by adding your first client."}
                                </p>
                                {!searchQuery && (
                                  <Link
                                    to="/client-add"
                                    className="btn btn-primary btn-sm"
                                  >
                                    <i className="fa fa-plus me-1" /> Add Client
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          paginated.map((client, idx) => (
                            <tr key={client._id}>
                              <td className="text-muted">
                                {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                              </td>
                              <td>
                                <ClientAvatar
                                  src={client.clientImage}
                                  name={client.clientName}
                                />
                              </td>
                              <td>
                                <span className="fw-semibold">
                                  {client.clientName || "—"}
                                </span>
                              </td>
                              <td>{client.contactPerson || "—"}</td>
                              <td className="text-muted">
                                {client.clientEmail || "—"}
                              </td>
                              <td>{client.clientMobile || "—"}</td>
                              <td className="text-center" style={{ whiteSpace: "nowrap" }}>
                                <button
                                  className="btn btn-primary shadow btn-xs sharp me-1"
                                  title="Edit Client"
                                  onClick={() => openEdit(client)}
                                >
                                  <i className="fas fa-pencil-alt" />
                                </button>
                                <button
                                  className="btn btn-danger shadow btn-xs sharp"
                                  title="Delete Client"
                                  onClick={() => handleDelete(client)}
                                >
                                  <i className="fa fa-trash" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-end mt-3">
                      <nav>
                        <ul className="pagination pagination-sm mb-0">
                          <li
                            className={`page-item ${
                              currentPage === 1 ? "disabled" : ""
                            }`}
                          >
                            <button
                              className="page-link"
                              onClick={() =>
                                setCurrentPage((p) => Math.max(1, p - 1))
                              }
                            >
                              <i className="fa fa-chevron-left" />
                            </button>
                          </li>
                          {renderPages()}
                          <li
                            className={`page-item ${
                              currentPage === totalPages ? "disabled" : ""
                            }`}
                          >
                            <button
                              className="page-link"
                              onClick={() =>
                                setCurrentPage((p) =>
                                  Math.min(totalPages, p + 1)
                                )
                              }
                            >
                              <i className="fa fa-chevron-right" />
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Client Modal */}
      <Modal show={showEditModal} onHide={closeEdit} centered size="lg">
        <Modal.Header closeButton className="border-bottom pb-3">
          <Modal.Title>
            <i className="fa fa-edit me-2 text-primary" />
            Edit Client{editingClient ? ` — ${editingClient.clientName}` : ""}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-4">
          {editingClient && (
            <ClientForm
              key={editingClient._id}
              initialValues={{
                clientName: editingClient.clientName || "",
                contactPerson: editingClient.contactPerson || "",
                clientEmail: editingClient.clientEmail || "",
                clientMobile: editingClient.clientMobile || "",
                clientAddress: editingClient.clientAddress || "",
                trn: editingClient.trn || "",
                clientImage: editingClient.clientImage || "",
              }}
              onSubmit={handleEditSubmit}
              onCancel={closeEdit}
              isEditMode={true}
              externalSubmitting={editSubmitting}
            />
          )}
        </Modal.Body>
      </Modal>
    </Fragment>
  );
};

export default ClientList;