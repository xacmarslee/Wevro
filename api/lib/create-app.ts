import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors, { type CorsOptions } from "cors";
import { registerRoutes } from "../../server/routes.js";
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

  const allAllowedOrigins = Array.from(
    new Set([...ALLOWED_ORIGINS, ...envOrigins])
  );

  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      // Log the incoming origin for debugging
      console.log(`[CORS] Request origin: ${origin || 'none'}`);

      if (!origin) {
        // Allow requests with no origin (like mobile apps or curl requests)
        console.log(`[CORS] Allowing request with no origin`);
        return callback(null, true);
      }

      // Check if origin is in the allowed list
      if (allAllowedOrigins.includes(origin)) {
        console.log(`[CORS] ✅ Allowing origin: ${origin}`);
        // ✅ CORRECT: callback second parameter must be true, not origin string
        return callback(null, true);
      }

      // Log rejected origin for debugging
      console.warn(`[CORS] ❌ Origin ${origin} is not allowed. Allowed origins: ${allAllowedOrigins.join(", ")}`);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Type', 'Authorization'],
  };

  const corsMiddleware = cors(corsOptions);
  
  // Apply CORS middleware to all routes
  app.use(corsMiddleware);
  
  // Explicitly handle OPTIONS requests for all routes (preflight)
  app.options("*", corsMiddleware);

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

  await registerRoutes(app);

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
