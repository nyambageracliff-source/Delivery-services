import React, { useState, useEffect } from 'react';
import { 
  Truck, CheckCircle2, Phone, MapPin, Package, Clock, 
  AlertCircle, ChevronRight, MessageSquare, RefreshCw, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Order, OrderStatus } from '../types';

export const DriverPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [driverNotes, setDriverNotes] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await api.getDriverDeliveries();
      setDeliveries(res.deliveries);
    } catch (err) {
      console.error('Failed to load driver deliveries', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      await api.updateDriverDeliveryStatus(orderId, status, driverNotes.trim() || undefined);
      await fetchDeliveries();
      setSelectedOrder(null);
      setDriverNotes('');
    } catch (err) {
      console.error('Failed to update delivery status', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = deliveries.filter(d => {
    if (filter === 'active') return d.orderStatus !== 'delivered' && d.orderStatus !== 'cancelled';
    if (filter === 'completed') return d.orderStatus === 'delivered';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-emerald-800 rounded-2xl text-emerald-300">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Driver Route & Delivery Portal
              </span>
              <span className="bg-emerald-800 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Driver: {user?.name || 'David Kamau'}
              </span>
            </div>
            <h1 className="font-serif font-bold text-2xl text-white mt-0.5">
              Van Route Dispatch & Proof of Delivery
            </h1>
            <p className="text-xs text-emerald-200/80 mt-1">
              Active assigned delivery drop-offs across Nairobi & Kenya fulfillment zones.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDeliveries}
            className="bg-emerald-900 hover:bg-emerald-800 text-emerald-100 text-xs font-semibold px-4 py-2.5 rounded-xl border border-emerald-700/60 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Route
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-stone-200 gap-4 text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setFilter('active')}
          className={`pb-3 border-b-2 transition-colors ${
            filter === 'active'
              ? 'border-emerald-700 text-emerald-900'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          Active Deliveries ({deliveries.filter(d => d.orderStatus !== 'delivered' && d.orderStatus !== 'cancelled').length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`pb-3 border-b-2 transition-colors ${
            filter === 'completed'
              ? 'border-emerald-700 text-emerald-900'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          Completed Drop-offs ({deliveries.filter(d => d.orderStatus === 'delivered').length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`pb-3 border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-emerald-700 text-emerald-900'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          All Assigned ({deliveries.length})
        </button>
      </div>

      {/* Deliveries Grid */}
      {loading ? (
        <div className="p-12 bg-white rounded-3xl border border-stone-200 text-center text-xs text-stone-500">
          Loading assigned deliveries...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl border border-stone-200 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="font-serif font-bold text-base text-stone-900">All Deliveries Complete!</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            You currently have no pending delivery route orders. Check back when new orders are batch-assigned.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredOrders.map((ord) => (
            <div
              key={ord.id}
              className={`bg-white rounded-3xl p-6 border transition-all space-y-4 shadow-sm ${
                ord.orderStatus === 'out_for_delivery'
                  ? 'border-emerald-500 ring-2 ring-emerald-100'
                  : 'border-stone-200'
              }`}
            >
              {/* Order Top Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-stone-900">{ord.orderNumber}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      ord.orderStatus === 'delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ord.orderStatus === 'out_for_delivery'
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : 'bg-amber-100 text-amber-900'
                    }`}>
                      {ord.orderStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Destination: {ord.county} County • Estimated: {ord.estimatedDeliveryDate || 'Today'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-stone-900 block">
                    KSh {ord.total.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold uppercase">
                    {ord.paymentStatus === 'paid' ? '✓ Paid via M-Pesa' : ord.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Customer Contact & Navigation Box */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-stone-900">{ord.customerName}</h4>
                    <p className="text-stone-600 font-mono">{ord.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${ord.phone}`}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                    <a
                      href={`https://wa.me/${ord.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200/60 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-stone-800">{ord.deliveryAddress || ord.area}, {ord.town}</p>
                    {ord.landmark && (
                      <p className="text-[11px] text-stone-500">Landmark: {ord.landmark}</p>
                    )}
                    {ord.deliveryNotes && (
                      <p className="text-[11px] text-amber-900 font-medium mt-0.5">Instructions: "{ord.deliveryNotes}"</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Mattress Cargo Items */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  Van Cargo Items ({ord.items.length})
                </span>
                <div className="space-y-1.5">
                  {ord.items.map((item) => (
                    <div key={item.id} className="p-2.5 bg-stone-50 rounded-xl flex items-center justify-between text-xs border border-stone-200">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={item.productImage} 
                          alt={item.productName} 
                          className="w-9 h-9 object-cover rounded-lg border border-stone-200 bg-white"
                        />
                        <div>
                          <p className="font-bold text-stone-900">{item.productName}</p>
                          <p className="text-[10px] text-stone-500">Size: {item.sizeLabel} • Qty: {item.quantity}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Update Action Controls */}
              {ord.orderStatus !== 'delivered' && (
                <div className="pt-3 border-t border-stone-100 space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    {ord.orderStatus !== 'out_for_delivery' && (
                      <button
                        onClick={() => handleUpdateStatus(ord.id, 'out_for_delivery')}
                        disabled={updatingId === ord.id}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" /> Start Van Delivery Run
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedOrder(selectedOrder?.id === ord.id ? null : ord)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Delivered
                    </button>
                  </div>

                  {/* Delivery Note Input when confirming delivered */}
                  {selectedOrder?.id === ord.id && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 mt-2">
                      <label className="block text-xs font-bold text-emerald-950">
                        Delivery Proof / Recipient Note:
                      </label>
                      <input
                        type="text"
                        value={driverNotes}
                        onChange={(e) => setDriverNotes(e.target.value)}
                        placeholder="e.g. Received by customer, signed delivery slip, mattress unboxed"
                        className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-stone-900"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setSelectedOrder(null)}
                          className="text-xs text-stone-600 hover:text-stone-900 px-3 py-1.5 font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(ord.id, 'delivered')}
                          disabled={updatingId === ord.id}
                          className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-4 py-1.5 rounded-xl transition-colors"
                        >
                          {updatingId === ord.id ? 'Updating...' : 'Submit Proof & Complete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
