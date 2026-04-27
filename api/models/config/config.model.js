const { required } = require("joi");
const mongoose = require("mongoose");
const autopopulate = require("mongoose-autopopulate");

const ConfigSchema = new mongoose.Schema(
  {
    //Home Page Config
    homeBannerVideo: {
      type: String,
      required: false,
    },
     homeBannerVideoAr: {
      type: String,
      required: false,
    },
    
        homeBannerVideoMob: {
      type: String,
      required: false,
    },
         homeBannerVideoMobAr: {
      type: String,
      required: false,
    },
    
    
    homeStoryTitle: {
      type: String,
      required: false,
    },
    homeStoryTitleAr: {
      type: String,
      required: false,
    },
    homeStoryDesc: {
      type: String,
      required: false,
    },
    homeStoryDescAr: {
      type: String,
      required: false,
    },
    homeStoryUrl: {
      type: String,
      required: false,
    },
    homeContactTitle: {
      type: String,
      required: false,
    },
    homeContactTitleAr: {
      type: String,
      required: false,
    },
    homeLagunaTitle: {
      type: String,
      required: false,
    },
    homeLagunaTitleAr: {
      type: String,
      required: false,
    },

    homeLagunaImage: {
      type: String,
      required: false,
    },

    homeGatewayTitle: {
      type: String,
      required: false,
    },

    homeGatewayTitleAr: {
      type: String,
      required: false,
    },

    homeGatewayUrl: {
      type: String,
      required: false,
    },

    homeStory: [
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
        image: {
          type: String,
          required: false,
        },
         imageAr: {
          type: String,
          required: false,
        },
      },
    ],

    mediaTitle: {
      type: String,
      required: false,
    },
    mediaTitleAr: {
      type: String,
      required: false,
    },

    directorTitle: {
      type: String,
      required: false,
    },
    directorTitleAr: {
      type: String,
      required: false,
    },

    leadershipTitle: {
      type: String,
      required: false,
    },
    leadershipTitleAr: {
      type: String,
      required: false,
    },

    //Our Development
    modernTitle: {
      type: String,
      required: false,
    },
    modernTitleAr: {
      type: String,
      required: false,
    },

    mortgageTitle: {
      type: String,
      required: false,
    },
    mortgageTitleAr: {
      type: String,
      required: false,
    },

    projectContactTitle: {
      type: String,
      required: false,
    },
    projectContactTitleAr: {
      type: String,
      required: false,
    },
        ambassadorTitle: {
      type: String,
      required: false,
    },
          ambassadorTitleAr: {
      type: String,
      required: false,
    },
           ambassadorSubTitle: {
      type: String,
      required: false,
    },
          ambassadorSubTitleAr: {
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
