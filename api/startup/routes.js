// Project Management Module (moved inside function below)
const express = require("express");
var bodyParser = require("body-parser");
const authRoute = require("../routes/auth.routes");

module.exports = function (app) {
    // Project Management Module
    app.use("/api/projects", require("../routes/project.routes"));

    // Department Management Module
    app.use("/api/departments", require("../routes/department.routes"));

  // CORS is applied once in app.js (cors with open origin). Do not add a second cors()
  // here — a whitelist duplicate was rejecting valid browser Origins (domain/IP mismatch).

  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(
    bodyParser.urlencoded({
      limit: "50mb",
      extended: true,
      parameterLimit: 50000,
    })
  );

  app.use("/public", express.static("public"));

  /// One Development Admin Routes ///////////////////////////////////////////////////////////////////////
  const apiPrefix = "/api";
  const adminRoute = `${apiPrefix}/admin`;

  // User Management Module (public registration + auth-protected CRUD)
  app.use('/api/users', require('../routes/user.routes'));

  // User-facing auth (login / logout) — same handlers as admin auth
  app.use('/api/auth', authRoute);

  app.use(`${adminRoute}/auth`, authRoute);
  app.use(`${adminRoute}/role`, require("../routes/role.routes"));
  app.use("/api/role", require("../routes/role.routes"));
  
    // Client Management Module
    app.use("/api/clients", require("../routes/client.routes"));

    // Vendor Management Module
    app.use("/api/vendors", require("../routes/vendor.routes"));

    // Assign vendor (client → project → SO, costs, uploads)
    app.use("/api/assign-vendors", require("../routes/assignVendor.routes"));

  // Dashboard (summary KPIs + status breakdowns)
  app.use("/api/dashboard", require("../routes/dashboard.routes"));

      // Logs/Audit Module
      app.use("/api/logs", require("../routes/log.routes"));

    // Assignment / Resource Allocation Module
    app.use("/api/assignments", require("../modules/assignment/assignment.routes"));

    // Resource Allocation Module
    app.use("/api/resource-allocations", require("../routes/resourceAllocation.routes"));

    // Invoice PDF extract (same logic as /PDF reader project)
    app.use("/api/invoice-pdf", require("../routes/invoicePdf.routes"));

  app.use(`${adminRoute}/contact-us`,require("../routes/admin/contact.us.routes")
  );
  app.use(`${adminRoute}/enquire`, require("../routes/admin/enquire.routes"));
  //app.use(`${adminRoute}/campaign`, require("../routes/admin/campaign.routes"));
  app.use(`${adminRoute}/config`, require("../routes/admin/config.routes"));
  app.use(`${adminRoute}/modules`, require("../routes/admin/module.routes"));
  app.use(`${adminRoute}/permissions`, require("../routes/admin/user.permission.routes"));
  app.use(
    `${adminRoute}/assign-module-roles`,
    require("../routes/admin/assignModuleRole.routes")
  );
  /// One Development Admin Routes END ///////////////////////////////////////////////////////////////////////
  ///
  /// One Development Frontend Routes ////////////////////////////////////////////////////////////////////

  app.use(`${apiPrefix}/home`, require("../routes/frontend/home.routes"));
  app.use(`${apiPrefix}/enquire`, require("../routes/frontend/enquire.routes"));
  app.use(`${apiPrefix}/media`, require("../routes/frontend/media.routes"));
  app.use(
    `${apiPrefix}/our-story`,
    require("../routes/frontend/our.story.routes")
  );
  app.use(`${apiPrefix}/team`, require("../routes/frontend/team.routes"));
  app.use(
    `${apiPrefix}/our-partner`,
    require("../routes/frontend/our.partner.routes")
  );
  app.use(`${apiPrefix}/footer`, require("../routes/frontend/footer.routes"));
  app.use(`${apiPrefix}/project`, require("../routes/frontend/project.routes"));
  app.use(`${apiPrefix}/review`, require("../routes/frontend/review.routes"));
  app.use(
    `${apiPrefix}/visit-us`,
    require("../routes/frontend/visit.us.routes")
  );
  app.use(
    `${apiPrefix}/currency`,
    require("../routes/frontend/currency.routes")
  );

  app.use(
    `${apiPrefix}/our-brand-ambassadors`,
    require("../routes/frontend/our.brand.ambassadors.routes")
  );
  app.use(
    `${apiPrefix}/campaign`,
    require("../routes/frontend/campaign.routes")
  );
  app.use(
    `${apiPrefix}/contact-us`,
    require("../routes/frontend/contact.us.routes")
  );

  app.use(`${apiPrefix}/image`, require("../routes/image.routes"));

  app.use(
    `${apiPrefix}/subscribe`,
    require("../routes/frontend/subscription.routes")
  );
  app.use(`${apiPrefix}/config`, require("../routes/frontend/config.routes"));
  app.use(`${apiPrefix}/project-config`, require("../routes/frontend/project.config.routes"));

  /// One Development Frontend Routes END ////////////////////////////////////////////////////////////////////
  ///

};
