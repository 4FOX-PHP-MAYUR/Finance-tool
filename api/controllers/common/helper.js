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

/* const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 60 }); */

// Generate a custom filename for uploaded files
function generateCustomFilename(file, ext) {
  return `${file.fieldname}-${Date.now()}${ext}`;
}

// Set up the multer configuration for multi-file upload

// Configure multer storage with a dynamic folder name
const multiFileUploadMulter = (folderName) => {
  // Dynamically generate fields for socialMediaLinks
  const ourStoryCards = Array.from({ length: 100 }, (_, i) => ({
    name: `cards[${i}][image]`,
    maxCount: 1,
  }));

  const workDetailFields = Array.from({ length: 100 }, (_, i) => ({
    name: `workDetails[${i}][detailImage]`,
    maxCount: 1,
  }));
  const amenities = Array.from({ length: 100 }, (_, i) => ({
    name: `amenities[${i}][image]`,
    maxCount: 1,
  }));

  const nearBy = Array.from({ length: 100 }, (_, i) => ({
    name: `nearBy[${i}][image]`,
    maxCount: 1,
  }));
  const gallery = Array.from({ length: 100 }, (_, i) => ({
    name: `gallery[${i}][image]`,
    maxCount: 1,
  }));
  const propertyImages = Array.from({ length: 100 }, (_, i) => ({
    name: `propertyImages[${i}][image]`,
    maxCount: 1,
  }));
  

  const homeStory = Array.from({ length: 100 }, (_, i) => ({
    name: `homeStory[${i}][image]`,
    maxCount: 1,
  }));

    const homeStoryAr = Array.from({ length: 100 }, (_, i) => ({
    name: `homeStory[${i}][imageAr]`,
    maxCount: 1,
  }));

  const socialLinks = Array.from({ length: 100 }, (_, i) => ({
    name: `socialLinks[${i}][socialIcon]`,
    maxCount: 1,
  }));

  const campaignImage = Array.from({ length: 100 }, (_, i) => ({
    name: `campaign[${i}][image]`,
    maxCount: 1,
  }));

  const campaignVideo = Array.from({ length: 100 }, (_, i) => ({
    name: `campaign[${i}][video]`,
    maxCount: 1,
  }));

  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        console.log("Uploading file:", file.originalname); // Log file details
        // Get the dynamic folder name from request body or query parameters
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
    }),
    limits: { fileSize: 1024 * 1024 * 200 },
    fileFilter: (req, file, callback) => {
      const allowedExtensions = [
        ".png",
        ".jpg",
        ".gif",
        ".jpeg",
        ".mp4",
        ".pdf",
      ];
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
        file.fieldname === "podcastMobImage" ||
        file.fieldname == "brochure"
      ) {
        if (!allowedExtensions.includes(ext.toLowerCase())) {
          return callback(
            new Error(
              `Only images (png, jpg, gif, jpeg, mp4, pdf) are allowed in ${file.fieldname}`
            ),
            false
          );
        }
      }

      callback(null, true);
    },
  }).fields([
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
    { name: "youtubeIcon", maxCount: 1 },
    { name: "spotifyIcon", maxCount: 1 },
    { name: "anghamiIcon", maxCount: 1 },
    { name: "podcastIcon", maxCount: 1 },
    { name: "imageAboutSuccess", maxCount: 1 },
    { name: "footerBannerImage", maxCount: 1 },
    ...ourStoryCards,
    ...workDetailFields,
    ...amenities,
    ...gallery,
    ...propertyImages,
    ...nearBy,
    ...homeStory,
    ...homeStoryAr,
    ...socialLinks,
    ...campaignVideo,
    ...campaignImage,
    { name: "sec1BannerImage" },
    { name: "sec1MobImage" },
    { name: "sec2BannerImage" },
    { name: "sec3BannerImage" },
    { name: "mediaImage" },
    { name: "mediaBannerImage" },
    { name: "userImage" },
    { name: "projectVideo" },
    { name: "brochure" },
    { name: "topNotchImage" },
    { name: "gallery", maxCount: 50 },
    { name: "buildingImage" },
    { name: "floorImage" },
    { name: "flatImage" },
    { name: "thumbnailImage" },
    { name: "footerLogo" },
    { name: "emailIcon" },
    { name: "phoneIcon" },
    { name: "addressIcon" }, //footer address icon
    { name: "socialIcon" },
    { name: "locationImage" },
    { name: "projectImage" },
    { name: "projectImageAr" },
    { name: "mediaVideo" },
    { name: "bgImage" },
    { name: "mobImage" },
    { name: "sec2InspiredByImage" },
    { name: "projectSliderImage" },
    { name: "projectSliderMobImage" },
    { name: "projectThumbImage" },
    { name: "homeBannerVideoMob" },
    { name: "homeBannerVideoMobAr" },
    { name: "homeBannerVideoAr" },
    { name: "imageAr" },
    
    
    
    
    { name: "testFile" },
    
    
    
  ]);
};

async function asyncMultiFileUploadMulter(req, res, folderName) {
  return new Promise((resolve, reject) => {
    const uploadMiddleware = multiFileUploadMulter(folderName); // Call with dynamic folder name
    uploadMiddleware(req, res, (err) => {
      console.log("req.files", req.files);
      if (err instanceof multer.MulterError) {
        console.log(`Multer error ${JSON.stringify(err)}`);
        reject(
          res
            .status(500)
            .json(c_error(`Multer error ${JSON.stringify(err)}`, 500))
        );
      } else if (err) {
        reject(res.status(400).json(c_error(err.message, 400)));
      } else {
        resolve();
      }
    });
  });
}

/*  const multiFileUploadMulter = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            let uploadPath = '';

            if (file.fieldname === 'image') {
                uploadPath = path.join(__dirname, '../../public', 'uploads', 'podcast');
            }

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
    }),
    limits: { fileSize: 1024 * 1024 * 5 },
    fileFilter: (req, file, callback) => {
        const allowedExtensions = ['.png', '.jpg', '.gif', '.jpeg'];
        const ext = path.extname(file.originalname);

        if (file.fieldname === "image") {
            if (!allowedExtensions.includes(ext.toLowerCase())) {
                return callback(new Error(`Only images (png, jpg, gif, jpeg) are allowed in ${file.fieldname}`), false);
            }
        }

        callback(null, true);
    },
}).fields([
    { name: 'image', maxCount: 1 },
]);  */

/* function multiFileUploadMulter(fieldname, folderName) {
    return multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => {
                let uploadPath = '';
                
                if (file.fieldname === fieldname) {
                    uploadPath = path.join(__dirname, '../../../public', 'uploads', folderName);
                }

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
        }),
        limits: { fileSize: 1024 * 1024 * 5 },
        fileFilter: (req, file, callback) => {
            const allowedExtensions = ['.png', '.jpg', '.gif', '.jpeg'];
            const ext = path.extname(file.originalname);

            if (file.fieldname === fieldname) {
                if (!allowedExtensions.includes(ext.toLowerCase())) {
                    return callback(new Error(`Only images (png, jpg, gif, jpeg) are allowed in ${file.fieldname}`), false);
                }
            }

            callback(null, true);
        },
    }).fields([
        { name: fieldname, maxCount: 1 },
    ]);
} */

// Create a promise-based multer upload handler
/* function asyncMultiFileUploadMulter(req, res) {
    return new Promise((resolve, reject) => {
        multiFileUploadMulter(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                reject(res.status(500).json(c_error(`Multer error ${err}`, 500)));
            } else if (err) {
                reject(res.status(400).json(c_error(err.message, 400)));
            } else {
                resolve();
            }
        });
    });
} */

/* async function paginate  (model, query, req, res, successMessage, errorMessage, populateFields = []) {
    try {
      // Get pagination parameters from query, set default values if not provided
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
  
      // Build the query with optional population
      let queryBuilder = model.find(query).skip(skip).limit(limit);
  
      // Check if there are fields to populate
      if (populateFields.length > 0) {
        populateFields.forEach(field => {
          queryBuilder = queryBuilder.populate(field);
        });
      }
  
      // Execute the query
      const data = await queryBuilder;
  
      // Get the total count of the items that match the query
      const total = await model.countDocuments(query);
  
      if (!data || data.length === 0) {
        return res.status(400).json(c_error(errorMessage, res.statusCode));
      }
  
      // Respond with paginated data and pagination info
      return res.status(200).json(
        c_success(
          successMessage,
          {
            data: data,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total
          },
          res.statusCode
        )
      );
    } catch (err) {
      logger.error(`Pagination Error: ${err.message}`);
      return res.status(500).json(c_error(err.message || errorMessage, res.statusCode));
    }
  }; */
async function paginate({
  model,
  query = {},
  req,
  res,
  successMessage,
  errorMessage,
  populateFields = [],
  searchFields = [],
  selectFields = [],
  sortField = "", // Default sort field
  sortOrder = -1, // Default order: -1 for descending, 1 for ascending
}) {
  try {
    // Extract pagination and search parameters from the request
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;
    const searchTerm = req.query.searchTerm?.trim();

    /* const cachedData = cache.get(req.originalUrl); // Cache based on URL

    if (cachedData) {
      console.log("Serving from cache");
      return res.status(200).json(
        c_success(successMessage, cachedData, res.statusCode)
      );
    } */

    // Build search query if searchTerm is provided
    if (searchTerm && searchFields.length > 0) {
      query["$or"] = buildSearchQuery(searchFields, searchTerm);
    }

    // Build the query builder
    let queryBuilder = model.find(query).skip(skip).limit(limit);
    // Apply sorting
    if (sortField) {
      const sortOptions = { [sortField]: sortOrder };
      queryBuilder = queryBuilder.sort(sortOptions);
    }

    // Apply select logic
    if (selectFields.length > 0) {
      queryBuilder = queryBuilder.select(selectFields.join(" "));
    }

    // Apply population logic
    if (populateFields.length > 0) {
      queryBuilder = queryBuilder.populate(
        buildPopulateOptions(populateFields)
      );
    }

    // Fetch data and total count in parallel
    const [data, total] = await Promise.all([
      queryBuilder,
      model.countDocuments(query),
    ]);

    /* cache.set(req.originalUrl, {
      data,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    }); // Store response in cache */

    // Return paginated data
    return res.status(200).json(
      c_success(
        successMessage,
        {
          data,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
        },
        res.statusCode
      )
    );
  } catch (err) {
    console.error(`Pagination Error: ${err.message}`);
    logger.error(`Pagination Error: ${err.message}`);
    return res
      .status(500)
      .json(c_error(err.message || errorMessage, res.statusCode));
  }
}

// Helper function to build search query
function buildSearchQuery(fields, term) {
  return fields.map((field) => ({
    [field]: { $regex: term, $options: "i" },
  }));
}

// Helper function to build populate options
function buildPopulateOptions(fields) {
  return fields
    .map((field) => {
      if (typeof field === "object" && field.path) {
        return {
          path: field.path,
          select: field.select ? field.select.join(" ") : undefined,
          populate: field.populate || undefined,
        };
      } else if (typeof field === "string") {
        return field;
      }
      return null;
    })
    .filter(Boolean); // Filter out any null or undefined values
}
// Helper function to  delete existing file
function deleteExistingFile(folderName, fileName) {
  if (fileName != null) {
    console.log("deleteExistingFile", fileName);
    const existingFilePath = path.join(
      __dirname,
      "../../public",
      "uploads",
      folderName,
      fileName
    );

    console.log("existingFilePath", existingFilePath);

    // Delete the file if it exists
    if (fs.existsSync(existingFilePath)) {
      fs.unlinkSync(existingFilePath);

      return true;
    }
  }

  return false;
}

const deleteUnusedFiles = (records, folderName) => {
  try {
    // Extract filenames from the records
    const usedFiles = new Set();
    const folderPath = path.join(
      __dirname,
      "../../public",
      "uploads",
      folderName
    );

    records.forEach((record) => {
      if (record.image) usedFiles.add(record.image);
      if (record.bannerImage) usedFiles.add(record.bannerImage);
      if (record.homeBannerVideo) usedFiles.add(record.homeBannerVideo);
      if (record.homeLagunaImage) usedFiles.add(record.homeLagunaImage);
      if (record.mobileImage) usedFiles.add(record.mobileImage);
      if (record.bannerImageMob) usedFiles.add(record.bannerImageMob);
    });

    console.log("Used Files:", Array.from(usedFiles));

    // Get all files in the folder
    const allFiles = fs.readdirSync(folderPath);

    // Find unused files
    const unusedFiles = allFiles.filter((file) => !usedFiles.has(file));

    if (unusedFiles.length === 0) {
      console.log("No unused files found.");
      return;
    }

    // Delete unused files
    /*    unusedFiles.forEach((file) => {
      const filePath = path.join(folderPath, file);
      fs.unlinkSync(filePath);
      console.log(`Deleted: ${file}`);
    });
 */
    console.log("Unused files.", unusedFiles);
    console.log("Unused files cleanup complete.");
  } catch (error) {
    console.error("Error deleting unused files:", error);
  }
};

module.exports = {
  generateCustomFilename,
  multiFileUploadMulter,
  asyncMultiFileUploadMulter,
  paginate,
  deleteExistingFile,
  deleteUnusedFiles,
};
