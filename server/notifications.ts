import { db } from './db.js';
import { NotificationLog } from '../src/types.js';

export interface NotificationPayload {
  orderId?: string;
  orderNumber?: string;
  recipient: string;
  channel: 'sms' | 'whatsapp' | 'email';
  title: string;
  message: string;
  status?: 'sent' | 'delivered' | 'failed' | 'queued';
}

export function dispatchNotification(payload: NotificationPayload): NotificationLog {
  const notif: NotificationLog = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    recipient: payload.recipient,
    channel: payload.channel,
    title: payload.title,
    message: payload.message,
    status: payload.status || 'delivered',
    createdAt: new Date().toISOString()
  };

  db.getNotifications().unshift(notif);
  // Keep last 1000 logs
  if (db.getNotifications().length > 1000) {
    db.getNotifications().splice(1000);
  }
  db.save();
  return notif;
}

export function notifyOrderStatusChange(order: any, newStatus: string, customMessage?: string) {
  let title = 'Order Update';
  let message = `Hello ${order.customerName}, your mattress order ${order.orderNumber} is updated to ${newStatus}.`;

  switch (newStatus) {
    case 'order_confirmed':
      title = 'Order Confirmed';
      message = `Hello ${order.customerName}, your order ${order.orderNumber} has been verified and confirmed. Sourcing and production has commenced.`;
      break;
    case 'supplier_purchase':
      title = 'Mattress Being Sourced';
      message = `Hello ${order.customerName}, your mattress is currently being freshly manufactured / sourced from our factory partner.`;
      break;
    case 'ready_for_delivery':
      title = 'Order Ready for Delivery';
      message = `Hello ${order.customerName}, your order ${order.orderNumber} has passed quality inspection and is packed for dispatch.`;
      break;
    case 'out_for_delivery':
      title = 'Out for Delivery';
      message = `Hello ${order.customerName}, your mattress order ${order.orderNumber} is now out for delivery${order.driverName ? ` with driver ${order.driverName} (${order.driverPhone || ''})` : ''}.`;
      break;
    case 'delivered':
      title = 'Order Delivered';
      message = `Hello ${order.customerName}, your mattress order ${order.orderNumber} has been delivered! We hope you enjoy deep, restful sleep. Please leave us a review on our website.`;
      break;
    case 'cancelled':
      title = 'Order Cancelled';
      message = `Hello ${order.customerName}, your order ${order.orderNumber} has been cancelled. If payment was made, a refund will be processed.`;
      break;
  }

  if (customMessage) {
    message = customMessage;
  }

  dispatchNotification({
    orderId: order.id,
    orderNumber: order.orderNumber,
    recipient: order.phone,
    channel: 'sms',
    title,
    message,
    status: 'delivered'
  });
}
