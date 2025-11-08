import { createServer } from "http";
import { createApp } from "../api/lib/create-app.js";

const dev = process.env.NODE_ENV !== "production";
const baseLog = (...args: unknown[]) => console.log(...args);

(async () => {
  if (dev) {
    const { config } = await import("dotenv");
    config();
  }

  if (dev && !process.env.REPL_ID) {
    const { storage } = await import("./storage");
    try {
      await storage.upsertUser({
        id: "local-dev-user",
        email: "developer@local.dev",
        firstName: "Local",
        lastName: "Developer",
        profileImageUrl: null,
      });
      baseLog("✓ Local dev user ensured");
    } catch (error: any) {
      baseLog("Warning: Could not create local dev user:", error?.message || error);
    }
  }

  const app = await createApp();
  const server = createServer(app);

  let logFn: (...args: any[]) => void = baseLog;

  if (dev) {
    const { setupVite, log } = await import("./vite");
    await setupVite(app, server);
    logFn = log;
    logFn("✓ Vite dev server attached");
  } else {
    const { serveStatic, log } = await import("./vite");
    serveStatic(app);
    logFn = log;
    logFn("✓ Static assets served");
  }

  const port = parseInt(process.env.PORT || "5000", 10);

  server.listen(port, "0.0.0.0", () => {
    logFn(`serving on port ${port}`);
  });
})();
