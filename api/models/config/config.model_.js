const mongoose = require("mongoose");
const autopopulate = require("mongoose-autopopulate");

const ConfigSchema = new mongoose.Schema(
  {
    //Home Page Config
    homeBannerImage: {
      type: String,
      required: true,
    },

    homeSection2Title: {
      type: String,
      required: true,
      default: "OUR STORY",
    },
    homeSection2TitleAr: {
      type: String,
      required: false,
    },
    homeSection2Desc: {
      type: String,
      required: true,
    },
    homeSection2DescAr: {
      type: String,
      required: false,
    },
    homeSection3Title: {
      type: String,
      required: true,
      default: "MEDIA",
    },
    homeSection3TitleAr: {
      type: String,
      required: false,
    },
    homeSection4Title: {
      type: String,
      required: true,
      default: "REGISTER YOUR INTEREST",
    },
    homeSection4TitleAr: {
      type: String,
      required: false,
    },
    homeFeatures: [
      {
        title: {
          type: String,
          required: false,
        },
        titleAr: {
          type: String,
          required: false,
        },
        description: {
          type: String,
          required: false,
        },
        descriptionAr: {
          type: String,
          required: false,
        },
      },
    ],

    //Our Story
    ourStorySection5Title: {
      type: String,
      required: true,
      default: "BOARD OF DIRECTORS",
    },
    ourStorySection5TitleAr: {
      type: String,
      required: false,
    },

    ourStorySection6Title: {
      type: String,
      required: true,
      default: "LEADERSHIP TEAM",
    },
    ourStorySection6TitleAr: {
      type: String,
      required: false,
    },

    ourStorySection7Title: {
      type: String,
      required: true,
      default: "OUR PARTNERS",
    },
    ourStorySection7TitleAr: {
      type: String,
      required: false,
    },

    //Our Development
    ourDevelopmentSection5Title: {
      type: String,
      required: true,
      default: "Top-Notch Amenities",
    },
    ourDevelopmentSection5TitleAr: {
      type: String,
      required: false,
    },

    ourDevelopmentSection8Title: {
      type: String,
      required: true,
      default: "Sleek designs for the modern life",
    },
    ourDevelopmentSection8TitleAr: {
      type: String,
      required: false,
    },

    ourDevelopmentSection9Title: {
      type: String,
      required: true,
      default: "get the right mortgage",
    },
    ourDevelopmentSection9TitleAr: {
      type: String,
      required: false,
    },

    ourDevelopmentSection10Title: {
      type: String,
      required: true,
      default: "REVIEWS",
    },
    ourDevelopmentSection10TitleAr: {
      type: String,
      required: false,
    },

    ourDevelopmentSection11Title: {
      type: String,
      required: true,
      default: "REGISTER YOUR INTEREST",
    },
    ourDevelopmentSection11TitleAr: {
      type: String,
      required: false,
    },

    //Contact Us
    contactUsSection1Title: {
      type: String,
      required: true,
      default: "Visit us",
    },
    contactUsSection1TitleAr: {
      type: String,
      required: false,
    },

    contactUsSection2Title: {
      type: String,
      required: true,
      default: "Find your perfect home",
    },
    contactUsSection2TitleAr: {
      type: String,
      required: false,
    },

    //Our Brand Ambassadors
    ourBrandAmbassadorsSec1Title: {
      type: String,
      required: true,
      default: "OUR BRAND AMBASSADORS",
    },
    ourBrandAmbassadorsSec1TitleAr: {
      type: String,
      required: false,
    },

    ourBrandAmbassadorsSec1BannerImage: {
      type: String,
      required: false,
    },

    ourBrandAmbassadorsLstCampTitle: {
      type: String,
      required: false,
      default: "LATEST CAMPAIGNS",
    },

    ourBrandAmbassadorsLstCampImage: {
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
    collection: "Config",
  }
);

ConfigSchema.plugin(autopopulate);
const Config = mongoose.model("Config", ConfigSchema);

module.exports = Config;
