import { config } from "dotenv";
config();

import { createServer } from "http";
import { createApp } from "../api/_lib/create-app.js";
import { setupVite, serveStatic, log } from "./vite";

(async () => {
  // Ensure local dev user exists in database (for local development only)
  if (!process.env.REPL_ID) {
    const { storage } = await import("./storage");
    try {
      await storage.upsertUser({
        id: "local-dev-user",
        email: "developer@local.dev",
        firstName: "Local",
        lastName: "Developer",
        profileImageUrl: null,
      });
      log("✓ Local dev user ensured");
    } catch (error: any) {
      log("Warning: Could not create local dev user:", error?.message || error);
    }
  }

  const app = await createApp();
  const server = createServer(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);

  // Use simple listen for cross-platform compatibility (Windows doesn't support reusePort)
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
