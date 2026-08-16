export type UserRole = 'customer' | 'buyer' | 'driver' | 'admin' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  addresses?: Address[];
  businessName?: string;
  taxPin?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  emailVerified?: boolean;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  county: string;
  town: string;
  area: string;
  deliveryAddress: string;
  landmark?: string;
  isDefault?: boolean;
}

export type Department = 
  | 'clothing'
  | 'shoes'
  | 'accessories'
  | 'home-bedding'
  | 'electronics'
  | 'beauty'
  | 'home-kitchen'
  | 'hardware'
  | 'mattresses'
  | 'furniture'
  | 'other';

export type MattressFirmness = 'Plush (Soft)' | 'Medium Soft' | 'Medium' | 'Medium Firm' | 'Firm' | 'Extra Firm Orthopedic';

export interface ProductVariant {
  id: string;
  productId?: string;
  name?: string;
  sizeLabel?: string;
  size?: string;
  color?: string;
  colorHex?: string;
  model?: string;
  storage?: string;
  shoeSize?: string;
  clothingSize?: string;
  dimensions?: string;
  thicknessInches?: number;
  thickness?: number;
  firmness?: string;
  price?: number; // Customer price in KSh
  sellingPrice?: number;
  oldPrice?: number; // Discounted from price
  compareAtPrice?: number;
  supplierPrice?: number; // Hidden from customer, used for profit tracking
  sku?: string;
  stockStatus?: 'in_stock' | 'supplier_order' | 'out_of_stock';
  stockCount?: number;
  weightKg?: number;
  unit?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  categoryId: string;
  categoryName?: string;
  department?: Department | string;
  supplierId?: string;
  primarySupplierId?: string;
  description: string;
  shortDescription?: string;
  features: string[];
  materials?: string[];
  specifications?: Record<string, string>;
  warrantyYears?: number;
  warranty?: string;
  trialNights?: number;
  firmness?: MattressFirmness | string;
  firmnessScore?: number; // 1 to 10
  firmnessRating?: number;
  firmnessLabel?: string;
  mattressType?: string;
  availableThicknesses?: number[];
  availableSizes?: string[];
  availableColors?: string[];
  images: string[];
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival?: boolean;
  isSpecialOffer?: boolean;
  isArchived?: boolean;
  rating: number;
  reviewCount: number;
  variants: ProductVariant[];
  basePrice?: number; // Display "From KSh X"
  baseOldPrice?: number;
  deliveryInfo?: string;
  weightKg?: number;
  dimensions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  department?: Department | string;
  description: string;
  image: string;
  displayOrder: number;
  active?: boolean;
  is_active?: boolean;
  productCount?: number;
}

export interface Supplier {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  location: string;
  leadTimeDays: number;
  notes?: string;
  active: boolean;
  productsSuppliedCount?: number;
}

export interface CartItem {
  id: string; // unique item id in cart (productId + variantId)
  productId: string;
  product: {
    id: string;
    name: string;
    brand: string;
    image: string;
    categoryName?: string;
    warrantyYears: number;
  };
  variantId: string;
  sizeLabel: string;
  thicknessInches: number;
  unitPrice: number;
  quantity: number;
}

export type OrderStatus = 
  | 'pending_payment'
  | 'payment_received'
  | 'order_confirmed'
  | 'processing'
  | 'supplier_purchase'
  | 'ready_for_delivery'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded';

export type SupplierFulfillmentStatus = 'not_contacted' | 'supplier_contacted' | 'purchased' | 'received';

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  label: string;
  description: string;
  timestamp: string;
  actor?: string; // 'System' | 'Admin' | 'Driver' | 'M-Pesa Webhook'
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  brand: string;
  variantId: string;
  sizeLabel: string;
  thicknessInches: number;
  quantity: number;
  unitPrice: number;
  supplierPrice?: number; // Only returned to admin
  lineTotal: number;
  lineSupplierCost?: number; // Only returned to admin
  lineProfit?: number; // Only returned to admin
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. ORD-2026-000101
  customerId?: string;
  isGuest: boolean;
  customerName: string;
  phone: string;
  email: string;
  county: string;
  town: string;
  area: string;
  deliveryAddress: string;
  landmark?: string;
  deliveryNotes?: string;
  deliveryType: 'delivery' | 'pickup';
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  couponCode?: string;
  paymentMethod: 'mpesa' | 'card' | 'cod';
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  supplierStatus: SupplierFulfillmentStatus;
  supplierId?: string;
  supplierOrderRef?: string;
  supplierPurchaseCost?: number; // admin only
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverNotes?: string;
  internalNotes?: string;
  estimatedDeliveryDate?: string;
  trackingHistory: OrderStatusHistoryItem[];
  // Profit calculations for admin
  totalSupplierCost?: number;
  estimatedProfit?: number;
  paymentTransactionRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  phone: string;
  method: 'mpesa' | 'card' | 'cod';
  status: PaymentStatus;
  mpesaReceiptNumber?: string;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  resultCode?: number;
  resultDesc?: string;
  createdAt: string;
  completedAt?: string;
}

export interface DeliveryZone {
  id: string;
  county: string;
  towns: string[];
  baseFee: number;
  estimatedDays: string;
  freeDeliveryThreshold?: number;
  active: boolean;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  customerId?: string;
  customerName?: string;
  userId?: string;
  userName?: string;
  userLocation?: string;
  orderId?: string;
  orderNumber?: string;
  rating: number;
  title?: string;
  comment: string;
  sizeBought?: string;
  verifiedPurchase?: boolean;
  isVerifiedPurchase?: boolean;
  helpfulVotes?: number;
  status?: 'approved' | 'pending' | 'hidden';
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  startDate: string;
  expiryDate: string;
  usageLimit?: number;
  usedCount: number;
  active: boolean;
  description?: string;
}

export interface Driver {
  id: string;
  userId?: string;
  name: string;
  phone: string;
  email?: string;
  vehicleType: string;
  vehiclePlate: string;
  activeDeliveriesCount?: number;
  assignedOrdersCount?: number;
  deliveredOrdersCount?: number;
  currentLocation?: string;
  rating?: number;
  deliveriesCount?: number;
  notes?: string;
  status?: string;
  active?: boolean;
  createdAt?: string;
}

export interface AdminSettings {
  businessName: string;
  tagline: string;
  logoUrl: string;
  phone: string;
  phoneAlternative: string;
  email: string;
  whatsapp: string;
  physicalAddress: string;
  currency: string;
  currencySymbol: string;
  pickupEnabled: boolean;
  pickupAddress: string;
  taxPercentage: number;
  freeDeliveryDefaultThreshold: number;
  allowGuestCheckout: boolean;
  mpesa: {
    environment: 'sandbox' | 'production';
    shortcode: string;
    tillNumber?: string;
    paybillNumber?: string;
    passkeyConfigured: boolean;
    consumerKeyConfigured: boolean;
  };
  notifications: {
    smsEnabled: boolean;
    whatsappEnabled: boolean;
    emailEnabled: boolean;
    senderId: string;
  };
}

export interface NotificationLog {
  id: string;
  orderId?: string;
  orderNumber?: string;
  recipient: string;
  channel: 'sms' | 'whatsapp' | 'email';
  title: string;
  message: string;
  status: 'sent' | 'delivered' | 'failed' | 'queued';
  createdAt: string;
}

export interface AdminActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalSales: number;
  todaySales: number;
  thisMonthSales: number;
  totalOrders: number;
  pendingOrders: number;
  paidOrders: number;
  processingOrders: number;
  outForDeliveryOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  totalCustomers: number;
  totalProfit: number;
  lowStockCount: number;
  topSellingProducts: {
    productId: string;
    productName: string;
    brand: string;
    image: string;
    unitsSold: number;
    revenue: number;
  }[];
  salesTrend: {
    date: string;
    sales: number;
    orders: number;
    profit: number;
  }[];
  categoryDistribution: {
    name: string;
    count: number;
    revenue: number;
  }[];
  paymentMethodStats: {
    method: string;
    count: number;
    amount: number;
  }[];
}
