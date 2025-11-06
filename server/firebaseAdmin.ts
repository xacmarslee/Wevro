// Firebase Admin SDK for server-side authentication
import admin from 'firebase-admin';

// Initialize Firebase Admin
// In production, use service account credentials
// In development, Firebase Admin can use Application Default Credentials
let firebaseAdmin: admin.app.App;

try {
  if (!admin.apps.length) {
    // Check if we have service account credentials
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccount) {
      // Production: Use service account key
      const credentials = JSON.parse(serviceAccount);
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(credentials),
      });
      console.log('✅ Firebase Admin initialized with service account');
    } else {
      // Development: Use project ID only (requires Firebase emulator or Application Default Credentials)
      const projectId = process.env.FIREBASE_PROJECT_ID;
      if (projectId) {
        firebaseAdmin = admin.initializeApp({
          projectId: projectId,
        });
        console.log('✅ Firebase Admin initialized with project ID');
      } else {
        console.warn('⚠️ Firebase Admin not initialized - missing credentials');
        // Create a dummy app to prevent errors
        firebaseAdmin = admin.initializeApp({
          projectId: 'dummy-project',
        });
      }
    }
  } else {
    firebaseAdmin = admin.app();
  }
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error);
  // Create a dummy app to prevent crashes
  firebaseAdmin = admin.initializeApp({
    projectId: 'dummy-project',
  }, 'fallback');
}

// Verify Firebase ID token
export async function verifyIdToken(idToken: string) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    throw error;
  }
}

// Get user by UID
export async function getUserByUid(uid: string) {
  try {
    const userRecord = await admin.auth().getUser(uid);
    return userRecord;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

// Delete user
export async function deleteUser(uid: string) {
  try {
    await admin.auth().deleteUser(uid);
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

export { firebaseAdmin };

