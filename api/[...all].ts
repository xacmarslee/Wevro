import { config as loadEnv } from "dotenv";
loadEnv();

import { createApp } from "./lib/create-app.js";

const appPromise = createApp();

// Default allowed origins for Capacitor/local development
const defaultAllowedOrigins = [
  "https://localhost",      // Capacitor Android/iOS default (if not using hostname)
  "http://localhost",       // Local development
  "capacitor://localhost",  // Capacitor alternative scheme
  "ionic://localhost",      // Ionic/Capacitor alternative scheme
  "https://wevro.co",       // Capacitor with hostname (no www)
  "https://www.wevro.co",   // Production web app (with www)
];

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // Allow requests with no origin
  return defaultAllowedOrigins.includes(origin);
}

export default async function handler(req: any, res: any) {
  // 读取 origin，支持多种可能的 header 名称
  const origin = req.headers.origin || req.headers.Origin || req.headers['x-forwarded-host'] || req.headers.host;
  
  console.log("[vercel] incoming", {
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    origin: origin,
    allHeaders: Object.keys(req.headers).filter(k => k.toLowerCase().includes('origin') || k.toLowerCase().includes('host')),
  });

  // 处理 OPTIONS preflight 请求
  if (req.method === "OPTIONS") {
    console.log("[vercel] Handling OPTIONS preflight request");
    
    // 设置 CORS headers
    if (isOriginAllowed(origin)) {
      // 关键：必须使用请求的实际 origin，不能使用固定的值
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
      console.log(`[vercel] OPTIONS: CORS headers set for origin: ${origin}`);
    } else {
      console.warn(`[vercel] OPTIONS: Origin not allowed: ${origin}`);
    }
    
    res.status(200).end();
    return;
  }

  // 对于所有其他请求，也设置 CORS headers
  // 这确保所有响应都包含正确的 CORS header
  if (isOriginAllowed(origin)) {
    // 关键：必须使用请求的实际 origin
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    console.log(`[vercel] CORS headers set for origin: ${origin}`);
  } else {
    console.warn(`[vercel] Origin not allowed: ${origin}. Allowed: ${defaultAllowedOrigins.join(", ")}`);
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
