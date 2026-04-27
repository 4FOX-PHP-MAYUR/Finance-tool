const mongoose = require("mongoose");
const autopopulate = require("mongoose-autopopulate");

const FooterSchema = new mongoose.Schema(
  {
    footerLogo: {
      type: String,
      required: true,
    },
    emailIcon: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: false,
      default: "info@oneuae.com",
    },
    phoneIcon: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: false,
      default: "800 663 338",
    },

    copyRights: {
      type: String,
      required: false,
      default: "© ONE Development All Rights Reserved",
    },
      copyRightsAr: {
      type: String,
      required: false,
      default: "© ONE Development All Rights Reserved",
    },
    

    socialLinks: [
      {
        socialIcon: {
          type: String,
          required: false,
        },
        socialLink: {
          type: String,
          required: false,
        },
      },
    ],

    footerAddress: [
      {
        addressIcon: {
          type: String,
          required: false,
        },
        city: {
          type: String,
          required: false,
        },
        cityAr: {
          type: String,
          required: false,
        },
        address: {
          type: String,
          required: false,
        },
        addressAr: {
          type: String,
          required: false,
        },
        phone: {
          type: String,
          required: false,
        },
           addressUrl: {
      type: String,
      required: false,
    },
      },
    ],

    reachUsTitle: {
      type: String,
      required: false,
    },
    reachUsTitleAr: {
      type: String,
      required: false,
    },
    ourOfficeTitle: {
      type: String,
      required: false,
    },
    ourOfficeTitleAr: {
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
    collection: "Footer",
  }
);

FooterSchema.plugin(autopopulate);
const Footer = mongoose.model("Footer", FooterSchema);

module.exports = Footer;
