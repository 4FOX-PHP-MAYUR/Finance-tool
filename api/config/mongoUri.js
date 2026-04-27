const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoUri = process.env.DATABASE_URL || process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error('Set DATABASE_URL (or MONGODB_URI) in api/.env');
}

module.exports = mongoUri;
