const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  roleName: {
    type: String,
    required: [true, 'Role name is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Role name must be at least 3 characters'],
    maxlength: [50, 'Role name must be at most 50 characters'],
    match: [/^[A-Za-z ]+$/, 'Role name must contain only alphabets and spaces'],
  },
  description: {
    type: String,
    required: false,
    trim: true,
    maxlength: [500, 'Description must be at most 500 characters'],
  },
  status: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: false,
  },
}, {
  timestamps: true,
  collection: 'Role',
});

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;
