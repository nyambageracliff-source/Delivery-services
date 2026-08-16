import React, { useState, useEffect } from 'react';
import { 
  Search, Package, CheckCircle2, Clock, Truck, ShieldCheck, 
  FileText, Star, AlertCircle, Phone, ArrowRight, UserCheck
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { api } from '../lib/api';
import { InvoiceModal } from '../components/InvoiceModal';
import { ReviewModal } from '../components/ReviewModal';

interface OrderTrackingPageProps {
  initialOrderNumber?: string;
  onSelectProduct?: (product: any) => void;
}

export const OrderTrackingPage: React.FC<OrderTrackingPageProps> = ({
  initialOrderNumber
}) => {
  const [searchQuery, setSearchQuery] = useState(initialOrderNumber || 'ORD-2026-000101');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewProduct, setReviewProduct] = useState<any>(null);

  const fetchOrder = async (queryToUse?: string) => {
    const q = queryToUse || searchQuery;
    if (!q.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.trackOrder(q.trim());
      setOrder(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Order not found. Please check order reference.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderNumber) {
      setSearchQuery(initialOrderNumber);
      fetchOrder(initialOrderNumber);
    } else {
      fetchOrder('ORD-2026-000101');
    }
  }, [initialOrderNumber]);

  const steps: { key: OrderStatus; label: string; desc: string }[] = [
    { key: 'pending_payment', label: 'Order Received', desc: 'Order logged into system' },
    { key: 'payment_received', label: 'M-PESA Verified', desc: 'Payment received & cleared' },
    { key: 'processing', label: 'Processing & Approved', desc: 'Approved for factory batching' },
    { key: 'supplier_purchase', label: 'Sourced from Factory', desc: 'Manufactured & dispatched to hub' },
    { key: 'ready_for_delivery', label: 'Quality Checked', desc: 'Inspected & prepared for van loading' },
    { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'On delivery route with driver' },
    { key: 'delivered', label: 'Delivered & Installed', desc: 'Delivered & setup completed' },
  ];

  const getStepStatus = (stepIndex: number, currentStatus: OrderStatus) => {
    const orderProgression: OrderStatus[] = [
      'pending_payment',
      'payment_received',
      'processing',
      'supplier_purchase',
      'ready_for_delivery',
      'out_for_delivery',
      'delivered'
    ];

    const currentIdx = orderProgression.indexOf(currentStatus);
    if (currentStatus === 'cancelled' || currentStatus === 'refunded') return 'cancelled';
    if (stepIndex < currentIdx) return 'completed';
    if (stepIndex === currentIdx) return 'active';
    return 'pending';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Search Header */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase text-amber-400 tracking-wider">
            Real-Time Order Tracking
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-1">
            Track Your Mattress Sourcing & Delivery
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 mt-2">
            Enter your Order Reference Number (e.g. <span className="font-mono text-amber-300">ORD-2026-000101</span>) to view live factory sourcing and delivery progress.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); fetchOrder(); }} className="mt-6 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ORD-2026-000101 or 0712345678"
                className="w-full bg-stone-800 border border-stone-700 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-stone-850"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-2xl transition-colors shadow flex items-center gap-1.5"
            >
              {loading ? 'Searching...' : 'Track'}
            </button>
          </form>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-xs flex items-center gap-2 border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tracking Result View */}
      {order && (
        <div className="space-y-8">
          {/* Status Header Banner */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg text-stone-900">{order.orderNumber}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                  (order.orderStatus || (order as any).status) === 'delivered'
                    ? 'bg-emerald-100 text-emerald-800'
                    : (order.orderStatus || (order as any).status) === 'out_for_delivery'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-900'
                }`}>
                  {(order.orderStatus || (order as any).status || 'pending').replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Placed on {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsInvoiceModalOpen(true)}
                className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold px-4 py-2.5 rounded-xl border border-stone-300 transition-colors flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-amber-700" /> View Tax Invoice
              </button>

              <a
                href="https://wa.me/254116822231?text=Hello%20Haven%20Support%2C%20I%20have%20an%20inquiry%20regarding%20my%20order"
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" /> WhatsApp Support
              </a>
            </div>
          </div>

          {/* Visual Step Timeline */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
            <h3 className="font-serif font-bold text-base text-stone-900">
              Live Fulfillment Progress
            </h3>

            <div className="relative">
              {/* Desktop Horizontal Line */}
              <div className="hidden lg:block absolute top-5 left-8 right-8 h-1 bg-stone-200 -z-0" />

              <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 relative z-10">
                {steps.map((step, idx) => {
                  const currentStatus = order.orderStatus || (order as any).status || 'pending_payment';
                  const status = getStepStatus(idx, currentStatus);
                  return (
                    <div key={step.key} className="flex lg:flex-col items-center lg:items-center gap-4 lg:gap-2 text-left lg:text-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                        status === 'completed'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : status === 'active'
                          ? 'bg-amber-600 text-white ring-4 ring-amber-100 shadow-md animate-pulse'
                          : 'bg-stone-100 text-stone-400 border border-stone-200'
                      }`}>
                        {status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : status === 'active' ? (
                          <Clock className="w-5 h-5" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold leading-tight ${
                          status === 'active' ? 'text-amber-900' : status === 'completed' ? 'text-stone-900' : 'text-stone-400'
                        }`}>
                          {step.label}
                        </p>
                        <p className="text-[10px] text-stone-500 mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Assigned Driver Details if Out for Delivery */}
            {(order.driverName || (order as any).assignedDriverName) && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950">Assigned Delivery Driver: {order.driverName || (order as any).assignedDriverName}</h4>
                    <p className="text-emerald-800">{order.driverPhone || (order as any).assignedDriverPhone || '+254 712 345 678'}</p>
                  </div>
                </div>
                {(order.driverPhone || (order as any).assignedDriverPhone) && (
                  <a
                    href={`tel:${order.driverPhone || (order as any).assignedDriverPhone}`}
                    className="bg-white text-emerald-900 font-bold px-3 py-1.5 rounded-lg border border-emerald-300 hover:bg-emerald-100 text-center"
                  >
                    Call Driver
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Order Details & Items Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Items List */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-base text-stone-900 pb-3 border-b border-stone-100">
                Items in This Order ({order.items.length})
              </h3>

              <div className="divide-y divide-stone-100 space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-14 h-14 object-cover rounded-xl border border-stone-200 bg-stone-50"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-stone-900">{item.productName}</h4>
                        <p className="text-[11px] text-stone-500">
                          Size: {item.sizeLabel} • Qty: {item.quantity}
                        </p>
                        <p className="text-xs font-bold text-stone-900 mt-0.5">
                          KSh {(item.lineTotal || item.unitPrice * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {(order.orderStatus === 'delivered' || (order as any).status === 'delivered') && (
                      <button
                        onClick={() => {
                          setReviewProduct({ id: item.productId, name: item.productName, brand: item.brand });
                          setIsReviewModalOpen(true);
                        }}
                        className="text-xs text-amber-800 hover:text-amber-900 font-bold bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200"
                      >
                        Rate & Review
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Destination & Payment Summary */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-base text-stone-900 pb-3 border-b border-stone-100">
                Destination & Payment
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-bold text-stone-500 uppercase tracking-wider block mb-0.5">Recipient:</span>
                  <p className="font-semibold text-stone-900">{order.customerName}</p>
                  <p className="text-stone-600">{order.phone}</p>
                </div>

                <div>
                  <span className="font-bold text-stone-500 uppercase tracking-wider block mb-0.5">Delivery Address:</span>
                  <p className="text-stone-700">{order.deliveryAddress || order.area}, {order.town}</p>
                  <p className="text-stone-600">{order.county} County</p>
                  {order.landmark && (
                    <p className="text-stone-500">Landmark: {order.landmark}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 space-y-1">
                  <div className="flex justify-between text-stone-600">
                    <span>Payment Method:</span>
                    <span className="font-bold text-emerald-700">{order.paymentMethod}</span>
                  </div>
                  {order.mpesaReceiptNumber && (
                    <div className="flex justify-between text-stone-600">
                      <span>M-PESA Receipt:</span>
                      <span className="font-mono font-bold text-stone-900">{order.mpesaReceiptNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-stone-900 pt-1">
                    <span>Total Amount Paid:</span>
                    <span className="text-amber-800 font-serif text-sm">KSh {order.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tax Invoice Modal */}
      <InvoiceModal
        order={order}
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
      />

      {/* Review Modal */}
      {reviewProduct && (
        <ReviewModal
          product={reviewProduct}
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
};
