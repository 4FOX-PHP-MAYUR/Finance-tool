const { c_success, c_error, c_results, db, msgConf } = require("../../startup/commonModules");
const { invalidateModuleIdNameCache } = require("../../middlewares/permission.middleware");

const ModuleModel = db.module;

/**
 * Master list: submodules use parentModule for grouping in the UI.
 * Upserted on each GET /modules so existing DBs pick up new keys.
 */
const DEFAULT_MODULES = [
  { moduleName: "dashboard", description: "Dashboard", parentModule: null },
  { moduleName: "so", description: "SO — uploads / business orders", parentModule: null },
  { moduleName: "departments", description: "Departments", parentModule: null },
  { moduleName: "resource_allocation", description: "Resource allocation", parentModule: null },

  { moduleName: "users_add", description: "User — add", parentModule: "users" },
  { moduleName: "users_list", description: "User — manage users", parentModule: "users" },

  { moduleName: "roles_add", description: "Roles — add role", parentModule: "roles" },
  { moduleName: "roles_list", description: "Roles — manage roles", parentModule: "roles" },

  {
    moduleName: "permissions_assign",
    description: "Permissions — assign",
    parentModule: "permissions",
  },
  {
    moduleName: "permissions_manage",
    description: "Permissions — manage",
    parentModule: "permissions",
  },

  { moduleName: "clients_add", description: "Clients — add", parentModule: "clients" },
  { moduleName: "clients_list", description: "Clients — manage", parentModule: "clients" },

  { moduleName: "vendor_add", description: "Vendor — add vendor", parentModule: "vendors" },
  { moduleName: "vendor_list", description: "Vendor — manage vendors", parentModule: "vendors" },
  { moduleName: "assign_vendor", description: "Vendor — assign vendor", parentModule: "vendors" },
  { moduleName: "assigned_vendors", description: "Vendor — assigned vendors", parentModule: "vendors" },
  { moduleName: "vendor_hod_review", description: "Vendor — HOD review", parentModule: "vendors" },
  {
    moduleName: "vendor_finance_review",
    description: "Vendor — finance review",
    parentModule: "vendors",
  },
  {
    moduleName: "vendor_admin_approval",
    description: "Vendor — admin approval",
    parentModule: "vendors",
  },

  { moduleName: "projects_add", description: "Projects — add", parentModule: "projects" },
  { moduleName: "projects_list", description: "Projects — manage", parentModule: "projects" },
];

async function ensureDefaultModules() {
  for (const def of DEFAULT_MODULES) {
    const name = def.moduleName.toLowerCase().trim();
    try {
      await ModuleModel.updateOne(
        { moduleName: name },
        {
          $set: {
            description: def.description,
            parentModule: def.parentModule != null ? def.parentModule : null,
          },
          $setOnInsert: { moduleName: name },
        },
        { upsert: true }
      );
    } catch (e) {
      console.error(`ensureDefaultModules failed for ${name}:`, e.message);
    }
  }
  invalidateModuleIdNameCache();
}

exports.createModule = async (req, res) => {
  try {
    const { moduleName, description, parentModule } = req.body;
    if (!moduleName) {
      return res
        .status(400)
        .json(c_error("moduleName is required", res.statusCode));
    }

    const existing = await ModuleModel.findOne({
      moduleName: moduleName.toLowerCase().trim(),
    });
    if (existing) {
      return res
        .status(400)
        .json(c_error("Module already exists", res.statusCode));
    }

    const moduleDoc = await ModuleModel.create({
      moduleName,
      description,
      parentModule: parentModule || null,
    });
    invalidateModuleIdNameCache();
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results("Module created successfully", moduleDoc),
          res.statusCode
        )
      );
  } catch (err) {
    return res
      .status(500)
      .json(c_error(err.message || msgConf.somethingWrong, res.statusCode));
  }
};

exports.getModules = async (req, res) => {
  try {
    await ensureDefaultModules();
    const modules = await ModuleModel.find().sort({ parentModule: 1, moduleName: 1 });
    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results("Modules fetched successfully", modules),
          res.statusCode
        )
      );
  } catch (err) {
    return res
      .status(500)
      .json(c_error(err.message || msgConf.somethingWrong, res.statusCode));
  }
};
