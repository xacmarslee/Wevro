import { config as loadEnv } from "dotenv";
loadEnv();

import { createApp } from "./lib/create-app.js";

const appPromise = createApp();

// Unified allowed origins list (must match create-app.ts)
const ALLOWED_ORIGINS = [
  "https://wevro.co",
  "https://www.wevro.co",
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
  "ionic://localhost",
];

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // Allow requests with no origin
  return ALLOWED_ORIGINS.includes(origin);
}

export default async function handler(req: any, res: any) {
  // ✅ CORRECT: Only read from origin header, not host
  const origin = req.headers.origin || req.headers.Origin;
  
  console.log("[vercel] incoming", {
    method: req.method,
    url: req.url,
    origin: origin || 'none',
  });

  // Handle OPTIONS preflight requests
  // Note: Express CORS middleware will handle CORS for all other requests
  if (req.method === "OPTIONS") {
    console.log("[vercel] Handling OPTIONS preflight request");
    
    // MANUAL FIX: Always allow all origins for OPTIONS to fix Android/Capacitor issues
    const responseOrigin = origin || "*";
    
    res.setHeader("Access-Control-Allow-Origin", responseOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
    console.log(`[vercel] ✅ OPTIONS: CORS headers set for origin: ${responseOrigin}`);
    
    res.status(200).end();
    return;
  }

  // For all other requests, let Express CORS middleware handle it
  // Don't manually set CORS headers here to avoid conflicts

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
