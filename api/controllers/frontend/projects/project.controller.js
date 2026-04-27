const {
  c_success,
  c_error,
  c_results,
  db,
  msgConf,
  logger,
} = require("../../../startup/commonModules");

const mongoose = require("mongoose");

const Project = db.project;
const ProjectConfig = db.projectConfig;

exports.get = async (req, res) => {
  try {
    const query = { isActive: true, isDeleted: false };
    const projects = await Project.find(query)
    .sort({ sortOrder: 1 })
    .lean();

    if (!projects) {
      return res
        .status(400)
        .json(c_error(msgConf.somethingWrong, res.statusCode));
    }

    // ✅ Get ProjectConfig once
    const config = await ProjectConfig.findOne().lean();

  if (config) {
      projects.forEach((project) => {
        // ✅ Convert IDs to string for safe comparison
        const washroomIds = project.noOfWashrooms?.map((id) => id.toString()) || [];
        const bedroomIds = project.noOfBedrooms?.map((id) => id.toString()) || [];
        const propertyTypeIds = project.propertyTypes?.map((id) => id.toString()) || [];

        // ✅ Replace arrays with matching config objects
        project.noOfWashrooms = config.noOfWashrooms.filter((item) =>
          washroomIds.includes(item._id.toString())
        );

        project.noOfBedrooms = config.noOfBedrooms.filter((item) =>
          bedroomIds.includes(item._id.toString())
        );

        project.propertyTypes = config.propertyTypes.filter((item) =>
          propertyTypeIds.includes(item._id.toString())
        );
      });
    }

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results("Projects data", projects),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getProjects ${err.message}`);
    res
      .status(500)
      .json(
        c_error(
          err.message || msgConf.project.projectFetchFailed,
          res.statusCode
        )
      );
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;

    const productDetail = await Project.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(projectId) } },

      {
        $lookup: {
          from: "Building",
          localField: "_id",
          foreignField: "projectId",
          as: "buildings",
        },
      },
      {
        $unwind: {
          path: "$buildings",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "Floor",
          localField: "buildings._id",
          foreignField: "buildingId",
          as: "buildings.floors",
        },
      },
      {
        $unwind: {
          path: "$buildings.floors",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "Flat",
          localField: "buildings.floors._id",
          foreignField: "floorId",
          as: "buildings.floors.flats",
        },
      },
      // {
      //   $unwind: {
      //     path: "$buildings.floors.flats",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      //   {
      //     $group: {
      //       _id: "$_id",
      //       projectTitle: { $first: "$projectTitle" },
      //       buildings: { $push: "$buildings" },
      //     },
      //   },
    ]);

    if (!productDetail.length) {
      return res
        .status(500)
        .json(
          c_error(
            err.message || msgConf.project.projectNotFound,
            res.statusCode
          )
        );
    }

    // const isExists = await Project.findOne({
    //   _id: projectId,
    // });

    // if (!isExists) {
    //   return res
    //     .status(400)
    //     .json(
    //       c_error(
    //         `${teamId} ${msgConf.project.validation.projectIdNotFound}`,
    //         res.statusCode
    //       )
    //     );
    // }

    // const projectQuery = { _id: projectId, isActive: true, isDeleted: false };
    // const project = await Project.findOne(projectQuery);
    // const buildingQuery = {
    //   projectId: projectId,
    //   isActive: true,
    //   isDeleted: false,
    // };
    // const buildings = await Building.find(buildingQuery);
    // for (let i = 0; i < buildings.length; i++) {
    //   const floorQuery = {
    //     projectId: projectId,
    //     buildingId: buildings[i]._id,
    //     isActive: true,
    //     isDeleted: false,
    //   };
    //   buildings[i].floors = await Building.find(floorQuery);
    // }

    // if (!project && !buildings) {
    //   return res
    //     .status(400)
    //     .json(c_error(msgConf.somethingWrong, res.statusCode));
    // }

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.project.projectFound, productDetail[0] || {}),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getProjectById ${err.message}`);
    res
      .status(500)
      .json(
        c_error(err.message || msgConf.project.projectNotFound, res.statusCode)
      );
  }
};

exports.getProjectByTitle = async (req, res) => {
  try {
    const { projectTitle} = req.params;
    const normalizedTitle = projectTitle.replace(/-/g, ' ');

    console.log("projectgetProjectByTitleTitle",normalizedTitle);

    const productDetail = await Project.aggregate([
      {
         $match: { 
    projectTitle: { $regex: new RegExp(`^${normalizedTitle}$`, 'i') } 
  } 
       },
       

      {
        $lookup: {
          from: "Building",
          localField: "_id",
          foreignField: "projectId",
          as: "buildings",
        },
      },
      {
        $unwind: {
          path: "$buildings",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "Floor",
          localField: "buildings._id",
          foreignField: "buildingId",
          as: "buildings.floors",
        },
      },
      {
        $unwind: {
          path: "$buildings.floors",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "Flat",
          localField: "buildings.floors._id",
          foreignField: "floorId",
          as: "buildings.floors.flats",
        },
      },
      // {
      //   $unwind: {
      //     path: "$buildings.floors.flats",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      //   {
      //     $group: {
      //       _id: "$_id",
      //       projectTitle: { $first: "$projectTitle" },
      //       buildings: { $push: "$buildings" },
      //     },
      //   },
    ]);

    console.log("productDetail",productDetail);

    const config = await ProjectConfig.findOne().lean();



    const project = productDetail[0];

    // ✅ Apply your filtering logic here
    if (config) {
      
project.noOfWashrooms = config.noOfWashrooms.filter((item) => {
  const projectWashrooms = project.noOfWashrooms?.map((id) => id.toString());
  return projectWashrooms?.includes(item._id.toString());
});


     project.noOfBedrooms = config.noOfBedrooms.filter((item) =>
  project.noOfBedrooms?.some((id) => id.equals(item._id))
);

project.propertyTypes = config.propertyTypes.filter((item) =>
  project.propertyTypes?.some((id) => id.equals(item._id))
);
    }

    if (!productDetail.length) {
      return res
        .status(500)
        .json(
          c_error(
            msgConf.project.projectNotFound,
            res.statusCode
          )
        );
    }



    

    return res
      .status(200)
      .json(
        c_success(
          msgConf.success,
          c_results(msgConf.project.projectFound, productDetail[0] || {}),
          res.statusCode
        )
      );
  } catch (err) {
    logger.error(`getProjectById ${err.message}`);
    res
      .status(500)
      .json(
        c_error(err.message || msgConf.project.projectNotFound, res.statusCode)
      );
  }
};


exports.getGroupedProjects = async (req, res) => {
  try {
    const grouped = await Project.aggregate([
      {
        $match: { isActive: true, isDeleted: false },
      },
      {
        $addFields: {
          sortField: {
            $ifNull: ["$sortOrder", "$createdAt"],
          },
        },
      },
      {
        $sort: {
          projectCountryId: 1,
          sortField: 1,
        },
      },
      {
        $group: {
          _id: "$projectCountryId",
          projects: { $push: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "ProjectCountry",
          localField: "_id",
          foreignField: "_id",
          as: "projectCountry",
        },
      },
      {
        $unwind: {
          path: "$projectCountry",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          projectCountryId: "$_id",
          projectCountry: 1,
          projects: 1,
          _id: 0,
        },
      },
      // 👇 Sort the grouped result by projectCountry.sortOrder
      {
        $sort: {
          "projectCountry.sortOrder": 1,
        },
      },
    ]);

    const allProjects = await Project.aggregate([
      { $match: { isActive: true, isDeleted: false } },
      {
        $addFields: {
          sortField: {
            $ifNull: ["$sortOrder", "$createdAt"],
          },
        },
      },
      {
        $sort: { sortField: 1 },
      },
    ]);

    const allCategory = {
      projectCountryId: null,
      projectCountry: {
        countryName: "All",
        countryNameAr: "الكل",
      },
      projects: allProjects,
    };

    const finalResult = [allCategory, ...grouped];

    return res.status(200).json(
      c_success(
        msgConf.success,
        c_results(msgConf.project.projectFound, finalResult),
        res.statusCode
      )
    );
  } catch (err) {
    console.error(err);
    res.status(500).json(
      c_error(err.message || msgConf.project.projectNotFound, res.statusCode)
    );
  }
};

