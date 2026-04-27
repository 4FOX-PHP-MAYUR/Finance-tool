const mongoose = require('mongoose');

const resourceAllocationSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return !this.startDate || value >= this.startDate;
        },
        message: 'End Date must be on or after Start Date',
      },
    },
    allocationPercentage: {
      type: Number,
      required: true,
      min: [0, 'Allocation percentage must be at least 0'],
      max: [100, 'Allocation percentage must not exceed 100'],
    },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'On Hold'],
      default: 'Active',
      required: true,
    },
    description: {
      type: String,
      maxlength: 500,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index for efficient overlap-detection queries
resourceAllocationSchema.index({ resourceId: 1, projectId: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('ResourceAllocation', resourceAllocationSchema);