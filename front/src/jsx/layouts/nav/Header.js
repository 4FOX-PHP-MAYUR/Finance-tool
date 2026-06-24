import React from "react";
/// Image
import romeoLogo from "../../../images/ask-romeo-logo.png";

const Header = ({ onNote, toggle, onProfile, onActivity, onNotification}) => {
   var path = window.location.pathname.split("/");
   var name = path[path.length - 1].split("-");
   var filterName = name.length >= 3 ? name.filter((n, i) => i > 0) : name;
   var finalName = filterName.includes("app")
      ? filterName.filter((f) => f !== "app")
      : filterName.includes("ui")
      ? filterName.filter((f) => f !== "ui")
      : filterName.includes("uc")
      ? filterName.filter((f) => f !== "uc")
      : filterName.includes("basic")
      ? filterName.filter((f) => f !== "basic")
      : filterName.includes("form")
      ? filterName.filter((f) => f !== "form")
      : filterName.includes("table")
      ? filterName.filter((f) => f !== "table")
      : filterName.includes("page")
      ? filterName.filter((f) => f !== "page")
      : filterName.includes("email")
      ? filterName.filter((f) => f !== "email")
      : filterName.includes("ecom")
      ? filterName.filter((f) => f !== "ecom")
      : filterName.includes("chart")
      ? filterName.filter((f) => f !== "chart")
      : filterName.includes("editor")
      ? filterName.filter((f) => f !== "editor")
      : filterName;
	
   const routeKey = path[path.length - 1] || "";
   const routeTitleOverrides = {
      "assign-vendor-list": "Assigned Vendors",
   };
   const shouldHideBulkInHeader =
      routeKey === "assign-vendor-hod-bulk-edit" ||
      routeKey === "assign-vendor-finance-bulk-edit";
   const headerTokens = shouldHideBulkInHeader
      ? finalName.filter((token) => token !== "bulk")
      : finalName;
	var page_name =
      routeTitleOverrides[routeKey] ||
      ((headerTokens.join(" ") === "") ? "Dashboard" : headerTokens.join(" "));	
	  
   return (
      <div className="header">
         <div className="header-content">
            <nav className="navbar navbar-expand">
               <div className="collapse navbar-collapse justify-content-between">
                  <div className="header-left">
                     <div
                        className="dashboard_bar"
                        style={{ textTransform: "capitalize" }}
                     >
                        {page_name}
                     </div>
                  </div>

                  <ul className="navbar-nav header-right">
                     <li className="nav-item header-romeo-logo">
                        <img src={romeoLogo} alt="Ask Romeo" className="header-romeo-logo-img" />
                     </li>
					 
                  </ul>
               </div>
            </nav>
         </div>
      </div>
   );
};

export default Header;
