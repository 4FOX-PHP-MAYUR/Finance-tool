const Client = require("../models/client.model");
const Vendor = require("../models/vendor.model");
const Project = require("../models/project.model");
const BusinessOrderInvoice = require("../models/businessOrderInvoice.model");
const AssignVendor = require("../models/assignVendor.model");

const { c_success, c_error, c_results, msgConf } = require("../startup/commonModules");

function toBreakdownObject(rows, { unknownKey = "unknown" } = {}) {
  const out = {};
  for (const r of rows || []) {
    const key = String(r?._id ?? unknownKey).trim() || unknownKey;
    out[key] = Number(r?.count || 0);
  }
  return out;
}

exports.getSummary = async (req, res) => {
  try {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      clientCount,
      vendorCount,
      projectCount,
      soUploadsCount,
      soUploadsLast30DaysCount,
      assignVendorCount,
      financeBreakdownRows,
      hodBreakdownRows,
      soTotalsRows,
    ] = await Promise.all([
      Client.countDocuments({ status: true }),
      Vendor.countDocuments({ status: true }),
      Project.countDocuments({ status: true }),
      BusinessOrderInvoice.countDocuments({}),
      BusinessOrderInvoice.countDocuments({ createdAt: { $gte: last30Days } }),
      AssignVendor.countDocuments({}),
      AssignVendor.aggregate([
        {
          $group: {
            _id: { $ifNull: ["$financeReviewStatus", ""] },
            count: { $sum: 1 },
          },
        },
      ]),
      AssignVendor.aggregate([
        {
          $group: {
            _id: { $ifNull: ["$hodReviewStatus", ""] },
            count: { $sum: 1 },
          },
        },
      ]),
      BusinessOrderInvoice.aggregate([
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            approvedCount: { $sum: { $cond: ["$approved", 1, 0] } },
            totalAmountSum: { $sum: { $ifNull: ["$totalAmount", 0] } },
            subtotalSum: { $sum: { $ifNull: ["$subtotal", 0] } },
            taxSum: { $sum: { $ifNull: ["$standardRateAmount", 0] } },
          },
        },
      ]),
    ]);

    const financeBreakdown = toBreakdownObject(financeBreakdownRows, {
      unknownKey: "",
    });
    const hodBreakdown = toBreakdownObject(hodBreakdownRows, { unknownKey: "" });

    const soTotals = Array.isArray(soTotalsRows) && soTotalsRows.length ? soTotalsRows[0] : null;

    return res.status(200).json(
      c_success(
        msgConf?.success || "success",
        c_results("Dashboard summary fetched successfully", {
          counts: {
            clients: clientCount,
            vendors: vendorCount,
            projects: projectCount,
            soUploads: soUploadsCount,
            soUploadsLast30Days: soUploadsLast30DaysCount,
            assignVendors: assignVendorCount,
          },
          breakdowns: {
            financeReviewStatus: financeBreakdown,
            hodReviewStatus: hodBreakdown,
          },
          totals: {
            soUploads: {
              approvedCount: Number(soTotals?.approvedCount || 0),
              subtotalSum: Number(soTotals?.subtotalSum || 0),
              taxSum: Number(soTotals?.taxSum || 0),
              totalAmountSum: Number(soTotals?.totalAmountSum || 0),
            },
          },
          meta: {
            last30DaysFrom: last30Days.toISOString(),
            generatedAt: now.toISOString(),
          },
        }),
        res.statusCode
      )
    );
  } catch (err) {
    return res
      .status(500)
      .json(c_error(err.message || msgConf?.somethingWrong || "Something went wrong", res.statusCode));
  }
};

