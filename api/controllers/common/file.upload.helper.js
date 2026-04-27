const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../startup/commonModules");

// Multer storage configuration
const getMulterMiddleware = (folderName) => {
  // Multer storage with dynamic folder
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.join(
        __dirname,
        "../../public",
        "uploads",
        folderName
      );

      // Create the directory if it doesn't exist
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const customFilename = generateCustomFilename(file, ext);
      cb(null, customFilename);
    },
  });

  // File filter for images
  const fileFilter = (req, file, cb) => {
    const allowedExtensions = [".png", ".jpg", ".gif", ".jpeg", ".mp4"];
    const ext = path.extname(file.originalname);

    if (
      file.fieldname === "image" ||
      file.fieldname === "blurImage" ||
      file.fieldname === "bannerImage" ||
      file.fieldname === "homeBannerVideo" ||
      file.fieldname === "homeLagunaImage" ||
      file.fieldname === "whatWeDoImage" ||
      file.fieldname === "blogBannerImage" ||
      file.fieldname === "blogBannerImage" ||
      file.fieldname === "footerLogo" ||
      file.fieldname === "mobileImage" ||
      file.fieldname === "podcastMobImage"
    ) {
      if (!allowedExtensions.includes(ext.toLowerCase())) {
        return cb(
          new Error(
            `Only images (png, jpg, gif, jpeg,mp4) are allowed in ${file.fieldname}`
          ),
          false
        );
      }
    }

    cb(null, true);
  };

  return multer({ storage, fileFilter }).fields([
    { name: "image", maxCount: 1 },
    { name: "blurImage", maxCount: 1 },
    { name: "bannerImage", maxCount: 1 },
    { name: "homeBannerVideo", maxCount: 1 },
    { name: "homeLagunaImage", maxCount: 1 },
    { name: "whatWeDoImage", maxCount: 1 },
    { name: "blogBannerImage", maxCount: 1 },
    { name: "footerLogo", maxCount: 1 },
    { name: "mobileImage", maxCount: 1 },
    { name: "podcastMobImage", maxCount: 1 },
    { name: "infBannerImage", maxCount: 1 },
    { name: "infSectionImage", maxCount: 1 },
    { name: "serviceVideo", maxCount: 1 },
    { name: "testimonialImage", maxCount: 1 },
    { name: "blogDetailImage", maxCount: 1 },
    { name: "blogDetailImageMob", maxCount: 1 },
    { name: "bannerImageMob", maxCount: 1 },

    { name: "icon" },
    { name: "detailImage" },
    { name: "blogImages" },
    { name: "profileImage", maxCount: 1 }, // Named file
    { name: "galleryImages", maxCount: 5 }, // Array of images
    { name: "socialMediaLinks", maxCount: 10 }, // Images from JSON array
  ]);
};

// Generate a custom filename for uploaded files
function generateCustomFilename(file, ext) {
  return `${file.fieldname}-${Date.now()}${ext}`;
}

module.exports = {
  generateCustomFilename,
  getMulterMiddleware,
};
