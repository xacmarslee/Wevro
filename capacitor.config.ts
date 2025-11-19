import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wevro.app',
  appName: 'Wevro',
  webDir: 'dist/public',
  // ⚠️ 開發時可以啟用 server.url 連接到本地伺服器
  // 上架前必須註解掉！
  // server: {
  //   url: 'http://172.20.10.4:5000',
  //   cleartext: true
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: false,
      androidSpinnerStyle: "small",
      iosSpinnerStyle: "small",
    }
  },
  // OAuth 回調 URL scheme - 使用 https 以支持 Firebase Auth 和 Google API
  // 注意：自定義 scheme (wevro://) 在 Android WebView 117+ 會有問題
  // 改用 https 可以讓 Google API 正常加載
  server: {
    androidScheme: 'https'
  }
};

export default config;

