const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../../startup/commonModules");

const Media = db.media;

exports.get = async (req, res) => {
  try {
    const query = { isActive: true, isDeleted: false };
    //const media = await Media.find(query).populate('category');
    /*  const media = await Media.find({ isDeleted: false })
   .populate({
     path: 'category',
     select: 'category categoryAr' // Only include the `name` field
   })
   .lean(); */
    const groupedMedia = await Media.aggregate([
      {
        $match: {
          isDeleted: false,
          isActive: true
        }
      },
      {
        $lookup: {
          from: 'MediaCategory', // The name of your categories collection
          localField: 'category',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: '$category'
      },
      // ✅ Sort by publishedDate before grouping
      {
        $addFields: {
          hasPublishedDate: { $cond: [{ $ifNull: ['$publishedDate', false] }, 1, 0] },
          publishedDateOrNull: '$publishedDate',
        }
      },
      {
        $sort: {
          hasPublishedDate: -1,            // published ones first
          publishedDateOrNull: -1,         // latest first
          sortOrder: 1                     // for missing publishedDate, use sortOrder ascending
        }
      },
      {
        $group: {
          _id: '$category._id',
          categoryName: { $first: '$category.category' },
          categoryAr: { $first: '$category.categoryAr' },
          media: {
            $push: {
              _id: '$_id',
              mediaTitle: '$mediaTitle',
              mediaTitleAr: '$mediaTitleAr',
              mediaImage: '$mediaImage',
              publishedDate: '$publishedDate',
              mediaVideo: '$mediaVideo',
              mediaUrl: '$mediaUrl',
              mediaUrlAr : '$mediaUrlAr',
              createdAt: '$createdAt'
            }
          }
        }
      },

      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          categoryName: 1,
          categoryAr: 1,
          media: 1
        }
      }
    ]);

    if (!groupedMedia) {
      return res
        .status(400)
        .json(c_error(msgConf.somethingWrong, res.statusCode));
    }

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results("Media data", groupedMedia),
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
