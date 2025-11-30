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
      // Use productIdentifier from transaction (this is what Google Play/Apple actually returned)
      // If productIdentifier is missing, use the original productId from purchase request
      let productId = transaction.productIdentifier;
      
      // Fallback: If productIdentifier is missing, use the original productId from purchase
      if (!productId || productId.trim() === '') {
        console.warn('IAP: productIdentifier is missing from transaction, using original productId');
        productId = originalProductId || 
                   (transaction as any).productId || 
                   (transaction as any).product_id || 
                   (transaction as any).sku || 
                   null;
        
        if (!productId) {
          console.error('IAP: Cannot determine productId from transaction:', {
            transaction,
            originalProductId,
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
        console.log('IAP: Using fallback productId:', productId);
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
        console.error('IAP: productId is empty or invalid:', productId);
        toast({
          title: 'Verification Error',
          description: 'Product ID is missing. Please contact support with your transaction ID.',
          variant: 'destructive',
          duration: 10000,
        });
        return;
      }

      // Send receipt to backend for verification
      const response = await fetchWithAuth('/api/billing/verify', {
        method: 'POST',
        body: JSON.stringify({
          platform: platform === 'ios' ? 'apple-appstore' : 'google-play',
          productId: productId.trim(), // Ensure no whitespace
          transactionId: transaction.transactionId,
          purchaseToken: transaction.purchaseToken || transaction.receipt,
          receipt: transaction.receipt, // Also send receipt for backwards compatibility
          orderId: transaction.orderId,
        }),
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
        console.error('IAP: Verification failed', {
          status: response.status,
          statusText: response.statusText,
          responseData,
          transaction: {
            productId,
            transactionId: transaction.transactionId,
            orderId: transaction.orderId,
          },
        });
        
        const errorMessage = responseData?.error || responseData?.message || 'Unknown error';
        
        toast({
          title: 'Verification Failed',
          description: `Purchase verification failed: ${errorMessage}. Transaction ID: ${transaction.transactionId || 'N/A'}. Please contact support with this information.`,
          variant: 'destructive',
          duration: 10000, // Show for 10 seconds
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
    console.log('[IAP] purchase() called with productId:', productId);
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
    const isSubscription = productId === PRODUCT_IDS.PRO_MONTHLY;
    const productType = isSubscription ? PURCHASE_TYPE.SUBS : PURCHASE_TYPE.INAPP;

    // Check if product exists in loaded products
    let product = products.find(p => p.identifier === productId);
    
    // If product not found in loaded products, try to fetch it directly
    // This handles cases where state hasn't updated yet or product list is empty
    if (!product) {
      console.warn(`IAP: Product ${productId} not found in loaded products. Attempting to fetch directly...`);
      console.log('IAP: Currently loaded products:', products.map(p => p.identifier));
      
      try {
        // Try to fetch the product directly from Google Play
        const productResult = await NativePurchases.getProduct({
          productIdentifier: productId,
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
          description: `Could not find product: ${productId}. Please check Google Play Console configuration.`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Final check - if still no product, fail
    if (!product) {
      console.error(`IAP: Product ${productId} still not available after fetch attempt`);
      toast({
        title: 'Product not found',
        description: `Product ${productId} is not available. Available: ${products.map(p => p.identifier).join(', ') || 'none'}`,
        variant: 'destructive',
      });
      return;
    }

    // At this point, product is guaranteed to be defined
    const finalProduct = product;

    try {
      // For subscriptions, use the subscription product ID (not the Base Plan ID)
      // The loaded product identifier might be the Base Plan ID, but we need to use the subscription ID
      const purchaseProductId = isSubscription ? productId : finalProduct.identifier;
      
      const purchaseParams: any = {
        productIdentifier: purchaseProductId,
        productType: productType,
        isConsumable: !isSubscription, // Tokens are consumable, subscriptions are not
        autoAcknowledgePurchases: false, // We'll acknowledge and consume after server verification
        // For consumable products, we need to manually consume after purchase
        // This allows users to purchase the same product multiple times
      };
      
      // For Android subscriptions, add Base Plan ID (required)
      if (platform === 'android' && isSubscription) {
        purchaseParams.planIdentifier = BASE_PLAN_IDS.PRO_MONTHLY;
      }
      
      console.log('IAP: Purchasing product:', {
        requestedProductId: productId,
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
          productId: productId,
        });
        throw purchaseError; // Re-throw to be handled by outer catch
      }

      console.log('IAP: Purchase transaction received', {
        transactionId: transaction.transactionId,
        productId: transaction.productIdentifier,
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

      // Handle purchase success - pass the original productId as fallback
      // Use the requested productId (not purchaseProductId) as it's the one we want to verify
      await handlePurchaseSuccess(transaction, productId);

      // For consumable products, we need to acknowledge AND consume the purchase
      // This allows users to purchase the same consumable product multiple times
      if (platform === 'android' && transaction.purchaseToken) {
        try {
          // Step 1: Acknowledge the purchase (required for all purchases)
          await NativePurchases.acknowledgePurchase({
            purchaseToken: transaction.purchaseToken,
          });
          console.log('IAP: Purchase acknowledged successfully');
          
          // Step 2: For consumable products, consume the purchase
          // This allows the user to purchase the same product again
          if (!isSubscription && transaction.purchaseToken) {
            try {
              // Consume the purchase to allow re-purchase
              // Note: Some plugins may use consumePurchase, others may handle it automatically
              // Check if the plugin has a consumePurchase method
              if (typeof (NativePurchases as any).consumePurchase === 'function') {
                await (NativePurchases as any).consumePurchase({
                  purchaseToken: transaction.purchaseToken,
                });
                console.log('IAP: Purchase consumed successfully - can be purchased again');
              } else {
                // If consumePurchase is not available, try using acknowledgePurchase with consume flag
                // Or the plugin may handle consumption automatically for consumable products
                console.log('IAP: consumePurchase method not available, purchase may need manual consumption');
              }
            } catch (consumeError: any) {
              console.warn('IAP: Failed to consume purchase (may not be critical):', consumeError);
              // Don't fail the purchase if consumption fails
              // The purchase is still valid, user just may not be able to purchase again immediately
            }
          }
        } catch (ackError: any) {
          console.error('IAP: Failed to acknowledge purchase:', ackError);
          // Don't fail the purchase if acknowledgment fails, as backend can handle it
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
