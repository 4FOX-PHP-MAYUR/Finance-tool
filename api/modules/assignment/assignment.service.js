const Assignment = require('./assignment.model');

/**
 * Check if any allocation in any resource block conflicts with existing bookings.
 * Iterates over every (employeeId, allocation) pair in the resources array.
 * Pass excludeId to skip the current assignment (used on updates).
 * Returns the first conflicting assignment document found, or null.
 */
async function checkConflict(resources, excludeId = null) {
  for (const resource of resources) {
    const { employeeId, allocations } = resource;
    for (const alloc of allocations) {
      const query = {
        status: true,
        resources: {
          $elemMatch: {
            employeeId,
            allocations: {
              $elemMatch: {
                startDate: { $lte: new Date(alloc.endDate) },
                endDate:   { $gte: new Date(alloc.startDate) }
              }
            }
          }
        }
      };
      if (excludeId) query._id = { $ne: excludeId };

      const conflict = await Assignment.findOne(query);
      if (conflict) return { conflict, employeeId };
    }
  }
  return null;
}

module.exports = { checkConflict };