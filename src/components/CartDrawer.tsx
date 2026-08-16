import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, Truck, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface CartDrawerProps {
  onProceedToCheckout: () => void;
  onExploreShop: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  onProceedToCheckout,
  onExploreShop
}) => {
  const {
    items,
    itemCount,
    subtotal,
    deliveryFee,
    discount,
    total,
    selectedZone,
    deliveryZones,
    selectDeliveryZone,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    updateQuantity,
    removeItem,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    amountNeededForFreeDelivery,
    freeDeliveryThreshold
  } = useCart();

  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  if (!isCartDrawerOpen) return null;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCodeInput.trim()) return;
    setCouponError('');
    setIsApplyingCoupon(true);
    const res = await applyCoupon(couponCodeInput.trim());
    setIsApplyingCoupon(false);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponCodeInput('');
    }
  };

  const freeDeliveryProgress = Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={() => setIsCartDrawerOpen(false)}
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 flex justify-end w-full max-w-full pointer-events-none">
        <div className="pointer-events-auto w-full max-w-full sm:max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden border-l border-stone-200">
          {/* Header */}
          <div className="px-4 sm:px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50 shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-700" />
              <h3 className="font-bold text-base text-stone-900 font-serif">
                Your Shopping Cart ({itemCount})
              </h3>
            </div>
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200 transition-colors cursor-pointer"
              title="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          {items.length > 0 && selectedZone?.county === 'Nairobi' && (
            <div className="bg-amber-50/70 border-b border-amber-200/50 px-5 py-2.5">
              <div className="flex items-center justify-between text-xs text-amber-950 font-semibold mb-1">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-amber-700" />
                  {amountNeededForFreeDelivery === 0 
                    ? '🎉 You unlocked FREE Nairobi Delivery!' 
                    : `Add KSh ${amountNeededForFreeDelivery.toLocaleString()} more for FREE Delivery!`}
                </span>
                <span>{freeDeliveryProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-amber-200/60 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-600 transition-all duration-500 rounded-full"
                  style={{ width: `${freeDeliveryProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 divide-y divide-stone-100">
            {items.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-stone-800">Your cart is empty</h4>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto mt-1">
                    Explore our orthopedic, memory foam, and luxury pocket spring collections.
                  </p>
                </div>
                <button
                  onClick={() => { setIsCartDrawerOpen(false); onExploreShop(); }}
                  className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold px-5 py-2.5 rounded-full transition-all shadow-md"
                >
                  Explore Mattresses →
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="pt-4 first:pt-0 flex gap-3.5">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-20 h-20 object-cover rounded-xl border border-stone-200 bg-stone-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-stone-900 leading-snug truncate pr-2">
                        {item.product.name}
                      </h4>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-stone-400 hover:text-red-600 p-0.5 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500">
                      <span className="font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Size: {item.sizeLabel}
                      </span>
                      {item.thicknessInches > 0 && (
                        <span className="bg-stone-100 px-1.5 py-0.5 rounded">
                          {item.thicknessInches}" Thick
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-stone-200 rounded-lg bg-stone-50 overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-1 text-stone-600 hover:bg-stone-200 text-xs transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-stone-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-1 text-stone-600 hover:bg-stone-200 text-xs transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-stone-900">
                          KSh {(item.unitPrice * item.quantity).toLocaleString()}
                        </span>
                        {item.quantity > 1 && (
                          <span className="block text-[10px] text-stone-400">
                            (KSh {item.unitPrice.toLocaleString()} each)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Calculations */}
          {items.length > 0 && (
            <div className="border-t border-stone-200 bg-stone-50 p-5 space-y-3.5">
              {/* Delivery Zone Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider flex items-center justify-between">
                  <span>Delivery Destination</span>
                  <span className="text-amber-800 font-semibold lowercase text-[10px]">
                    {deliveryFee === 0 ? 'Free delivery' : `+KSh ${deliveryFee.toLocaleString()}`}
                  </span>
                </label>
                <select
                  value={selectedZone?.county || 'Nairobi'}
                  onChange={(e) => selectDeliveryZone(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs text-stone-800 font-medium focus:ring-1 focus:ring-amber-700"
                >
                  {deliveryZones.map((z) => (
                    <option key={z.id} value={z.county}>
                      {z.county} ({z.estimatedDays}) — KSh {z.baseFee.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Coupon Code Input */}
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 text-xs text-emerald-900 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Coupon <strong>{appliedCoupon.code}</strong> applied (-KSh {appliedCoupon.discountAmount.toLocaleString()})</span>
                  </div>
                  <button onClick={removeCoupon} className="text-emerald-700 hover:text-emerald-900 font-bold ml-2">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value)}
                      placeholder="Coupon Code (e.g. WELCOME10)"
                      className="flex-1 bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs uppercase text-stone-800 focus:ring-1 focus:ring-amber-700"
                    />
                    <button
                      type="submit"
                      disabled={isApplyingCoupon || !couponCodeInput.trim()}
                      className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xl disabled:opacity-50 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-[11px] text-red-600">{couponError}</p>
                  )}
                </form>
              )}

              {/* Summary Breakdown */}
              <div className="space-y-1.5 text-xs pt-2 border-t border-stone-200">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span>KSh {subtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount</span>
                    <span>-KSh {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>Estimated Delivery ({selectedZone?.county})</span>
                  <span>{deliveryFee === 0 ? <span className="text-emerald-700 font-bold">FREE</span> : `KSh ${deliveryFee.toLocaleString()}`}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-stone-900 pt-1.5 border-t border-stone-200">
                  <span>Grand Total</span>
                  <span className="text-base text-amber-800 font-serif">KSh {total.toLocaleString()}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                id="cart-checkout-cta"
                onClick={() => {
                  setIsCartDrawerOpen(false);
                  onProceedToCheckout();
                }}
                className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[10px] text-stone-400 text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified M-Pesa STK Push Payment • Anti-Sag Guaranteed
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
