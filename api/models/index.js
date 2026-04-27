const mongoose = require("mongoose");
const environment = process.env.NODE_ENV || "development";
var config = require("config");

require("dotenv").config();
const mongoString = require("../config/mongoUri");
mongoose.connect(mongoString);
const database = mongoose.connection;

database.on("error", (error) => {
  console.log(error);
});

database.once("connected", () => {
  console.log("Database Connected");
});

const db = {};


db.user = require("./user/user.model");
db.contactUs = require("./contactUs/contact.us.model");
db.enquire = require("./enquire/enquire.model");

db.config = require("./config/config.model");
db.footer = require("./footer/footer.model");
db.role = require("./role/roles.model");
// Permission / module management
db.module = require("./module/module.model");
db.userPermission = require("./userPermission/user.permission.model");
db.rolePermission = require("./rolePermission/role.permission.model");

db.assignModuleRole = require("./assign/assignModuleRole.model");

db.resourceAllocation = require('./resourceAllocation.model');
db.businessOrderInvoice = require('./businessOrderInvoice.model');

db.connection = database;  // This is your mongoose.connection
module.exports = db;
