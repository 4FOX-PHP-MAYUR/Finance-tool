

const { c_success, c_error, c_results, db, msgConf,logger } = require("../../../startup/commonModules");

const Team = db.team;
exports.getAllTeam = async (req, res) => {
    try {
      const baseQuery = {
        isDeleted: false,
        isActive: true,
      };
  
      const leadQuery = {
        ...baseQuery,
        roles: {
          $elemMatch: {
            role: 'Lead',
          },
        },
      };
  
      const directorQuery = {
        ...baseQuery,
        roles: {
          $elemMatch: {
            role: 'Director',
          },
        },
      };
  
        const [leadTeam, directorTeam] = await Promise.all([
    Team.find(leadQuery)
      .populate('createdBy updatedBy')
      .sort({ sortOrder: 1, createdAt: -1 }), // sortOrder first, fallback to createdAt desc
    Team.find(directorQuery)
      .populate('createdBy updatedBy')
      .sort({ sortOrder: 1, createdAt: -1 }),
  ]);
  
      return res.status(200).json(
        c_success(
          msgConf.success,
          {
            message: msgConf.team.teamFetchSuccess,
            data: {
              leadTeam,
              directorTeam,
            },
          },
          res.statusCode
        )
      );
  
    } catch (err) {
      logger.error(`getAllTeam ${err.message}`);
      res.status(500).json(
        c_error(err.message || msgConf.team.teamFetchFailed, res.statusCode)
      );
    }
  };
  

exports.getTeamById = async (req, res) => {
    try {

        const { teamId } = req.params;
        if (!teamId) {
            return res.status(400).json(c_error(msgConf.team.validation.historyIdRequired, res.statusCode));
        }
        const isExists = await Team.findOne({
            _id: teamId,
        });

        if (!isExists) {
            return res.status(400).json(c_error(`${teamId} ${msgConf.team.validation.teamIdNotFound}`, res.statusCode));
        }
        return res.status(200)
            .json(c_success(msgConf.success, c_results(msgConf.team.teamFound, isExists), res.statusCode));

    } catch (err) {
        logger.error(`getTeamById ${err.message}`);
        res
            .status(500)
            .json(c_error(err.message || msgConf.team.teamNotFound, res.statusCode));
    }

}
