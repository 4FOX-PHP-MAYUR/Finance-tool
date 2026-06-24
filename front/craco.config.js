/**
 * CRA's source-map-loader follows sourceMappingURL into node_modules; many packages
 * ship broken maps (e.g. lightgallery → missing scss). Skip all of node_modules.
 */
function findSourceMapLoaderRule(rules) {
  for (const rule of rules) {
    if (!rule || rule.enforce !== "pre") continue;
    if (rule.loader && String(rule.loader).includes("source-map-loader")) {
      return rule;
    }
    if (Array.isArray(rule.use)) {
      const hit = rule.use.some(
        (u) =>
          (typeof u === "string" && u.includes("source-map-loader")) ||
          (u && u.loader && String(u.loader).includes("source-map-loader")),
      );
      if (hit) return rule;
    }
  }
  return null;
}

module.exports = {
  webpack: {
    configure(config) {
      const rules = (config.module.rules || []).filter(Boolean);
      const smRule = findSourceMapLoaderRule(rules);
      if (smRule) {
        smRule.exclude = /node_modules/;
      }
      return config;
    },
  },
};
