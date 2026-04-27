/**
 * moduleKey matches api/models/module (lowercase) — used for role-based menu visibility.
 */
export const MenuList = [
    //Dashboard
    {
        title: 'Dashboard',	
        classsChange: 'mm-collapse',		
        iconStyle: <i className="flaticon-dashboard-1"></i>,
        content: [
            {
                title: 'Dashboard',
                to: 'dashboard',
                moduleKey: 'dashboard',
            },    
        ],
    },

    // SO — Business Orders (invoice PDF extract)
    {
        title: 'SO',
        classsChange: 'mm-collapse',
        iconStyle: <i className="flaticon-invoice"></i>,
        content: [
            {
                title: 'Uploads',
                to: 'so-uploads',
                moduleKey: 'so',
            },
        ],
    },
    
    //Users
    // {
    //     title: 'Users',
    //     classsChange: 'mm-collapse',
    //     iconStyle: <i className="flaticon-381-user"></i>,
    //     content: [
    //         {
    //             title: 'Add User',
    //             to: 'user-add',
    //         },
    //         {
    //             title: 'Edit User',
    //             to: 'user-list',
    //         },
    //     ],
    // },

    //User Management
    {
        title: 'User',
        classsChange: 'mm-collapse',
        iconStyle: <i className="flaticon-user"></i>,
        content: [
            {
                title: 'Add User',
                to: 'mgmt-user-add',
                moduleKey: 'users_add',
            },
            {
                title: 'Manage Users',
                to: 'mgmt-user-list',
                moduleKey: 'users_list',
            },
        ],
    },

    // Roles
    {
        title: 'Roles',
        classsChange: 'mm-collapse',
        iconStyle: <i className="flaticon-tickets-1"></i>,
        content: [
            {
                title: 'Add Role',
                to: 'role-add',
                moduleKey: 'roles_add',
            },
            {
                title: 'Manage Roles',
                to: 'role-list',
                moduleKey: 'roles_list',
            },
        ],
    },

    // Role ↔ module access
    {
        title: 'Permissions',
        classsChange: 'mm-collapse',
        iconStyle: <i className="flaticon-settings-1"></i>,
        content: [
            {
                title: 'Assign Permissions',
                to: 'permissions-assign',
                moduleKey: 'permissions_assign',
            },
            {
                title: 'Manage Permissions',
                to: 'permissions-manage',
                moduleKey: 'permissions_manage',
            },
        ],
    },

    //Client Management
    {
        title: 'Client',
        classsChange: 'mm-collapse',
        iconStyle: <i className="flaticon-form-1"></i>,
        content: [
            {
                title: 'Add Client',
                to: 'client-add',
                moduleKey: 'clients_add',
            },
            {
                title: 'Manage Clients',
                to: 'client-list',
                moduleKey: 'clients_list',
            },
        ],
    },

    //Vendor Management
    {
        title: 'Vendor',
        classsChange: 'mm-collapse',
        iconStyle: <i className="flaticon-form-1"></i>,
        content: [
            {
                title: 'Add Vendor',
                to: 'vendor-add',
                moduleKey: 'vendor_add',
            },
            {
                title: 'Manage Vendors',
                to: 'vendor-list',
                moduleKey: 'vendor_list',
            },
            {
                title: 'Assign vendor',
                to: 'assign-vendor-add',
                moduleKey: 'assign_vendor',
            },
            {
                title: 'Assigned vendors',
                to: 'assign-vendor-list',
                moduleKey: 'assigned_vendors',
            },
            {
                title: 'HOD review',
                to: 'assign-vendor-hod-review',
                moduleKey: 'vendor_hod_review',
            },
            {
                title: 'Finance review',
                to: 'assign-vendor-finance-review',
                moduleKey: 'vendor_finance_review',
            },
            {
                title: 'Admin approval',
                to: 'assign-vendor-admin-approval',
                moduleKey: 'assigned_vendors',
            },
        ],
    },


    //Project Management
    {
        title: 'Project',
        classsChange: 'mm-collapse',
        iconStyle: <i className="flaticon-form-1"></i>,
        content: [
            {
                title: 'Add Project',
                to: 'project-add',
                moduleKey: 'projects_add',
            },
            {
                title: 'Manage Projects',
                to: 'project-list',
                moduleKey: 'projects_list',
            },
        ],
    },

    
    

    //Department Management
    {
        title: 'Department',
        classsChange: 'mm-collapse',
        iconStyle: <i className="flaticon-form"></i>,
        content: [
            {
                title: 'Add',
                to: 'department-add',
                moduleKey: 'departments',
            },
            {
                title: 'Manage',
                to: 'department-list',
                moduleKey: 'departments',
            },
        ],
    },

    
    
]