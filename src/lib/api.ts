import { 
  Product, Category, Supplier, Order, DeliveryZone, 
  Review, Coupon, Driver, AdminSettings, AnalyticsSummary, 
  NotificationLog, AdminActivityLog, User, PaymentTransaction 
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('haven_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export const api = {
  // Auth
  async register(data: { 
    name: string; 
    email: string; 
    phone: string; 
    password: string; 
    role?: 'customer' | 'buyer' | 'driver' | 'admin' | 'staff';
    businessName?: string;
    vehicleType?: string;
    vehiclePlate?: string;
    address?: any;
  }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Registration failed');
    return json;
  },

  async login(data: { email: string; password: string }) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Login failed');
    return json;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch profile');
    return json.user as User;
  },

  async updateProfile(data: { name?: string; phone?: string; addresses?: any[] }) {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Update profile failed');
    return json;
  },

  // Products
  async getProducts(params: Record<string, string | number | boolean | string[] | undefined> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== '') {
        if (Array.isArray(val)) {
          val.forEach(v => query.append(key, v));
        } else {
          query.append(key, String(val));
        }
      }
    });

    const res = await fetch(`${API_BASE}/products?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch products');
    return json as { count: number; products: Product[] };
  },

  async getProduct(idOrSlug: string) {
    const res = await fetch(`${API_BASE}/products/${idOrSlug}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Product not found');
    return json as { product: Product; reviews: Review[] };
  },

  async createProduct(data: Partial<Product>) {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Create product failed');
    return json;
  },

  async updateProduct(id: string, data: Partial<Product>) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Update product failed');
    return json;
  },

  async deleteProduct(id: string) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Delete product failed');
    return json;
  },

  async toggleArchiveProduct(id: string) {
    const res = await fetch(`${API_BASE}/products/${id}/archive`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Archive toggle failed');
    return json;
  },

  // Categories
  async getCategories() {
    const res = await fetch(`${API_BASE}/categories`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch categories');
    return json.categories as Category[];
  },

  async createCategory(data: Partial<Category>) {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create category');
    return json.category as Category;
  },

  async updateCategory(id: string, data: Partial<Category>) {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update category');
    return json.category as Category;
  },

  async deleteCategory(id: string) {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete category');
    return json;
  },

  // Delivery Zones
  async getDeliveryZones() {
    const res = await fetch(`${API_BASE}/delivery-zones`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch delivery zones');
    return json.zones as DeliveryZone[];
  },

  async createDeliveryZone(data: Partial<DeliveryZone>) {
    const res = await fetch(`${API_BASE}/delivery-zones`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create zone');
    return json;
  },

  async updateDeliveryZone(id: string, data: Partial<DeliveryZone>) {
    const res = await fetch(`${API_BASE}/delivery-zones/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update zone');
    return json;
  },

  async deleteDeliveryZone(id: string) {
    const res = await fetch(`${API_BASE}/delivery-zones/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete zone');
    return json;
  },

  // Coupons
  async validateCoupon(code: string, subtotal: number) {
    const res = await fetch(`${API_BASE}/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, subtotal })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Invalid coupon');
    return json as { valid: boolean; code: string; discountAmount: number; discountType: string; discountValue: number; description?: string };
  },

  async getCoupons() {
    const res = await fetch(`${API_BASE}/coupons`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch coupons');
    return json.coupons as Coupon[];
  },

  async createCoupon(data: Partial<Coupon>) {
    const res = await fetch(`${API_BASE}/coupons`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create coupon');
    return json;
  },

  async updateCoupon(id: string, data: Partial<Coupon>) {
    const res = await fetch(`${API_BASE}/coupons/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update coupon');
    return json;
  },

  async deleteCoupon(id: string) {
    const res = await fetch(`${API_BASE}/coupons/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete coupon');
    return json;
  },

  // Orders & Tracking
  async createOrder(data: any) {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to place order');
    return json as { order: Order; paymentPrompt: any };
  },

  async trackOrder(orderNumber: string, phoneOrEmail?: string) {
    const query = new URLSearchParams();
    if (phoneOrEmail) query.append('auth', phoneOrEmail);
    const res = await fetch(`${API_BASE}/orders/track/${orderNumber}?${query.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Order tracking not found');
    return json.order as Order;
  },

  async getMyOrders() {
    const res = await fetch(`${API_BASE}/orders/my-orders`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch orders');
    return json.orders as Order[];
  },

  async getAdminOrders(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params);
    const res = await fetch(`${API_BASE}/admin/orders?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch admin orders');
    return json as { count: number; orders: Order[] };
  },

  async getOrder(id: string) {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch order');
    return json.order as Order;
  },

  async updateOrderStatus(id: string, status: string, note?: string) {
    const res = await fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, note })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update order status');
    return json;
  },

  async updateSupplierFulfillment(id: string, data: { supplierStatus?: string; supplierId?: string; supplierOrderRef?: string; actualCost?: number; notes?: string }) {
    const res = await fetch(`${API_BASE}/orders/${id}/supplier-fulfillment`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update supplier fulfillment');
    return json;
  },

  async assignDriver(id: string, driverId: string, estimatedDeliveryDate?: string) {
    const res = await fetch(`${API_BASE}/orders/${id}/assign-driver`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ driverId, estimatedDeliveryDate })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to assign driver');
    return json;
  },

  async getInvoice(id: string) {
    const res = await fetch(`${API_BASE}/orders/${id}/invoice`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to get invoice');
    return json.invoice;
  },

  // Payments
  async initiateMpesa(orderId: string, phone: string) {
    const res = await fetch(`${API_BASE}/payments/mpesa/stkpush`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, phone })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'M-Pesa initiation failed');
    return json;
  },

  async simulateMpesaSuccess(checkoutRequestId: string, receiptNumber?: string) {
    const res = await fetch(`${API_BASE}/payments/mpesa/simulate-success`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkoutRequestId, receiptNumber })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Payment simulation failed');
    return json as { message: string; order: Order };
  },

  async checkPaymentStatus(checkoutRequestId: string) {
    const res = await fetch(`${API_BASE}/payments/status/${checkoutRequestId}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Payment check failed');
    return json;
  },

  // Reviews
  async submitReview(data: { 
    productId: string; 
    rating: number; 
    title?: string; 
    comment: string; 
    orderNumber?: string; 
    sizeBought?: string;
    userLocation?: string;
  }) {
    const res = await fetch(`${API_BASE}/reviews`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to submit review');
    return json as { message: string; review: Review; product?: Product; reviews?: Review[] };
  },

  async voteHelpfulReview(reviewId: string) {
    const res = await fetch(`${API_BASE}/reviews/${reviewId}/helpful`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to record vote');
    return json as { message: string; helpfulVotes: number };
  },

  async getAdminReviews() {
    const res = await fetch(`${API_BASE}/reviews/admin`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch reviews');
    return json.reviews as Review[];
  },

  async updateReviewStatus(id: string, status: string) {
    const res = await fetch(`${API_BASE}/reviews/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update review status');
    return json;
  },

  async moderateReview(id: string, status: 'approved' | 'rejected') {
    return this.updateReviewStatus(id, status);
  },

  async deleteReview(id: string) {
    const res = await fetch(`${API_BASE}/reviews/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete review');
    return json;
  },

  // Wishlist
  async getWishlist() {
    const res = await fetch(`${API_BASE}/wishlist`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch wishlist');
    return json.wishlist as Product[];
  },

  async toggleWishlist(productId: string) {
    const res = await fetch(`${API_BASE}/wishlist/toggle`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ productId })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to toggle wishlist');
    return json as { inWishlist: boolean; message: string };
  },

  // Suppliers & Drivers
  async getSuppliers() {
    const res = await fetch(`${API_BASE}/suppliers`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch suppliers');
    return json.suppliers as Supplier[];
  },

  async createSupplier(data: Partial<Supplier>) {
    const res = await fetch(`${API_BASE}/suppliers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create supplier');
    return json.supplier as Supplier;
  },

  async updateSupplier(id: string, data: Partial<Supplier>) {
    const res = await fetch(`${API_BASE}/suppliers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update supplier');
    return json.supplier as Supplier;
  },

  async deleteSupplier(id: string) {
    const res = await fetch(`${API_BASE}/suppliers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete supplier');
    return json;
  },

  // Drivers Management
  async getDrivers() {
    const res = await fetch(`${API_BASE}/admin/drivers`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch drivers');
    return json.drivers as Driver[];
  },

  async createDriver(data: Partial<Driver>) {
    const res = await fetch(`${API_BASE}/admin/drivers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create driver');
    return json.driver as Driver;
  },

  async updateDriver(id: string, data: Partial<Driver>) {
    const res = await fetch(`${API_BASE}/admin/drivers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update driver');
    return json.driver as Driver;
  },

  async deleteDriver(id: string) {
    const res = await fetch(`${API_BASE}/admin/drivers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete driver');
    return json;
  },

  // Customers & Users Management
  async getCustomers() {
    const res = await fetch(`${API_BASE}/admin/customers`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch customers');
    return json.customers as Array<User & { totalOrders: number; totalSpent: number; lastOrderDate: string | null; lastOrderNumber?: string | null }>;
  },

  async createUser(userData: { name: string; email: string; phone?: string; role: 'admin' | 'staff' | 'driver' | 'customer'; password?: string; address?: string; vehicleType?: string; vehiclePlate?: string }) {
    const res = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create user');
    return json.user as User;
  },

  async getUserDetails(userId: string) {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/details`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch user details');
    return json as {
      user: User;
      metrics: {
        totalOrders: number;
        paidOrders: number;
        totalSpent: number;
        reviewsCount: number;
        wishlistCount: number;
        memberSince: string;
      };
      orders: any[];
      reviews: any[];
    };
  },

  async updateUser(userId: string, data: Partial<User>) {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update user');
    return json.user as User;
  },

  async updateUserRole(userId: string, role: 'admin' | 'staff' | 'driver' | 'customer') {
    const res = await fetch(`${API_BASE}/admin/customers/${userId}/role`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update user role');
    return json.user as User;
  },

  async deleteCustomer(userId: string) {
    const res = await fetch(`${API_BASE}/admin/customers/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete customer');
    return json;
  },

  // Payments / Transactions
  async getPayments() {
    const res = await fetch(`${API_BASE}/admin/payments`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch payments');
    return json.payments as PaymentTransaction[];
  },

  async approvePayment(paymentOrOrderId: string, data?: { receiptNumber?: string; notes?: string }) {
    const res = await fetch(`${API_BASE}/admin/payments/${paymentOrOrderId}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data || {})
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to approve payment');
    return json;
  },

  async rejectPayment(paymentOrOrderId: string, reason?: string) {
    const res = await fetch(`${API_BASE}/admin/payments/${paymentOrOrderId}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to reject payment');
    return json;
  },

  // Driver Deliveries
  async getDriverDeliveries() {
    const res = await fetch(`${API_BASE}/driver/deliveries`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch driver deliveries');
    return json as { count: number; deliveries: Order[] };
  },

  async updateDriverDeliveryStatus(id: string, status: string, driverNotes?: string) {
    const res = await fetch(`${API_BASE}/driver/deliveries/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, driverNotes })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update delivery');
    return json;
  },

  // Admin Analytics & Settings
  async getAnalytics() {
    const res = await fetch(`${API_BASE}/admin/analytics`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch analytics');
    return json.analytics as AnalyticsSummary;
  },

  async getSettings() {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch settings');
    return json.settings as AdminSettings;
  },

  async updateSettings(data: Partial<AdminSettings>) {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update settings');
    return json;
  },

  async getNotifications() {
    const res = await fetch(`${API_BASE}/admin/notifications`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch notifications');
    return json.notifications as NotificationLog[];
  },

  async getActivityLogs() {
    const res = await fetch(`${API_BASE}/admin/activity-logs`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch logs');
    return json.logs as AdminActivityLog[];
  },

  async resetDemoData() {
    const res = await fetch(`${API_BASE}/admin/reset-demo-data`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to reset demo data');
    return json;
  },

  async seedCatalogTemplate(force = false) {
    const res = await fetch(`${API_BASE}/admin/seed-catalog`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ force })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to seed catalog');
    return json;
  },

  async setupAdmin(data: { name?: string; email?: string; phone?: string; password?: string; setupKey?: string }) {
    const res = await fetch(`${API_BASE}/auth/setup-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to set up admin');
    return json as { message: string; user: User; token: string };
  },

  // Supabase Integration
  async getSupabaseStatus() {
    const res = await fetch(`${API_BASE}/supabase/status`);
    const json = await res.json();
    return json as {
      isConfigured: boolean;
      connected: boolean;
      url: string;
      configuredKeyType: 'service_role' | 'anon' | 'none';
      tablesDetected: string[];
      message: string;
      error?: string;
    };
  },

  async testSupabase(credentials?: { url?: string; key?: string }) {
    const res = await fetch(`${API_BASE}/supabase/test`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: credentials ? JSON.stringify(credentials) : undefined,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to test Supabase connection');
    return json as {
      isConfigured: boolean;
      connected: boolean;
      url: string;
      configuredKeyType: 'service_role' | 'anon' | 'none';
      tablesDetected: string[];
      message: string;
      error?: string;
    };
  },

  async configureSupabase(url: string, key: string) {
    const res = await fetch(`${API_BASE}/supabase/configure`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ url, key }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to configure Supabase');
    return json as { success: boolean; status: any };
  },

  async syncToSupabase() {
    const res = await fetch(`${API_BASE}/supabase/sync-up`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || json.message || 'Failed to sync to Supabase');
    return json as {
      success: boolean;
      message: string;
      syncedCounts: Record<string, number>;
    };
  },

  async pullFromSupabase() {
    const res = await fetch(`${API_BASE}/supabase/pull-down`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || json.message || 'Failed to pull from Supabase');
    return json as {
      success: boolean;
      message: string;
      pulledCounts: Record<string, number>;
    };
  },

  async getSupabaseTableData(tableName: string, limit = 50) {
    const res = await fetch(`${API_BASE}/supabase/table/${tableName}?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to query Supabase table');
    return json as {
      table: string;
      count: number;
      rows: any[];
    };
  },

  async getSupabaseSqlSchema() {
    const res = await fetch(`${API_BASE}/supabase/schema-sql`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load SQL schema');
    return json as { sql: string };
  }
};

