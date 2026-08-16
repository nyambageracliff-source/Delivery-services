import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Truck, ArrowLeft, Smartphone, CreditCard, 
  MapPin, CheckCircle, AlertCircle, ShoppingBag, Tag, Lock
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { saveOrderToSupabase } from '../lib/supabase';
import { Order } from '../types';
import { MpesaPaymentModal } from '../components/MpesaPaymentModal';

interface CheckoutPageProps {
  onBackToCart: () => void;
  onOrderPlaced: (order: Order) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  onBackToCart,
  onOrderPlaced
}) => {
  const {
    items,
    subtotal,
    deliveryFee,
    discount,
    total,
    selectedZone,
    deliveryZones,
    selectDeliveryZone,
    appliedCoupon,
    clearCart
  } = useCart();

  const { user } = useAuth();

  // Customer contact state
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '0712345678');

  // Delivery destination state
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [county, setCounty] = useState(selectedZone?.county || 'Nairobi');
  const [townCity, setTownCity] = useState('Nairobi');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Payment method (COD removed for now)
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');

  // Status & Modals
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isMpesaModalOpen, setIsMpesaModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.name && !customerName) setCustomerName(user.name || '');
      if (user.email && !customerEmail) setCustomerEmail(user.email || '');
      if (user.phone && (!customerPhone || customerPhone === '0712345678')) setCustomerPhone(user.phone || '');
      if (user.addresses && user.addresses.length > 0) {
        const def = user.addresses.find(a => a.isDefault) || user.addresses[0];
        if (def.county) setCounty(def.county);
        if (def.town || (def as any).townCity) setTownCity(def.town || (def as any).townCity || '');
        if (def.deliveryAddress || def.area) setDeliveryArea(def.deliveryAddress || def.area || '');
        if (def.landmark) setLandmark(def.landmark || '');
      }
    }
  }, [user]);

  const handleCountyChange = (newCounty: string) => {
    setCounty(newCounty);
    selectDeliveryZone(newCounty);
  };

  const finalDeliveryFee = deliveryMethod === 'pickup' ? 0 : deliveryFee;
  const finalTotal = Math.max(0, subtotal - discount + finalDeliveryFee);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setErrorMsg('Your shopping cart is empty. Please choose at least 1 item.');
      return;
    }
    if (!customerName.trim()) {
      setErrorMsg('Please enter your full name / M-PESA registered name');
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMsg('Please enter your Safaricom phone number for M-PESA payment');
      return;
    }
    if (deliveryMethod === 'delivery' && !deliveryArea.trim()) {
      setErrorMsg('Please enter your specific delivery area / street / building');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const orderPayload = {
        customerName: customerName.trim(),
        name: customerName.trim(),
        customerEmail: customerEmail.trim() || 'customer@haveenscompany.co.ke',
        email: customerEmail.trim() || 'customer@haveenscompany.co.ke',
        customerPhone: customerPhone.trim(),
        phone: customerPhone.trim(),
        deliveryType: deliveryMethod,
        deliveryMethod,
        county: deliveryMethod === 'pickup' ? 'Nakuru' : county,
        town: deliveryMethod === 'pickup' ? 'Nakuru Showroom' : townCity,
        townCity: deliveryMethod === 'pickup' ? 'Nakuru Showroom' : townCity,
        area: deliveryMethod === 'pickup' ? 'Haveens Hub, Nakuru 20100' : deliveryArea.trim(),
        deliveryArea: deliveryMethod === 'pickup' ? 'Haveens Hub, Nakuru 20100' : deliveryArea.trim(),
        landmark: landmark.trim() || undefined,
        deliveryNotes: deliveryNotes.trim() || undefined,
        deliveryAddress: {
          county: deliveryMethod === 'pickup' ? 'Nakuru (Showroom Pickup)' : county,
          townCity: deliveryMethod === 'pickup' ? 'Nakuru Showroom' : townCity,
          deliveryArea: deliveryMethod === 'pickup' ? 'Haveens Hub, Nakuru 20100' : deliveryArea.trim(),
          landmark: landmark.trim() || undefined,
          deliveryNotes: deliveryNotes.trim() || undefined
        },
        items: items.map(i => ({
          id: i.productId,
          productId: i.productId,
          variantId: i.variantId,
          productName: i.product.name,
          brand: i.product.brand,
          sizeLabel: i.sizeLabel,
          thicknessInches: i.thicknessInches,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          price: i.unitPrice,
          totalPrice: i.unitPrice * i.quantity,
          image: i.product.image
        })),
        paymentMethod: paymentMethod === 'mpesa' ? 'M-PESA STK Push' : 'Credit / Debit Card',
        couponCode: appliedCoupon?.code,
        deliveryFee: finalDeliveryFee
      };

      const res = await api.createOrder(orderPayload);
      setCreatedOrder(res.order);

      // Persist order to Supabase cloud database
      saveOrderToSupabase(res.order).catch(e => console.warn('Supabase order background sync notice:', e));

      if (paymentMethod === 'mpesa') {
        setIsMpesaModalOpen(true);
      } else {
        clearCart();
        onOrderPlaced(res.order);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMpesaSuccess = (updatedOrder: Order) => {
    setIsMpesaModalOpen(false);
    clearCart();
    saveOrderToSupabase(updatedOrder).catch(e => console.warn('Supabase order status sync notice:', e));
    onOrderPlaced(updatedOrder);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Checkout Header */}
      <div className="border-b border-stone-200 pb-4 flex items-center justify-between">
        <button
          onClick={onBackToCart}
          className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </button>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>SSL 256-bit Encrypted Checkout</span>
        </div>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Details & Delivery */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Customer Info */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <div className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="font-serif font-bold text-base text-stone-900">
                Customer & M-Pesa Contact
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={customerName || ''}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  placeholder="e.g. Samuel Mutua"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:ring-1 focus:ring-amber-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Phone Number (for M-PESA STK Prompt) *
                </label>
                <input
                  type="tel"
                  value={customerPhone || ''}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                  placeholder="0712 345 678"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:ring-1 focus:ring-amber-700 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Email Address (for Receipt & Tracking) *
                </label>
                <input
                  type="email"
                  value={customerEmail || ''}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                  placeholder="samuel@gmail.com"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:ring-1 focus:ring-amber-700"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Delivery Destination */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  Fulfillment & Delivery Details
                </h3>
              </div>

              {/* Delivery method toggle */}
              <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('delivery')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    deliveryMethod === 'delivery'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Doorstep Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('pickup')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    deliveryMethod === 'pickup'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Showroom Pickup
                </button>
              </div>
            </div>

            {deliveryMethod === 'pickup' ? (
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <MapPin className="w-4 h-4 text-amber-700" />
                  <span>Nakuru Fulfillment Hub Pickup (FREE)</span>
                </div>
                <p className="text-stone-600 leading-relaxed">
                  Collect your order at Haveens Hub, Nakuru 20100. Open Monday to Saturday, 8:00 AM – 6:30 PM.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Delivery County *
                  </label>
                  <select
                    value={county}
                    onChange={(e) => handleCountyChange(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-stone-900 font-semibold focus:ring-1 focus:ring-amber-700"
                  >
                    {deliveryZones.map((z) => (
                      <option key={z.id} value={z.county}>
                        {z.county} ({z.estimatedDays}) — {z.baseFee === 0 ? 'FREE' : `KSh ${z.baseFee.toLocaleString()}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Town / City *
                  </label>
                  <input
                    type="text"
                    value={townCity || ''}
                    onChange={(e) => setTownCity(e.target.value)}
                    required
                    placeholder="e.g. Kilimani / Westlands / Ruiru"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:ring-1 focus:ring-amber-700"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Street / Estate / Building Name / House No *
                  </label>
                  <input
                    type="text"
                    value={deliveryArea || ''}
                    onChange={(e) => setDeliveryArea(e.target.value)}
                    required
                    placeholder="e.g. Wood Avenue, Silver Oak Court, Apartment 4B"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:ring-1 focus:ring-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Nearby Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={landmark || ''}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Near Yaya Centre"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:ring-1 focus:ring-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Driver Delivery Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    value={deliveryNotes || ''}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="e.g. Call when entering main gate"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:ring-1 focus:ring-amber-700"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Payment Method */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <div className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="font-serif font-bold text-base text-stone-900">
                Payment Method
              </h3>
            </div>

            <div className="space-y-2">
              <label 
                className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'mpesa'
                    ? 'border-emerald-600 bg-emerald-50/40'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
                onClick={() => setPaymentMethod('mpesa')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-emerald-600 flex items-center justify-center">
                    {paymentMethod === 'mpesa' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-stone-900">M-PESA Express (STK Push)</span>
                      <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        RECOMMENDED
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Instant PIN prompt sent to your Safaricom phone. Immediate order confirmation.
                    </p>
                  </div>
                </div>
                <Smartphone className="w-6 h-6 text-emerald-600 shrink-0" />
              </label>

              <label 
                className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'card'
                    ? 'border-emerald-600 bg-emerald-50/40'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
                onClick={() => setPaymentMethod('card')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-emerald-600 flex items-center justify-center">
                    {paymentMethod === 'card' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-stone-900">Visa / Mastercard / Debit Card</span>
                    <p className="text-[11px] text-stone-500">Secure bank card payment gateway</p>
                  </div>
                </div>
                <CreditCard className="w-6 h-6 text-stone-400 shrink-0" />
              </label>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Order Summary Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4 sticky top-24">
            <h3 className="font-serif font-bold text-base text-stone-900 pb-3 border-b border-stone-100 flex items-center justify-between">
              <span>Order Summary</span>
              <span className="text-xs font-sans text-stone-500 font-normal">
                {items.length} item(s)
              </span>
            </h3>

            {/* Items list */}
            <div className="max-h-64 overflow-y-auto divide-y divide-stone-100 pr-1 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="pt-3 first:pt-0 flex gap-3">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-14 h-14 object-cover rounded-xl border border-stone-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-stone-900 truncate">{item.product.name}</h4>
                    <p className="text-[11px] text-stone-500">
                      Size: {item.sizeLabel} • Qty: {item.quantity}
                    </p>
                    <p className="text-xs font-bold text-stone-900 mt-0.5">
                      KSh {(item.unitPrice * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2 pt-3 border-t border-stone-100 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span>KSh {subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon Discount</span>
                  <span>-KSh {discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Fee ({deliveryMethod === 'pickup' ? 'Showroom Pickup' : county})</span>
                <span>{finalDeliveryFee === 0 ? <strong className="text-emerald-700">FREE</strong> : `KSh ${finalDeliveryFee.toLocaleString()}`}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-200">
                <span>Grand Total</span>
                <span className="text-lg text-amber-800 font-serif">KSh {finalTotal.toLocaleString()}</span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Place Order CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold py-4 px-6 rounded-2xl text-sm transition-all shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Generating Sourced Order...</span>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Place Order & Pay with M-PESA</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-stone-400 text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Full 10-15 Year Factory Anti-Sag Guarantee Included</span>
            </p>
          </div>
        </div>
      </form>

      {/* M-Pesa Interactive STK Modal */}
      {createdOrder && (
        <MpesaPaymentModal
          order={createdOrder}
          isOpen={isMpesaModalOpen}
          onClose={() => {
            setIsMpesaModalOpen(false);
            onOrderPlaced(createdOrder);
          }}
          onPaymentSuccess={handleMpesaSuccess}
        />
      )}
    </div>
  );
};
