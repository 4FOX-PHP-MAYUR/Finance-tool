const mongoose = require('mongoose');
const autopopulate = require('mongoose-autopopulate');
const validator = require('validator');
const bcrypt = require('bcryptjs')
const { normalizeUserEmail } = require('../../utils/normalizeEmail');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');



const UserSchema = new mongoose.Schema({

  userName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate : [validator.isEmail,"Please enter valid email"],
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
  },
  mVerified: {
    type: Boolean,
    default: false,
  },
  eVerified: {
    type: Boolean,
    default: false,
  },
  dob: {
    type: Date,
    required: false,
  },
  gender: {
    type: String,
    required: false,
  },
  provider: {
    type: String,
    required: false,
  },
  token: {
    type: String,
    required: false,
  },
  password: {
    type: String,
    required: false,
  },
  imageUrl: {
    type: String,
    required: false,
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: false,
    default: null,
    autopopulate: { select: 'roleName -_id' },
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: false,
    default: null,
    autopopulate: { select: 'departmentName departmentDescription' },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  collection :'Users'
});

UserSchema.pre('validate', function (next) {
  if (this.email != null && typeof this.email === 'string' && this.email !== '') {
    this.email = normalizeUserEmail(this.email);
  }
  next();
});

// Encypting passwords before saving
UserSchema.pre('save', async function(next) {
    

  if(!this.isModified('password')) {
      next();
  }

  this.tempPassword = this.password;
  this.password = await bcrypt.hash(this.password, 10)
});

// Return JSON Web Token
UserSchema.methods.getJwtToken = function() {
  return jwt.sign({ id : this._id}, process.env.JWT_SECRET, {
      expiresIn : process.env.JWT_EXPIRES_TIME
  });
}

// Compare user password in database password
UserSchema.methods.comparePassword = async function(enterPassword) {
  return await bcrypt.compare(enterPassword, this.password);
}

// Generate Password Reset Token
UserSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash and set to resetPasswordToken
  this.resetPasswordToken = crypto
          .createHash('sha256')
          .update(resetToken)
          .digest('hex');

  // Set token expire time
  this.resetPasswordExpire = Date.now() + 30*60*1000;

  return resetToken;
}

UserSchema.plugin(autopopulate);
const User = mongoose.models.Users || mongoose.model('Users', UserSchema);
// Backward-compatible aliases for older refs used across modules.
if (!mongoose.models.User) {
  mongoose.model('User', UserSchema);
}
if (!mongoose.models.user) {
  mongoose.model('user', UserSchema);
}

module.exports = User;
