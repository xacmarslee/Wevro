const express = require("express");
const { registerRoutes } = require("../../server/routes");
const { log } = require("../../server/vite");

async function createApp() {
  const app = express();

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse;

    const originalResJson = res.json.bind(res);
    res.json = function patchedJson(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson(bodyJson, ...args);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = `${logLine.slice(0, 79)}…`;
        }

        log(logLine);
      }
    });

    next();
  });

  await registerRoutes(app);

  app.use((err, _req, res, _next) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";

    if (!res.headersSent) {
      res.status(status).json({ message });
    }

    if (process.env.NODE_ENV !== "production") {
      console.error(err);
    }
  });

  return app;
}

module.exports = { createApp };
module.exports.default = createApp;
