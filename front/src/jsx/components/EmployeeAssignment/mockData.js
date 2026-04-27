/**
 * Employee Assignment — Shared Constants
 * Mock entities removed; only UI constants remain.
 */

/** Status options for allocation time slots (must match backend enum) */
export const ALLOCATION_STATUSES = [
  { value: "AVAILABLE", label: "Available"  },
  { value: "BOOKED",    label: "Booked"     },
  { value: "HALF_DAY",  label: "Half Day"   },
  { value: "ON_LEAVE",  label: "On Leave"   },
];

/** Visual style per status — keys match backend enum values */
export const STATUS_STYLES = {
  AVAILABLE: { bg: "#e8f8f4", border: "#20c997", textClass: "text-success",   label: "AVAILABLE" },
  BOOKED:    { bg: "#fde8e8", border: "#ef4444", textClass: "text-danger",    label: "BOOKED"    },
  HALF_DAY:  { bg: "#fff9db", border: "#fbbf24", textClass: "text-warning",   label: "HALF DAY"  },
  ON_LEAVE:  { bg: "#f3f4f6", border: "#9ca3af", textClass: "text-secondary", label: "ON LEAVE"  },
};