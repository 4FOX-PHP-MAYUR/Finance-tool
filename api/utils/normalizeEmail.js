const validator = require("validator");

/**
 * Normalize email for storage and DB lookups: trim, lowercase, fix common unicode domains.
 * Idempotent for already-normalized values.
 *
 * @param {string|null|undefined} email
 * @returns {string|null|undefined}
 */
function normalizeUserEmail(email) {
  if (email == null) return email;
  const str = String(email).trim();
  if (!str) return str;
  const normalized = validator.normalizeEmail(str, {
    all_lowercase: true,
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    yahoo_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false,
    icloud_remove_subaddress: false,
  });
  return normalized === false ? str.toLowerCase() : normalized;
}

/** Use on user email queries so legacy mixed-case rows still match normalized input. */
const EMAIL_LOOKUP_COLLATION = { locale: "en", strength: 2 };

module.exports = { normalizeUserEmail, EMAIL_LOOKUP_COLLATION };
