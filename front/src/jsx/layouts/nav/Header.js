import React from "react";
import LogoutPage from './Logout';
/// Image
import profile from "../../../images/profile/12.png";
import { Dropdown } from "react-bootstrap";
import { useSelector } from "react-redux";
import { resolveUploadedAssetUrl } from "../../../config/api";
import { Link } from "react-router-dom";

const Header = ({ onNote, toggle, onProfile, onActivity, onNotification}) => {
   const auth = useSelector((state) => state?.auth?.auth || {});
   const displayName =
      auth?.userName || "User";
   const avatarSrc =
      resolveUploadedAssetUrl(auth?.imageUrl) ||
      profile;

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
                    

                     <Dropdown as="li"
                        className={`nav-item header-profile`} 
                        // onClick={() => onProfile()}
                     >
                        <Dropdown.Toggle to={"#"} as="a"
                           className="nav-link  i-false"                           
                        >
                           <div className="header-info">
                              {/* <small>Good Morning</small> */}
                              <span>{displayName}</span>
                           </div>
                           <img src={avatarSrc} width="20" alt="" />
                        </Dropdown.Toggle>
                        <Dropdown.Menu align="end"
                           className={`dropdown-menu  ${
                              toggle === "profile" ? "show" : ""
                           }`}
                        >
                           <Link to="/my-profile" className="dropdown-item ai-icon">
                              <svg
                                 id="icon-user1"
                                 xmlns="http://www.w3.org/2000/svg"
                                 className="text-primary"
                                 width="18"
                                 height="18"
                                 viewBox="0 0 24 24"
                                 fill="none"
                                 stroke="currentColor"
                                 strokeWidth="2"
                                 strokeLinecap="round"
                                 strokeLinejoin="round"
                              >
                                 <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                 <circle cx="12" cy="7" r="4"></circle>
                              </svg>
                              <span className="ms-2">My Profile</span>
                           </Link>
                           {/* <Link
                              to="/app-profile"
                              className="dropdown-item ai-icon"
                           >
                              <svg
                                 id="icon-user1"
                                 xmlns="http://www.w3.org/2000/svg"
                                 className="text-primary"
                                 width="18"
                                 height="18"
                                 viewBox="0 0 24 24"
                                 fill="none"
                                 stroke="currentColor"
                                 strokeWidth="2"
                                 strokeLinecap="round"
                                 strokeLinejoin="round"
                              >
                                 <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                 <circle cx="12" cy="7" r="4"></circle>
                              </svg>
                              <span className="ms-2">Profile </span>
                           </Link> */}
                           {/* <Link
                              to="/email-inbox"
                              className="dropdown-item ai-icon"
                           >
                              <svg
                                 id="icon-inbox"
                                 xmlns="http://www.w3.org/2000/svg"
                                 className="text-success"
                                 width="18"
                                 height="18"
                                 viewBox="0 0 24 24"
                                 fill="none"
                                 stroke="currentColor"
                                 strokeWidth="2"
                                 strokeLinecap="round"
                                 strokeLinejoin="round"
                              >
                                 <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                 <polyline points="22,6 12,13 2,6"></polyline>
                              </svg>
                              <span className="ms-2">Inbox </span>
                           </Link> */}
                           <LogoutPage />
                        </Dropdown.Menu>
                     </Dropdown>
					 
                  </ul>
               </div>
            </nav>
         </div>
      </div>
   );
};

export default Header;
