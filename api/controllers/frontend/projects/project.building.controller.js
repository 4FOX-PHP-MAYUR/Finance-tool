const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../../startup/commonModules");

const mongoose = require("mongoose");

const Building = db.building;

exports.get = async (req, res) => {
  try {
    const query = { isActive: true, isDeleted: false };
    const buildings = await Building.find(query);
    console.log("buildings ::", buildings);
    if (!buildings) {
      return res
        .status(400)
        .json(c_error(msgConf.somethingWrong, res.statusCode));
    }

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results("Building data", buildings),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getBuildings ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.building.buildingFetchFailed,
          res.statusCode
        )
      );
  }
};

exports.getBuildingByProjectId = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res
        .status(400)
        .json(
          c_error(msgConf.building.validation.projectIdRequired, res.statusCode)
        );
    }

    const buildingFields = Object.keys(Building.schema.paths);

    const groupStage = buildingFields.reduce((acc, field) => {
      if (field === "_id") {
        acc["_id"] = `$_id`;
      } else {
        acc[field] = { $first: `$${field}` };
      }
      return acc;
    }, {});

    groupStage["floors"] = { $push: "$floors" };

    const result = await Building.aggregate([
      {
        $match: { projectId: new mongoose.Types.ObjectId(projectId) },
      },
      {
        $lookup: {
          from: "Floor",
          localField: "_id",
          foreignField: "buildingId",
          as: "floors",
        },
      },
      {
        $unwind: "$floors",
      },
      {
        $lookup: {
          from: "Flat",
          let: { floorId: "$floors._id" },
          pipeline: [{ $match: { $expr: { $eq: ["$floorId", "$$floorId"] } } }],
          as: "floorFlats",
        },
      },
      {
        $addFields: {
          "floors.flats": "$floorFlats",
        },
      },
      {
        $group: groupStage,
      },
      //   {
      //     $limit: 1,
      //   },
    ]);

    console.log("result ::", result);

    if (!result.length) {
      return res
        .status(400)
        .json(
          c_error(
            `${projectId} ${msgConf.building.validation.projectIdNotFound}`,
            res.statusCode
          )
        );
    }

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.building.buildingFound, result[0] || {}),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getBuildingByProjectId ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.building.buildingNotFound,
          res.statusCode
        )
      );
  }
};
