import React, { useState } from "react";
import { STATUS_STYLES } from "./mockData";

/* ── Date helpers (local) ────────────────────────────────────── */
const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};
const toDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const formatRange = (start, end) =>
  `${start.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;

/* ── Date range → day chips ──────────────────────────────────── */
const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getDayChips = (startStr, endStr) => {
  const chips = [];
  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) chips.push(DAY_ABBR[dow]); // skip weekends
    cur.setDate(cur.getDate() + 1);
    if (chips.length >= 5) break; // cap to 5 chips for display
  }
  return chips;
};

/* ── Chip colour cycling ─────────────────────────────────────── */
const CHIP_COLORS = ["primary", "success", "warning", "danger", "info", "secondary"];

const ListView = ({
  assignments,
  employees,
  departments,
  onEdit,
  onDelete,
  weekStart,
  onWeekChange,
}) => {
  const [search, setSearch] = useState("");

  const weekDays    = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  const weekStartStr = toDateStr(weekDays[0]);
  const weekEndStr   = toDateStr(weekDays[4]);

  const normalizeId = (val) => val && typeof val === "object" ? val._id : val;

  const empMap  = Object.fromEntries(employees.map((e) => [e._id, e]));
  const deptMap = Object.fromEntries(departments.map((d) => [d._id, d.departmentName]));

  /* Flatten: one row per (assignment × allocation) */
  const rows = assignments.flatMap((asgn) => {
    const empId  = normalizeId(asgn.employeeId);
    const deptId = normalizeId(asgn.departmentId);
    const emp    = empMap[empId] || {};
    const dept   = deptMap[deptId] || "—";
    return (asgn.allocations || []).map((alloc) => ({
      assignmentId: asgn._id || asgn.id,
      empName: emp.name || "—",
      jobTitle: emp.jobTitle || "—",
      department: dept,
      startDate: alloc.startDate,
      endDate: alloc.endDate,
      status: (alloc.status || "").toUpperCase(),
      taskDescription: asgn.taskDescription,
    }));
  });

  /* Filter by selected week AND search query */
  const filtered = rows.filter((r) => {
    const inWeek = r.startDate <= weekEndStr && r.endDate >= weekStartStr;
    if (!inWeek) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.empName.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.taskDescription.toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* ── Date range navigator (top left) ── */}
      <div
        className="px-3 py-2 d-flex align-items-center justify-content-between"
        style={{ borderBottom: "1px solid #e5e7eb" }}
      >
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-light btn-sm px-2"
            onClick={() => onWeekChange(addDays(weekStart, -7))}
            title="Previous week"
          >
            <i className="fa fa-chevron-left" />
          </button>
          <i className="fa fa-calendar text-muted" />
          <span className="fw-semibold" style={{ fontSize: 13 }}>
            {formatRange(weekDays[0], weekDays[4])}
          </span>
          <button
            className="btn btn-light btn-sm px-2"
            onClick={() => onWeekChange(addDays(weekStart, 7))}
            title="Next week"
          >
            <i className="fa fa-chevron-right" />
          </button>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div style={{ maxWidth: 280 }}>
            <div className="input-group input-group-sm">
              <span className="input-group-text">
                <i className="fa fa-search" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search employee, task…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="btn btn-outline-secondary" onClick={() => setSearch("")}>
                  <i className="fa fa-times" />
                </button>
              )}
            </div>
          </div>
          <small className="text-muted">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</small>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
          <thead className="table-light">
            <tr>
              <th style={{ width: 44 }}>#</th>
              <th style={{ minWidth: 140 }}>Employee Name</th>
              <th style={{ minWidth: 160 }}>Job Title</th>
              <th style={{ minWidth: 110 }}>Department</th>
              <th style={{ minWidth: 220 }}>
                Assigned Dates
              </th>
              <th style={{ minWidth: 200 }}>Task Description</th>
              <th style={{ minWidth: 110 }}>Status</th>
              <th style={{ width: 90, textAlign: "center", whiteSpace: "nowrap" }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted py-4">
                  {search ? "No matching records." : "No allocations found."}
                </td>
              </tr>
            ) : (
              filtered.map((row, idx) => {
                const chips = getDayChips(row.startDate, row.endDate);
                const statusStyle = STATUS_STYLES[row.status] || STATUS_STYLES.AVAILABLE;

                return (
                  <tr key={`${row.assignmentId}-${row.startDate}`}>
                    <td className="text-muted">{idx + 1}</td>
                    <td className="fw-semibold">{row.empName}</td>
                    <td className="text-muted">{row.jobTitle}</td>
                    <td className="text-muted">{row.department}</td>

                    {/* Date chips */}
                    <td>
                      <div className="d-flex align-items-center gap-1 flex-wrap">
                        <span className="text-muted me-1" style={{ fontSize: 11 }}>
                          {row.startDate} – {row.endDate}
                        </span>
                        {chips.map((day, ci) => (
                          <span
                            key={day}
                            className={`badge bg-${CHIP_COLORS[ci % CHIP_COLORS.length]} bg-opacity-25 text-dark`}
                            style={{ fontSize: 10 }}
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td
                      className="text-muted"
                      style={{
                        maxWidth: 200,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }}
                      title={row.taskDescription}
                    >
                      {row.taskDescription}
                    </td>

                    {/* Status */}
                    <td>
                      <span
                        className={`badge ${statusStyle.textClass}`}
                        style={{
                          fontSize: 11,
                          background: statusStyle.bg,
                          border: `1px solid ${statusStyle.border}`,
                          fontWeight: 600,
                        }}
                      >
                        {statusStyle.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="text-center" style={{ whiteSpace: "nowrap" }}>
                      <button
                        className="btn btn-primary btn-xs me-1"
                        title="Edit Assignment"
                        onClick={() => onEdit(row.assignmentId)}
                      >
                        <i className="fa fa-edit" />
                      </button>
                      <button
                        className="btn btn-danger btn-xs"
                        title="Delete Assignment"
                        onClick={() => onDelete(row.assignmentId)}
                      >
                        <i className="fa fa-trash" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ListView;