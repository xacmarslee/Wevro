import { Router } from "express";
import { storage } from "../storage.js";
import { firebaseAuthMiddleware, getFirebaseUserId } from "../firebaseAuth.js";

function getUserId(req: any): string {
  return getFirebaseUserId(req);
}

const router = Router();

// Get user quota (tokens and plan) - Moved here from billing.ts to match original /api/quota path logic
router.get('/quota', firebaseAuthMiddleware, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const quota = await storage.getUserQuota(userId);
    res.json(quota);
  } catch (error: any) {
    console.error("Error fetching quota:", error);
    res.status(500).json({ 
      message: "Failed to fetch quota",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;

