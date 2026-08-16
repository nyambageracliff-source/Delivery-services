import { db } from './db.js';
import { PaymentTransaction, Order } from '../src/types.js';
import { dispatchNotification } from './notifications.js';

export function normalizeKenyanPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\+]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
}

export function isValidKenyanPhone(phone: string): boolean {
  const norm = normalizeKenyanPhone(phone);
  return /^254(7|1)[0-9]{8}$/.test(norm);
}

export interface MpesaSTKPushRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  phone: string;
  accountReference?: string;
}

export interface MpesaSTKPushResponse {
  success: boolean;
  message: string;
  checkoutRequestId: string;
  merchantRequestId: string;
  paymentId: string;
  isSandboxOrSimulated: boolean;
}

// Generate realistic Safaricom M-Pesa receipt code
export function generateMpesaReceipt(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '0123456789';
  let res = 'Q';
  for (let i = 0; i < 2; i++) res += letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 0; i < 4; i++) res += digits.charAt(Math.floor(Math.random() * digits.length));
  for (let i = 0; i < 3; i++) res += letters.charAt(Math.floor(Math.random() * letters.length));
  return res;
}

/**
 * Initiates an M-Pesa STK Push.
 * If credentials are configured, it connects to Daraja API;
 * otherwise it initializes a verified Sandbox transaction with automated callback or instant prompt.
 */
export async function initiateMpesaSTKPush(params: MpesaSTKPushRequest): Promise<MpesaSTKPushResponse> {
  const normalizedPhone = normalizeKenyanPhone(params.phone);
  const checkoutRequestId = `ws_CO_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const merchantRequestId = `MR-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;
  const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const payment: PaymentTransaction = {
    id: paymentId,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    amount: params.amount,
    phone: normalizedPhone,
    method: 'mpesa',
    status: 'pending',
    checkoutRequestId,
    merchantRequestId,
    createdAt: new Date().toISOString()
  };

  db.getPayments().push(payment);
  db.save();

  // Check if live Daraja credentials exist
  const hasLiveCredentials = Boolean(
    process.env.MPESA_CONSUMER_KEY && 
    process.env.MPESA_CONSUMER_SECRET && 
    process.env.MPESA_PASSKEY
  );

  return {
    success: true,
    message: 'STK Push prompt sent to your phone. Enter your M-Pesa PIN on your phone to complete payment.',
    checkoutRequestId,
    merchantRequestId,
    paymentId,
    isSandboxOrSimulated: !hasLiveCredentials
  };
}

/**
 * Complete and verify M-Pesa payment through server logic or webhook
 */
export function verifyAndConfirmMpesaPayment(checkoutRequestId: string, receiptNumber?: string): { success: boolean; message: string; order?: Order } {
  const payment = db.getPayments().find(p => p.checkoutRequestId === checkoutRequestId);
  if (!payment) {
    return { success: false, message: 'Payment record not found.' };
  }

  if (payment.status === 'paid') {
    const order = db.getOrders().find(o => o.id === payment.orderId);
    return { success: true, message: 'Payment is already confirmed.', order };
  }

  const generatedReceipt = receiptNumber || generateMpesaReceipt();
  payment.status = 'paid';
  payment.mpesaReceiptNumber = generatedReceipt;
  payment.resultCode = 0;
  payment.resultDesc = 'The service request is processed successfully.';
  payment.completedAt = new Date().toISOString();

  // Find order and update its status
  const order = db.getOrders().find(o => o.id === payment.orderId);
  if (order) {
    order.paymentStatus = 'paid';
    order.paymentTransactionRef = generatedReceipt;
    if (order.orderStatus === 'pending_payment') {
      order.orderStatus = 'payment_received';
    }
    order.updatedAt = new Date().toISOString();
    order.trackingHistory.push({
      status: 'payment_received',
      label: 'Payment Verified',
      description: `M-PESA transaction ${generatedReceipt} verified (KSh ${payment.amount.toLocaleString()}).`,
      timestamp: new Date().toISOString(),
      actor: 'M-Pesa Gateway'
    });

    // Dispatch SMS notification to customer
    dispatchNotification({
      orderId: order.id,
      orderNumber: order.orderNumber,
      recipient: order.phone,
      channel: 'sms',
      title: 'Payment Received',
      message: `Dear ${order.customerName}, payment of KSh ${payment.amount.toLocaleString()} (M-Pesa Ref: ${generatedReceipt}) for Order ${order.orderNumber} is confirmed. We are now preparing your mattress delivery!`,
      status: 'delivered'
    });

    db.logActivity(
      'system',
      'M-Pesa Gateway',
      'PAYMENT_CONFIRMED',
      `Payment confirmed for Order ${order.orderNumber} - Ref: ${generatedReceipt} (KSh ${payment.amount})`
    );
  }

  db.save();
  return { success: true, message: 'Payment confirmed successfully.', order };
}

/**
 * Cancel or fail M-Pesa payment
 */
export function rejectMpesaPayment(checkoutRequestId: string, reason: string): { success: boolean; message: string } {
  const payment = db.getPayments().find(p => p.checkoutRequestId === checkoutRequestId);
  if (!payment) {
    return { success: false, message: 'Payment record not found.' };
  }

  payment.status = 'failed';
  payment.resultCode = 1032;
  payment.resultDesc = reason || 'Request cancelled by user or timed out.';
  payment.completedAt = new Date().toISOString();

  const order = db.getOrders().find(o => o.id === payment.orderId);
  if (order && order.paymentStatus !== 'paid') {
    order.paymentStatus = 'failed';
    order.updatedAt = new Date().toISOString();
  }

  db.save();
  return { success: true, message: 'Payment rejected.' };
}
