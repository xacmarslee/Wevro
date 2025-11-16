import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 添加全局錯誤處理
window.addEventListener("error", (event) => {
  console.error("❌ 全局錯誤:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("❌ 未處理的 Promise 拒絕:", event.reason);
});

// 添加調試日誌
console.log("🚀 App 啟動中...");
console.log("環境變數檢查:", {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY ? "已設置" : "未設置",
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID ? "已設置" : "未設置",
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("找不到 root 元素");
}

createRoot(rootElement).render(<App />);
