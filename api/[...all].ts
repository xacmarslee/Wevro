import { config as loadEnv } from "dotenv";
loadEnv();

import { createApp } from "../server/app";

const appPromise = createApp();

export default async function handler(req: any, res: any) {
  const app = await appPromise;
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
