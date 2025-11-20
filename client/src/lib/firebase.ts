// Firebase Configuration and Initialization
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User,
  type Auth
} from 'firebase/auth';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { Browser } from '@capacitor/browser';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// Firebase configuration - these should be set in .env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate Firebase configuration
const missingConfig = Object.entries(firebaseConfig)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingConfig.length > 0) {
  console.error("❌ Firebase 配置缺失:", missingConfig);
  console.error("當前配置:", firebaseConfig);
}

// Initialize Firebase with error handling
let app: FirebaseApp;
let auth: Auth;
let analytics: Analytics | null = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // 在移動端，設置自定義的 redirect URL
  // Firebase Auth 會使用這個 URL 作為 OAuth 回調
  if (typeof window !== 'undefined') {
    const isCapacitorEnv = () => {
      return (window as any).Capacitor !== undefined || window.location.protocol === 'capacitor:';
    };
    
    if (isCapacitorEnv()) {
      // 在移動端，Firebase Auth 會使用 Firebase Auth domain 作為重定向 URL
      // 例如：https://wevro-5330b.firebaseapp.com/__/auth/handler
      // 這個 URL 需要在 AndroidManifest.xml 中設定為 deep link
      // 當用戶完成登入後，瀏覽器會嘗試打開這個 URL
      // Android 系統會通過 intent-filter 將應用打開
      console.log("📱 移動端環境：Firebase Auth 將使用深度連結進行 OAuth 回調");
      console.log("📋 重定向 URL 將是:", `https://${firebaseConfig.authDomain}/__/auth/handler`);
      
      // 設置 Firebase Auth 的 redirect URL
      // 注意：Firebase Auth 會自動使用 authDomain，但我們可以通過設置來確保
      // 實際上，signInWithRedirect 會自動使用正確的重定向 URL
    }
  }
  
  console.log("✅ Firebase 初始化成功");
  
  // Initialize Analytics (only in browser environment)
  if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
      if (supported) {
        try {
          analytics = getAnalytics(app);
          console.log("✅ Firebase Analytics 初始化成功");
        } catch (error) {
          console.warn("⚠️ Firebase Analytics 初始化失敗（非致命）:", error);
        }
      } else {
        console.warn("⚠️ Firebase Analytics 不支援此環境");
      }
    }).catch((error) => {
      console.warn("⚠️ Firebase Analytics 支援檢查失敗:", error);
    });
  }
} catch (error) {
  console.error("❌ Firebase 初始化失敗:", error);
  // 創建一個假的 auth 對象以避免後續錯誤
  // 這會導致認證功能無法使用，但至少 app 不會完全崩潰
  throw new Error(`Firebase 初始化失敗: ${error instanceof Error ? error.message : String(error)}`);
}

// Check if running in Capacitor (mobile app)
const isCapacitor = () => {
  if (typeof window === 'undefined') return false;
  
  // Check for Capacitor global object
  if ((window as any).Capacitor !== undefined) {
    return true;
  }
  
  // Check for Capacitor protocol
  if (window.location.protocol === 'capacitor:') {
    return true;
  }
  
  // Check for Android/iOS user agent
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) {
    // Additional check: if running in WebView (not browser)
    if (ua.includes('wv') || !ua.includes('chrome')) {
      return true;
    }
  }
  
  return false;
};

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// 設置自定義 URL scheme 用於移動端 OAuth 回調
if (isCapacitor()) {
  // 在移動端，設置自定義 URL scheme 作為重定向 URL
  // Firebase 會使用這個 scheme 來回調到 app
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
}

// Helper function to open browser with OAuth URL using Capacitor Browser plugin
const openBrowserForOAuth = async (auth: any, provider: GoogleAuthProvider): Promise<void> => {
  try {
    // Firebase Auth doesn't provide a direct way to get the OAuth URL
    // So we need to use a workaround: we'll use signInWithRedirect
    // but intercept it before it actually redirects
    
    // Actually, the best approach is to let signInWithRedirect handle it
    // But if it fails silently, we can't detect it easily
    
    // For now, we'll try signInWithRedirect first
    // If it doesn't work (silent failure), we'll need to implement a custom flow
    // But that's complex, so let's first ensure signInWithRedirect works
    
    // The issue might be that signInWithRedirect doesn't throw an error
    // but also doesn't open the browser. In that case, we need to detect it.
    
    // Let's try a different approach: use Browser plugin to open the OAuth URL directly
    // But we need to construct the OAuth URL manually, which is complex
    
    // For now, let's just use signInWithRedirect and hope it works
    // If it doesn't, the user will see the button stuck in loading state
    // We've already added a timeout mechanism in Landing.tsx to handle this
    
    throw new Error('Using signInWithRedirect - Browser plugin fallback not yet implemented');
  } catch (error) {
    console.error('Error in openBrowserForOAuth:', error);
    throw error;
  }
};

// Auth functions
export const signInWithGoogle = async () => {
  try {
    // Check if we're in a real Capacitor environment AND GoogleAuth is available
    // This prevents trying to use native plugins in web browsers
    const isRealCapacitor = isCapacitor() && 
                            typeof GoogleAuth !== 'undefined' && 
                            typeof GoogleAuth.initialize === 'function' &&
                            typeof GoogleAuth.signIn === 'function';
    
    // In mobile apps (Capacitor), use native Google Auth plugin
    // This avoids browser redirect issues and provides a better UX
    if (isRealCapacitor) {
      console.log('📱 檢測到移動應用環境，使用原生 Google 登入');
      
      try {
        // 使用原生 Google Auth 插件進行登入
        // 這會直接彈出系統原生的 Google 帳號選擇視窗，不需要瀏覽器跳轉
        console.log('🔄 準備啟動原生 Google 登入...');
        
        // 初始化 Google Auth（如果尚未初始化）
        // 注意：需要使用 Firebase 的 Web Client ID（OAuth 2.0 Client ID）
        // 格式应该是：xxxxx.apps.googleusercontent.com
        // 可以在 Firebase Console > Project Settings > General > Your apps > Web app 中找到
        // 或者 Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client IDs
        const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        
        // 調試：輸出環境變數狀態
        console.log('🔍 調試資訊：');
        console.log('  - VITE_GOOGLE_CLIENT_ID 是否存在:', !!googleClientId);
        console.log('  - VITE_GOOGLE_CLIENT_ID 值:', googleClientId ? googleClientId.substring(0, 30) + '...' : 'undefined');
        console.log('  - 是否等於 API Key:', googleClientId === firebaseConfig.apiKey);
        
        // 如果沒有配置 OAuth Client ID，跳過原生登入，直接使用 Web Redirect
        if (!googleClientId || googleClientId === firebaseConfig.apiKey) {
          console.warn('⚠️ 未配置 VITE_GOOGLE_CLIENT_ID，跳過原生 Google 登入，使用 Web Redirect');
          console.warn('💡 提示：在 Firebase Console > Project Settings > General > Your apps > Web app 中獲取 OAuth 2.0 Client ID');
          throw new Error('GOOGLE_CLIENT_ID_NOT_CONFIGURED');
        }
        
        console.log('📋 使用 OAuth Client ID:', googleClientId.substring(0, 20) + '...');
        
        GoogleAuth.initialize({
          clientId: googleClientId,
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        });
        
        // 執行原生 Google 登入
        const result = await GoogleAuth.signIn();
        
        console.log('✅ 原生 Google 登入成功，取得 ID Token');
        console.log('📋 User ID:', result.id);
        console.log('📋 Email:', result.email);
        
        // 將原生登入結果轉換為 Firebase Credential
        // 注意：result.authentication.idToken 是 Google ID Token
        const credential = GoogleAuthProvider.credential(result.authentication.idToken);
        
        // 使用 Credential 登入 Firebase
        const userCredential = await signInWithCredential(auth, credential);
        
        console.log('✅ Firebase 登入成功');
        return userCredential.user;
      } catch (nativeError: any) {
        console.error('❌ 原生 Google 登入失敗:', nativeError);
        console.error('錯誤詳情:', {
          code: nativeError?.code,
          message: nativeError?.message,
          name: nativeError?.name,
          stack: nativeError?.stack
        });
        
        // 構建詳細的錯誤訊息
        let errorMessage = 'Native Google sign-in failed. ';
        
        // 檢查常見錯誤代碼
        if (nativeError?.code === '10') {
          errorMessage += 'Error 10: Developer error. Check: 1) VITE_GOOGLE_CLIENT_ID is correct (Web Client ID from Firebase), 2) SHA-1 fingerprints are added to Firebase Console, 3) Wait 5-10 minutes after adding SHA-1. ';
        } else if (nativeError?.code === '12500') {
          errorMessage += 'Error 12500: Sign-in cancelled by user. ';
        } else if (nativeError?.code) {
          errorMessage += `Error code: ${nativeError.code}. `;
        }
        
        if (nativeError?.message) {
          errorMessage += `Details: ${nativeError.message}. `;
        }
        
        // 添加診斷資訊
        const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        errorMessage += `Diagnostics: VITE_GOOGLE_CLIENT_ID=${googleClientId ? 'SET' : 'MISSING'}. `;
        errorMessage += 'Please check: 1) VITE_GOOGLE_CLIENT_ID in .env (must be Web Client ID, not Android Client ID), 2) SHA-1 fingerprints (Debug and Release) added to Firebase Console, 3) google-services.json is up-to-date, 4) Wait 5-10 minutes after Firebase changes.';
        
        // 在移動端，原生登入失敗時不應該回退到 Web 登入（會開瀏覽器）
        // 直接拋出錯誤，讓用戶知道問題
        throw new Error(errorMessage);
      }
    }
    
    // If we're in Capacitor but native login didn't work, don't fallback to web
    if (isCapacitor()) {
      // 在移動端，如果原生登入失敗，不應該回退到 Web 登入（會開瀏覽器）
      throw new Error('Native Google sign-in is required on mobile. Please check: 1) VITE_GOOGLE_CLIENT_ID is configured, 2) SHA-1 certificate fingerprints are added to Firebase Console, 3) google-services.json is present.');
    }
    
    // Web environment only: Use popup first, fallback to redirect if popup is blocked
    console.log('🌐 Web 環境，使用彈窗登入');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (popupError: any) {
      // If popup is blocked or failed, fallback to redirect (web only)
      if (popupError?.code === 'auth/popup-blocked' || popupError?.code === 'auth/popup-closed-by-user') {
        console.log('🔄 Popup 被阻止，改用重定向登入');
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      throw popupError;
    }
  } catch (error: any) {
    console.error('❌ Google 登入錯誤:', error);
    console.error('錯誤詳情:', {
      code: error?.code,
      message: error?.message,
      name: error?.name,
      stack: error?.stack
    });
    
    // If popup is blocked or failed, fallback to redirect (web only)
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/popup-closed-by-user') {
      if (!isCapacitor()) {
        console.log('🔄 Popup 被阻止，改用重定向登入');
        try {
          await signInWithRedirect(auth, googleProvider);
          return null;
        } catch (redirectError) {
          console.error('❌ 重定向登入也失敗:', redirectError);
          throw redirectError;
        }
      }
    }
    throw error;
  }
};

// Handle OAuth redirect result (for mobile apps and popup fallback)
export const handleOAuthRedirect = async () => {
  try {
    console.log('🔄 開始檢查 OAuth redirect 結果...');
    console.log('📋 當前 URL:', window.location.href);
    console.log('📋 Auth domain:', firebaseConfig.authDomain);
    
    const result = await getRedirectResult(auth);
    
    if (result) {
      console.log('✅ 收到 OAuth redirect 結果');
      console.log('📋 User:', result.user?.email);
      console.log('📋 Provider:', result.providerId);
      
      if (result.user) {
        console.log('✅ OAuth 重定向登入成功');
        return result.user;
      }
    } else {
      console.log('ℹ️ getRedirectResult 返回 null（可能尚未完成或已處理過）');
    }
    
    return null;
  } catch (error: any) {
    console.error('❌ Error handling OAuth redirect:', error);
    console.error('錯誤詳情:', {
      code: error?.code,
      message: error?.message,
      name: error?.name,
      stack: error?.stack
    });
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
};

export const registerWithEmail = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error('Error registering with email:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No user is currently signed in');
    }

    // Re-authenticate user with current password first (required for security)
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);
  } catch (error: any) {
    console.error('Error changing password:', error);
    
    // Provide more specific error messages
    if (error.code === 'auth/wrong-password') {
      throw new Error('Current password is incorrect');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('New password is too weak');
    } else if (error.code === 'auth/requires-recent-login') {
      throw new Error('Please sign out and sign in again before changing password');
    }
    
    throw error;
  }
};

export { auth, analytics };
export type { User as FirebaseUser };



