const mongoose = require("mongoose");

const ModuleSchema = new mongoose.Schema(
  {
    moduleName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    /** Optional logical group for assign-permissions UI (e.g. `vendors` for vendor submodules). */
    parentModule: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "Modules",
  }
);

const Module = mongoose.model("Modules", ModuleSchema);

module.exports = Module;
