const path = require("path");

const root = __dirname;

module.exports = {
  apps: [
    {
      name: "pdf-backend",
      cwd: path.join(root, "backend"),
      script: "src/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 6000,
        HOST: "0.0.0.0",
      },
    },
    {
      name: "pdf-frontend",
      cwd: path.join(root, "frontend"),
      script: "node_modules/vite/bin/vite.js",
      args: "preview --host 0.0.0.0 --port 5174",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
