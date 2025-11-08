// Firebase Authentication Middleware for Express
import type { RequestHandler } from "express";
import { verifyIdToken } from "./firebaseAdmin.js";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      firebaseUser?: {
        uid: string;
        email?: string;
        name?: string;
        picture?: string;
      };
    }
  }
}

// Middleware to verify Firebase ID token
export const firebaseAuthMiddleware: RequestHandler = async (req, res, next) => {
  try {
    // Get token from Authorization header or query parameter
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.query.token as string;

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Verify token with Firebase Admin
    const decodedToken = await verifyIdToken(token);
    
    // Attach user info to request
    req.firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };

    next();
  } catch (error) {
    console.error("Firebase auth error:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Helper function to get user ID from request
export function getFirebaseUserId(req: any): string {
  if (req.firebaseUser?.uid) {
    return req.firebaseUser.uid;
  }
  throw new Error("No Firebase user in request");
}


