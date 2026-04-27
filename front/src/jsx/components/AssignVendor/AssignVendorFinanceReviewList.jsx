import React from "react";
import AssignVendorList from "./AssignVendorList";

/** Finance-only review workflow (separate menu / route from Assigned vendors and HOD review). */
const AssignVendorFinanceReviewList = () => (
  <AssignVendorList listVariant="finance" />
);

export default AssignVendorFinanceReviewList;
