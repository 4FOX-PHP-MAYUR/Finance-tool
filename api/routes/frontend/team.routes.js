const express = require('express');
const teamController = require('../../controllers/frontend/team/team.controller');
const router = express.Router()



router.get('/',teamController.getAllTeam);





module.exports = router;