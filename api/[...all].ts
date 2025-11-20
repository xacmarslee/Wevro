import { config as loadEnv } from "dotenv";
loadEnv();

import { createApp } from "./lib/create-app.js";

const appPromise = createApp();

// Default allowed origins for Capacitor/local development
const defaultAllowedOrigins = [
  "https://localhost",      // Capacitor Android/iOS default
  "http://localhost",       // Local development
  "capacitor://localhost",  // Capacitor alternative scheme
  "ionic://localhost",      // Ionic/Capacitor alternative scheme
];

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // Allow requests with no origin
  return defaultAllowedOrigins.includes(origin);
}

export default async function handler(req: any, res: any) {
  const origin = req.headers.origin || req.headers.Origin;
  
  console.log("[vercel] incoming", {
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    origin: origin,
  });

  // Handle OPTIONS preflight requests explicitly
  if (req.method === "OPTIONS") {
    console.log("[vercel] Handling OPTIONS preflight request");
    
    // Set CORS headers
    if (isOriginAllowed(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
    }
    
    res.status(200).end();
    return;
  }

  const app = await appPromise;

  if (req.url && !req.url.startsWith("/api/")) {
    req.url = `/api${req.url.startsWith("/") ? req.url : `/${req.url}`}`;
  }
  if (req.originalUrl && !req.originalUrl.startsWith("/api/")) {
    req.originalUrl = `/api${req.originalUrl.startsWith("/") ? req.originalUrl : `/${req.originalUrl}`}`;
  }
  console.log("[vercel] normalized", {
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
  });

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
