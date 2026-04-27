import React from "react";
import { STATUS_STYLES } from "./mockData";

/* ── Date helpers ────────────────────────────────────────────── */
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

const daysBetween = (startStr, endStr) => {
  const s = new Date(startStr + "T00:00:00");
  const e = new Date(endStr   + "T00:00:00");
  return Math.round((e - s) / 86400000);
};

const formatHeader  = (date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const formatDayName = (date) => date.toLocaleDateString("en-GB", { weekday: "long" });
const formatRange   = (start, end) => {
  const opts = { day: "numeric", month: "long", year: "numeric" };
  return `${start.toLocaleDateString("en-GB", opts)} – ${end.toLocaleDateString("en-GB", opts)}`;
};

/* ── Normalise a raw ID or populated object to a string ────── */
const normalizeId = (val) =>
  val && typeof val === "object" ? val._id : val;

/* ── Row accent palette (cycled per employee) ───────────────── */
const ROW_PALETTE = [
  { bg: "#e8f8f4", border: "#20c997" },
  { bg: "#f3f4f6", border: "#9ca3af" },
  { bg: "#fff9db", border: "#fbbf24" },
  { bg: "#fde8e8", border: "#f87171" },
  { bg: "#fff3e0", border: "#fb923c" },
  { bg: "#e8f4fd", border: "#60a5fa" },
  { bg: "#f3e8fd", border: "#a78bfa" },
];

/* ── Render the 5 week cells for one employee row ───────────── */
const renderWeekCells = (allocs, weekDays, employee, paletteColor, onEdit) => {
  const weekStartStr = toDateStr(weekDays[0]);
  const weekEndStr   = toDateStr(weekDays[4]);

  if (allocs.length === 0) {
    return (
      <td
        colSpan={5}
        style={{ background: "#fafafa", borderBottom: "1px solid #e5e7eb" }}
      />
    );
  }

  const sorted = [...allocs].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const cells  = [];
  let cursor   = 0;

  for (const alloc of sorted) {
    const clampedStart = alloc.startDate < weekStartStr ? weekStartStr : alloc.startDate;
    const clampedEnd   = alloc.endDate   > weekEndStr   ? weekEndStr   : alloc.endDate;

    const startCol = daysBetween(weekStartStr, clampedStart);
    const endCol   = daysBetween(weekStartStr, clampedEnd);
    const colSpan  = Math.max(1, endCol - startCol + 1);

    /* Empty cells before this block */
    for (let i = cursor; i < startCol; i++) {
      cells.push(
        <td key={`pre-${alloc._id || alloc.id}-${i}`}
          style={{ borderRight: "1px solid #e5e7eb", minWidth: 120 }}
        />
      );
    }

    /* Use STATUS_STYLES for the block colour; fall back to palette */
    const statusKey   = (alloc.status || "").toUpperCase();
    const statusStyle = STATUS_STYLES[statusKey] || {
      bg:        paletteColor.bg,
      border:    paletteColor.border,
      textClass: "text-muted",
      label:     alloc.status || "—",
    };

    cells.push(
      <td
        key={alloc._id || alloc.id || `alloc-${startCol}`}
        colSpan={colSpan}
        style={{
          backgroundColor: statusStyle.bg,
          borderLeft:      `4px solid ${statusStyle.border}`,
          borderBottom:    "1px solid #e5e7eb",
          verticalAlign:   "top",
          padding:         "10px 12px",
          cursor:          "pointer",
          minWidth:        120,
        }}
        onClick={() => onEdit && onEdit(alloc.assignmentId)}
        title="Click to edit"
      >
        <div className="d-flex justify-content-between align-items-start">
          <div style={{ minWidth: 0 }}>
            <div className="fw-semibold" style={{ fontSize: 13, color: "#1f2937" }}>
              {employee.name}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{employee.jobTitle}</div>
            <div className="fw-semibold mt-1" style={{ fontSize: 11, color: "#374151" }}>
              {employee.deptName}
            </div>
            <div
              style={{
                fontSize:     11,
                color:        "#6b7280",
                marginTop:    2,
                overflow:     "hidden",
                whiteSpace:   "nowrap",
                textOverflow: "ellipsis",
                maxWidth:     220,
              }}
            >
              {alloc.taskDescription}
            </div>
          </div>
          <span
            className={`fw-bold ms-2 ${statusStyle.textClass}`}
            style={{ fontSize: 10, whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {statusStyle.label}
          </span>
        </div>
      </td>
    );

    cursor = endCol + 1;
  }

  /* Remaining empty cells */
  for (let i = cursor; i < 5; i++) {
    cells.push(
      <td key={`post-${i}`}
        style={{ borderRight: "1px solid #e5e7eb", minWidth: 120 }}
      />
    );
  }

  return cells;
};

/* ── CalendarView ────────────────────────────────────────────── */
const CalendarView = ({
  assignments,
  employees,
  departments,
  resourceFilter,
  onResourceFilterChange,
  onEditAssignment,
  weekStart,
  onWeekChange,
  resourceCount,
}) => {
  const weekDays     = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  const weekStartStr = toDateStr(weekDays[0]);
  const weekEndStr   = toDateStr(weekDays[4]);

  const prevWeek = () => onWeekChange(addDays(weekStart, -7));
  const nextWeek = () => onWeekChange(addDays(weekStart,  7));

  /* Build dept lookup using _id */
  const deptMap = Object.fromEntries(
    departments.map((d) => [d._id, d.departmentName])
  );

  /* Flatten assignments → calendar entries */
  const calendarEntries = assignments.flatMap((assignment) => {
    const empId = normalizeId(assignment.employeeId);
    return (assignment.allocations || []).map((alloc) => ({
      ...alloc,
      _id:            alloc._id || alloc.id,
      assignmentId:   assignment._id || assignment.id,
      employeeId:     empId,
      taskDescription: assignment.taskDescription,
    }));
  });

  /* Build per-employee rows — only employees who have allocations this week */
  const employeesWithData = employees
    .filter((emp) => {
      if (resourceFilter && emp._id !== resourceFilter) return false;
      return calendarEntries.some((e) => e.employeeId === emp._id);
    })
    .map((emp, idx) => {
      const weekAllocs = calendarEntries.filter(
        (e) =>
          e.employeeId === emp._id &&
          e.startDate <= weekEndStr &&
          e.endDate   >= weekStartStr
      );
      return {
        employee: {
          ...emp,
          deptName: deptMap[normalizeId(emp.departmentId)] || "—",
        },
        weekAllocs,
        palette: ROW_PALETTE[idx % ROW_PALETTE.length],
      };
    });

  return (
    <div className="card">
      <div className="card-body p-0">
        {/* ── Week navigator ── */}
        <div
          className="d-flex align-items-center justify-content-between px-3 py-3"
          style={{ borderBottom: "1px solid #e5e7eb" }}
        >
          <div className="d-flex align-items-center gap-3">
            <span className="fw-bold text-primary" style={{ fontSize: 15, whiteSpace: "nowrap" }}>
              {resourceCount} Resource{resourceCount !== 1 ? "s" : ""}
            </span>

            <button className="btn btn-light btn-sm px-2" onClick={prevWeek} title="Previous week">
              <i className="fa fa-chevron-left" />
            </button>

            <div className="d-flex align-items-center gap-2">
              <i className="fa fa-calendar text-muted" />
              <span className="fw-semibold" style={{ fontSize: 14 }}>
                {formatRange(weekDays[0], weekDays[4])}
              </span>
            </div>

            <button className="btn btn-light btn-sm px-2" onClick={nextWeek} title="Next week">
              <i className="fa fa-chevron-right" />
            </button>
          </div>

          {/* Resource filter */}
          <div style={{ minWidth: 180 }}>
            <div className="input-group input-group-sm">
              <select
                className="form-control"
                value={resourceFilter}
                onChange={(e) => onResourceFilterChange(e.target.value)}
              >
                <option value="">All Resources</option>
                {employees.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.name}
                  </option>
                ))}
              </select>
              <span className="input-group-text">
                <i className="fa fa-search" />
              </span>
            </div>
          </div>
        </div>

        {/* ── Calendar grid ── */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ width: 64, padding: "8px 12px" }} />
                {weekDays.map((day) => (
                  <th
                    key={toDateStr(day)}
                    style={{
                      padding:    "8px 12px",
                      textAlign:  "left",
                      fontWeight: 600,
                      fontSize:   13,
                      color:      "#374151",
                      borderLeft: "1px solid #e5e7eb",
                      minWidth:   140,
                    }}
                  >
                    {formatDayName(day)}
                    <div style={{ fontWeight: 400, color: "#9ca3af", fontSize: 11 }}>
                      {formatHeader(day)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {employeesWithData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-5" style={{ fontSize: 14 }}>
                    <i className="fa fa-calendar-o fa-2x d-block mb-2" />
                    No allocations for this week.
                  </td>
                </tr>
              ) : (
                employeesWithData.map(({ employee, weekAllocs, palette }) => (
                  <tr key={employee._id} style={{ minHeight: 80 }}>
                    {/* Initials avatar */}
                    <td
                      style={{
                        width:         64,
                        padding:       "10px 8px",
                        textAlign:     "center",
                        verticalAlign: "middle",
                        borderRight:   "1px solid #e5e7eb",
                        borderBottom:  "1px solid #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          width:           36,
                          height:          36,
                          borderRadius:    "50%",
                          background:      palette.border,
                          color:           "#fff",
                          display:         "flex",
                          alignItems:      "center",
                          justifyContent:  "center",
                          fontSize:        12,
                          fontWeight:      700,
                          margin:          "0 auto",
                        }}
                      >
                        {employee.initials}
                      </div>
                    </td>

                    {renderWeekCells(weekAllocs, weekDays, employee, palette, onEditAssignment)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Legend ── */}
        <div
          className="d-flex gap-3 flex-wrap px-3 py-2"
          style={{ borderTop: "1px solid #e5e7eb", fontSize: 12 }}
        >
          {Object.entries(STATUS_STYLES).map(([key, s]) => (
            <span key={key} className="d-flex align-items-center gap-1">
              <span
                style={{
                  width:        10,
                  height:       10,
                  borderRadius: 2,
                  background:   s.bg,
                  border:       `2px solid ${s.border}`,
                  display:      "inline-block",
                }}
              />
              <span className="text-muted">{s.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;