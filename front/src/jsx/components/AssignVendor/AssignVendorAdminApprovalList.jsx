import React from "react";
import AssignVendorList from "./AssignVendorList";

/** Admin/Superadmin approval workflow for assignments older than 4 weeks. */
const AssignVendorAdminApprovalList = () => (
  <AssignVendorList listVariant="admin" />
);

export default AssignVendorAdminApprovalList;
