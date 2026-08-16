import React, { useState, useEffect } from 'react';
import { X, Smartphone, CheckCircle, AlertCircle, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import { Order } from '../types';
import { api } from '../lib/api';

interface MpesaPaymentModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (updatedOrder: Order) => void;
}

export const MpesaPaymentModal: React.FC<MpesaPaymentModalProps> = ({
  order,
  isOpen,
  onClose,
  onPaymentSuccess
}) => {
  const orderPhone = order.phone || (order as any).customerPhone || '0712345678';
  const orderTotal = order.total || (order as any).totalAmount || 0;
  const [phone, setPhone] = useState(orderPhone);
  const [stage, setStage] = useState<'prompt' | 'waiting' | 'success' | 'failed'>('prompt');
  const [checkoutRequestId, setCheckoutRequestId] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(60);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [receiptNumber, setReceiptNumber] = useState<string>('');

  useEffect(() => {
    const currentPhone = order.phone || (order as any).customerPhone;
    if (currentPhone) {
      setPhone(currentPhone);
    }
  }, [order]);

  // STK Push countdown timer
  useEffect(() => {
    let timer: any;
    if (stage === 'waiting' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0 && stage === 'waiting') {
      // Prompt timeout
      setErrorMsg('M-Pesa prompt timed out. Please retry or verify your phone connection.');
      setStage('failed');
    }
    return () => clearInterval(timer);
  }, [stage, countdown]);

  if (!isOpen) return null;

  const handleInitiateSTK = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setErrorMsg('Please enter a valid Safaricom phone number');
      return;
    }

    setErrorMsg('');
    setIsProcessing(true);

    try {
      const res = await api.initiateMpesa(order.id, phone.trim());
      setCheckoutRequestId(res.checkoutRequestId);
      setCountdown(60);
      setStage('waiting');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send M-Pesa STK Push');
      setStage('failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateInstantSuccess = async () => {
    setIsProcessing(true);
    setErrorMsg('');

    try {
      const randomReceipt = 'QHG' + Math.floor(1000000 + Math.random() * 9000000);
      const res = await api.simulateMpesaSuccess(checkoutRequestId || `ws_CO_${Date.now()}`, randomReceipt);
      setReceiptNumber(randomReceipt);
      setStage('success');
      setTimeout(() => {
        onPaymentSuccess(res.order);
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Simulation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={() => stage !== 'waiting' && onClose()}
        className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-100 overflow-hidden z-10">
        {/* Top green M-Pesa bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-600" />

        {/* Close Button */}
        {stage !== 'waiting' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Modal Content by Stage */}
        {stage === 'prompt' && (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <Smartphone className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold font-serif text-stone-900">
                Pay with M-PESA
              </h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                An instant STK Push prompt will be sent directly to your phone. Enter your M-Pesa PIN to complete payment.
              </p>
            </div>

            {/* Order Summary Pill */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Order Reference:</span>
                <span className="font-mono font-bold text-stone-900">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Mattress Items:</span>
                <span>{order.items.length} item(s)</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-stone-900 pt-2 border-t border-stone-200">
                <span>Total Amount to Pay:</span>
                <span className="text-emerald-700 font-serif text-base">KSh {orderTotal.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleInitiateSTK} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Safaricom M-Pesa Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone || ''}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0712 345 678"
                    required
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-3 text-sm font-semibold text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                    254
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Contacting Safaricom Daraja...</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    <span>Send M-Pesa Prompt</span>
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Official Daraja 2.0 API Sandbox Integration</span>
            </div>
          </div>
        )}

        {stage === 'waiting' && (
          <div className="text-center space-y-5 py-4">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-100 animate-ping opacity-75" />
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center font-serif font-black text-2xl shadow-lg">
                {countdown}s
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-stone-900 font-serif">
                Check Your Phone Now
              </h3>
              <p className="text-xs text-stone-600 max-w-xs mx-auto leading-relaxed">
                An M-Pesa prompt has been sent to <strong className="text-stone-900">{phone}</strong>. Enter your secret PIN to authorize payment of <strong className="text-emerald-700 font-serif">KSh {order.totalAmount.toLocaleString()}</strong>.
              </p>
            </div>

            {/* Sandbox Fast-Pay Action for Instant Testing */}
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-left space-y-2">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Developer / Demo Testing Mode:</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-snug">
                Click below to instantly simulate customer PIN authorization and confirm receipt generation:
              </p>
              <button
                onClick={handleSimulateInstantSuccess}
                disabled={isProcessing}
                className="w-full bg-stone-900 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : '⚡ Simulate Successful PIN Entry & Verify'}
              </button>
            </div>

            <p className="text-[11px] text-stone-400">
              Do not close this window while payment is processing.
            </p>
          </div>
        )}

        {stage === 'success' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold font-serif text-stone-900">
                Payment Confirmed!
              </h3>
              <p className="text-xs text-stone-500">
                Safaricom M-Pesa Receipt: <span className="font-mono font-bold text-stone-900">{receiptNumber || order.mpesaReceiptNumber || 'QHG' + Date.now().toString().slice(-6)}</span>
              </p>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600">
              Your order <strong className="text-stone-900">{order.orderNumber}</strong> is now verified and queued for direct factory sourcing & express delivery.
            </div>
          </div>
        )}

        {stage === 'failed' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-stone-900">Payment Incomplete</h3>
              <p className="text-xs text-stone-500">{errorMsg || 'M-Pesa STK Push was rejected or cancelled.'}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setStage('prompt'); setErrorMsg(''); }}
                className="flex-1 bg-stone-900 hover:bg-stone-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs"
              >
                Retry M-Pesa
              </button>
              <button
                onClick={handleSimulateInstantSuccess}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs"
              >
                Simulate Success
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
