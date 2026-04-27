const mongoose = require("mongoose");

/** Logical module key for assign-vendor / assign flows (permissions, checks). */
const ASSIGN_MODULE_KEY = "assign";

/** Allowed roles within the assign module. */
const ASSIGN_ROLES = Object.freeze({
  USER: "user",
  ADMIN: "admin",
});

const assignModuleRoleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: [true, "userId is required"],
      index: true,
    },
    moduleKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      default: ASSIGN_MODULE_KEY,
    },
    role: {
      type: String,
      required: [true, "role is required"],
      enum: [ASSIGN_ROLES.USER, ASSIGN_ROLES.ADMIN],
    },
  },
  {
    timestamps: true,
    collection: "AssignModuleRoles",
  },
);

assignModuleRoleSchema.index({ userId: 1, moduleKey: 1 }, { unique: true });

const AssignModuleRole = mongoose.model("AssignModuleRole", assignModuleRoleSchema);

module.exports = AssignModuleRole;
module.exports.ASSIGN_MODULE_KEY = ASSIGN_MODULE_KEY;
module.exports.ASSIGN_ROLES = ASSIGN_ROLES;
