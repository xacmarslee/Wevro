import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 新增全域錯誤處理
window.addEventListener("error", (event) => {
  console.error("❌ 全域錯誤:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("❌ 未處理的 Promise 拒絕:", event.reason);
});

// 初始化安全區域變量（在React渲染前立即執行）
(function initSafeArea() {
  const root = document.documentElement;
  
  // 檢查是否在Capacitor環境中
  const isCapacitor = typeof (window as any).Capacitor !== 'undefined';
  
  console.log('🔍 [main.tsx] 初始化安全區域，isCapacitor:', isCapacitor);
  
  if (isCapacitor) {
    try {
      // 檢測平台
      const Capacitor = (window as any).Capacitor;
      const platform = Capacitor.getPlatform?.() || Capacitor.platform || 'web';
      
      console.log('📱 [main.tsx] 檢測到Capacitor平台:', platform);
      
      if (platform === 'android') {
        // Android: 根據設備密度設置狀態欄高度
        const density = window.devicePixelRatio || 1;
        let statusBarHeight = 24; // 默認值（mdpi）
        
        if (density >= 3.5) {
          statusBarHeight = 56; // xxxhdpi
        } else if (density >= 3) {
          statusBarHeight = 48; // xxhdpi
        } else if (density >= 2) {
          statusBarHeight = 32; // xhdpi
        } else if (density >= 1.5) {
          statusBarHeight = 28; // hdpi
        }
        
        // 設置CSS變量
        root.style.setProperty('--safe-area-inset-top', `${statusBarHeight}px`);
        console.log(`✅ [main.tsx] Android狀態欄高度設置為: ${statusBarHeight}px (密度: ${density})`);
      } else if (platform === 'ios') {
        // iOS: 檢查env()是否可用（不依賴body）
        // 使用CSS變量設置，讓CSS的env()自然工作
        root.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top, 44px)');
        console.log('✅ [main.tsx] iOS使用安全區域: env(safe-area-inset-top, 44px)');
      }
    } catch (error) {
      console.warn('⚠️ [main.tsx] 初始化安全區域時出錯:', error);
      // 設置默認值作為fallback
      root.style.setProperty('--safe-area-inset-top', '24px');
    }
  } else {
      // Web瀏覽器: 檢查是否支援env()
      const supportsEnv = CSS.supports('padding-top', 'env(safe-area-inset-top)');
      console.log('🌐 [main.tsx] Web瀏覽器，支援env():', supportsEnv);
    if (!supportsEnv) {
      root.style.setProperty('--safe-area-inset-top', '0px');
    }
  }
  
  // 輸出最終的CSS變量值用於調試
  const finalValue = getComputedStyle(root).getPropertyValue('--safe-area-inset-top');
  console.log(`🎯 [main.tsx] 最終CSS變量 --safe-area-inset-top 值: ${finalValue}`);
})();

// 新增調試日誌
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
