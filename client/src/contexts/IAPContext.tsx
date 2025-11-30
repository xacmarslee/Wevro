import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/queryClient';
import { Capacitor } from '@capacitor/core';

// Declare global CdvPurchase type if not available
declare global {
  interface Window {
    CdvPurchase: any;
  }
  var CdvPurchase: any;
}

namespace CdvPurchase {
  export interface Store {
    register(products: Product[]): void;
    when(): When;
    initialize(platforms: Platform[]): void;
    get(id: string): Product | undefined;
    off(callback: Function): void;
    restore(): Promise<void>;
    products: Product[];
  }

  export interface Product {
    id: string;
    type: ProductType;
    platform: Platform;
    getOffer(): Offer | undefined;
    transaction: any;
  }

  export interface Offer {
    order(): Promise<void>;
  }

  export interface When {
    productUpdated(callback: (product: Product) => void): When;
    approved(callback: (transaction: Transaction) => void): When;
    verified(callback: (receipt: Receipt) => void): When;
  }

  export interface Transaction {
    platform: Platform;
    products: Product[];
    transactionId: string;
    finish(): void;
  }

  export interface Receipt {
    finish(): void;
  }

  export enum ProductType {
    CONSUMABLE = 'consumable',
    PAID_SUBSCRIPTION = 'paid subscription',
    NON_CONSUMABLE = 'non consumable',
  }

  export enum Platform {
    GOOGLE_PLAY = 'google-play',
    APPLE_APPSTORE = 'apple-appstore',
  }

  export enum ErrorCode {
    PAYMENT_CANCELLED = 6777010
  }
}

// Define product IDs
export const PRODUCT_IDS = {
  TOKEN_S: 'wevro_token_s',
  TOKEN_M: 'wevro_token_m',
  TOKEN_L: 'wevro_token_l',
  PRO_MONTHLY: 'wevro_pro_monthly',
};

interface IAPContextType {
  store: CdvPurchase.Store | null;
  products: CdvPurchase.Product[];
  purchase: (productId: string) => Promise<void>;
  restore: () => Promise<void>;
  isLoading: boolean;
  isSupported: boolean;
}

const IAPContext = createContext<IAPContextType | null>(null);

export function IAPProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<CdvPurchase.Store | null>(null);
  const [products, setProducts] = useState<CdvPurchase.Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const initStore = () => {
      // Diagnostic logs to check plugin availability
      console.log('IAP: [DIAGNOSTIC] Checking CdvPurchase availability:', !!window.CdvPurchase);
      console.log('IAP: [DIAGNOSTIC] Checking store:', !!window.CdvPurchase?.store);
      console.log('IAP: [DIAGNOSTIC] Device ready state:', document.readyState);
      console.log('IAP: [DIAGNOSTIC] window.CdvPurchase object:', window.CdvPurchase);
      
      // Check if CdvPurchase is available (it's a global variable from the plugin)
      if (!window.CdvPurchase?.store) {
        console.log('IAP: Store not available (running in browser?)');
        console.log('IAP: [DIAGNOSTIC] window.CdvPurchase is:', window.CdvPurchase);
        setIsLoading(false);
        return;
      }

      const store = window.CdvPurchase.store;
      setStore(store);
      setIsSupported(true);

      // Determine platform and only register/initialize for current platform
      const platform = Capacitor.getPlatform();
      console.log('IAP: [DIAGNOSTIC] Current platform:', platform);
      
      const currentPlatform = platform === 'ios' 
        ? CdvPurchase.Platform.APPLE_APPSTORE 
        : CdvPurchase.Platform.GOOGLE_PLAY;
      
      // Filter products for current platform only
      const platformProducts = [
        {
          id: PRODUCT_IDS.TOKEN_S,
          type: CdvPurchase.ProductType.CONSUMABLE,
          platform: currentPlatform,
        },
        {
          id: PRODUCT_IDS.TOKEN_M,
          type: CdvPurchase.ProductType.CONSUMABLE,
          platform: currentPlatform,
        },
        {
          id: PRODUCT_IDS.TOKEN_L,
          type: CdvPurchase.ProductType.CONSUMABLE,
          platform: currentPlatform,
        },
        {
          id: PRODUCT_IDS.PRO_MONTHLY,
          type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
          platform: currentPlatform,
        },
      ];
      
      console.log('IAP: [DIAGNOSTIC] Registering products for platform:', currentPlatform, platformProducts);
      store.register(platformProducts);

      // Setup event listeners BEFORE initialize
      console.log('IAP: [DIAGNOSTIC] Setting up event listeners...');
      const whenChain = store.when();
      
      // Try to listen for ready event if available
      if (typeof whenChain.ready === 'function') {
        whenChain.ready(() => {
          console.log('IAP: [DIAGNOSTIC] Store ready event fired!');
          console.log('IAP: [DIAGNOSTIC] Products after ready:', store.products);
          setProducts(store.products);
        });
      }
      
      whenChain
        .productUpdated((product: CdvPurchase.Product) => {
          console.log('IAP: [DIAGNOSTIC] productUpdated event fired!', product);
          console.log('IAP: [DIAGNOSTIC] All products now:', store.products);
          setProducts(store.products);
        })
        .approved(async (transaction: CdvPurchase.Transaction) => {
          console.log('IAP: Transaction approved', transaction);
          
          try {
            // Send receipt to backend for verification and granting tokens/subscription
            // Note: For security, you should verify the receipt on the server
            const response = await fetchWithAuth('/api/billing/verify', {
              method: 'POST',
              body: JSON.stringify({
                platform: transaction.platform,
                productId: transaction.products[0].id,
                transactionId: transaction.transactionId,
                receipt: transaction.products[0].transaction // Or specific receipt field depending on platform
              }),
            });

            if (response.ok) {
              transaction.finish();
              toast({
                title: 'Purchase Successful',
                description: 'Your purchase has been processed.',
              });
            } else {
              console.error('IAP: Verification failed');
              toast({
                title: 'Verification Failed',
                description: 'Please contact support.',
                variant: 'destructive',
              });
            }
          } catch (err) {
            console.error('IAP: Verification error', err);
          }
        })
        .verified((receipt: CdvPurchase.Receipt) => {
          console.log('IAP: Receipt verified', receipt);
          receipt.finish();
        });

      // Initialize the store - only for current platform
      console.log('IAP: [DIAGNOSTIC] About to initialize store for platform:', currentPlatform);
      try {
        store.initialize([currentPlatform]);
        console.log('IAP: [DIAGNOSTIC] Store initialize() called successfully');
        
        // Try to manually refresh products after a short delay
        // Sometimes Google Billing needs time to connect
        setTimeout(() => {
          console.log('IAP: [DIAGNOSTIC] Attempting manual refresh after 2 seconds...');
          console.log('IAP: [DIAGNOSTIC] Products before refresh:', store.products);
          
          // Try refresh if available
          if (typeof store.refresh === 'function') {
            console.log('IAP: [DIAGNOSTIC] Calling store.refresh()...');
            store.refresh();
          } else {
            console.log('IAP: [DIAGNOSTIC] store.refresh() not available, checking products directly');
          }
          
          // Check products again after refresh
          setTimeout(() => {
            console.log('IAP: [DIAGNOSTIC] Products after refresh delay:', store.products);
            if (store.products.length > 0) {
              setProducts(store.products);
              console.log('IAP: [DIAGNOSTIC] Products loaded:', store.products.map((p: CdvPurchase.Product) => p.id));
            } else {
              console.warn('IAP: [DIAGNOSTIC] Still no products after refresh delay');
            }
          }, 3000);
        }, 2000);
      } catch (err) {
        console.error('IAP: [DIAGNOSTIC] Store initialize() threw error:', err);
      }

      setIsLoading(false);
    };

    console.log('IAP: [DIAGNOSTIC] Setting up deviceready listener...');
    console.log('IAP: [DIAGNOSTIC] Current readyState:', document.readyState);
    
    // If already ready (e.g. in browser or late binding), call immediately
    if (document.readyState === 'complete' || (window as any).cordova) {
      console.log('IAP: [DIAGNOSTIC] Document already ready or Cordova detected, calling initStore immediately');
      initStore();
    } else {
      document.addEventListener('deviceready', () => {
        console.log('IAP: [DIAGNOSTIC] deviceready event fired!');
        initStore();
      });
    }

    return () => {
      document.removeEventListener('deviceready', initStore);
      if (store) {
        store.off(initStore);
      }
    };
  }, []);

  const purchase = async (productId: string) => {
    if (!store) {
      toast({
        title: 'Store not available',
        description: 'In-App Purchases are only available on mobile devices.',
        variant: 'destructive',
      });
      return;
    }

    const product = store.get(productId);
    if (!product) {
      console.error(`IAP: Product not found: ${productId}`);
      console.log('IAP: Available products:', store.products.map(p => p.id));
      toast({
        title: 'Product not found',
        description: `Could not find product: ${productId}. Available: ${store.products.map(p => p.id).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await product.getOffer()?.order();
    } catch (err: any) {
      console.error('IAP: Purchase failed', err);
      if (err.code !== CdvPurchase.ErrorCode.PAYMENT_CANCELLED) {
        toast({
          title: 'Purchase Failed',
          description: err.message || 'An error occurred during purchase.',
          variant: 'destructive',
        });
      }
    }
  };

  const restore = async () => {
    if (!store) {
      return;
    }
    try {
      await store.restore();
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
    <IAPContext.Provider value={{ store, products, purchase, restore, isLoading, isSupported }}>
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

