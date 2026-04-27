/**
 * Reset a user's password in MongoDB (bcrypt hash, same as User model).
 *
 * Usage (from api/):
 *   node scripts/reset-user-password.js <email> <new-password>
 *
 * Requires DATABASE_URL (or MONGODB_URI) in api/.env
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const mongoString = require("../config/mongoUri");
const UserModel = require("../models/user/user.model");
const { normalizeUserEmail, EMAIL_LOOKUP_COLLATION } = require("../utils/normalizeEmail");

async function main() {
  const email = normalizeUserEmail(process.argv[2] || "");
  const newPassword = process.argv[3] || "";

  if (!email || !newPassword) {
    console.error(
      "Usage: node scripts/reset-user-password.js <email> <new-password>"
    );
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  await mongoose.connect(mongoString);

  const hash = await bcrypt.hash(newPassword, 10);
  const res = await UserModel.updateOne(
    { email, isDeleted: false },
    { $set: { password: hash } }
  ).collation(EMAIL_LOOKUP_COLLATION);

  if (res.matchedCount === 0) {
    const any = await UserModel.findOne({ email }).collation(EMAIL_LOOKUP_COLLATION).select("email isDeleted");
    if (!any) {
      console.error("No user found with that email.");
    } else {
      console.error(
        "User exists but is deleted (isDeleted=true). Restore or pick another account."
      );
    }
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log("Password updated for:", email);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
