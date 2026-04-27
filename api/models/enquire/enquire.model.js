const mongoose = require("mongoose");
const autopopulate = require("mongoose-autopopulate");

const EnquireSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
   /*  nationality: {
      type: String,
      required: true,
    }, */
    noOfBedrooms: {
      type: String,
      required: true,
    },
    isAgreeCommunication: {
      type: Boolean,
      default: false,
    },
      isAgreeMarketing: {
      type: Boolean,
      default: false,
    },
    projectID: {
      type: String,
      required: false,
    },
    clientIp: {
      type: String,
      required: false,
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "Enquire",
  }
);

EnquireSchema.plugin(autopopulate);
const Enquire = mongoose.model("Enquire", EnquireSchema);

module.exports = Enquire;
