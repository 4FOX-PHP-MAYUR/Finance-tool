const nodemailer = require("nodemailer");
const { db } = require("../startup/commonModules");

function cleanEmail(email) {
  if (!email) return "";
  return String(email).trim().toLowerCase();
}

function uniqueEmails(list) {
  return [...new Set((list || []).map(cleanEmail).filter(Boolean))];
}

function parseFinanceEmailsFromEnv() {
  const raw = process.env.FINANCE_APPROVER_EMAILS || "";
  if (!raw) return [];
  return uniqueEmails(raw.split(","));
}

let transporter;
function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.GOOGLE_SMTP_USER || "";
  const pass = process.env.GOOGLE_SMTP_PASS || "";
  if (!user || !pass) return null;
  transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  return transporter;
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function baseTemplate({ title, intro, rows = [], footerNote = "", highlightTitle = "", highlightBody = "" }) {
  const rowHtml = rows
    .map(
      (r) =>
        `<tr><td style="padding:12px 16px;background:#f3f4f6;border-bottom:1px solid #e5e7eb;font-weight:700;color:#4b5563;width:30%;">${escapeHtml(r.label)}</td><td style="padding:12px 16px;background:#ffffff;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(r.value || "-")}</td></tr>`,
    )
    .join("");

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f5f6fb;padding:28px 12px;">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(17,24,39,0.05);">
      <div style="background:linear-gradient(135deg,#5246d8 0%,#4f46e5 100%);color:#ffffff;padding:22px 28px;font-size:36px;font-weight:800;line-height:1.2;">
        ${escapeHtml(title)}
      </div>
      <div style="padding:28px;background:#fafafa;">
        <p style="margin:0 0 18px 0;color:#1f2937;line-height:1.6;font-size:18px;">${escapeHtml(intro)}</p>
        <table style="width:100%;border-collapse:separate;border-spacing:0;margin:0 0 18px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          ${rowHtml}
        </table>
        ${
          highlightBody
            ? `<div style="border-left:5px solid #22c55e;background:#eaf7ef;padding:14px 16px;margin:0 0 18px 0;">
              ${
                highlightTitle
                  ? `<div style="font-weight:700;color:#166534;margin:0 0 6px 0;">${escapeHtml(highlightTitle)}</div>`
                  : ""
              }
              <div style="color:#166534;line-height:1.5;">${escapeHtml(highlightBody)}</div>
            </div>`
            : ""
        }
        ${
          footerNote
            ? `<p style="margin:0;color:#6b7280;font-size:16px;line-height:1.5;">${escapeHtml(footerNote)}</p>`
            : ""
        }
      </div>
      <div style="padding:16px;background:#f1f2f6;color:#9ca3af;text-align:center;font-size:14px;">
        Finance Tool — Automated Notification
      </div>
    </div>
  </div>`;
}

function getDisplayName(u, fallback) {
  if (!u) return fallback || "User";
  return u.userName || u.name || u.email || fallback || "User";
}

function getAmount(record) {
  return record?.costToAgency || record?.costToClient || "-";
}

async function getFinanceEmailsFromPermissions() {
  const financeModuleNames = ["vendor_finance_review", "vendors"];
  const moduleDocs = await db.module
    .find({ moduleName: { $in: financeModuleNames } })
    .select("_id moduleName")
    .lean();
  const moduleIds = moduleDocs.map((m) => m._id).filter(Boolean);

  const rolePerms = await db.rolePermission
    .find({
      permissions: {
        $elemMatch: {
          $and: [
            {
              $or: [
                { moduleId: { $in: moduleIds } },
                { moduleName: { $in: financeModuleNames } },
              ],
            },
            {
              $or: [
                { "access.view": true },
                { "access.add": true },
                { "access.update": true },
              ],
            },
          ],
        },
      },
    })
    .select("roleId")
    .lean();

  const roleIds = rolePerms.map((rp) => rp.roleId).filter(Boolean);
  if (!roleIds.length) return [];

  const users = await db.user
    .find({
      roleId: { $in: roleIds },
      isDeleted: false,
      isActive: true,
    })
    .select("email")
    .lean();

  return uniqueEmails(users.map((u) => u.email));
}

async function getFinanceEmailsFromUserPermissions() {
  if (!db.userPermission) return [];
  const rows = await db.userPermission
    .find({
      permissions: {
        $elemMatch: {
          module: { $in: ["vendor_finance_review", "vendors"] },
          $or: [
            { "access.view": true },
            { "access.add": true },
            { "access.update": true },
          ],
        },
      },
    })
    .select("userId")
    .lean();
  const userIds = rows.map((r) => r.userId).filter(Boolean);
  if (!userIds.length) return [];
  const users = await db.user
    .find({
      _id: { $in: userIds },
      isDeleted: false,
      isActive: true,
    })
    .select("email")
    .lean();
  return uniqueEmails(users.map((u) => u.email));
}

async function resolveFinanceEmails() {
  const configured = parseFinanceEmailsFromEnv();
  if (configured.length) return configured;
  const [fromRolePermissions, fromUserPermissions] = await Promise.all([
    getFinanceEmailsFromPermissions(),
    getFinanceEmailsFromUserPermissions(),
  ]);
  return uniqueEmails([...fromRolePermissions, ...fromUserPermissions]);
}

async function sendEmail({ to = [], cc = [], subject, html }) {
  const smtp = getTransporter();
  const toList = uniqueEmails(to);
  const ccList = uniqueEmails(cc).filter((e) => !toList.includes(e));
  if (!smtp || !toList.length) return;
  const fromAddress = process.env.GOOGLE_SMTP_FROM || process.env.GOOGLE_SMTP_USER;
  const fromName = process.env.GOOGLE_SMTP_FROM_NAME || "Finance Tool";
  await smtp.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: toList.join(","),
    cc: ccList.length ? ccList.join(",") : undefined,
    subject,
    html,
  });
}

function extractContext(record) {
  return {
    vendor: record?.vendorId?.vendorName || "N/A",
    poBo:
      record?.businessOrderId?.boNo ||
      record?.businessOrderId?.invoiceNumber ||
      "N/A",
    project: record?.projectId?.projectName || "N/A",
    amount: getAmount(record),
  };
}

async function notifyInvoiceSubmittedToHod({ record, accountManager, hod }) {
  if (!hod?.email) return;
  const meta = extractContext(record);
  const subject = `Invoice Submitted for Approval - ${meta.vendor} / ${meta.poBo} / ${meta.project}`;
  await sendEmail({
    to: [hod.email],
    subject,
    html: baseTemplate({
      title: "Invoice Submitted For Approval",
      intro: `An invoice has been submitted by ${getDisplayName(accountManager, "Account Manager")} for your review.`,
      rows: [
        { label: "Vendor", value: meta.vendor },
        { label: "PO / BO", value: meta.poBo },
        { label: "Project", value: meta.project },
        { label: "Amount", value: meta.amount },
      ],
      footerNote: "Please review and take action in the Finance Tool.",
    }),
  });
}

async function notifyHodRejected({ record, accountManager, hod, reason }) {
  if (!accountManager?.email) return;
  const subject = "Invoice Rejected - Action Required";
  await sendEmail({
    to: [accountManager.email],
    subject,
    html: baseTemplate({
      title: "Invoice Rejected By HOD",
      intro: `Your submitted invoice has been rejected by ${getDisplayName(hod, "HOD")}.`,
      rows: [
        { label: "Vendor", value: record?.vendorId?.vendorName || "N/A" },
      ],
      highlightTitle: "HOD Rejection Reason",
      highlightBody: reason || "-",
      footerNote: "Please revise the invoice and resubmit for approval.",
    }),
  });
}

async function notifyHodApproved({ record, accountManager, hod }) {
  const financeEmails = await resolveFinanceEmails();
  const meta = extractContext(record);
  await sendEmail({
    to: accountManager?.email ? [accountManager.email] : [],
    subject: "Invoice Approved by HOD",
    html: baseTemplate({
      title: "Invoice Approved By HOD",
      intro: `Your invoice has been approved by ${getDisplayName(hod, "HOD")} and forwarded to Finance for processing.`,
      rows: [
        { label: "Vendor", value: meta.vendor },
        { label: "PO / BO", value: meta.poBo },
        { label: "Amount", value: meta.amount },
      ],
    }),
  });

  await sendEmail({
    to: financeEmails,
    subject: "Invoice Approved - Payment Action Required",
    html: baseTemplate({
      title: "Invoice Approved For Finance Processing",
      intro: "An invoice has been approved by HOD and is ready for payment processing.",
      rows: [
        { label: "Vendor", value: meta.vendor },
        { label: "PO / BO", value: meta.poBo },
        { label: "Amount", value: meta.amount },
        { label: "Approved By", value: getDisplayName(hod, "HOD") },
      ],
      footerNote: "Please review and process payment.",
    }),
  });
}

async function notifyFinanceRejected({ accountManager, hod, reason }) {
  const recipients = uniqueEmails([accountManager?.email, hod?.email]);
  if (!recipients.length) return;
  await sendEmail({
    to: recipients,
    subject: "Invoice Rejected by Finance - Action Required",
    html: baseTemplate({
      title: "Invoice Rejected By Finance",
      intro: "The invoice has been rejected during finance review.",
      rows: [],
      highlightTitle: "Finance Rejection Reason",
      highlightBody: reason || "-",
      footerNote: "Please revise and resubmit. The approval cycle will restart from HOD.",
    }),
  });
}

async function notifyPaymentCompleted({
  accountManager,
  hod,
  paymentDate,
  paymentSlipLabel,
}) {
  const recipients = uniqueEmails([accountManager?.email, hod?.email]);
  if (!recipients.length) return;
  await sendEmail({
    to: recipients,
    subject: "Payment Completed - Invoice Closed",
    html: baseTemplate({
      title: "Payment Completed",
      intro: "The invoice has been successfully processed and paid.",
      rows: [
        { label: "Payment Date", value: paymentDate || "-" },
        { label: "Attachment", value: paymentSlipLabel || "Payment Slip Uploaded" },
      ],
      footerNote: "Process completed.",
    }),
  });
}

module.exports = {
  notifyInvoiceSubmittedToHod,
  notifyHodRejected,
  notifyHodApproved,
  notifyFinanceRejected,
  notifyPaymentCompleted,
};
