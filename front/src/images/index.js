import React, { useContext, useEffect, useMemo, useState } from 'react'
/// React router dom
import {Routes, Route, Outlet, Navigate } from 'react-router-dom'
/// Css
import './index.css'
import './chart.css'
import './step.css'

/// Layout
import Nav from './layouts/nav'
import Footer from './layouts/Footer'

/// Dashboard
import Home from "./components/Dashboard/Home/Home";
import Analytics from "./components/Dashboard/Analytics/Analytics";
import Review from "./components/Dashboard/Review/Review";
import Order from "./components/Dashboard/Order/Order";
import Orderlist from "./components/Dashboard/Orderlist/Orderlist";
import Customerlist from "./components/Dashboard/Customerlist/Customerlist";
import Task from './components/Dashboard/Task';

/// Users
import AddUser from './components/User/AddUser'
import EditUser from './components/User/EditUser'
import UserList from './components/User/UserList'

/// User Management (mock)
import AddUserMgmt from './components/UserManagement/AddUserMgmt'
import UserMgmtList from './components/UserManagement/UserMgmtList'

/// Roles
import AddRole from './components/Role/AddRole'
import RoleList from './components/Role/RoleList'

/// Employee Assignment (mock)
import ResourceAllocation from './components/EmployeeAssignment/ResourceAllocation'

/// Role Permissions (mock)
import AssignPermissions from './components/RolePermissions/AssignPermissions'
import ManagePermissions from './components/RolePermissions/ManagePermissions'

/// Project Management (mock)
import AddProject from './components/ProjectManagement/AddProject'
import ProjectList from './components/ProjectManagement/ProjectList'

/// Client Management (mock)
import AddClient from './components/ClientManagement/AddClient'
import ClientList from './components/ClientManagement/ClientList'

/// Vendor Management
import AddVendor from './components/VendorManagement/AddVendor'
import VendorList from './components/VendorManagement/VendorList'
import AddAssignVendor from './components/AssignVendor/AddAssignVendor'
import AssignVendorList from './components/AssignVendor/AssignVendorList'
import AssignVendorBulkEdit from './components/AssignVendor/AssignVendorBulkEdit'
import AssignVendorHodBulkEdit from './components/AssignVendor/AssignVendorHodBulkEdit'
import AssignVendorFinanceBulkEdit from './components/AssignVendor/AssignVendorFinanceBulkEdit'
import AssignVendorHodReviewList from './components/AssignVendor/AssignVendorHodReviewList'
import AssignVendorFinanceReviewList from './components/AssignVendor/AssignVendorFinanceReviewList'
import AssignVendorAdminApprovalList from './components/AssignVendor/AssignVendorAdminApprovalList'

/// Department Management (mock)
import AddDepartment from './components/DepartmentManagement/AddDepartment'
import DepartmentList from './components/DepartmentManagement/DepartmentList'

/// Resource Allocation Module
import AddResourceAllocation from './components/ResourceAllocation/AddResourceAllocation'
import ResourceAllocationList from './components/ResourceAllocation/ResourceAllocationList'

/// BO (Business Orders) — invoice PDF extract
import BusinessOrdersManagement from './components/BusinessOrdersManagement/BusinessOrdersManagement'

/// App
import AppProfile from './components/AppsMenu/AppProfile/AppProfile'
import PostDetails from './components/AppsMenu/AppProfile/PostDetails'
import Compose from './components/AppsMenu/Email/Compose/Compose'
import Inbox from './components/AppsMenu/Email/Inbox/Inbox'
import Read from './components/AppsMenu/Email/Read/Read'
import Calendar from './components/AppsMenu/Calendar/Calendar'

/// Product List
import ProductGrid from './components/AppsMenu/Shop/ProductGrid/ProductGrid'
import ProductList from './components/AppsMenu/Shop/ProductList/ProductList'
import ProductDetail from './components/AppsMenu/Shop/ProductGrid/ProductDetail'
import Checkout from './components/AppsMenu/Shop/Checkout/Checkout'
import Invoice from './components/AppsMenu/Shop/Invoice/Invoice'
import ProductOrder from './components/AppsMenu/Shop/ProductOrder'
import EcomCustomers from './components/AppsMenu/Shop/Customers/Customers'

/// Charts
import RechartJs from './components/charts/rechart'
import ChartJs from './components/charts/Chartjs'
import SparklineChart from './components/charts/Sparkline'
import ApexChart from './components/charts/apexcharts'

/// Bootstrap
import UiAlert from './components/bootstrap/Alert'
import UiAccordion from './components/bootstrap/Accordion'
import UiBadge from './components/bootstrap/Badge'
import UiButton from './components/bootstrap/Button'
import UiModal from './components/bootstrap/Modal'
import UiButtonGroup from './components/bootstrap/ButtonGroup'
import UiListGroup from './components/bootstrap/ListGroup'
import UiCards from './components/bootstrap/Cards'
import UiCarousel from './components/bootstrap/Carousel'
import UiDropDown from './components/bootstrap/DropDown'
import UiPopOver from './components/bootstrap/PopOver'
import UiProgressBar from './components/bootstrap/ProgressBar'
import UiTab from './components/bootstrap/Tab'
import UiPagination from './components/bootstrap/Pagination'
import UiGrid from './components/bootstrap/Grid'
import UiTypography from './components/bootstrap/Typography'

/// Plugins
import Select2 from './components/PluginsMenu/Select2/Select2'
import Nestable from './components/PluginsMenu/Nestable/Nestable'
import MainSweetAlert from './components/PluginsMenu/SweetAlert/SweetAlert'
import Toastr from './components/PluginsMenu/Toastr/Toastr'
import JqvMap from './components/PluginsMenu/JqvMap/JqvMap'
import Lightgallery from './components/PluginsMenu/Lightgallery/Lightgallery'


/// Widget
import Widget from './pages/Widget'

/// Table
import DataTable from './components/table/DataTable'
import BootstrapTable from './components/table/BootstrapTable'
import SortingTable from "./components/table/SortingTable/SortingTable";
import FilteringTable from "./components/table/FilteringTable/FilteringTable";


/// Form
import Element from './components/Forms/Element/Element'
import Wizard from './components/Forms/Wizard/Wizard'
import CkEditor from './components/Forms/CkEditor/CkEditor'
import Pickers from './components/Forms/Pickers/Pickers'
import FormValidation from './components/Forms/FormValidation/FormValidation'

/// Pages
import LockScreen from './pages/LockScreen'
import Error400 from './pages/Error400'
import Error403 from './pages/Error403'
import Error404 from './pages/Error404'
import Error500 from './pages/Error500'
import Error503 from './pages/Error503'
import Todo from './pages/Todo';
import MyProfile from './components/Profile/MyProfile';

import { ThemeContext } from "../context/ThemeContext";
import { fetchMyPermissions } from "../services/permissionService";
//Scroll To Top
import ScrollToTop from './layouts/ScrollToTop';

const Markup = () => {
  
  const allroutes = [
    /// Dashboard
    { url: "", component: <Home /> },
    { url: "dashboard", component: <Home />, moduleKey: "dashboard" },
    // { url: "companies", component: <Companies/> },
    { url: "analytics", component: <Analytics/> },
    { url: "review", component: <Review/> },
    { url: "order", component: <Order/> },
    { url: "order-list", component: <Orderlist/> },
    { url: "customer-list", component: <Customerlist/> },
    { url: 'task', component: <Task/> },

    /// Users
    { url: 'user-add', component: <AddUser/> },
    { url: 'user-list', component: <UserList/> },
    { url: 'user-edit/:id', component: <EditUser/> },

    /// Roles
    { url: 'role-add', component: <AddRole/>, moduleKey: "roles_add" },
    { url: 'role-list', component: <RoleList/>, moduleKey: "roles_list" },

    /// Employee Assignment (mock)
    { url: 'resource-allocation', component: <ResourceAllocation/> },

    /// Role Permissions (mock)
    { url: 'permissions-assign', component: <AssignPermissions/>, moduleKey: "permissions_assign" },
    { url: 'permissions-manage', component: <ManagePermissions/>, moduleKey: "permissions_manage" },

    /// Project Management (mock)
    { url: 'project-add', component: <AddProject/>, moduleKey: "projects_add" },
    { url: 'project-list', component: <ProjectList/>, moduleKey: "projects_list" },

    /// Client Management (mock)
    { url: 'client-add', component: <AddClient/>, moduleKey: "clients_add" },
    { url: 'client-list', component: <ClientList/>, moduleKey: "clients_list" },

    /// Vendor Management
    { url: 'vendor-add', component: <AddVendor/>, moduleKey: "vendor_add" },
    { url: 'vendor-list', component: <VendorList/>, moduleKey: "vendor_list" },
    { url: 'assign-vendor-add', component: <AddAssignVendor/>, moduleKey: "assign_vendor" },
    { url: 'assign-vendor-list', component: <AssignVendorList/>, moduleKey: "assigned_vendors" },
    { url: 'assign-vendor-bulk-edit', component: <AssignVendorBulkEdit/> },
    { url: 'assign-vendor-hod-bulk-edit', component: <AssignVendorHodBulkEdit/> },
    { url: 'assign-vendor-finance-bulk-edit', component: <AssignVendorFinanceBulkEdit/> },
    { url: 'assign-vendor-hod-review', component: <AssignVendorHodReviewList/>, moduleKey: "vendor_hod_review" },
    { url: 'assign-vendor-finance-review', component: <AssignVendorFinanceReviewList/>, moduleKey: "vendor_finance_review" },
    { url: 'assign-vendor-admin-approval', component: <AssignVendorAdminApprovalList/>, moduleKey: "assigned_vendors" },

    /// User Management (mock)
    { url: 'mgmt-user-add', component: <AddUserMgmt/> },
    { url: 'mgmt-user-list', component: <UserMgmtList/> },

    /// Department Management (mock)
    { url: 'department-add', component: <AddDepartment/>, moduleKey: "departments" },
    { url: 'department-list', component: <DepartmentList/>, moduleKey: "departments" },

    /// Resource Allocation Module
    { url: 'resource-allocation-add', component: <AddResourceAllocation/>, moduleKey: "resource_allocation" },
    { url: 'resource-allocation-list', component: <ResourceAllocationList/>, moduleKey: "resource_allocation" },

    /// SO — Uploads (invoice PDF / SOW)
    { url: 'so-uploads', component: <BusinessOrdersManagement/>, moduleKey: "so" },

    /// Apps
    { url: 'app-profile', component: <AppProfile/> },
    { url: 'post-details', component: <PostDetails/> },
    { url: 'email-compose', component: <Compose/> },
    { url: 'email-inbox', component: <Inbox/> },
    { url: 'email-read', component: <Read/> },
    { url: 'app-calender', component: <Calendar/> },
    

    /// Chart
    { url: 'chart-sparkline', component: <SparklineChart/> },
    { url: 'chart-chartjs', component: <ChartJs/> },    
    { url: 'chart-apexchart', component: <ApexChart/> },
    { url: 'chart-rechart', component: <RechartJs/> },

    /// Bootstrap
    { url: 'ui-alert', component: <UiAlert/> },
    { url: 'ui-badge', component: <UiBadge/> },
    { url: 'ui-button', component: <UiButton/> },
    { url: 'ui-modal', component: <UiModal/> },
    { url: 'ui-button-group', component: <UiButtonGroup/> },
    { url: 'ui-accordion', component: <UiAccordion/> },
    { url: 'ui-list-group', component: <UiListGroup/> },
    { url: 'ui-card', component: <UiCards/> },
    { url: 'ui-carousel', component: <UiCarousel/> },
    { url: 'ui-dropdown', component: <UiDropDown/> },
    { url: 'ui-popover', component: <UiPopOver/> },
    { url: 'ui-progressbar', component: <UiProgressBar/> },
    { url: 'ui-tab', component: <UiTab/> },
    { url: 'ui-pagination', component: <UiPagination/> },
    { url: 'ui-typography', component: <UiTypography/> },
    { url: 'ui-grid', component: <UiGrid/> },

    /// Plugin
    { url: 'uc-select2', component: <Select2/> },
    { url: 'uc-nestable', component: <Nestable/> },
    { url: 'uc-sweetalert', component: <MainSweetAlert/> },
    { url: 'uc-toastr', component: <Toastr/> },
    { url: 'map-jqvmap', component: <JqvMap/> },
    { url: 'uc-lightgallery', component: <Lightgallery/> },


    /// Widget
    { url: 'widget-basic', component: <Widget/> },

    /// Shop
    { url: 'ecom-product-grid', component: <ProductGrid/> },
    { url: 'ecom-product-list', component: <ProductList/> },
    { url: 'ecom-product-detail', component: <ProductDetail/> },
    { url: 'ecom-product-order', component: <ProductOrder/> },
    { url: 'ecom-checkout', component: <Checkout/> },
    { url: 'ecom-invoice', component: <Invoice/> },
    { url: 'ecom-product-detail', component: <ProductDetail/> },
    { url: 'ecom-customers', component: <EcomCustomers/> },

    /// Form
    
       
    { url: 'form-element', component: <Element/> },
    { url: 'form-wizard', component: <Wizard/> },
    { url: 'form-ckeditor', component: <CkEditor/> },
    { url: 'form-pickers', component: <Pickers/> },
    { url: 'form-validation', component: <FormValidation/> },

    /// table
    { url: 'table-datatable-basic', component: <DataTable/> },
    { url: 'table-bootstrap-basic', component: <BootstrapTable/> },
    { url: 'table-filtering', component: <FilteringTable/> },
    { url: 'table-sorting', component: <SortingTable/> },

    /// pages
    { url: 'page-lock-screen', component: <LockScreen/> },  
    { url: 'todo', component: Todo },
    { url: 'my-profile', component: <MyProfile /> },
  ]

  return (
       <>          
          <Routes>
            <Route path='/page-lock-screen' element= {<LockScreen />} />
            <Route path='/page-error-400' element={<Error400/>} />
            <Route path='/page-error-403' element={<Error403/>} />
            <Route path='/page-error-404' element={<Error404/>} />
            <Route path='/page-error-500' element={<Error500/>} />
            <Route path='/page-error-503' element={<Error503/>} />
            <Route  element={<MainLayout />} > 
                <Route path="business-orders-management" element={<Navigate to="so-uploads" replace />} />
                <Route path="bo-uploads" element={<Navigate to="so-uploads" replace />} />
                <Route path="so" element={<Navigate to="so-uploads" replace />} />
                {allroutes.map((data, i) => (
                  <Route
                    key={i}
                    exact
                    path={`${data.url}`}
                    element={<PermissionProtected moduleKey={data.moduleKey}>{data.component}</PermissionProtected>}
                  />
                ))}
            </Route>           
          </Routes>      
         <ScrollToTop />
       </>
  )
}

function MainLayout(){  
  const { menuToggle, sidebariconHover } = useContext(ThemeContext);
  return (
    <>
      <div id="main-wrapper" className={`show ${sidebariconHover ? "iconhover-toggle": ""} ${ menuToggle ? "menu-toggle" : ""}`}>  
        <Nav />
        <div className="content-body" style={{ minHeight: window.screen.height - 45 }}>
            <div className="container-fluid">
              <Outlet />                
            </div>
        </div>
        <Footer />
      </div>
    </>
  )
};

function PermissionProtected({ moduleKey, children }) {
  const [loading, setLoading] = useState(Boolean(moduleKey));
  const [allowedKeys, setAllowedKeys] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!moduleKey) {
      setLoading(false);
      setAllowedKeys(null);
      return () => {};
    }
    fetchMyPermissions()
      .then((doc) => {
        if (cancelled) return;
        if (!doc?.assigned) {
          setAllowedKeys(null);
          return;
        }
        const keys = new Set(
          (doc.permissions || [])
            .filter((p) => Boolean(p?.access?.view))
            .map((p) => String(p.moduleName || "").toLowerCase().trim())
            .filter(Boolean)
        );
        setAllowedKeys(keys);
      })
      .catch(() => {
        if (!cancelled) setAllowedKeys(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [moduleKey]);

  const allowed = useMemo(() => {
    if (!moduleKey) return true;
    if (allowedKeys == null) return true;
    return allowedKeys.has(String(moduleKey).toLowerCase().trim());
  }, [allowedKeys, moduleKey]);

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
  if (!allowed) return <Error403 />;
  return children;
}
export default Markup
