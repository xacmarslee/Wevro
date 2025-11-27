import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors, { type CorsOptions } from "cors";
import { router as apiRoutes } from "../../server/routes/index.js";

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

export async function createApp(): Promise<Express> {
  const app = express();

  // Unified allowed origins list
  const ALLOWED_ORIGINS = [
    "https://wevro.co",
    "https://www.wevro.co",
    "capacitor://localhost",
    "http://localhost",
    "https://localhost",
    "ionic://localhost",
  ];

  // Add any additional origins from environment variables
  const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_ORIGIN || "";
  const envOrigins = rawAllowedOrigins
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  // MANUAL CORS MIDDLEWARE (To fix Android WebView issues)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // List of allowed origins including mobile app schemes
    const SAFE_ORIGINS = [
      "https://wevro.co",
      "https://www.wevro.co",
      "capacitor://localhost",
      "http://localhost",
      "https://localhost",
    ];

    if (origin && SAFE_ORIGINS.includes(origin)) {
       res.setHeader('Access-Control-Allow-Origin', origin);
       res.setHeader('Vary', 'Origin'); // Important for caching
    } else if (!origin) {
       // Allow requests with no origin (e.g. mobile apps sometimes)
       res.setHeader('Access-Control-Allow-Origin', '*');
    } else {
       // Fallback: reflect origin if in dev mode, or stick to strict list in prod
       // For now, let's be permissive for the mobile app to work
       res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests immediately
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    
    next();
  });

  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined;

    const originalResJson = res.json.bind(res);
    res.json = function patchedJson(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson(bodyJson, ...args);
    } as typeof res.json;

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

  // Mount API routes
  app.use("/api", apiRoutes);

  // Fallback for undefined routes under /api
  app.use("/api", (req, res) => {
    res.status(404).json({
      message: "API route not found",
      path: req.originalUrl ?? req.url,
      method: req.method,
    });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
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

export default createApp;
