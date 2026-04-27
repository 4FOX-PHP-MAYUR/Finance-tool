const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true,
    maxlength: 60,
    match: [/^[A-Za-z0-9 ]+$/, 'Only letters, numbers, and spaces allowed for projectName']
  },
  projectDescription: {
    type: String,
    maxlength: 500
  },
  projectImage: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  projectPercentageCompleted: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return !this.startDate || value > this.startDate;
      },
      message: 'End Date must be after Start Date'
    }
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  /** Set when the project row was auto-created from BO invoice upload. */
  invoiceBoImport: {
    type: Boolean,
    default: false
  },
  status: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Custom validation: if isCompleted is true, percentage must be 100
projectSchema.pre('save', function(next) {
  if (this.isCompleted && this.projectPercentageCompleted !== 100) {
    return next(new Error('If project is completed, percentage must be 100'));
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);
