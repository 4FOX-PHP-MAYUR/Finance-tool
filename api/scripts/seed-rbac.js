require("dotenv").config();

const db = require("../models");
const { normalizeUserEmail, EMAIL_LOOKUP_COLLATION } = require("../utils/normalizeEmail");

const MODULE_DEFAULTS = [
  { moduleName: "dashboard", description: "Dashboard", parentModule: null },
  { moduleName: "so", description: "SO — uploads / business orders", parentModule: null },
  { moduleName: "departments", description: "Departments", parentModule: null },
  { moduleName: "resource_allocation", description: "Resource allocation", parentModule: null },
  { moduleName: "users_add", description: "User — add", parentModule: "users" },
  { moduleName: "users_list", description: "User — manage users", parentModule: "users" },
  { moduleName: "roles_add", description: "Roles — add role", parentModule: "roles" },
  { moduleName: "roles_list", description: "Roles — manage roles", parentModule: "roles" },
  { moduleName: "permissions_assign", description: "Permissions — assign", parentModule: "permissions" },
  { moduleName: "permissions_manage", description: "Permissions — manage", parentModule: "permissions" },
  { moduleName: "clients_add", description: "Clients — add", parentModule: "clients" },
  { moduleName: "clients_list", description: "Clients — manage", parentModule: "clients" },
  { moduleName: "vendor_add", description: "Vendor — add vendor", parentModule: "vendors" },
  { moduleName: "vendor_list", description: "Vendor — manage vendors", parentModule: "vendors" },
  { moduleName: "assign_vendor", description: "Vendor — assign vendor", parentModule: "vendors" },
  { moduleName: "assigned_vendors", description: "Vendor — assigned vendors", parentModule: "vendors" },
  { moduleName: "vendor_hod_review", description: "Vendor — HOD review", parentModule: "vendors" },
  { moduleName: "vendor_finance_review", description: "Vendor — finance review", parentModule: "vendors" },
  { moduleName: "vendor_admin_approval", description: "Vendor — admin approval", parentModule: "vendors" },
  { moduleName: "projects_add", description: "Projects — add", parentModule: "projects" },
  { moduleName: "projects_list", description: "Projects — manage", parentModule: "projects" },
];

const ALL_ACTIONS = { view: true, add: true, update: true, delete: true };
const CRUD_NO_DELETE = { view: true, add: true, update: true, delete: false };
const VIEW_ONLY = { view: true, add: false, update: false, delete: false };

function byModule(moduleList, allowedMap) {
  const byName = new Map(moduleList.map((m) => [String(m.moduleName), m]));
  return Object.entries(allowedMap)
    .map(([moduleName, access]) => {
      const mod = byName.get(moduleName);
      if (!mod) return null;
      return { moduleId: mod._id, moduleName, access };
    })
    .filter(Boolean);
}

async function upsertRole(roleName, description) {
  return db.role.findOneAndUpdate(
    { roleName },
    { roleName, description, status: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function upsertExampleUser({ userName, email, mobileNumber, password, roleId }) {
  const emailKey = normalizeUserEmail(email);
  const existing = await db.user.findOne({ email: emailKey }).collation(EMAIL_LOOKUP_COLLATION);
  if (existing) {
    existing.roleId = roleId;
    existing.isActive = true;
    existing.isDeleted = false;
    await existing.save();
    return existing;
  }
  return db.user.create({
    userName,
    email: emailKey,
    mobileNumber,
    password,
    roleId,
    isActive: true,
    isDeleted: false,
  });
}

async function run() {
  const roleAdmin = await upsertRole("Admin", "Platform administrator with full access.");
  const roleManager = await upsertRole("Manager", "Business manager with operational CRUD access.");
  const roleUser = await upsertRole("User", "Standard user with restricted read/limited write access.");

  for (const moduleDef of MODULE_DEFAULTS) {
    await db.module.updateOne(
      { moduleName: moduleDef.moduleName },
      {
        $set: {
          description: moduleDef.description,
          parentModule: moduleDef.parentModule,
        },
        $setOnInsert: {
          moduleName: moduleDef.moduleName,
        },
      },
      { upsert: true }
    );
  }
  const modules = await db.module.find({});

  const managerMap = {
    dashboard: VIEW_ONLY,
    so: CRUD_NO_DELETE,
    departments: CRUD_NO_DELETE,
    resource_allocation: CRUD_NO_DELETE,
    users_add: VIEW_ONLY,
    users_list: CRUD_NO_DELETE,
    roles_add: VIEW_ONLY,
    roles_list: VIEW_ONLY,
    permissions_assign: VIEW_ONLY,
    permissions_manage: VIEW_ONLY,
    clients_add: CRUD_NO_DELETE,
    clients_list: CRUD_NO_DELETE,
    vendor_add: CRUD_NO_DELETE,
    vendor_list: CRUD_NO_DELETE,
    assign_vendor: CRUD_NO_DELETE,
    assigned_vendors: CRUD_NO_DELETE,
    vendor_hod_review: CRUD_NO_DELETE,
    vendor_finance_review: VIEW_ONLY,
    projects_add: CRUD_NO_DELETE,
    projects_list: CRUD_NO_DELETE,
  };

  const userMap = {
    dashboard: VIEW_ONLY,
    so: VIEW_ONLY,
    assigned_vendors: VIEW_ONLY,
    vendor_hod_review: VIEW_ONLY,
    vendor_finance_review: VIEW_ONLY,
    projects_list: VIEW_ONLY,
    clients_list: VIEW_ONLY,
    vendor_list: VIEW_ONLY,
  };

  await db.rolePermission.findOneAndUpdate(
    { roleId: roleAdmin._id },
    {
      roleId: roleAdmin._id,
      permissions: modules.map((m) => ({
        moduleId: m._id,
        moduleName: m.moduleName,
        access: ALL_ACTIONS,
      })),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await db.rolePermission.findOneAndUpdate(
    { roleId: roleManager._id },
    { roleId: roleManager._id, permissions: byModule(modules, managerMap) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await db.rolePermission.findOneAndUpdate(
    { roleId: roleUser._id },
    { roleId: roleUser._id, permissions: byModule(modules, userMap) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await upsertExampleUser({
    userName: "System Admin",
    email: process.env.SEED_ADMIN_EMAIL || "admin@finance.local",
    mobileNumber: process.env.SEED_ADMIN_MOBILE || "9000000001",
    password: process.env.SEED_ADMIN_PASSWORD || "Admin@12345",
    roleId: roleAdmin._id,
  });
  await upsertExampleUser({
    userName: "Ops Manager",
    email: process.env.SEED_MANAGER_EMAIL || "manager@finance.local",
    mobileNumber: process.env.SEED_MANAGER_MOBILE || "9000000002",
    password: process.env.SEED_MANAGER_PASSWORD || "Manager@12345",
    roleId: roleManager._id,
  });
  await upsertExampleUser({
    userName: "Standard User",
    email: process.env.SEED_USER_EMAIL || "user@finance.local",
    mobileNumber: process.env.SEED_USER_MOBILE || "9000000003",
    password: process.env.SEED_USER_PASSWORD || "User@12345",
    roleId: roleUser._id,
  });

  console.log("RBAC seed completed: roles, modules, permissions, and sample users are up to date.");
  process.exit(0);
}

run().catch((err) => {
  console.error("RBAC seed failed:", err);
  process.exit(1);
});
