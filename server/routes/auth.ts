import { Router } from "express";
import { storage } from "../storage.js";
import { firebaseAuthMiddleware, getFirebaseUserId } from "../firebaseAuth.js";
import { getUserByUid, deleteUser as deleteFirebaseUser } from "../firebaseAdmin.js";

function getUserId(req: any): string {
  return getFirebaseUserId(req);
}

const router = Router();

// Get current user
router.get('/user', firebaseAuthMiddleware, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    
    // Try to get user from database
    let user = await storage.getUser(userId);
    
    // Update email verification status if changed
    if (req.firebaseUser) {
      const isEmailVerified = req.firebaseUser.email_verified || false;
      // Always update verification status on login/check
      await storage.updateEmailVerificationStatus(userId, isEmailVerified);
    }

    // If user doesn't exist in database, create from Firebase token data
    if (!user && req.firebaseUser) {
      // Use data from decoded token (no need for getUserByUid which requires Service Account)
      user = await storage.upsertUser({
        id: userId,
        email: req.firebaseUser.email || null,
        firstName: req.firebaseUser.name?.split(' ')[0] || null,
        lastName: req.firebaseUser.name?.split(' ').slice(1).join(' ') || null,
        profileImageUrl: req.firebaseUser.picture || null,
      });
    }
    
    res.json(user);
  } catch (error: any) {
    console.error("Error fetching user:", error);
    res.status(500).json({ 
      message: "Failed to fetch user",
      details: error.message 
    });
  }
});

// Check email verification and claim reward if eligible
router.post('/check-verification-reward', firebaseAuthMiddleware, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    
    // Get email verification status from Firebase Auth token
    const isEmailVerified = req.firebaseUser?.email_verified || false;
    
    // Sync verification status to database
    await storage.updateEmailVerificationStatus(userId, isEmailVerified);
    
    // Try to claim reward if eligible
    const result = await storage.claimVerificationReward(userId, isEmailVerified);
    
    if (result?.success) {
      res.json({
        success: true,
        rewardClaimed: true,
        tokenBalance: result.tokenBalance,
        message: 'Verification reward claimed successfully',
      });
    } else {
      res.json({
        success: false,
        rewardClaimed: result?.rewardClaimed || false,
        tokenBalance: result?.tokenBalance || 0,
        isEmailVerified,
        message: result?.message || 'Reward not eligible',
      });
    }
  } catch (error: any) {
    console.error("Error checking verification reward:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to check verification reward",
      error: error.message 
    });
  }
});

// Delete user account
router.delete('/user', firebaseAuthMiddleware, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    
    // Delete user from database (cascading delete via foreign keys)
    const dbDeleteSuccess = await storage.deleteUser(userId);
    if (!dbDeleteSuccess) {
      console.warn(`User ${userId} not found in database, continuing with Firebase deletion`);
    }
    
    // Delete user from Firebase
    try {
      await deleteFirebaseUser(userId);
    } catch (firebaseError: any) {
      // If Firebase user doesn't exist, that's okay (might have been deleted already)
      if (firebaseError?.code !== 'auth/user-not-found') {
        console.error("Error deleting Firebase user:", firebaseError);
        // Continue anyway if database deletion succeeded
        if (!dbDeleteSuccess) {
          throw firebaseError;
        }
      }
    }
    
    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    const errorMessage = error?.message || "Failed to delete account";
    const errorCode = error?.code || "UNKNOWN_ERROR";
    res.status(500).json({ 
      message: errorMessage,
      code: errorCode,
      error: "Failed to delete account" 
    });
  }
});

export default router;

