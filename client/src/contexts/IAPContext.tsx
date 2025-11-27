import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { fetchWithAuth } from '@/lib/queryClient';

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
      // Check if CdvPurchase is available (it's a global variable from the plugin)
      if (!window.CdvPurchase?.store) {
        console.log('IAP: Store not available (running in browser?)');
        setIsLoading(false);
        return;
      }

      const store = window.CdvPurchase.store;
      setStore(store);
      setIsSupported(true);

      // Register products
      store.register([
        {
          id: PRODUCT_IDS.TOKEN_S,
          type: CdvPurchase.ProductType.CONSUMABLE,
          platform: CdvPurchase.Platform.GOOGLE_PLAY,
        },
        {
          id: PRODUCT_IDS.TOKEN_S,
          type: CdvPurchase.ProductType.CONSUMABLE,
          platform: CdvPurchase.Platform.APPLE_APPSTORE,
        },
        {
          id: PRODUCT_IDS.TOKEN_M,
          type: CdvPurchase.ProductType.CONSUMABLE,
          platform: CdvPurchase.Platform.GOOGLE_PLAY,
        },
        {
          id: PRODUCT_IDS.TOKEN_M,
          type: CdvPurchase.ProductType.CONSUMABLE,
          platform: CdvPurchase.Platform.APPLE_APPSTORE,
        },
        {
          id: PRODUCT_IDS.TOKEN_L,
          type: CdvPurchase.ProductType.CONSUMABLE,
          platform: CdvPurchase.Platform.GOOGLE_PLAY,
        },
        {
          id: PRODUCT_IDS.TOKEN_L,
          type: CdvPurchase.ProductType.CONSUMABLE,
          platform: CdvPurchase.Platform.APPLE_APPSTORE,
        },
        {
          id: PRODUCT_IDS.PRO_MONTHLY,
          type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
          platform: CdvPurchase.Platform.GOOGLE_PLAY,
        },
        {
          id: PRODUCT_IDS.PRO_MONTHLY,
          type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
          platform: CdvPurchase.Platform.APPLE_APPSTORE,
        },
      ]);

      // Setup event listeners
      store.when()
        .productUpdated((product: CdvPurchase.Product) => {
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

      // Initialize the store
      store.initialize([
        CdvPurchase.Platform.GOOGLE_PLAY,
        CdvPurchase.Platform.APPLE_APPSTORE,
      ]);

      setIsLoading(false);
    };

    document.addEventListener('deviceready', initStore);

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

