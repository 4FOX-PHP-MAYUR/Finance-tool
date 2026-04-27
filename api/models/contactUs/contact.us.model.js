const mongoose = require("mongoose");
const autopopulate = require("mongoose-autopopulate");

const ContactUsSchema = new mongoose.Schema(
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
    message: {
      type: String,
      required: false,
    },
      clientIp: {
      type: String,
      required: false,
    },
    // enquireType: {
    //   type: String,
    //   enum: Object.values(EnquireType),
    //   default: "Enquire",
    //   required: true,
    // },
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
    collection: "ContactUs",
  }
);

ContactUsSchema.plugin(autopopulate);
const ContactUs = mongoose.model("ContactUs", ContactUsSchema);

module.exports = ContactUs;
