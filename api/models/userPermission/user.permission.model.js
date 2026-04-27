const mongoose = require("mongoose");

const UserPermissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      unique: true,
    },
    permissions: [
      {
        module: {
          type: String,
          required: true,
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
    collection: "UserPermissions",
  }
);


const UserPermission = mongoose.model("UserPermissions", UserPermissionSchema);

module.exports = UserPermission;
