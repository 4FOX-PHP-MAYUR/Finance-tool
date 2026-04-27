const mongoose = require('mongoose');
const { Schema } = mongoose;

const ALLOCATION_STATUS = ['AVAILABLE', 'BOOKED', 'HALF_DAY', 'ON_LEAVE'];

const allocationSchema = new Schema({
  startDate:        { type: Date, required: true },
  endDate:          { type: Date, required: true },
  notes:            { type: String, trim: true },
  allocationStatus: { type: String, enum: ALLOCATION_STATUS, default: 'BOOKED' }
}, { _id: true });

// Each resource block: one employee + their allocation date-ranges
const resourceSchema = new Schema({
  employeeId:  { type: Schema.Types.ObjectId, ref: 'Users', required: true },
  allocations: {
    type: [allocationSchema],
    validate: {
      validator: (arr) => Array.isArray(arr) && arr.length > 0,
      message: 'Each resource must have at least one allocation'
    }
  }
}, { _id: true });

const assignmentSchema = new Schema({
  clientId:        { type: Schema.Types.ObjectId, ref: 'Client',     required: true },
  projectId:       { type: Schema.Types.ObjectId, ref: 'Project',    required: true },
  departmentId:    { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  taskDescription: { type: String, required: true, trim: true },

  // Multiple resources per assignment
  resources: {
    type: [resourceSchema],
    required: true,
    validate: {
      validator: (arr) => Array.isArray(arr) && arr.length > 0,
      message: 'resources must have at least one entry'
    }
  },

  createdBy: { type: Schema.Types.ObjectId, ref: 'Users' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'Users' },
  status:    { type: Boolean, default: true }
}, { timestamps: true });

assignmentSchema.index({ 'resources.employeeId': 1 });
assignmentSchema.index({ 'resources.allocations.startDate': 1 });
assignmentSchema.index({ 'resources.allocations.endDate': 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);