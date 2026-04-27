// Load environment variables from .env file
require("dotenv").config();

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { c_error } = require("../startup/customResponse");
const { TokenExpiredError } = jwt;

const catchError = (err, res) => {
  if (err instanceof TokenExpiredError) {
    return res
      .status(401)
      .json(c_error("Unauthorized! Access Token was expired!", res.statusCode));
  }

  return res.status(401).json(c_error("Unauthorized!", res.statusCode));
};

/* module.exports = function auth(req, res, next) {
  const token = req.header("x-auth-token");
  if (!token) return res.status(401).json(c_error("Access denied. No token provided", res.statusCode));

  jwt.verify(token, process.env.JWT_TOKEN_KEY, (err, decoded) => {
    if (err) {
      return catchError(err, res);
    }
    req.user = decoded;
    next();
  });
}; */

module.exports = function auth(req, res, next) {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json(c_error("Access denied. No Bearer token provided", res.statusCode));
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_TOKEN_KEY, async (err, decoded) => {
    if (err) {
      return catchError(err, res);
    }
    // Some tokens (older logins) may not contain roleId or may contain null.
    // Hydrate it from DB so permission checks work without forcing re-login.
    try {
      const rawRoleId = decoded?.roleId;
      const roleIdString =
        typeof rawRoleId === "string"
          ? rawRoleId
          : rawRoleId?._id
          ? String(rawRoleId._id)
          : "";
      const roleIdValid = mongoose.Types.ObjectId.isValid(roleIdString);

      if ((!decoded?.roleId || !roleIdValid) && decoded?.userId) {
        const { db } = require("../startup/commonModules");
        const UserModel = db.user;
        const user = await UserModel.findById(decoded.userId)
          .select("roleId isActive isDeleted")
          .setOptions({ autopopulate: false })
          .lean();
        if (user?.roleId) {
          decoded.roleId = user.roleId;
        }
        // Optional: block inactive/deleted users early (defensive)
        if (user && (user.isDeleted || user.isActive === false)) {
          return res.status(401).json(c_error("Unauthorized!", res.statusCode));
        }
      }
    } catch {
      // If hydration fails, continue with decoded as-is.
    }
    req.user = decoded;
    next();
  });
};
