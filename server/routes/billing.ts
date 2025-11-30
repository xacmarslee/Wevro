import { Router } from "express";
import { storage } from "../storage.js";
import { firebaseAuthMiddleware, getFirebaseUserId } from "../firebaseAuth.js";

function getUserId(req: any): string {
  return getFirebaseUserId(req);
}

const router = Router();

router.post("/verify", firebaseAuthMiddleware, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const { platform, productId, transactionId, purchaseToken, receipt, orderId } = req.body;

    // Support both purchaseToken (from new plugin) and receipt (legacy)
    const tokenOrReceipt = purchaseToken || receipt;

    console.log(`💰 Processing purchase for user ${userId}: ${productId} on ${platform}`, {
      transactionId,
      orderId,
      hasToken: !!tokenOrReceipt,
      tokenLength: tokenOrReceipt?.length,
    });

    // TODO: Verify receipt with Google/Apple servers
    // This is CRITICAL for production security. 
    // Without this, anyone can fake a request to this endpoint.
    // Libraries to use: 'googleapis' (Android), 'apple-receipt-verify' or similar (iOS)

    // For now, we trust the client (Development/MVP mode)
    
    let tokensToAdd = 0;
    let newPlan = null;

    switch (productId) {
      case 'wevro_token_s':
        tokensToAdd = 40;
        break;
      case 'wevro_token_m':
        tokensToAdd = 120;
        break;
      case 'wevro_token_l':
        tokensToAdd = 300;
        break;
      case 'wevro_pro_monthly':
        newPlan = 'pro';
        tokensToAdd = 180; // Initial tokens for Pro? Or just update plan?
        // Usually Pro gives monthly allowance.
        break;
      default:
        console.error(`❌ Invalid product ID: ${productId}`);
        return res.status(400).json({ error: "Invalid product ID", productId });
    }

    if (tokensToAdd > 0) {
      await storage.addTokens(userId, tokensToAdd, "iap_purchase", {
        platform,
        productId,
        transactionId,
        orderId,
        purchaseToken: tokenOrReceipt,
      });
      console.log(`✅ Added ${tokensToAdd} tokens to user ${userId}`);
    }

    if (newPlan) {
      // Update user subscription plan
      // Calculate subscription period end date (monthly subscription = current time + 1 month)
      const subscriptionPeriodEnd = new Date();
      subscriptionPeriodEnd.setMonth(subscriptionPeriodEnd.getMonth() + 1);
      
      // Update subscription plan and status
      await storage.updateSubscriptionPlan(
        userId,
        newPlan,
        subscriptionPeriodEnd,
        'active', // Subscription is active when purchased
        {
          platform,
          productId,
          transactionId,
          orderId,
          purchaseToken: tokenOrReceipt,
          subscriptionType: 'monthly',
          subscriptionStartDate: new Date().toISOString(),
        }
      );
      
      console.log(`✅ Updated user ${userId} to ${newPlan} plan. Subscription expires: ${subscriptionPeriodEnd.toISOString()}`);
    }

    res.json({ success: true, message: "Purchase processed", tokensAdded: tokensToAdd });
  } catch (error: any) {
    console.error("❌ Error processing purchase:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    res.status(500).json({ 
      error: "Failed to process purchase",
      message: error?.message || "Unknown error",
    });
  }
});

export default router;
