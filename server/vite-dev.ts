import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function setupVite(app: Express, server: Server) {
  const { default: viteConfigFn } = await import("../vite.config");
  
  // viteConfig 現在是一個異步函數，需要調用它來獲取配置
  const viteConfig = typeof viteConfigFn === 'function' 
    ? await viteConfigFn() 
    : viteConfigFn;

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  // 從 viteConfig 中提取 server 配置
  const { server: configServer, ...restConfig } = viteConfig;
  
  // 合併 server 配置，但 middlewareMode 相關的選項優先
  const mergedServerConfig = {
    ...(configServer || {}),
    ...serverOptions,
    // 保留 fs 配置（如果有的話）
    fs: configServer?.fs,
  };
  
  // 確保 root 路徑正確設置
  const rootPath = restConfig.root || path.resolve(__dirname, "..", "client");
  
  const vite = await createViteServer({
    ...restConfig,
    root: rootPath,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: mergedServerConfig,
    appType: "custom",
  });

  app.use(vite.middlewares);
  
  // 處理所有其他請求（主要是 HTML 頁面）
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
