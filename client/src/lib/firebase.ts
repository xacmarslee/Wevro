// Firebase Configuration and Initialization
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User
} from 'firebase/auth';

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
let app;
let auth;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  console.log("✅ Firebase 初始化成功");
} catch (error) {
  console.error("❌ Firebase 初始化失敗:", error);
  // 創建一個假的 auth 對象以避免後續錯誤
  // 這會導致認證功能無法使用，但至少 app 不會完全崩潰
  throw new Error(`Firebase 初始化失敗: ${error instanceof Error ? error.message : String(error)}`);
}

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Auth functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
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

export { auth };
export type { User as FirebaseUser };


