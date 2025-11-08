import express, { type Express } from "express";
import fs from "fs";
import path from "path";

const distPath = path.resolve(process.cwd(), "dist", "public");

export function serveStatic(app: Express) {
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
