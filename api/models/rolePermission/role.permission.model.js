const mongoose = require("mongoose");

const RolePermissionSchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
      unique: true,
    },
    permissions: [
      {
        moduleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Modules",
          required: true,
          index: true,
        },
        moduleName: {
          type: String,
          required: false,
          trim: true,
          lowercase: true,
        },
        access: {
          view: { type: Boolean, default: false },
          add: { type: Boolean, default: false },
          update: { type: Boolean, default: false },
          delete: { type: Boolean, default: false },
        },
      },
    ],
  },
  {
    timestamps: true,
    collection: "RolePermissions",
  }
);


const RolePermission = mongoose.model("RolePermissions", RolePermissionSchema);

module.exports = RolePermission;
