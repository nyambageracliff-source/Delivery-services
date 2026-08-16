import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  wishlist: Product[];
  wishlistIds: Set<string>;
  toggleWishlist: (product: Product) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  loading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadWishlist() {
      if (user) {
        try {
          setLoading(true);
          const items = await api.getWishlist();
          
          // Check if there were guest wishlist items to merge
          try {
            const local = localStorage.getItem('haven_guest_wishlist');
            if (local) {
              const guestItems: Product[] = JSON.parse(local);
              if (guestItems && guestItems.length > 0) {
                // Merge guest items not yet in server list
                const existingIds = new Set(items.map(p => p.id));
                for (const gItem of guestItems) {
                  if (!existingIds.has(gItem.id)) {
                    await api.toggleWishlist(gItem.id).catch(() => {});
                    items.push(gItem);
                    existingIds.add(gItem.id);
                  }
                }
                localStorage.removeItem('haven_guest_wishlist');
              }
            }
          } catch (_) {}

          setWishlist(items);
          setWishlistIds(new Set(items.map(p => p.id)));
        } catch (err: any) {
          console.warn('Wishlist load fallback notice:', err?.message || err);
          // If server call fails, fallback to local storage
          try {
            const local = localStorage.getItem('haven_guest_wishlist');
            if (local) {
              const parsed = JSON.parse(local);
              setWishlist(parsed);
              setWishlistIds(new Set(parsed.map((p: Product) => p.id)));
            }
          } catch (_) {}
        } finally {
          setLoading(false);
        }
      } else {
        // Load local wishlist for guests
        try {
          const local = localStorage.getItem('haven_guest_wishlist');
          if (local) {
            const parsed = JSON.parse(local);
            setWishlist(parsed);
            setWishlistIds(new Set(parsed.map((p: Product) => p.id)));
          } else {
            setWishlist([]);
            setWishlistIds(new Set());
          }
        } catch (_) {}
      }
    }
    loadWishlist();
  }, [user]);

  const toggleWishlist = async (product: Product) => {
    if (user) {
      try {
        const res = await api.toggleWishlist(product.id);
        if (res.inWishlist) {
          setWishlist(prev => [product, ...prev.filter(p => p.id !== product.id)]);
          setWishlistIds(prev => new Set(prev).add(product.id));
        } else {
          setWishlist(prev => prev.filter(p => p.id !== product.id));
          setWishlistIds(prev => {
            const next = new Set(prev);
            next.delete(product.id);
            return next;
          });
        }
      } catch (err) {
        console.warn('Server wishlist toggle fallback notice:', err);
        // Optimistic local fallback
        setWishlist(prev => {
          const exists = prev.some(p => p.id === product.id);
          let updated: Product[];
          if (exists) {
            updated = prev.filter(p => p.id !== product.id);
          } else {
            updated = [product, ...prev];
          }
          setWishlistIds(new Set(updated.map(p => p.id)));
          return updated;
        });
      }
    } else {
      // Guest local storage
      setWishlist(prev => {
        const exists = prev.some(p => p.id === product.id);
        let updated: Product[];
        if (exists) {
          updated = prev.filter(p => p.id !== product.id);
        } else {
          updated = [product, ...prev];
        }
        localStorage.setItem('haven_guest_wishlist', JSON.stringify(updated));
        setWishlistIds(new Set(updated.map(p => p.id)));
        return updated;
      });
    }
  };

  const isInWishlist = (productId: string) => wishlistIds.has(productId);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistIds,
        toggleWishlist,
        isInWishlist,
        loading
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = (): WishlistContextType => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
