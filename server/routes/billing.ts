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

    // Validate required fields
    if (!productId || productId.trim() === '') {
      console.error('❌ Missing or empty productId in request:', {
        productId,
        productIdType: typeof productId,
        fullBody: req.body,
        bodyKeys: Object.keys(req.body),
      });
      return res.status(400).json({ 
        error: "Missing product ID",
        message: "Product ID is required but was not provided or is empty",
        received: req.body,
        transactionId: transactionId || 'N/A',
        orderId: orderId || 'N/A',
      });
    }

    // Support both purchaseToken (from new plugin) and receipt (legacy)
    const tokenOrReceipt = purchaseToken || receipt;

    console.log(`💰 Processing purchase for user ${userId}: ${productId} on ${platform}`, {
      transactionId,
      orderId,
      hasToken: !!tokenOrReceipt,
      tokenLength: tokenOrReceipt?.length,
      productId,
      productIdType: typeof productId,
      fullRequestBody: req.body, // Log full request for debugging
    });

    // TODO: Verify receipt with Google/Apple servers
    // This is CRITICAL for production security. 
    // Without this, anyone can fake a request to this endpoint.
    // Libraries to use: 'googleapis' (Android), 'apple-receipt-verify' or similar (iOS)

    // For now, we trust the client (Development/MVP mode)
    
    // Normalize product ID (trim whitespace, handle case variations)
    const normalizedProductId = productId?.trim()?.toLowerCase();
    
    // Product ID mapping for Google Play (in case it returns Base Plan ID or different format)
    const productIdMap: Record<string, string> = {
      // Standard product IDs
      'wevro_token_s': 'wevro_token_s',
      'wevro_token_m': 'wevro_token_m',
      'wevro_token_l': 'wevro_token_l',
      'wevro_pro_monthly': 'wevro_pro_monthly',
      'wevro_token_test': 'wevro_token_test', // Test product: $0.3 for 2 tokens
      // Handle potential variations
      'wevro_tokens_small': 'wevro_token_s',
      'wevro_tokens_medium': 'wevro_token_m',
      'wevro_tokens_large': 'wevro_token_l',
      // Base Plan IDs (for subscriptions - Google Play may return these instead of product ID)
      'monthly-plan': 'wevro_pro_monthly', // Base Plan ID for monthly subscription
    };
    
    const mappedProductId = productIdMap[normalizedProductId] || normalizedProductId;
    
    console.log(`🔍 Product ID mapping: "${productId}" -> "${mappedProductId}"`);
    
    let tokensToAdd = 0;
    let newPlan = null;

    switch (mappedProductId) {
      case 'wevro_token_s':
        tokensToAdd = 40;
        break;
      case 'wevro_token_m':
        tokensToAdd = 120;
        break;
      case 'wevro_token_l':
        tokensToAdd = 300;
        break;
      case 'wevro_token_test':
        tokensToAdd = 2; // Test product: $0.3 for 2 tokens
        break;
      case 'wevro_pro_monthly':
        newPlan = 'pro';
        tokensToAdd = 180; // Initial tokens for Pro? Or just update plan?
        // Usually Pro gives monthly allowance.
        break;
      default:
        // Log detailed error information for debugging
        console.error(`❌ Invalid product ID: "${productId}" (normalized: "${normalizedProductId}", mapped: "${mappedProductId}")`);
        console.error(`Full request body:`, JSON.stringify(req.body, null, 2));
        console.error(`Available product IDs: wevro_token_s, wevro_token_m, wevro_token_l, wevro_token_test, wevro_pro_monthly`);
        console.error(`Also accepts Base Plan IDs: monthly-plan`);
        
        // Return detailed error for debugging
        return res.status(400).json({ 
          error: "Invalid product ID", 
          message: `Product ID "${productId}" is not recognized. Please check the product ID matches one of the available products.`,
          productId: productId,
          normalized: normalizedProductId,
          mapped: mappedProductId,
          available: ['wevro_token_s', 'wevro_token_m', 'wevro_token_l', 'wevro_token_test', 'wevro_pro_monthly'],
          basePlanIds: ['monthly-plan'],
          receivedBody: req.body, // Include full request for debugging
        });
    }

    if (tokensToAdd > 0) {
      console.log(`💰 About to add ${tokensToAdd} tokens to user ${userId}`);
      const newBalance = await storage.addTokens(userId, tokensToAdd, "iap_purchase", {
        platform,
        productId,
        transactionId,
        orderId,
        purchaseToken: tokenOrReceipt,
      });
      console.log(`✅ Successfully added ${tokensToAdd} tokens to user ${userId}. New balance: ${newBalance}`);
    } else {
      console.warn(`⚠️ tokensToAdd is 0 or negative: ${tokensToAdd}. No tokens will be added.`);
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

    res.json({ 
      success: true, 
      message: "Purchase processed", 
      tokensAdded: tokensToAdd,
      productId: productId,
      transactionId: transactionId,
    });
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
