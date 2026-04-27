const express = require("express");
const ourStoryController = require("../../controllers/frontend/ourStory/our.story.controller");
const router = express.Router();

router.get("/", ourStoryController.get);

module.exports = router;
