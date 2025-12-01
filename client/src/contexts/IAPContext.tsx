import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE, type Product, type Transaction } from '@capgo/native-purchases';

// Define product IDs
export const PRODUCT_IDS = {
  TOKEN_S: 'wevro_token_s',
  TOKEN_M: 'wevro_token_m',
  TOKEN_L: 'wevro_token_l',
  TOKEN_TEST: 'wevro_token_test', // Test product: $0.3 for 2 tokens
  PRO_MONTHLY: 'wevro_pro_monthly', // Match the actual product ID in Google Play Console
};

// Define Base Plan IDs for subscriptions (Android only)
export const BASE_PLAN_IDS = {
  PRO_MONTHLY: 'monthly-plan', // Base Plan ID for monthly subscription
};

interface IAPContextType {
  products: Product[];
  purchase: (productId: string) => Promise<void>;
  restore: () => Promise<void>;
  isLoading: boolean;
  isSupported: boolean;
}

const IAPContext = createContext<IAPContextType | null>(null);

export function IAPProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const initIAP = async () => {
      // DEBUG: Log version to verify update
      console.log('[IAP] IAPContext loaded - Version: 1.0.41 (Fix for stuck transactions)');
      
      // Only initialize on mobile platforms
      const platform = Capacitor.getPlatform();
      console.log('[IAP] Initializing IAP, platform:', platform);
      
      if (platform === 'web') {
        console.log('IAP: Running on web, IAP not supported');
        setIsLoading(false);
        setIsSupported(false);
        return;
      }

      try {
        // Check if billing is supported
        console.log('[IAP] Checking if billing is supported...');
        const billingCheck = await NativePurchases.isBillingSupported();
        console.log('[IAP] Billing support check result:', billingCheck);
        
        if (!billingCheck.isBillingSupported) {
          console.warn('IAP: Billing not supported on this device');
          toast({
            title: 'Billing Not Supported',
            description: 'In-App Purchases are not supported on this device or emulator. Please use a real device or Google Play test environment.',
            variant: 'destructive',
            duration: 10000,
          });
          setIsLoading(false);
          setIsSupported(false);
          return;
        }

        console.log('[IAP] Billing is supported, setting isSupported to true');
        setIsSupported(true);

        // Load products
        await loadProducts();
        
        // Check for and process any unconsumed purchases (critical for consumable products)
        await checkAndProcessUnconsumedPurchases();
      } catch (error) {
        console.error('IAP: Initialization error', error);
        toast({
          title: 'IAP Initialization Failed',
          description: `Failed to initialize In-App Purchases: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your device and try again.`,
          variant: 'destructive',
          duration: 10000,
        });
        setIsLoading(false);
        setIsSupported(false);
      }
    };

    const loadProducts = async () => {
      try {
        const platform = Capacitor.getPlatform();
        const productIds = [
          PRODUCT_IDS.TOKEN_S,
          PRODUCT_IDS.TOKEN_M,
          PRODUCT_IDS.TOKEN_L,
          PRODUCT_IDS.TOKEN_TEST, // Test product for development
        ];

        const allProducts: Product[] = [];

        // Load consumable products (tokens) - handle errors gracefully
        try {
          console.log('[IAP] Loading consumable products...');
          const consumableResult = await NativePurchases.getProducts({
            productIdentifiers: productIds,
            productType: PURCHASE_TYPE.INAPP,
          });
          allProducts.push(...consumableResult.products);
          console.log('IAP: Loaded consumable products:', consumableResult.products.map(p => p.identifier));
        } catch (error: any) {
          console.warn('IAP: Failed to load consumable products:', error?.message || error);
          // 即使加載失敗，也繼續（可以在購買時動態獲取）
        }

        // Load subscription product - handle errors gracefully
        try {
          console.log('[IAP] Loading subscription products...');
          const subscriptionResult = await NativePurchases.getProducts({
            productIdentifiers: [PRODUCT_IDS.PRO_MONTHLY],
            productType: PURCHASE_TYPE.SUBS,
          });
          allProducts.push(...subscriptionResult.products);
          console.log('IAP: Loaded subscription products:', subscriptionResult.products.map(p => p.identifier));
        } catch (error: any) {
          console.warn('IAP: Failed to load subscription products:', error?.message || error);
          // 即使加載失敗，也繼續（可以在購買時動態獲取）
        }

        if (allProducts.length > 0) {
          console.log('IAP: Total products loaded:', allProducts.length, allProducts.map(p => p.identifier));
          setProducts(allProducts);
        } else {
          console.warn('IAP: No products were loaded. Products will be fetched dynamically when needed.');
          // 即使沒有產品，也允許繼續（購買時會動態獲取）
        }
        
        // 無論成功或失敗，都設置 isLoading 為 false
        // 這樣用戶可以嘗試購買（購買時會動態獲取產品）
        console.log('[IAP] Product loading completed, setting isLoading to false');
        setIsLoading(false);
      } catch (error: any) {
        console.error('IAP: Failed to load products:', error?.message || error);
        // 確保即使出錯也設置 isLoading 為 false
        setIsLoading(false);
      }
    };

    // Function to check and process unconsumed purchases
    // This is critical for consumable products - if a purchase wasn't consumed,
    // the user won't be able to purchase again
    const checkAndProcessUnconsumedPurchases = async () => {
      try {
        console.log('[IAP] Checking for unconsumed purchases...');
        
        // Query for in-app purchases (consumable products)
          try {
          const purchasesResult = await NativePurchases.getPurchases({
            productType: PURCHASE_TYPE.INAPP,
          });
            
          if (purchasesResult && purchasesResult.purchases && Array.isArray(purchasesResult.purchases)) {
            console.log(`[IAP] Found ${purchasesResult.purchases.length} in-app purchases`);
            
            for (const purchase of purchasesResult.purchases) {
              // Skip subscription products
              if (purchase.productIdentifier?.includes('pro_monthly')) {
                continue;
              }
              
              // Only process purchased items (state === "1")
              if (purchase.purchaseState === "1" && purchase.purchaseToken) {
                console.log('[IAP] Found unconsumed consumable purchase:', {
                  productId: purchase.productIdentifier,
                  transactionId: purchase.transactionId,
                  purchaseToken: purchase.purchaseToken,
                });

                // Check if productIdentifier is valid (not a long internal ID)
                const isValidProductId = Object.values(PRODUCT_IDS).some(id => purchase.productIdentifier === id);
                
                if (isValidProductId) {
                  // Process and consume valid purchases
                  await handlePurchaseSuccess(purchase as Transaction, purchase.productIdentifier);
                  await tryConsumePurchase(purchase as Transaction);
                } else {
                  console.warn('[IAP] Found unconsumed purchase with invalid/internal product ID:', purchase.productIdentifier);
                  console.warn('[IAP] Consuming this purchase directly to clean up stuck queue');
                  // Directly consume invalid/stuck purchases without verification to prevent infinite error loops
                  await tryConsumePurchase(purchase as Transaction);
                }
              }
            }
            }
          } catch (queryError: any) {
            console.warn('[IAP] Failed to query purchases:', queryError);
        }
      } catch (error: any) {
        console.error('[IAP] Error checking unconsumed purchases:', error);
      }
    };
    
    // Helper function to try consuming a purchase
    const tryConsumePurchase = async (transaction: Transaction) => {
      if (!transaction.purchaseToken) return false;
      
          try {
        // Use the new consumePurchase method we added to the plugin
        await (NativePurchases as any).consumePurchase({
          token: transaction.purchaseToken,
            });
        console.log('✅ [IAP] Successfully consumed purchase');
            return true;
          } catch (error: any) {
        console.warn('[IAP] Failed to consume purchase:', error?.message || error);
        // If it fails, it might be already consumed - that's OK
      return false;
      }
    };

    // Note: Android purchases are handled synchronously in purchaseProduct()
    // iOS uses transactionUpdated listener for StoreKit 2
    if (Capacitor.getPlatform() === 'ios') {
      NativePurchases.addListener('transactionUpdated', async (transaction: Transaction) => {
        console.log('IAP: Transaction updated (iOS)', transaction);
        // For iOS, try to get productId from transaction or use productIdentifier
        const productId = transaction.productIdentifier || (transaction as any).productId;
        await handlePurchaseSuccess(transaction, productId);
      }).catch((err) => {
        console.error('IAP: Failed to set up transaction listener', err);
      });
    }

    initIAP();

    return () => {
      // Cleanup listeners if needed
      NativePurchases.removeAllListeners().catch(console.error);
    };
  }, []);

  // Store the original productId when purchase is initiated, so we can use it if transaction.productIdentifier is missing
  const purchaseProductIdMap = new Map<string, string>();
  
  const handlePurchaseSuccess = async (transaction: Transaction, originalProductId?: string) => {
    try {
      const platform = Capacitor.getPlatform();
      
      // DEBUG: Log all inputs to track down productId loss
      console.log('[DEBUG] handlePurchaseSuccess called', {
        arg_originalProductId: originalProductId,
        arg_originalProductIdType: typeof originalProductId,
        arg_originalProductIdLength: originalProductId?.length,
        transaction_productIdentifier: transaction?.productIdentifier,
        transaction_productIdentifierType: typeof transaction?.productIdentifier,
        transactionKeys: transaction ? Object.keys(transaction) : 'no transaction',
        fullTransaction: transaction,
      });
      
      // CRITICAL: Always prioritize originalProductId (the one we requested to purchase)
      // Google Play may return Base Plan ID for subscriptions or incorrect format
      // The originalProductId is the one we know is correct and matches our backend mapping
      let productId = originalProductId;
      
      // Only use transaction.productIdentifier as fallback if originalProductId is not available
      if (!productId || productId.trim() === '') {
        console.warn('IAP: originalProductId is missing, falling back to transaction.productIdentifier');
        productId = transaction.productIdentifier || 
                   (transaction as any).productId || 
                   (transaction as any).product_id || 
                   (transaction as any).sku || 
                   null;
        
        if (!productId || productId.trim() === '') {
          console.error('IAP: Cannot determine productId from transaction:', {
            transaction,
            originalProductId,
            productIdentifier: transaction.productIdentifier,
            transactionKeys: Object.keys(transaction),
          });
          toast({
            title: 'Verification Error',
            description: 'Cannot determine product ID from purchase. Please contact support with your transaction ID.',
            variant: 'destructive',
            duration: 10000,
          });
          return;
        }
        console.log('IAP: Using fallback productId from transaction:', productId);
      } else {
        console.log('IAP: Using originalProductId (requested product):', productId);
        // Log what Google Play returned for debugging
        if (transaction.productIdentifier && transaction.productIdentifier !== productId) {
          console.log('IAP: Note - Google Play returned different productIdentifier:', transaction.productIdentifier, 'but using requested:', productId);
        }
      }

      console.log('IAP: Starting verification process', {
        productId,
        productIdentifier: transaction.productIdentifier,
        transactionId: transaction.transactionId,
        orderId: transaction.orderId,
        hasPurchaseToken: !!transaction.purchaseToken,
        hasReceipt: !!transaction.receipt,
        platform,
        fullTransaction: transaction, // Log full transaction for debugging
      });

      // Validate productId before sending
      if (!productId || productId.trim() === '') {
        console.error('IAP: productId is empty or invalid after all fallbacks:', {
          productId,
          originalProductId,
          transactionProductIdentifier: transaction.productIdentifier,
          transactionKeys: Object.keys(transaction),
        });
        toast({
          title: 'Verification Error',
          description: 'Product ID is missing. Please contact support with your transaction ID.',
          variant: 'destructive',
          duration: 10000,
        });
        return;
      }

      // CRITICAL: Strict Allowlist Check
      // Ensure the productId is one of our known products
      // This prevents invalid IDs (like purchase tokens) from being sent to the backend
      const knownProductIds = [
        ...Object.values(PRODUCT_IDS),
        ...Object.values(BASE_PLAN_IDS),
        'monthly-plan', // Add any other aliases here
        'android.test.purchased',
        'android.test.canceled',
        'android.test.refunded',
        'android.test.item_unavailable',
      ];
      
      // Check if the productId is in our allowlist
      const isKnownProduct = knownProductIds.some(id => productId === id) || 
                             // Also allow if it ends with one of our IDs (handling potential prefixes)
                             knownProductIds.some(id => productId!.endsWith(id));

      if (!isKnownProduct) {
        console.error('IAP: Blocked invalid productId from verification:', productId);
        console.warn('IAP: This ID is not in our allowlist and looks like an internal token or error.');
        
        // If it's definitely not a valid product, we should probably just consume it to clear the queue
        // But for safety, let's just show a user-friendly error first
        toast({
          title: 'Purchase Error',
          description: 'Invalid product identifier detected. The purchase cannot be verified.',
          variant: 'destructive',
          duration: 10000,
        });
        return;
      }

      // DEBUG: Log request body before sending
      const requestBody = {
          platform: platform === 'ios' ? 'apple-appstore' : 'google-play',
          productId: productId.trim(), // Ensure no whitespace
          transactionId: transaction.transactionId,
          purchaseToken: transaction.purchaseToken || transaction.receipt,
          receipt: transaction.receipt, // Also send receipt for backwards compatibility
          orderId: transaction.orderId,
      };
      
      console.log('[DEBUG] About to send verification request:', {
        productId: requestBody.productId,
        productIdType: typeof requestBody.productId,
        productIdLength: requestBody.productId?.length,
        hasPurchaseToken: !!requestBody.purchaseToken,
        purchaseTokenLength: requestBody.purchaseToken?.length,
        fullRequestBody: requestBody,
      });

      // Send receipt to backend for verification
      const response = await fetchWithAuth('/api/billing/verify', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json().catch(() => ({}));

      if (response.ok) {
        console.log('IAP: Verification successful', responseData);
        
        // Check if tokens were actually added
        const tokensAdded = responseData.tokensAdded || 0;
        if (tokensAdded > 0) {
          console.log(`✅ IAP: ${tokensAdded} tokens should have been added to account`);
        } else {
          console.warn('⚠️ IAP: Verification successful but tokensAdded is 0 or missing:', responseData);
        }
        
        // Immediately refresh quota to show updated token balance
        await queryClient.invalidateQueries({ queryKey: ["/api/quota"] });
        console.log('IAP: Quota query invalidated, balance will refresh');
        
        // Force refetch to ensure we get the latest balance
        await queryClient.refetchQueries({ queryKey: ["/api/quota"] });
        console.log('IAP: Quota query refetched');
        
        toast({
          title: 'Purchase Successful',
          description: `Your purchase has been processed. ${tokensAdded > 0 ? `${tokensAdded} tokens added.` : 'Please check your balance.'}`,
          duration: 5000,
        });
      } else {
        // Log detailed error information
        console.error('IAP: Verification failed', {
          status: response.status,
          statusText: response.statusText,
          responseData,
          requestData: {
            platform: platform === 'ios' ? 'apple-appstore' : 'google-play',
            productId: productId,
            transactionId: transaction.transactionId,
            orderId: transaction.orderId,
            purchaseToken: transaction.purchaseToken ? 'present' : 'missing',
          },
          transaction: {
            productId,
            productIdentifier: transaction.productIdentifier,
            originalProductId: originalProductId,
            transactionId: transaction.transactionId,
            orderId: transaction.orderId,
          },
        });
        
        const errorMessage = responseData?.error || responseData?.message || 'Unknown error';
        const errorDetails = responseData?.available ? `Available products: ${responseData.available.join(', ')}` : '';
        const receivedProductId = responseData?.productId ? `Received: ${responseData.productId}` : '';
        
        // Show detailed error message
        let errorDescription = `Purchase verification failed: ${errorMessage}`;
        if (responseData?.normalized || responseData?.mapped) {
          errorDescription += `\nProduct ID: ${productId}`;
          if (responseData.normalized) errorDescription += ` (normalized: ${responseData.normalized})`;
          if (responseData.mapped) errorDescription += ` (mapped: ${responseData.mapped})`;
        }
        if (errorDetails) errorDescription += `\n${errorDetails}`;
        if (receivedProductId) errorDescription += `\n${receivedProductId}`;
        errorDescription += `\nTransaction ID: ${transaction.transactionId || 'N/A'}`;
        errorDescription += `\nPlease contact support with this information.`;
        
        toast({
          title: 'Verification Failed',
          description: errorDescription,
          variant: 'destructive',
          duration: 15000, // Show for 15 seconds to allow user to read
        });
      }
    } catch (err: any) {
      console.error('IAP: Verification error', {
        error: err,
        message: err?.message,
        stack: err?.stack,
        transaction: transaction ? {
          productId: transaction.productIdentifier,
          transactionId: transaction.transactionId,
          orderId: transaction.orderId,
        } : 'No transaction data',
      });
      
      toast({
        title: 'Verification Error',
        description: `Network error during verification. Please check your connection and try again. Transaction ID: ${transaction?.transactionId || 'N/A'}.`,
        variant: 'destructive',
        duration: 10000,
      });
    }
  };

  const purchase = async (productId: string) => {
    // DEBUG: Validate productId parameter at function entry
    if (!productId || typeof productId !== 'string' || productId.trim() === '') {
      console.error('[IAP] CRITICAL: purchase() called with invalid productId:', {
        productId,
        productIdType: typeof productId,
        productIdValue: productId,
      });
      toast({
        title: 'Purchase Error',
        description: 'Invalid product ID. Please try again or contact support.',
        variant: 'destructive',
      });
      return;
    }
    
    // Store original productId in a const to prevent accidental overwriting
    const requestedProductId = productId.trim();
    
    console.log('[IAP] purchase() called with productId:', requestedProductId);
    console.log('[IAP] isSupported:', isSupported, 'isLoading:', isLoading);
    
    if (!isSupported) {
      console.warn('[IAP] IAP not supported on this device');
      toast({
        title: 'Store not available',
        description: 'In-App Purchases are only available on mobile devices.',
        variant: 'destructive',
      });
      return;
    }
    
    if (isLoading) {
      console.warn('[IAP] IAP is still loading, but attempting to proceed with dynamic product fetch');
      // 不阻止購買，允許動態獲取產品
      // 這樣即使產品列表還沒加載完成，也可以嘗試購買
    }

    const platform = Capacitor.getPlatform();
    const isSubscription = requestedProductId === PRODUCT_IDS.PRO_MONTHLY;
    const productType = isSubscription ? PURCHASE_TYPE.SUBS : PURCHASE_TYPE.INAPP;

    // Check if product exists in loaded products
    let product = products.find(p => p.identifier === requestedProductId);
    
    // If product not found in loaded products, try to fetch it directly
    // This handles cases where state hasn't updated yet or product list is empty
    if (!product) {
      console.warn(`IAP: Product ${requestedProductId} not found in loaded products. Attempting to fetch directly...`);
      console.log('IAP: Currently loaded products:', products.map(p => p.identifier));
      
      try {
        // Try to fetch the product directly from Google Play
        const productResult = await NativePurchases.getProduct({
          productIdentifier: requestedProductId,
          productType: productType,
        });
        product = productResult.product;
        console.log('IAP: Successfully fetched product directly:', productResult.product.identifier);
        
        // Update products state with the fetched product
        if (productResult.product && !products.find(p => p.identifier === productResult.product.identifier)) {
          setProducts([...products, productResult.product]);
        }
      } catch (fetchError: any) {
        console.error('IAP: Failed to fetch product directly:', fetchError?.message || fetchError);
        toast({
          title: 'Product not found',
          description: `Could not find product: ${requestedProductId}. Please check Google Play Console configuration.`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Final check - if still no product, fail
    if (!product) {
      console.error(`IAP: Product ${requestedProductId} still not available after fetch attempt`);
      toast({
        title: 'Product not found',
        description: `Product ${requestedProductId} is not available. Available: ${products.map(p => p.identifier).join(', ') || 'none'}`,
        variant: 'destructive',
      });
      return;
    }

    // At this point, product is guaranteed to be defined
    const finalProduct = product;

    try {
      // For subscriptions, use the subscription product ID (not the Base Plan ID)
      // The loaded product identifier might be the Base Plan ID, but we need to use the subscription ID
      const purchaseProductId = isSubscription ? requestedProductId : finalProduct.identifier;
      
      const purchaseParams: any = {
        productIdentifier: purchaseProductId,
        productType: productType,
        isConsumable: !isSubscription, // Tokens are consumable, subscriptions are not
        // CRITICAL: For consumable products, we need autoAcknowledgePurchases: true
        // This allows the plugin to automatically handle consumption
        // If set to false, we must manually acknowledge AND consume, but the plugin may not support manual consume
        autoAcknowledgePurchases: !isSubscription, // Auto-acknowledge for consumables, manual for subscriptions
        // For consumable products, the plugin should automatically consume when isConsumable: true and autoAcknowledgePurchases: true
      };
      
      // For Android subscriptions, add Base Plan ID (required)
      if (platform === 'android' && isSubscription) {
        purchaseParams.planIdentifier = BASE_PLAN_IDS.PRO_MONTHLY;
      }
      
      console.log('IAP: Purchasing product:', {
        requestedProductId: requestedProductId, // Use the const we saved
        purchaseProductId: purchaseProductId,
        loadedProductIdentifier: finalProduct.identifier,
        productTitle: finalProduct.title,
        productType: productType,
        isSubscription: isSubscription,
        planIdentifier: purchaseParams.planIdentifier,
        platform: platform,
      });

      let transaction: Transaction;
      try {
        transaction = await NativePurchases.purchaseProduct(purchaseParams);
      } catch (purchaseError: any) {
        console.error('IAP: purchaseProduct() threw error:', {
          error: purchaseError,
          message: purchaseError?.message,
          code: purchaseError?.code,
          name: purchaseError?.name,
          stack: purchaseError?.stack,
          purchaseParams: purchaseParams,
          requestedProductId: requestedProductId, // Use the const we saved
        });
        throw purchaseError; // Re-throw to be handled by outer catch
      }

      console.log('IAP: Purchase transaction received', {
        requestedProductId: requestedProductId, // Log the original requested ID
        transactionId: transaction.transactionId,
        transactionProductIdentifier: transaction.productIdentifier,
        purchaseState: transaction.purchaseState,
        purchaseToken: transaction.purchaseToken,
        orderId: transaction.orderId,
        productType: transaction.productType,
      });

      // For Android, check purchaseState - "1" means PURCHASED
      if (platform === 'android') {
        const purchaseState = transaction.purchaseState;
        console.log('IAP: Android purchase state:', purchaseState, typeof purchaseState);
        
        // purchaseState is a string (numeric string) on Android
        if (purchaseState !== "1") {
          console.warn('IAP: Purchase state is not PURCHASED. State:', purchaseState, 'Type:', typeof purchaseState);
          
          // Purchase state: "0" = PENDING, "1" = PURCHASED, others = various states
          if (purchaseState === "0") {
            toast({
              title: 'Purchase Pending',
              description: 'Your purchase is being processed. Please wait for confirmation.',
              variant: 'default',
            });
          } else {
            toast({
              title: 'Purchase Status Unknown',
              description: `Purchase state: ${purchaseState || 'unknown'}. Please check your purchase history.`,
              variant: 'default',
            });
          }
          
          // Don't process as successful purchase yet
          return;
        }
        
        console.log('IAP: Purchase state is PURCHASED, proceeding with verification');
      }

      // DEBUG: Log before calling handlePurchaseSuccess to ensure productId is preserved
      console.log('[DEBUG] About to call handlePurchaseSuccess with:', {
        requestedProductId: requestedProductId,
        requestedProductIdType: typeof requestedProductId,
        requestedProductIdLength: requestedProductId?.length,
        transactionProductIdentifier: transaction.productIdentifier,
      });

      // Handle purchase success - pass the original requestedProductId
      // CRITICAL: Use requestedProductId (the const we saved) to ensure it's never lost
      // Use the requested productId (not purchaseProductId) as it's the one we want to verify
      await handlePurchaseSuccess(transaction, requestedProductId);

      // For consumable products with autoAcknowledgePurchases: true, the plugin should automatically consume
      // But we still need to manually acknowledge for subscriptions
      // For consumables, if autoAcknowledgePurchases is true, consumption should happen automatically
      if (platform === 'android' && transaction.purchaseToken) {
        if (isSubscription) {
          // For subscriptions, we need to acknowledge manually
          try {
            await NativePurchases.acknowledgePurchase({
              purchaseToken: transaction.purchaseToken,
            });
            console.log('IAP: Subscription purchase acknowledged successfully');
          } catch (ackError: any) {
            console.error('IAP: Failed to acknowledge subscription purchase:', ackError);
          }
        } else {
          // For consumable products, manually consume to ensure Google Play removes the purchase
          // This is critical for allowing repeated purchases of the same consumable product
          try {
            console.log('IAP: Manually consuming purchase to allow repeated purchases...');
            console.log('IAP: Purchase token:', transaction.purchaseToken);
            
            // Use the new consumePurchase method we added to the plugin
            await (NativePurchases as any).consumePurchase({
              token: transaction.purchaseToken,
                  });
            console.log('✅ IAP: Purchase consumed successfully - user can now purchase again');
          } catch (consumeError: any) {
            // If consume fails, it might mean:
            // 1. Purchase was already consumed (OK, can ignore)
            // 2. Network error (should retry later)
            // 3. Purchase doesn't exist (shouldn't happen, but log it)
            console.warn('IAP: Failed to consume purchase:', consumeError?.message || consumeError);
            
            // Don't throw - the purchase was already verified and tokens were added
            // We'll try to consume again on next app launch if needed
          }
        }
      }
    } catch (err: any) {
      console.error('IAP: Purchase failed', {
        error: err,
        message: err?.message,
        code: err?.code,
        name: err?.name,
        stack: err?.stack,
      });
      
      // Check if user cancelled
      const errorMessage = err?.message || '';
      const errorName = err?.name || '';
      
      console.log('[IAP] Error details:', {
        errorMessage,
        errorName,
        code: err?.code,
        fullError: err,
      });
      
      // Handle specific error cases
      if (
        errorMessage.includes('cancel') || 
        errorMessage.includes('Cancel') ||
        errorMessage.includes('User cancelled') ||
        errorName.includes('UserCancel')
      ) {
        console.log('IAP: User cancelled purchase');
        // User cancelled, show a friendly message instead of error
        toast({
          title: 'Purchase Cancelled',
          description: 'Purchase was cancelled. No charges were made.',
          variant: 'default',
        });
        return;
      }
      
      // Handle "Product not found" from Google Play
      if (
        errorMessage.includes('not found') ||
        errorMessage.includes('could not be found') ||
        errorMessage.includes('Product not found') ||
        errorMessage.includes('item you were attempting to purchase')
      ) {
        console.error('IAP: Google Play returned "Product not found" error');
        console.error('IAP: This may indicate:', {
          reason: 'Product ID mismatch or product not available in test environment',
          productId: productId,
          productType: productType,
          suggestion: 'Check Google Play Console to ensure product is published and available',
        });
        toast({
          title: 'Product Not Available',
          description: 'This product is not available for purchase. Please check Google Play Console configuration or try again later.',
          variant: 'destructive',
        });
        return;
      }
      
      // Handle "Purchase is not purchased" error - this can happen when:
      // 1. Purchase is still pending (state = 0)
      // 2. Purchase was cancelled before completion
      // 3. Purchase failed for some reason
      if (
        errorMessage.includes('not purchased') ||
        errorMessage.includes('Purchase is not purchased') ||
        errorMessage.includes('purchaseState')
      ) {
        console.warn('IAP: Purchase not completed - state is not PURCHASED');
        toast({
          title: 'Purchase Not Completed',
          description: 'The purchase was not completed. If you were charged, the transaction will be processed shortly.',
          variant: 'default',
        });
        return;
      }

      // Show error for other cases
      console.error('IAP: Unknown purchase error:', errorMessage);
      toast({
        title: 'Purchase Failed',
        description: errorMessage || 'An error occurred during purchase. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const restore = async () => {
    if (!isSupported) {
      return;
    }

    try {
      await NativePurchases.restorePurchases();
      toast({
        title: 'Purchases Restored',
        description: 'Your previous purchases have been restored.',
      });
    } catch (err: any) {
      console.error('IAP: Restore failed', err);
      toast({
        title: 'Restore Failed',
        description: 'Failed to restore purchases.',
        variant: 'destructive',
      });
    }
  };

  return (
    <IAPContext.Provider value={{ products, purchase, restore, isLoading, isSupported }}>
      {children}
    </IAPContext.Provider>
  );
}

export function useIAP() {
  const context = useContext(IAPContext);
  if (!context) {
    throw new Error('useIAP must be used within an IAPProvider');
  }
  return context;
}
