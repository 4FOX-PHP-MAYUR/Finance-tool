
module.exports = async function getClientIp(req) {
  return (
    req.headers['cf-connecting-ip'] ||          // Cloudflare (BEST)
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip
  );
};
