const express = require("express");
var bodyParser = require("body-parser");
const cors = require("cors");
const authRoute = require("../routes/auth.routes");

module.exports = function (app) {
  var whitelist = ["http://localhost:3000", "http://localhost:5004"];
  var corsOptions = {
    function(origin, callback) {
      if (whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS :"));
      }
    },
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  };

  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(
    bodyParser.urlencoded({
      limit: "50mb",
      extended: true,
      parameterLimit: 50000,
    })
  );

  app.use(cors(corsOptions));
  app.use("/public", express.static("public"));
  const apiPrefix = "/api";
  const adminRoute = `${apiPrefix}/admin`;
  const dhAppRoute = `/dh`;
  const hdAdminPrefix = `${dhAppRoute}${apiPrefix}/admin`;

  // Admin
  app.use(`${adminRoute}/auth`, authRoute);
  app.use(`${adminRoute}/role`, require("../routes/role.routes"));
  app.use(`${adminRoute}/team`, require("../routes/admin/team.routes"));
  app.use(
    `${adminRoute}/our-story`,
    require("../routes/admin/our.story.routes")
  );
  app.use(`${adminRoute}/media`, require("../routes/admin/media.routes"));
  app.use(`${adminRoute}/review`, require("../routes/admin/review.routes"));
  app.use(
    `${adminRoute}/contact-us`,
    require("../routes/admin/contact.us.routes")
  );
  app.use(`${adminRoute}/enquire`, require("../routes/admin/enquire.route"));
  app.use(
    `${adminRoute}/our-partner`,
    require("../routes/admin/our.partner.routes")
  );
  app.use(`${adminRoute}/project`, require("../routes/admin/project.routes"));
  app.use(
    `${adminRoute}/project/building`,
    require("../routes/admin/project.building.routes")
  );
  app.use(
    `${adminRoute}/project/floor`,
    require("../routes/admin/project.floor.routes")
  );
  app.use(
    `${adminRoute}/project/flat`,
    require("../routes/admin/project.flat.route")
  );
  app.use(
    `${adminRoute}/subscription`,
    require("../routes/admin/subscription.routes")
  );
  app.use(`${adminRoute}/country`, require("../routes/admin/country.routes"));
  app.use(`${adminRoute}/footer`, require("../routes/admin/footer.routes"));

  ///Frontend Routes
  app.use(`${apiPrefix}/home`, require("../routes/frontend/home.routes"));
  app.use(`${apiPrefix}/enquire`, require("../routes/frontend/enquire.route"));
  app.use(`${apiPrefix}/media`, require("../routes/frontend/media.routes"));
  app.use(
    `${apiPrefix}/our-story`,
    require("../routes/frontend/ourStory.route")
  );
  app.use(`${apiPrefix}/team`, require("../routes/frontend/team.routes"));
  app.use(
    `${apiPrefix}/our-partner`,
    require("../routes/frontend/our.partner.routes")
  );
  app.use(`${apiPrefix}/footer`, require("../routes/frontend/footer.route"));
  app.use(`${apiPrefix}/project`, require("../routes/frontend/project.route"));

  // Hospitality frontend
  const frontendRoute = "../routes/frontend/dh";
  app.use(
    `${dhAppRoute}${apiPrefix}/team`,
    require(`${frontendRoute}/team.routes`)
  );
  app.use(
    `${dhAppRoute}${apiPrefix}/home`,
    require(`${frontendRoute}/home.routes`)
  );
  app.use(
    `${dhAppRoute}${apiPrefix}/enquire`,
    require(`${frontendRoute}/enquire.route`)
  );
  app.use(
    `${dhAppRoute}${apiPrefix}/media`,
    require(`${frontendRoute}/media.routes`)
  );
  app.use(
    `${dhAppRoute}${apiPrefix}/our-story`,
    require(`${frontendRoute}/ourStory.route`)
  );
  app.use(
    `${dhAppRoute}${apiPrefix}/team`,
    require(`${frontendRoute}/team.routes`)
  );
  app.use(
    `${dhAppRoute}${apiPrefix}/our-partner`,
    require(`${frontendRoute}/our.partner.routes`)
  );
  app.use(
    `${dhAppRoute}${apiPrefix}/footer`,
    require(`${frontendRoute}/footer.route`)
  );
  app.use(
    `${dhAppRoute}${apiPrefix}/project`,
    require(`${frontendRoute}/project.route`)
  );

  // Hospitality Admin
  const adminDHRoute = "../routes/admin/dh";

  app.use(`${hdAdminPrefix}/auth`, authRoute);
  app.use(`${hdAdminPrefix}/role`, require("../routes/role.routes"));
  app.use(`${hdAdminPrefix}/team`, require(`${adminDHRoute}/team.routes`));
  app.use(
    `${hdAdminPrefix}/our-story`,
    require(`${adminDHRoute}/our.story.routes`)
  );
  app.use(`${hdAdminPrefix}/media`, require(`${adminDHRoute}/media.routes`));
  app.use(`${hdAdminPrefix}/review`, require(`${adminDHRoute}/review.routes`));
  app.use(
    `${hdAdminPrefix}/contact-us`,
    require(`${adminDHRoute}/contact.us.routes`)
  );
  app.use(`${hdAdminPrefix}/enquire`, require(`${adminDHRoute}/enquire.route`));
  app.use(
    `${hdAdminPrefix}/our-partner`,
    require(`${adminDHRoute}/our.partner.routes`)
  );
  app.use(
    `${hdAdminPrefix}/project/building`,
    require(`${adminDHRoute}/project.building.routes`)
  );
  app.use(
    `${hdAdminPrefix}/project/floor`,
    require(`${adminDHRoute}/project.floor.routes`)
  );
  app.use(
    `${hdAdminPrefix}/project`,
    require(`${adminDHRoute}/project.routes`)
  );
  app.use(
    `${hdAdminPrefix}/subscription`,
    require(`${adminDHRoute}/subscription.routes`)
  );
  app.use(
    `${hdAdminPrefix}/country`,
    require(`${adminDHRoute}/country.routes`)
  );
  app.use(`${hdAdminPrefix}/footer`, require(`${adminDHRoute}/footer.routes`));
};
