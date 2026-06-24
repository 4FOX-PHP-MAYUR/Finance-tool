import React, { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDashboardSummary } from "../../../../services/dashboardApi";
import {
  fetchMyPermissions,
  LEGACY_COARSE_PARENT,
} from "../../../../services/permissionService";
import "./Home.css";

function n(value) {
  const x = Number(value);
  return Number.isFinite(x) ? x : 0;
}

function formatNumber(value) {
  try {
    return new Intl.NumberFormat().format(n(value));
  } catch {
    return String(n(value));
  }
}

function formatMoney(value) {
  try {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n(value));
  } catch {
    return String(n(value));
  }
}

const Home = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [permissionDoc, setPermissionDoc] = useState({
    assigned: false,
    permissions: [],
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([fetchDashboardSummary(), fetchMyPermissions()])
      .then(([dashboardData, perms]) => {
        if (cancelled) return;
        setSummary(dashboardData);
        setPermissionDoc({
          assigned: Boolean(perms?.assigned),
          permissions: Array.isArray(perms?.permissions) ? perms.permissions : [],
        });
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Failed to load dashboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = summary?.counts || {};
  const breakdowns = summary?.breakdowns || {};
  const finance = breakdowns?.financeReviewStatus || {};
  const hod = breakdowns?.hodReviewStatus || {};
  const soTotals = summary?.totals?.soUploads || {};
  const hodApproved = n(hod.approved);
  const hodRejected = n(hod.rejected);
  const hodAwaiting = Math.max(0, n(counts.assignVendors) - hodApproved - hodRejected);

  const allowedByAction = useMemo(() => {
    if (!permissionDoc.assigned) return null;
    const map = new Map();
    for (const p of permissionDoc.permissions || []) {
      const key = String(p?.moduleName || "")
        .trim()
        .toLowerCase();
      if (!key) continue;
      map.set(key, {
        view: Boolean(p?.access?.view),
        add: Boolean(p?.access?.add),
        update: Boolean(p?.access?.update),
        delete: Boolean(p?.access?.delete),
      });
    }
    return map;
  }, [permissionDoc.assigned, permissionDoc.permissions]);

  const can = useMemo(() => {
    return (moduleKey, action = "view") => {
      if (!allowedByAction) return true; // legacy behavior: no role-permission doc => allow
      const key = String(moduleKey || "")
        .trim()
        .toLowerCase();
      if (!key) return false;
      const direct = allowedByAction.get(key);
      if (direct?.[action]) return true;
      const parent = LEGACY_COARSE_PARENT[key];
      if (!parent) return false;
      const coarse = allowedByAction.get(parent);
      return Boolean(coarse?.[action]);
    };
  }, [allowedByAction]);

  const kpis = useMemo(
    () =>
      [
        can("clients_list") && {
          title: "Clients",
          value: formatNumber(counts.clients),
          link: "/client-list",
          icon: <i className="flaticon-form-1" />,
        },
        can("vendor_list") && {
          title: "Vendors",
          value: formatNumber(counts.vendors),
          link: "/vendor-list",
          icon: <i className="flaticon-form-1" />,
        },
        can("projects_list") && {
          title: "Projects",
          value: formatNumber(counts.projects),
          link: "/project-list",
          icon: <i className="flaticon-form-1" />,
        },
        can("so") && {
          title: "SO uploads (30d)",
          value: formatNumber(counts.soUploadsLast30Days),
          link: "/so-uploads",
          icon: <i className="flaticon-invoice" />,
        },
      ].filter(Boolean),
    [
      can,
      counts.clients,
      counts.projects,
      counts.soUploadsLast30Days,
      counts.vendors,
    ]
  );

  if (loading) {
    return (
      <div id="preloader">
        <div className="sk-three-bounce">
          <div className="sk-child sk-bounce1"></div>
          <div className="sk-child sk-bounce2"></div>
          <div className="sk-child sk-bounce3"></div>
        </div>
      </div>
    );
  }

  return (
    <Fragment>
      <div className="dashboard-pro-wrap">
        <div className="dashboard-hero">
          <div>
            <h2 className="dashboard-hero-title mb-1">Finance Dashboard</h2>
            <p className="dashboard-hero-subtitle mb-0">
              Live overview of operations, uploads, and vendor approvals.
            </p>
          </div>
          <span className="dashboard-hero-pill">
            Live
          </span>
        </div>

      <div className="row g-3">
        {error ? (
          <div className="col-12">
            <div className="alert alert-danger">{error}</div>
          </div>
        ) : null}

        {kpis.map((k) => (
          <div className="col-xl-3 col-lg-6 col-sm-6" key={k.title}>
            <div className="card dashboard-kpi-card h-100 border-0">
              <div className="card-body d-flex align-items-center justify-content-between">
                <div>
                  <p className="mb-1 dashboard-kpi-title">{k.title}</p>
                  <h3 className="text-black mb-0 dashboard-kpi-value">{k.value}</h3>
                  <div className="mt-2">
                    <Link to={k.link} className="btn btn-outline-primary btn-sm dashboard-btn-soft">
                      Open
                    </Link>
                  </div>
                </div>
                <div className="ms-2 fs-1 dashboard-kpi-icon">{k.icon}</div>
              </div>
            </div>
          </div>
        ))}

        {can("so") ? (
        <div className="col-xl-6 col-lg-12">
          <div className="card dashboard-panel-card h-100 border-0">
            <div className="card-header border-0 dashboard-panel-head">
              <div>
                <h4 className="card-title mb-1">SO totals</h4>
                <p className="mb-0 fs-13">From all uploads</p>
              </div>
              <Link to="/so-uploads" className="btn btn-primary btn-sm dashboard-btn-gradient">
                View uploads
              </Link>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-sm-6 mb-3">
                  <div className="d-flex justify-content-between dashboard-stat-row">
                    <span>Approved uploads</span>
                    <strong className="text-black">{formatNumber(soTotals.approvedCount)}</strong>
                  </div>
                </div>
                <div className="col-sm-6 mb-3">
                  <div className="d-flex justify-content-between dashboard-stat-row">
                    <span>Total uploads</span>
                    <strong className="text-black">{formatNumber(counts.soUploads)}</strong>
                  </div>
                </div>
                <div className="col-sm-6 mb-3">
                  <div className="d-flex justify-content-between dashboard-stat-row">
                    <span>Subtotal sum</span>
                    <strong className="text-black">{formatMoney(soTotals.subtotalSum)}</strong>
                  </div>
                </div>
                <div className="col-sm-6 mb-3">
                  <div className="d-flex justify-content-between dashboard-stat-row">
                    <span>Tax sum</span>
                    <strong className="text-black">{formatMoney(soTotals.taxSum)}</strong>
                  </div>
                </div>
                <div className="col-sm-12">
                  <div className="d-flex justify-content-between dashboard-stat-row">
                    <span>Total amount sum</span>
                    <strong className="text-black">{formatMoney(soTotals.totalAmountSum)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        ) : null}

        {can("assigned_vendors") || can("vendor_finance_review") || can("assign_vendor") ? (
        <div className="col-xl-6 col-lg-12">
          <div className="card dashboard-panel-card h-100 border-0">
            <div className="card-header border-0 dashboard-panel-head">
              <div>
                <h4 className="card-title mb-1">Vendor finance status</h4>
                <p className="mb-0 fs-13">From assigned vendors</p>
              </div>
              <Link
                to={can("vendor_finance_review") ? "/assign-vendor-finance-review" : "/assign-vendor-list"}
                className="btn btn-outline-primary btn-sm dashboard-btn-soft"
              >
                Finance review
              </Link>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-sm-6 mb-3">
                  <div className="d-flex justify-content-between dashboard-stat-row">
                    <span>Unpaid</span>
                    <strong className="text-black">{formatNumber(finance.unpaid)}</strong>
                  </div>
                </div>
                <div className="col-sm-6 mb-3">
                  <div className="d-flex justify-content-between dashboard-stat-row">
                    <span>Paid</span>
                    <strong className="text-black">{formatNumber(finance.paid)}</strong>
                  </div>
                </div>
                <div className="col-sm-6 mb-3">
                  <div className="d-flex justify-content-between dashboard-stat-row">
                    <span>Overdue</span>
                    <strong className="text-black">{formatNumber(finance.overdue)}</strong>
                  </div>
                </div>
                <div className="col-sm-6 mb-3">
                  <div className="d-flex justify-content-between dashboard-stat-row">
                    <span>Rejected</span>
                    <strong className="text-black">{formatNumber(finance.rejected)}</strong>
                  </div>
                </div>
                <div className="col-sm-12">
                  <div className="d-flex justify-content-between dashboard-stat-row">
                    <span>Assigned vendors (total)</span>
                    <strong className="text-black">{formatNumber(counts.assignVendors)}</strong>
                  </div>
                </div>
              </div>
              <div className="mt-3 d-flex gap-2 flex-wrap">
                {can("assign_vendor", "add") || can("assign_vendor") ? (
                  <Link to="/assign-vendor-add" className="btn btn-primary btn-sm dashboard-btn-gradient">
                    Assign vendor
                  </Link>
                ) : null}
                {can("assigned_vendors") ? (
                  <Link to="/assign-vendor-list" className="btn btn-outline-primary btn-sm dashboard-btn-soft">
                    Assigned vendors
                  </Link>
                ) : null}
                {can("vendor_hod_review") ? (
                  <Link to="/assign-vendor-hod-review" className="btn btn-outline-primary btn-sm dashboard-btn-soft">
                    HOD review
                  </Link>
                ) : null}
                {can("vendor_finance_review") ? (
                  <Link to="/assign-vendor-finance-review" className="btn btn-outline-primary btn-sm dashboard-btn-soft">
                    Finance review
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        ) : null}

        {can("vendor_hod_review") || can("assigned_vendors") || can("assign_vendor") ? (
        <div className="col-xl-6 col-lg-12">
          <div className="card dashboard-panel-card h-100 border-0">
            <div className="card-header border-0 dashboard-panel-head">
              <div>
                <h4 className="card-title mb-1">Vendor HOD status</h4>
                <p className="mb-0 fs-13">From assigned vendors</p>
              </div>
              <Link
                to={can("vendor_hod_review") ? "/assign-vendor-hod-review" : "/assign-vendor-list"}
                className="btn btn-outline-primary btn-sm dashboard-btn-soft"
              >
                HOD review
              </Link>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-sm-6 mb-3">
                  <div className="d-flex justify-content-between dashboard-stat-row">
                    <span>Awaiting review</span>
                    <strong className="text-black">{formatNumber(hodAwaiting)}</strong>
                  </div>
                </div>
                <div className="col-sm-6 mb-3">
                  <div className="d-flex justify-content-between dashboard-stat-row">
                    <span>Approved</span>
                    <strong className="text-black">{formatNumber(hodApproved)}</strong>
                  </div>
                </div>
                <div className="col-sm-6 mb-3">
                  <div className="d-flex justify-content-between dashboard-stat-row">
                    <span>Rejected</span>
                    <strong className="text-black">{formatNumber(hodRejected)}</strong>
                  </div>
                </div>
                <div className="col-sm-6 mb-3">
                  <div className="d-flex justify-content-between dashboard-stat-row">
                    <span>Assigned vendors (total)</span>
                    <strong className="text-black">{formatNumber(counts.assignVendors)}</strong>
                  </div>
                </div>
              </div>
              <div className="mt-3 d-flex gap-2 flex-wrap">
                {can("assign_vendor", "add") || can("assign_vendor") ? (
                  <Link to="/assign-vendor-add" className="btn btn-primary btn-sm dashboard-btn-gradient">
                    Assign vendor
                  </Link>
                ) : null}
                {can("assigned_vendors") ? (
                  <Link to="/assign-vendor-list" className="btn btn-outline-primary btn-sm dashboard-btn-soft">
                    Assigned vendors
                  </Link>
                ) : null}
                {can("vendor_hod_review") ? (
                  <Link to="/assign-vendor-hod-review" className="btn btn-outline-primary btn-sm dashboard-btn-soft">
                    HOD review
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        ) : null}
      </div>
      </div>
    </Fragment>
  );
};

export default Home;
