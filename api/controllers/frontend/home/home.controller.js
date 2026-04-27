const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../../startup/commonModules");

const Media = db.media;
const OurStory = db.ourStory;
const Config = db.config;
const ProjectSlider = db.projectSlider;

exports.get = async (req, res) => {
  try {
    /* const query = { isDeleted: false };
    const populateFields = [
      {
        path: "updatedBy createdBy",
        select: ["firstName", "lastName", "-roleId"],
      },
    ];
    const searchFields = ["mediaTitle"];

    paginate({
      model: Media,
      query: query,
      req: req,
      res: res,
      successMessage: msgConf.media.mediaFetchSuccess,
      errorMessage: msgConf.media.mediaFetchFailed,
      searchFields: searchFields,
      populateFields: populateFields,
    }); */
    const query = { isActive: true, isDeleted: false };
//const media = await Media.find(query).sort({ createdAt: -1 }).limit(3);
const media = await Media.aggregate([
  {
    $lookup: {
      from: "MediaCategory", // actual MongoDB collection name
      localField: "category",
      foreignField: "_id",
      as: "categoryData"
    }
  },
  { $unwind: "$categoryData" },
  {
    $match: {
      "categoryData.category": "Press Release"
    }
  },
  {
    $sort: {
      publishedDate: -1  // ✅ Sort by publishedDate (descending)
    }
  },
  { $limit: 3 }
]);
/* const ourStory = await OurStory.find(query).sort({ createdAt: -1 }).limit(2); */
const config = await Config.findOne(query).sort({ createdAt: -1 });

const projectSlider = await ProjectSlider.find(query).sort({ createdAt: -1 });

    if (!media && !config && !projectSlider) {
      return res
        .status(400)
        .json(c_error(msgConf.somethingWrong, res.statusCode));
    }

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results("Home data", { media, config:config,projectSlider}),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getMedia ${err.message}`);
    res
      .status(500)
      .json(
        c_error(err.message || msgConf.media.mediaFetchFailed, res.statusCode)
      );
  }
};
