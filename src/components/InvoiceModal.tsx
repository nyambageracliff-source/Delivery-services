import React from 'react';
import { X, Printer, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Order } from '../types';

interface InvoiceModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm transition-opacity"
      />

      <div className="relative bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-10 shadow-2xl border border-stone-200 z-10 my-8">
        {/* Actions Bar */}
        <div className="flex items-center justify-between pb-6 border-b border-stone-200 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Printable Sheet */}
        <div className="pt-6 space-y-6 text-stone-800">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center font-serif font-black text-base">
                  H
                </div>
                <span className="font-serif font-bold text-xl text-stone-900">Haven Mattresses Kenya</span>
              </div>
              <p className="text-xs text-stone-500">Nakuru Showroom & Direct Factory Hub</p>
              <p className="text-xs text-stone-500">Nakuru 20100, Kenya • PIN: P051283948K</p>
              <p className="text-xs text-stone-500">support@havenmattresses.co.ke • +254 742 967 083 / +254 116 822 231</p>
            </div>

            <div className="text-left sm:text-right">
              <span className="inline-block bg-stone-100 text-stone-800 text-xs font-bold px-3 py-1 rounded-full uppercase mb-1">
                Tax Invoice
              </span>
              <h2 className="font-mono font-bold text-base text-stone-900">{order.orderNumber}</h2>
              <p className="text-xs text-stone-500">Date: {new Date(order.createdAt).toLocaleDateString('en-GB')}</p>
              <p className="text-xs text-emerald-700 font-semibold flex items-center sm:justify-end gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Paid via {order.paymentMethod}
              </p>
              {order.mpesaReceiptNumber && (
                <p className="text-[11px] font-mono text-stone-600">Ref: {order.mpesaReceiptNumber}</p>
              )}
            </div>
          </div>

          {/* Customer & Delivery Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs">
            <div>
              <h4 className="font-bold text-stone-700 uppercase tracking-wider mb-1">Billed & Delivered To:</h4>
              <p className="font-semibold text-stone-900">{order.customerName}</p>
              <p className="text-stone-600">{order.phone || (order as any).customerPhone}</p>
              <p className="text-stone-600">{order.email || (order as any).customerEmail}</p>
            </div>
            <div>
              <h4 className="font-bold text-stone-700 uppercase tracking-wider mb-1">Delivery Destination:</h4>
              <p className="text-stone-700">
                {typeof order.deliveryAddress === 'string' ? order.deliveryAddress : (order.deliveryAddress as any)?.deliveryArea || (order as any).area || 'Nairobi'}, {order.town || (order.deliveryAddress as any)?.townCity || 'Nairobi'}
              </p>
              <p className="text-stone-600">{order.county || (order.deliveryAddress as any)?.county || 'Nairobi'} County, Kenya</p>
              {(order.landmark || (order.deliveryAddress as any)?.landmark) && (
                <p className="text-stone-500">Landmark: {order.landmark || (order.deliveryAddress as any)?.landmark}</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-stone-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                <tr>
                  <th className="p-3">Mattress Item & Specification</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(order.items || []).map((item) => (
                  <tr key={item.id}>
                    <td className="p-3">
                      <p className="font-semibold text-stone-900">{item.productName}</p>
                      <p className="text-stone-500 text-[11px]">
                        Brand: {item.brand} • Size: {item.sizeLabel} {item.thicknessInches ? `(${item.thicknessInches}" thick)` : ''}
                      </p>
                    </td>
                    <td className="p-3 text-center font-bold">{item.quantity}</td>
                    <td className="p-3 text-right">KSh {item.unitPrice.toLocaleString()}</td>
                    <td className="p-3 text-right font-semibold">KSh {(item.lineTotal || (item as any).totalPrice || item.unitPrice * item.quantity).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Calculation */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Items Subtotal:</span>
                <span>KSh {order.subtotal.toLocaleString()}</span>
              </div>
              {((order.discount || (order as any).discountAmount || 0) > 0) && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount Applied:</span>
                  <span>-KSh {(order.discount || (order as any).discountAmount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Delivery ({order.county || (order.deliveryAddress as any)?.county || 'Nairobi'}):</span>
                <span>{order.deliveryFee === 0 ? 'FREE' : `KSh ${order.deliveryFee.toLocaleString()}`}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-stone-900 pt-2 border-t border-stone-200">
                <span>Total Amount Paid:</span>
                <span className="text-base text-amber-800 font-serif">KSh {(order.total || (order as any).totalAmount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer Notes & Proof of Purchase */}
          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60 text-[11px] text-amber-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Official Proof of Purchase & Delivery Certificate</span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              This invoice serves as your official electronic proof of purchase and tax receipt. Retain this invoice number for delivery tracking and aftercare support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
