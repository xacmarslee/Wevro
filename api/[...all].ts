import { config as loadEnv } from "dotenv";
loadEnv();

import { createApp } from "./lib/create-app.js";

const appPromise = createApp();

export default async function handler(req: any, res: any) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[vercel] incoming", req.method, req.url);
  }
  const app = await appPromise;

  if (req.url && !req.url.startsWith("/api/")) {
    req.url = `/api${req.url.startsWith("/") ? req.url : `/${req.url}`}`;
  }
  if (req.originalUrl && !req.originalUrl.startsWith("/api/")) {
    req.originalUrl = `/api${req.originalUrl.startsWith("/") ? req.originalUrl : `/${req.originalUrl}`}`;
  }
  if (process.env.NODE_ENV !== "production") {
    console.log("[vercel] normalized", req.method, req.url);
  }

  return new Promise<void>((resolve, reject) => {
    res.on("finish", resolve);
    res.on("close", resolve);
    res.on("error", reject);

    app(req, res, (err: unknown) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
