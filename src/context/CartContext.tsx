import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, ProductVariant, DeliveryZone } from '../types';
import { api } from '../lib/api';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  selectedZone: DeliveryZone | null;
  deliveryZones: DeliveryZone[];
  appliedCoupon: { code: string; discountAmount: number; description?: string } | null;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  selectDeliveryZone: (countyName: string) => void;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  freeDeliveryThreshold: number;
  amountNeededForFreeDelivery: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('haven_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number; description?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('haven_coupon');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Load delivery zones from server
  useEffect(() => {
    async function loadZones() {
      try {
        const zones = await api.getDeliveryZones();
        setDeliveryZones(zones);
        // Default to Nairobi zone if none selected
        if (!selectedZone && zones.length > 0) {
          const nairobi = zones.find(z => z.county.toLowerCase() === 'nairobi') || zones[0];
          setSelectedZone(nairobi);
        }
      } catch (err) {
        console.error('Failed to load delivery zones:', err);
      }
    }
    loadZones();
  }, []);

  // Save cart to local storage
  useEffect(() => {
    localStorage.setItem('haven_cart', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem('haven_coupon', JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem('haven_coupon');
    }
  }, [appliedCoupon]);

  const addItem = (product: Product, variant: ProductVariant, quantity: number = 1) => {
    setItems(prevItems => {
      const existingIndex = prevItems.findIndex(
        i => i.productId === product.id && i.variantId === variant.id
      );

      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex].quantity += quantity;
        return updated;
      } else {
        const newItem: CartItem = {
          id: `${product.id}-${variant.id}`,
          productId: product.id,
          product: {
            id: product.id,
            name: product.name,
            brand: product.brand,
            image: product.images[0] || '',
            categoryName: product.categoryName,
            warrantyYears: product.warrantyYears
          },
          variantId: variant.id,
          sizeLabel: variant.sizeLabel,
          thicknessInches: variant.thicknessInches,
          unitPrice: variant.price,
          quantity
        };
        return [...prevItems, newItem];
      }
    });
    setIsCartDrawerOpen(true);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity } : item));
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
  };

  const selectDeliveryZone = (countyName: string) => {
    const found = deliveryZones.find(z => z.county.toLowerCase() === countyName.toLowerCase());
    if (found) {
      setSelectedZone(found);
    }
  };

  const applyCoupon = async (code: string) => {
    try {
      const res = await api.validateCoupon(code, subtotal);
      if (res.valid) {
        setAppliedCoupon({
          code: res.code,
          discountAmount: res.discountAmount,
          description: res.description
        });
        return { success: true, message: `Coupon ${res.code} applied! Saved KSh ${res.discountAmount.toLocaleString()}` };
      }
      return { success: false, message: 'Invalid coupon' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Coupon validation failed' };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const freeDeliveryThreshold = selectedZone?.freeDeliveryThreshold || 35000;
  const isFreeDelivery = selectedZone ? (selectedZone.freeDeliveryThreshold ? subtotal >= selectedZone.freeDeliveryThreshold : false) : false;
  const deliveryFee = items.length === 0 ? 0 : (isFreeDelivery ? 0 : (selectedZone?.baseFee || 1000));
  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const total = Math.max(0, subtotal - discount + deliveryFee);
  const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        deliveryFee,
        discount,
        total,
        selectedZone,
        deliveryZones,
        appliedCoupon,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        selectDeliveryZone,
        applyCoupon,
        removeCoupon,
        freeDeliveryThreshold,
        amountNeededForFreeDelivery
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
