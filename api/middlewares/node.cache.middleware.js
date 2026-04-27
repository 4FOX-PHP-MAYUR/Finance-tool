// Load environment variables from .env file
require('dotenv').config();

const NodeCache = require("node-cache");
const FIVE_MINUTES_IN_SECONDS = 2 * 60;
const cache = new NodeCache({ stdTTL: FIVE_MINUTES_IN_SECONDS });
module.exports =  cacheMiddleware = (req, res, next) => {
  const cachedData = cache.get(req.originalUrl); 

  if (cachedData) {
    console.log("Serving from cache");
    return res.json(cachedData);
  }
  
  next();
};
