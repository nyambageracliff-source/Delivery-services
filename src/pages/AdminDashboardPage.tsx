import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ShoppingBag, Package, Truck, Users, Tag, 
  MapPin, Settings as SettingsIcon, MessageSquare, Bell, Plus, 
  Search, Edit3, Trash2, CheckCircle2, AlertCircle, RefreshCw, 
  ExternalLink, FileText, ArrowUpRight, DollarSign, TrendingUp,
  Percent, Star, Eye, Send, Lock, ChevronRight, X, ShieldAlert,
  CreditCard, FolderTree, ArrowDownToLine, Database, Copy, Check, Code2,
  Phone, Mail, UserPlus, Shield, UserCheck, Table, DownloadCloud, UploadCloud,
  History, Calendar, CheckCircle, ArrowRight
} from 'lucide-react';

import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Product, Category, Supplier, Order, DeliveryZone, Review, 
  Coupon, Driver, AdminSettings, AnalyticsSummary, NotificationLog,
  AdminActivityLog, OrderStatus, ProductVariant, User
} from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { InvoiceModal } from '../components/InvoiceModal';

export const AdminDashboardPage: React.FC = () => {
  const { user, isAdmin, isStaff } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'analytics' | 'orders' | 'products' | 'categories' | 'suppliers' | 'drivers' | 'zones' | 'customers' | 'payments' | 'coupons' | 'reviews' | 'notifications' | 'settings'
  >('analytics');

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [customers, setCustomers] = useState<Array<User & { totalOrders: number; totalSpent: number; lastOrderDate: string | null }>>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);

  // Modals & Selection States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  
  // Product Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  // Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);

  // Driver Modal
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Partial<Driver> | null>(null);

  // Zone Modal
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Partial<DeliveryZone> | null>(null);

  // Coupon Modal
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);

  // Delete Target Modal State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'supplier' | 'driver' | 'zone' | 'customer' | 'coupon' | 'review' | 'product';
    id: string;
    name: string;
    subtitle?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Supplier Sourcing Modal / form state on an order
  const [sourcingSupplierId, setSourcingSupplierId] = useState('');
  const [sourcingCost, setSourcingCost] = useState<number>(0);
  const [sourcingRef, setSourcingRef] = useState('');
  const [sourcingNotes, setSourcingNotes] = useState('');

  // Driver Assignment State
  const [assignDriverId, setAssignDriverId] = useState('');
  const [assignEstDate, setAssignEstDate] = useState('');

  // Orders Filter
  const [orderFilterStatus, setOrderFilterStatus] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Products Search
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // Supabase State
  const [supabaseStatus, setSupabaseStatus] = useState<{
    isConfigured: boolean;
    connected: boolean;
    url: string;
    configuredKeyType: string;
    tablesDetected: string[];
    message: string;
    error?: string;
  } | null>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [supabaseSql, setSupabaseSql] = useState<string>('');
  const [showSqlSchemaModal, setShowSqlSchemaModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // User Management State
  const [userFilterRole, setUserFilterRole] = useState<'all' | 'customer' | 'driver' | 'staff' | 'admin'>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'customer' as 'customer' | 'staff' | 'admin' | 'driver',
    password: '',
    address: '',
    vehicleType: '',
    vehiclePlate: ''
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<{
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
  } | null>(null);
  const [isLoadingCustomerDetails, setIsLoadingCustomerDetails] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

  // Supabase Pull & Table Explorer State
  const [isPullingSupabase, setIsPullingSupabase] = useState(false);
  const [isTableExplorerOpen, setIsTableExplorerOpen] = useState(false);
  const [selectedSupabaseTable, setSelectedSupabaseTable] = useState('users');
  const [supabaseTableData, setSupabaseTableData] = useState<{ table: string; count: number; rows: any[] } | null>(null);
  const [isLoadingTableData, setIsLoadingTableData] = useState(false);

  // Payments Filter & Approval State
  const [paymentFilterStatus, setPaymentFilterStatus] = useState<'all' | 'pending' | 'paid' | 'failed'>('all');
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [paymentApproveModal, setPaymentApproveModal] = useState<{
    id: string;
    orderNumber: string;
    amount: number;
    customerName: string;
    phone: string;
    receiptNumber: string;
    notes: string;
  } | null>(null);
  const [isApprovingPayment, setIsApprovingPayment] = useState(false);

  // Toast / feedback message
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        analyticsData,
        ordersData,
        prodsData,
        catsData,
        suppsData,
        driversData,
        zonesData,
        custsData,
        paysData,
        coupsData,
        revsData,
        notifsData,
        setsData,
        supaStatus
      ] = await Promise.all([
        api.getAnalytics().catch(() => null),
        api.getAdminOrders().catch(() => ({ count: 0, orders: [] })),
        api.getProducts({}).catch(() => ({ count: 0, products: [] })),
        api.getCategories().catch(() => []),
        api.getSuppliers().catch(() => []),
        api.getDrivers().catch(() => []),
        api.getDeliveryZones().catch(() => []),
        api.getCustomers().catch(() => []),
        api.getPayments().catch(() => []),
        api.getCoupons().catch(() => []),
        api.getAdminReviews().catch(() => []),
        api.getNotifications().catch(() => []),
        api.getSettings().catch(() => null),
        api.getSupabaseStatus().catch(() => null)
      ]);

      if (analyticsData) setAnalytics(analyticsData);
      setOrders(ordersData.orders || []);
      setProducts(prodsData.products || []);
      setCategories(catsData || []);
      setSuppliers(suppsData || []);
      setDrivers(driversData || []);
      setDeliveryZones(zonesData || []);
      setCustomers(custsData || []);
      setPayments(paysData || []);
      setCoupons(coupsData || []);
      setReviews(revsData || []);
      setNotifications(notifsData || []);
      if (setsData) setSettings(setsData);
      if (supaStatus) setSupabaseStatus(supaStatus);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestSupabaseConnection = async () => {
    setIsTestingSupabase(true);
    try {
      const result = await api.testSupabase();
      setSupabaseStatus(result);
      if (result.connected) {
        showToast(`Connected to Supabase! Found ${result.tablesDetected.length} tables.`);
      } else {
        showToast(result.message || 'Supabase connection test failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to test Supabase connection', 'error');
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const handleSyncToSupabase = async () => {
    setIsSyncingSupabase(true);
    try {
      const res = await api.syncToSupabase();
      showToast(res.message || 'Successfully synced catalog and data to Supabase!');
      await handleTestSupabaseConnection();
    } catch (err: any) {
      showToast(err.message || 'Sync to Supabase failed', 'error');
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handleOpenSqlSchema = async () => {
    try {
      if (!supabaseSql) {
        const schema = await api.getSupabaseSqlSchema();
        setSupabaseSql(schema.sql);
      }
      setShowSqlSchemaModal(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to load SQL schema', 'error');
    }
  };

  const handleCopySql = () => {
    if (supabaseSql) {
      navigator.clipboard.writeText(supabaseSql);
      setCopiedSql(true);
      showToast('SQL schema copied to clipboard!');
      setTimeout(() => setCopiedSql(false), 2500);
    }
  };

  const handlePullFromSupabase = async () => {
    setIsPullingSupabase(true);
    try {
      const res = await api.pullFromSupabase();
      showToast(res.message || 'Successfully pulled records from Supabase!');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to pull data from Supabase', 'error');
    } finally {
      setIsPullingSupabase(false);
    }
  };

  const handleInspectSupabaseTable = async (tableName: string) => {
    setSelectedSupabaseTable(tableName);
    setIsLoadingTableData(true);
    setIsTableExplorerOpen(true);
    try {
      const res = await api.getSupabaseTableData(tableName);
      setSupabaseTableData(res);
    } catch (err: any) {
      showToast(err.message || `Failed to fetch records from table ${tableName}`, 'error');
      setSupabaseTableData({ table: tableName, count: 0, rows: [] });
    } finally {
      setIsLoadingTableData(false);
    }
  };

  const handleViewCustomerDetails = async (userId: string) => {
    setIsLoadingCustomerDetails(true);
    try {
      const details = await api.getUserDetails(userId);
      setSelectedCustomerDetails(details);
    } catch (err: any) {
      showToast(err.message || 'Failed to load user details', 'error');
    } finally {
      setIsLoadingCustomerDetails(false);
    }
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email) {
      showToast('Name and Email are required', 'error');
      return;
    }
    setIsCreatingUser(true);
    try {
      await api.createUser(newUserForm);
      showToast(`User account created successfully!`);
      setIsCreateUserModalOpen(false);
      setNewUserForm({
        name: '',
        email: '',
        phone: '',
        role: 'customer',
        password: '',
        address: '',
        vehicleType: '',
        vehiclePlate: ''
      });
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create user', 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.id) return;
    try {
      await api.updateUser(editingUser.id, editingUser);
      showToast('User profile updated successfully');
      setIsEditUserModalOpen(false);
      setEditingUser(null);
      await loadAllData();
      if (selectedCustomerDetails && selectedCustomerDetails.user.id === editingUser.id) {
        await handleViewCustomerDetails(editingUser.id);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update user', 'error');
    }
  };

  const handleQuickApprovePayment = (
    paymentOrOrderId: string,
    orderNumber: string,
    amount: number,
    customerName: string,
    phone: string,
    existingReceipt?: string
  ) => {
    const defaultReceipt = existingReceipt && existingReceipt !== 'PENDING' ? existingReceipt : `QJH${Math.floor(100000 + Math.random() * 900000)}`;
    setPaymentApproveModal({
      id: paymentOrOrderId,
      orderNumber: orderNumber || 'N/A',
      amount: amount || 0,
      customerName: customerName || 'Customer',
      phone: phone || '',
      receiptNumber: defaultReceipt,
      notes: 'Manual payment approval & M-PESA confirmation by admin'
    });
  };

  const handleConfirmApprovePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentApproveModal) return;
    setIsApprovingPayment(true);
    try {
      const res = await api.approvePayment(paymentApproveModal.id, {
        receiptNumber: paymentApproveModal.receiptNumber,
        notes: paymentApproveModal.notes
      });
      showToast(res.message || 'Payment confirmed and approved successfully!');
      setPaymentApproveModal(null);
      await loadAllData();
      if (selectedOrder && (selectedOrder.id === paymentApproveModal.id || selectedOrder.orderNumber === paymentApproveModal.orderNumber)) {
        const updated = await api.getOrder(selectedOrder.id);
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to approve payment', 'error');
    } finally {
      setIsApprovingPayment(false);
    }
  };

  const handleRejectPayment = async (paymentOrOrderId: string) => {
    const reason = window.prompt('Please enter the reason for rejecting/failing this payment:', 'Failed M-Pesa transaction / timeout');
    if (reason === null) return;
    try {
      const res = await api.rejectPayment(paymentOrOrderId, reason);
      showToast(res.message || 'Payment marked as failed/rejected.');
      await loadAllData();
      if (selectedOrder && selectedOrder.id === paymentOrOrderId) {
        const updated = await api.getOrder(selectedOrder.id);
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to reject payment', 'error');
    }
  };


  useEffect(() => {
    loadAllData();
  }, []);

  // Update order status
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      showToast(`Order status updated to ${newStatus}`);
      await loadAllData();
      if (selectedOrder?.id === orderId) {
        const updated = await api.getOrder(orderId);
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      showToast(err.message || 'Status update failed', 'error');
    }
  };

  // Submit supplier sourcing fulfillment
  const handleSaveSupplierSourcing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await api.updateSupplierFulfillment(selectedOrder.id, {
        supplierId: sourcingSupplierId || undefined,
        supplierOrderRef: sourcingRef || undefined,
        actualCost: sourcingCost || undefined,
        notes: sourcingNotes || undefined,
        supplierStatus: 'purchased'
      });
      showToast('Supplier purchase order recorded successfully');
      await loadAllData();
      const updated = await api.getOrder(selectedOrder.id);
      setSelectedOrder(updated);
    } catch (err: any) {
      showToast(err.message || 'Supplier update failed', 'error');
    }
  };

  // Assign Driver
  const handleAssignDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !assignDriverId) return;
    try {
      await api.assignDriver(selectedOrder.id, assignDriverId, assignEstDate || undefined);
      showToast('Driver assigned to order');
      await loadAllData();
      const updated = await api.getOrder(selectedOrder.id);
      setSelectedOrder(updated);
    } catch (err: any) {
      showToast(err.message || 'Driver assign failed', 'error');
    }
  };

  // WhatsApp Supplier PO helper
  const handleSendSupplierWhatsApp = (order: Order) => {
    const supp = suppliers.find(s => s.id === order.supplierId) || suppliers[0];
    const itemsList = order.items.map(i => `• ${i.quantity}x ${i.productName} (${i.sizeLabel}, ${i.thicknessInches}")`).join('\n');
    const msg = `*PURCHASE ORDER - HAVEN MATTRESSES KENYA*\n\nOrder Ref: *${order.orderNumber}*\nSupplier: ${supp?.company || 'Factory Partner'}\n\n*Required Mattress Specs:*\n${itemsList}\n\nDelivery Destination Hub: Nakuru Hub, Nakuru 20100\nContact: +254 742 967 083 / +254 116 822 231\nPlease confirm factory batch readiness.`;
    const cleanPhone = (supp?.phone || '254742967083').replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Save product (create / update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.basePrice) return;
    try {
      if (editingProduct.id) {
        await api.updateProduct(editingProduct.id, editingProduct);
        showToast('Product updated successfully');
      } else {
        await api.createProduct(editingProduct);
        showToast('Product created successfully');
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save product', 'error');
    }
  };

  // Import Starter Mattress Catalog
  const handleImportStarterCatalog = async () => {
    if (!window.confirm('Import genuine Kenyan mattress catalog template (Dr. Mattress, Bobmil, Silentnight, Superfoam)?')) return;
    try {
      await api.seedCatalogTemplate(true);
      showToast('Starter mattress catalog imported successfully');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to import catalog', 'error');
    }
  };

  // Save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name) return;
    try {
      if (editingCategory.id) {
        await api.updateCategory(editingCategory.id, editingCategory);
        showToast('Category updated successfully');
      } else {
        await api.createCategory(editingCategory);
        showToast('Category created successfully');
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save category', 'error');
    }
  };

  // Unified Delete Execution (No window.confirm blockers in iframe)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'category') {
        await api.deleteCategory(deleteTarget.id);
        showToast(`Category "${deleteTarget.name}" deleted successfully`);
      } else if (deleteTarget.type === 'supplier') {
        await api.deleteSupplier(deleteTarget.id);
        showToast(`Supplier "${deleteTarget.name}" deleted successfully`);
      } else if (deleteTarget.type === 'driver') {
        await api.deleteDriver(deleteTarget.id);
        showToast(`Driver "${deleteTarget.name}" removed from fleet`);
      } else if (deleteTarget.type === 'zone') {
        await api.deleteDeliveryZone(deleteTarget.id);
        showToast(`Delivery zone "${deleteTarget.name}" deleted`);
      } else if (deleteTarget.type === 'coupon') {
        await api.deleteCoupon(deleteTarget.id);
        showToast(`Coupon code "${deleteTarget.name}" deleted`);
      } else if (deleteTarget.type === 'customer') {
        await api.deleteCustomer(deleteTarget.id);
        showToast(`Account "${deleteTarget.name}" deleted successfully`);
      } else if (deleteTarget.type === 'review') {
        await api.deleteReview(deleteTarget.id);
        showToast('Review removed successfully');
      } else if (deleteTarget.type === 'product') {
        await api.deleteProduct(deleteTarget.id);
        showToast(`Product "${deleteTarget.name}" permanently deleted`);
      }
      setDeleteTarget(null);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete item', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Save Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier?.company) return;
    try {
      if (editingSupplier.id) {
        await api.updateSupplier(editingSupplier.id, editingSupplier);
        showToast('Supplier updated successfully');
      } else {
        await api.createSupplier(editingSupplier);
        showToast('Supplier created successfully');
      }
      setIsSupplierModalOpen(false);
      setEditingSupplier(null);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save supplier', 'error');
    }
  };

  // Save Driver
  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver?.name || !editingDriver?.phone) return;
    try {
      if (editingDriver.id) {
        await api.updateDriver(editingDriver.id, editingDriver);
        showToast('Driver details updated');
      } else {
        await api.createDriver(editingDriver);
        showToast('Driver added to fleet');
      }
      setIsDriverModalOpen(false);
      setEditingDriver(null);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save driver', 'error');
    }
  };

  // Save Delivery Zone
  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone?.county) return;
    try {
      if (editingZone.id) {
        await api.updateDeliveryZone(editingZone.id, editingZone);
        showToast('Delivery zone updated');
      } else {
        await api.createDeliveryZone(editingZone);
        showToast('Delivery zone added');
      }
      setIsZoneModalOpen(false);
      setEditingZone(null);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save zone', 'error');
    }
  };

  // Save Coupon
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon?.code || !editingCoupon?.discountValue) return;
    try {
      if (editingCoupon.id) {
        await api.updateCoupon(editingCoupon.id, editingCoupon);
        showToast('Coupon updated');
      } else {
        await api.createCoupon(editingCoupon);
        showToast('Coupon code created');
      }
      setIsCouponModalOpen(false);
      setEditingCoupon(null);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save coupon', 'error');
    }
  };

  // User Role update
  const handleUpdateUserRole = async (userId: string, newRole: 'admin' | 'staff' | 'driver' | 'customer') => {
    try {
      await api.updateUserRole(userId, newRole);
      showToast(`User role updated to ${newRole}`);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update user role', 'error');
    }
  };

  // Reviews moderation
  const handleUpdateReviewStatus = async (reviewId: string, status: 'approved' | 'rejected') => {
    try {
      await api.moderateReview(reviewId, status);
      showToast(`Review marked as ${status}`);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to moderate review', 'error');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await api.updateSettings(settings);
      showToast('Settings saved successfully');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings', 'error');
    }
  };

  // Filtered Orders
  const filteredOrders = orders.filter(ord => {
    if (orderFilterStatus !== 'all' && ord.orderStatus !== orderFilterStatus) return false;
    if (orderSearchQuery) {
      const q = orderSearchQuery.toLowerCase();
      return (
        ord.orderNumber.toLowerCase().includes(q) ||
        ord.customerName.toLowerCase().includes(q) ||
        ord.phone.includes(q) ||
        ord.county.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const COLORS = ['#d97706', '#059669', '#2563eb', '#7c3aed', '#db2777', '#4b5563'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 transition-all ${
          toastMsg.type === 'success' ? 'bg-emerald-800 text-white' : 'bg-red-800 text-white'
        }`}>
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Admin Top Header */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-amber-700 rounded-2xl text-white shadow-md">
            <LayoutDashboard className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Haven Mattresses HQ Control Suite
              </span>
              <span className="bg-stone-800 text-stone-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Kenya Master Network
              </span>
            </div>
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-white mt-0.5">
              Admin & Operations Panel
            </h1>
            <p className="text-xs text-stone-400 mt-1">
              Production database management: Catalog, Orders, Sourcing, Logistics & Roles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAllData}
            className="bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-stone-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
          </button>
          {products.length === 0 && (
            <button
              onClick={handleImportStarterCatalog}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-600/30"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" /> Import Starter Catalog
            </button>
          )}
        </div>
      </div>

      {/* Guest Mode Banner */}
      {!isAdmin && !isStaff && (
        <div className="bg-amber-950 border border-amber-800/80 rounded-3xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-300">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-amber-200">
                Staff Authentication & Elevated Permissions
              </h3>
              <p className="text-xs text-stone-300">
                You are currently viewing as <span className="font-semibold text-amber-400">{user?.role || 'Guest'}</span>. To manage orders, catalog, and inventory, please sign in with an Administrator or Staff Supabase account.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex border-b border-stone-200 gap-2 sm:gap-4 overflow-x-auto text-xs font-bold uppercase tracking-wider pb-1">
        {[
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          { id: 'orders', label: `Orders (${orders.length})`, icon: ShoppingBag },
          { id: 'products', label: `Products (${products.length})`, icon: Package },
          { id: 'categories', label: `Categories (${categories.length})`, icon: FolderTree },
          { id: 'suppliers', label: `Suppliers (${suppliers.length})`, icon: Users },
          { id: 'drivers', label: `Fleet (${drivers.length})`, icon: Truck },
          { id: 'zones', label: `Zones (${deliveryZones.length})`, icon: MapPin },
          { id: 'customers', label: `Users & Directory (${customers.length})`, icon: Users },
          { id: 'payments', label: `Payments (${payments.length})`, icon: CreditCard },
          { id: 'coupons', label: `Coupons (${coupons.length})`, icon: Tag },
          { id: 'reviews', label: `Reviews (${reviews.length})`, icon: Star },
          { id: 'notifications', label: `Logs (${notifications.length})`, icon: Bell },
          { id: 'settings', label: 'Settings', icon: SettingsIcon }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 pb-3 px-1 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-amber-800 text-amber-900 font-extrabold'
                  : 'border-transparent text-stone-500 hover:text-stone-900 hover:border-stone-300 font-semibold'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-800' : 'text-stone-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DASHBOARD & REAL ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Gross Sales Revenue</span>
              <div className="flex items-baseline justify-between">
                <span className="font-serif font-bold text-2xl text-stone-900">
                  KSh {(analytics?.totalSales || 0).toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Settled
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Paid via M-PESA & Bank Gateway
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Orders Processed</span>
              <div className="flex items-baseline justify-between">
                <span className="font-serif font-bold text-2xl text-stone-900">
                  {analytics?.totalOrders ?? orders.length}
                </span>
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                  {analytics?.deliveredOrders || 0} Delivered
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {analytics?.pendingOrders || 0} currently in delivery pipeline
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Net Profit Realized</span>
              <div className="flex items-baseline justify-between">
                <span className="font-serif font-bold text-2xl text-emerald-800">
                  KSh {(analytics?.totalProfit || 0).toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {analytics?.totalSales ? ((analytics.totalProfit / analytics.totalSales) * 100).toFixed(1) : '0.0'}% Margin
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Factory Cost: KSh {((analytics?.totalSales || 0) - (analytics?.totalProfit || 0)).toLocaleString()}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Average Order Value</span>
              <div className="flex items-baseline justify-between">
                <span className="font-serif font-bold text-2xl text-stone-900">
                  KSh {(analytics?.paidOrders ? Math.round((analytics.totalSales || 0) / analytics.paidOrders) : 0).toLocaleString()}
                </span>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  AOV
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Per customer mattress checkout
              </p>
            </div>
          </div>

          {/* Quick Actions & Empty Database Alert */}
          {products.length === 0 && (
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-base text-amber-950 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-700" />
                  Mattress Catalog is Currently Empty
                </h3>
                <p className="text-xs text-amber-800 max-w-xl">
                  You can manually add custom products from the "Products" tab, or click "Import Starter Catalog" to load the genuine Kenyan catalog (Bobmil, Dr. Mattress, Silentnight, Superfoam).
                </p>
              </div>
              <button
                onClick={handleImportStarterCatalog}
                className="bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold px-5 py-3 rounded-2xl transition-all shadow-md cursor-pointer whitespace-nowrap"
              >
                Import Starter Catalog
              </button>
            </div>
          )}

          {/* Orders Overview / Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-base text-stone-900">Recent Customer Orders</h3>
              {orders.length === 0 ? (
                <div className="p-8 text-center text-stone-400 space-y-2">
                  <ShoppingBag className="w-8 h-8 mx-auto text-stone-300" />
                  <p className="text-xs font-bold text-stone-600">No orders yet</p>
                  <p className="text-[11px] text-stone-400">New customer orders placed in the store will appear here in real-time.</p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {orders.slice(0, 5).map((ord) => (
                    <div key={ord.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-mono font-bold text-xs text-stone-900">{ord.orderNumber}</p>
                        <p className="text-xs text-stone-500">{ord.customerName} • {ord.county}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xs text-stone-900">KSh {ord.total.toLocaleString()}</p>
                        <span className="text-[10px] font-bold uppercase text-amber-800">{ord.orderStatus.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-base text-stone-900">Active Factory Sourcing Partners</h3>
              <div className="grid grid-cols-2 gap-3">
                {suppliers.map((s) => (
                  <div key={s.id} className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/70 space-y-1">
                    <h4 className="font-bold text-xs text-stone-900">{s.company}</h4>
                    <p className="text-[11px] text-stone-500">Lead Time: {s.leadTimeDays} day</p>
                    <p className="text-[11px] font-semibold text-emerald-700">📍 {s.location.split(',')[0]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS & SOURCING PIPELINE */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder="Search by Order #, Customer, Phone or County..."
                className="w-full bg-white border border-stone-300 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-stone-900"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {['all', 'pending_payment', 'payment_received', 'supplier_purchase', 'out_for_delivery', 'delivered'].map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderFilterStatus(st)}
                  className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                    orderFilterStatus === st
                      ? 'bg-amber-800 text-white'
                      : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
              <ShoppingBag className="w-12 h-12 mx-auto text-stone-300" />
              <h3 className="font-serif font-bold text-base text-stone-900">No orders yet</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Customer orders placed on the store will appear here immediately with live M-Pesa receipts.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700">
                  <thead className="bg-stone-50 text-[10px] font-bold uppercase text-stone-500 tracking-wider">
                    <tr>
                      <th className="p-4">Order Ref</th>
                      <th className="p-4">Customer & Location</th>
                      <th className="p-4">Mattress Items</th>
                      <th className="p-4">Total (KSh)</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4">Pipeline Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-stone-50/50">
                        <td className="p-4 font-mono font-bold text-stone-900">{ord.orderNumber}</td>
                        <td className="p-4">
                          <p className="font-bold text-stone-900">{ord.customerName}</p>
                          <p className="text-stone-500 text-[11px]">{ord.phone} • {ord.county}, {ord.town}</p>
                        </td>
                        <td className="p-4 max-w-xs">
                          {ord.items.map((it, idx) => (
                            <p key={idx} className="truncate text-stone-800">
                              {it.quantity}x {it.productName} ({it.sizeLabel})
                            </p>
                          ))}
                        </td>
                        <td className="p-4 font-bold text-amber-900">
                          KSh {ord.total.toLocaleString()}
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ord.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                          }`}>
                            {ord.paymentStatus.toUpperCase()}
                          </span>
                          {ord.paymentTransactionRef && (
                            <p className="font-mono text-[10px] text-stone-500 mt-0.5">{ord.paymentTransactionRef}</p>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-xl bg-stone-100 text-stone-800">
                            {ord.orderStatus.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {ord.paymentStatus !== 'paid' && (
                            <button
                              onClick={() => handleQuickApprovePayment(
                                ord.id,
                                ord.orderNumber,
                                ord.total,
                                ord.customerName,
                                ord.phone,
                                ord.paymentTransactionRef
                              )}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                              title="Approve and confirm payment for this order"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve Pay
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedOrder(ord);
                              setSourcingSupplierId(ord.supplierId || suppliers[0]?.id || '');
                              setSourcingCost(ord.supplierPurchaseCost || ord.totalSupplierCost || 0);
                              setSourcingRef(ord.supplierOrderRef || '');
                              setAssignDriverId(ord.driverId || '');
                            }}
                            className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                          >
                            Manage Order
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SELECTED ORDER MANAGEMENT MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setSelectedOrder(null)} className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 z-10 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {selectedOrder.orderNumber}
                </span>
                <h3 className="font-serif font-bold text-xl text-stone-900 mt-1">
                  Order Management & Sourcing Dispatch
                </h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-stone-400 hover:text-stone-700 p-2 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center gap-2 pb-2">
              <button
                onClick={() => handleSendSupplierWhatsApp(selectedOrder)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Send PO via WhatsApp
              </button>
              <button
                onClick={() => setIsInvoiceOpen(true)}
                className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold px-3.5 py-2 rounded-xl border border-stone-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-700" /> Print Tax Invoice
              </button>
            </div>

            {/* Payment Verification Banner */}
            {selectedOrder.paymentStatus !== 'paid' ? (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-amber-950">Payment Awaiting Verification</h4>
                    <p className="text-[11px] text-amber-800">
                      Total: KSh {selectedOrder.total.toLocaleString()} • Customer Phone: {selectedOrder.phone}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickApprovePayment(
                    selectedOrder.id,
                    selectedOrder.orderNumber,
                    selectedOrder.total,
                    selectedOrder.customerName,
                    selectedOrder.phone,
                    selectedOrder.paymentTransactionRef
                  )}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve Payment Now
                </button>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold">Payment Verified & Received</span>
                </div>
                {selectedOrder.paymentTransactionRef && (
                  <span className="font-mono font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                    Receipt: {selectedOrder.paymentTransactionRef}
                  </span>
                )}
              </div>
            )}

            {/* Order Overall Status Progression */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                1. Update Order Pipeline Status
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { status: 'payment_received', label: 'M-PESA Paid' },
                  { status: 'supplier_purchase', label: 'Factory Sourced' },
                  { status: 'out_for_delivery', label: 'Out on Van' },
                  { status: 'delivered', label: 'Delivered & Done' }
                ].map((st) => (
                  <button
                    key={st.status}
                    onClick={() => handleUpdateOrderStatus(selectedOrder.id, st.status)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedOrder.orderStatus === st.status
                        ? 'bg-amber-800 text-white shadow-sm ring-2 ring-amber-800/30'
                        : 'bg-white border border-stone-200 text-stone-700 hover:border-stone-400'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Factory Supplier Sourcing Form */}
            <form onSubmit={handleSaveSupplierSourcing} className="p-5 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-800" /> 2. Master Factory Purchase & Margin Tracking
                </h4>
                <span className="text-[11px] font-bold text-amber-800">
                  Customer Price: KSh {selectedOrder.total.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Factory Partner</label>
                  <select
                    value={sourcingSupplierId}
                    onChange={(e) => setSourcingSupplierId(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-semibold"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.company} ({s.location})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Factory Sourcing Cost (KSh)</label>
                  <input
                    type="number"
                    value={sourcingCost}
                    onChange={(e) => setSourcingCost(Number(e.target.value))}
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Factory PO Ref / Batch No</label>
                  <input
                    type="text"
                    value={sourcingRef}
                    onChange={(e) => setSourcingRef(e.target.value)}
                    placeholder="e.g. PO-DRM-2026-99"
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-emerald-800 font-bold">
                  Expected Net Profit: KSh {Math.max(0, selectedOrder.total - sourcingCost).toLocaleString()}
                </span>
                <button
                  type="submit"
                  className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  Save Sourcing Cost & PO
                </button>
              </div>
            </form>

            {/* Driver Assignment Form */}
            <form onSubmit={handleAssignDriver} className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-4">
              <h4 className="font-bold text-xs text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-700" /> 3. Logistics Fleet Driver Assignment
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Select Delivery Driver</label>
                  <select
                    value={assignDriverId}
                    onChange={(e) => setAssignDriverId(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-semibold"
                  >
                    <option value="">-- Choose Driver --</option>
                    {drivers.map((drv) => (
                      <option key={drv.id} value={drv.id}>{drv.name} ({drv.vehicleType} - {drv.vehiclePlate})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Estimated Drop-off Date / Window</label>
                  <input
                    type="text"
                    value={assignEstDate}
                    onChange={(e) => setAssignEstDate(e.target.value)}
                    placeholder="e.g. Today 2:00 PM – 5:00 PM"
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={!assignDriverId}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Dispatch to Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCTS & VARIANT MATRIX MANAGER */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                placeholder="Search products by name or brand..."
                className="w-full bg-white border border-stone-300 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-stone-900"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleImportStarterCatalog}
                className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-stone-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowDownToLine className="w-4 h-4 text-amber-800" /> Import Starter Catalog
              </button>
              <button
                onClick={() => {
                  setEditingProduct({
                    name: '',
                    brand: 'Dr. Mattress',
                    categoryId: categories[0]?.id || 'cat-orthopedic',
                    description: '',
                    shortDescription: '',
                    features: ['100% Genuine Direct Sourced', 'Medical Chiropractor Grade'],
                    materials: ['High Density Rebonded Foam', 'Quilted Jacquard Cover'],
                    warrantyYears: 0,
                    firmness: 'Extra Firm Orthopedic',
                    firmnessScore: 9,
                    images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80'],
                    basePrice: 28000,
                    variants: [
                      { id: 'v1', productId: '', sizeLabel: '3x6 (Single)', dimensions: '72x36 in', thicknessInches: 8, price: 19500, supplierPrice: 12000, sku: 'HM-3X6-8', stockStatus: 'in_stock' },
                      { id: 'v2', productId: '', sizeLabel: '4x6 (Double)', dimensions: '72x48 in', thicknessInches: 8, price: 24500, supplierPrice: 15500, sku: 'HM-4X6-8', stockStatus: 'in_stock' },
                      { id: 'v3', productId: '', sizeLabel: '5x6 (Queen)', dimensions: '72x60 in', thicknessInches: 8, price: 29500, supplierPrice: 19000, sku: 'HM-5X6-8', stockStatus: 'in_stock' },
                      { id: 'v4', productId: '', sizeLabel: '6x6 (King)', dimensions: '72x72 in', thicknessInches: 8, price: 36000, supplierPrice: 23500, sku: 'HM-6X6-8', stockStatus: 'in_stock' }
                    ]
                  });
                  setIsProductModalOpen(true);
                }}
                className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" /> Add New Mattress
              </button>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-4">
              <Package className="w-12 h-12 mx-auto text-stone-300" />
              <h3 className="font-serif font-bold text-lg text-stone-900">No products available yet</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Mattresses added to the store catalog will appear here and in the customer shop.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleImportStarterCatalog}
                  className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-5 py-2.5 rounded-full transition-colors cursor-pointer"
                >
                  Import Starter Mattress Catalog
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products
                .filter(p => !productSearchQuery || p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) || p.brand.toLowerCase().includes(productSearchQuery.toLowerCase()))
                .map((prod) => (
                  <div key={prod.id} className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100">
                        <img src={prod.images?.[0] || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80'} alt={prod.name} className="w-full h-full object-cover" />
                        <span className="absolute top-3 left-3 bg-stone-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {prod.brand}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-serif font-bold text-base text-stone-900">{prod.name}</h4>
                        <p className="text-xs text-stone-500">{prod.firmness || 'Orthopedic'} • High-Density Core</p>
                        <p className="text-sm font-bold text-amber-900 mt-1">
                          From KSh {(prod.basePrice || prod.variants?.[0]?.price || 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                        <span className="font-bold text-stone-700 block">Available Sizes:</span>
                        <div className="flex flex-wrap gap-1">
                          {prod.variants?.map((v) => (
                            <span key={v.id} className="bg-white px-2 py-0.5 rounded border border-stone-300 font-semibold text-[10px]">
                              {v.sizeLabel || v.size}: KSh {((v.price ?? v.sellingPrice) || 0).toLocaleString()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                      <button
                        onClick={() => {
                          setEditingProduct(prod);
                          setIsProductModalOpen(true);
                        }}
                        className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Specs
                      </button>
                      <button
                        onClick={async () => {
                          await api.toggleArchiveProduct(prod.id);
                          showToast('Product status toggled');
                          await loadAllData();
                        }}
                        className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 font-semibold text-xs rounded-xl cursor-pointer"
                      >
                        {prod.isArchived ? 'Unarchive' : 'Archive'}
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ type: 'product', id: prod.id, name: prod.name, subtitle: `${prod.brand} • ${prod.sku}` })}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl transition-colors cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CATEGORIES MANAGER */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-serif font-bold text-base text-stone-900">Mattress Categories</h3>
            <button
              onClick={() => {
                setEditingCategory({ name: '', slug: '', description: '', image: '', displayOrder: categories.length + 1 });
                setIsCategoryModalOpen(true);
              }}
              className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-stone-100">
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-base text-stone-900">{cat.name}</h4>
                    <p className="text-xs text-stone-500 font-mono">slug: {cat.slug}</p>
                    <p className="text-xs text-stone-600 mt-2 line-clamp-2">{cat.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                  <button
                    onClick={() => {
                      setEditingCategory(cat);
                      setIsCategoryModalOpen(true);
                    }}
                    className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ type: 'category', id: cat.id, name: cat.name, subtitle: `Slug: ${cat.slug}` })}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs rounded-xl cursor-pointer transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SUPPLIERS DIRECTORY */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-serif font-bold text-base text-stone-900">Authorized Factory Partners</h3>
            <button
              onClick={() => {
                setEditingSupplier({ company: '', name: '', phone: '+254', email: '', location: '', leadTimeDays: 1, active: true });
                setIsSupplierModalOpen(true);
              }}
              className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Add Master Supplier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suppliers.map((s) => (
              <div key={s.id} className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-base text-stone-900">{s.company}</h4>
                    <p className="text-xs text-stone-500">Contact Person: {s.name}</p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-800 font-bold text-[10px] px-2.5 py-1 rounded-full border border-emerald-200">
                    Lead Time: {s.leadTimeDays} day(s)
                  </span>
                </div>

                <div className="text-xs text-stone-600 space-y-1">
                  <p>📍 Location: {s.location}</p>
                  <p>📞 Phone: {s.phone}</p>
                  <p>✉️ Email: {s.email}</p>
                  {s.notes && <p className="text-stone-500 italic text-[11px]">Notes: {s.notes}</p>}
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingSupplier(s);
                        setIsSupplierModalOpen(true);
                      }}
                      className="text-xs text-stone-600 hover:text-stone-900 font-bold px-2.5 py-1 bg-stone-100 rounded-lg cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ type: 'supplier', id: s.id, name: s.company || s.name, subtitle: `Lead time: ${s.leadTimeDays}d • ${s.phone}` })}
                      className="text-xs text-red-600 hover:text-red-800 font-bold px-2.5 py-1 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                  <a
                    href={`https://wa.me/${s.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3 h-3" /> WhatsApp Contact
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: LOGISTICS & DRIVERS */}
      {activeTab === 'drivers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-serif font-bold text-base text-stone-900">Delivery Drivers & Logistics Fleet</h3>
            <button
              onClick={() => {
                setEditingDriver({ name: '', phone: '+254', vehicleType: 'Pickup Truck', vehiclePlate: '', active: true });
                setIsDriverModalOpen(true);
              }}
              className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Add Delivery Driver
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map((d) => (
              <div key={d.id} className="p-5 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-base text-stone-900">{d.name}</h4>
                    <p className="text-xs text-stone-500">{d.phone}</p>
                  </div>
                  <span className="bg-blue-50 text-blue-800 font-bold text-[10px] px-2 py-0.5 rounded-full">
                    {d.vehiclePlate}
                  </span>
                </div>

                <div className="text-xs text-stone-600 space-y-1">
                  <p>🚚 Vehicle: {d.vehicleType}</p>
                  <p>📦 Active Deliveries: {d.activeDeliveriesCount || 0}</p>
                </div>

                <div className="pt-2 border-t border-stone-100 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingDriver(d);
                      setIsDriverModalOpen(true);
                    }}
                    className="text-xs text-stone-700 hover:text-stone-900 font-bold px-3 py-1 bg-stone-100 rounded-lg cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ type: 'driver', id: d.id, name: d.name, subtitle: `Plate: ${d.vehiclePlate} (${d.vehicleType})` })}
                    className="text-xs text-red-600 hover:text-red-800 font-bold px-3 py-1 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: DELIVERY ZONES */}
      {activeTab === 'zones' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-serif font-bold text-base text-stone-900">Kenya County Delivery Zones & Rates</h3>
            <button
              onClick={() => {
                setEditingZone({ county: '', towns: [], baseFee: 1500, estimatedDays: '1 - 2 Business Days', freeDeliveryThreshold: 45000, active: true });
                setIsZoneModalOpen(true);
              }}
              className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Add Delivery Zone
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-[10px] font-bold uppercase text-stone-500 tracking-wider">
                <tr>
                  <th className="p-4">County / Zone</th>
                  <th className="p-4">Covered Towns</th>
                  <th className="p-4">Transit Estimate</th>
                  <th className="p-4">Delivery Fee (KSh)</th>
                  <th className="p-4">Free Shipping Above</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {deliveryZones.map((z) => (
                  <tr key={z.id} className="hover:bg-stone-50/50">
                    <td className="p-4 font-bold text-stone-900">{z.county}</td>
                    <td className="p-4 text-stone-600 max-w-xs truncate">{z.towns.join(', ')}</td>
                    <td className="p-4">{z.estimatedDays}</td>
                    <td className="p-4 font-bold text-amber-900">
                      {z.baseFee === 0 ? 'FREE' : `KSh ${z.baseFee.toLocaleString()}`}
                    </td>
                    <td className="p-4 text-stone-600">
                      {z.freeDeliveryThreshold ? `KSh ${z.freeDeliveryThreshold.toLocaleString()}` : 'Default (KSh 35,000)'}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingZone(z);
                          setIsZoneModalOpen(true);
                        }}
                        className="text-stone-700 font-bold hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ type: 'zone', id: z.id, name: z.county, subtitle: `Transit: ${z.estimatedDays} • Fee: KSh ${z.baseFee.toLocaleString()}` })}
                        className="text-red-600 font-bold hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: USERS & DIRECTORY MANAGEMENT */}
      {activeTab === 'customers' && (() => {
        const totalUsers = customers.length;
        const totalCustomers = customers.filter(c => c.role === 'customer').length;
        const totalDrivers = customers.filter(c => c.role === 'driver').length;
        const totalStaff = customers.filter(c => c.role === 'staff').length;
        const totalAdmins = customers.filter(c => c.role === 'admin').length;

        const filteredUsers = customers.filter(c => {
          if (userFilterRole !== 'all' && c.role !== userFilterRole) return false;
          if (userSearchQuery.trim()) {
            const q = userSearchQuery.toLowerCase().trim();
            const nameMatch = c.name?.toLowerCase().includes(q);
            const emailMatch = c.email?.toLowerCase().includes(q);
            const phoneMatch = c.phone?.toLowerCase().includes(q);
            const addrMatch = c.addresses?.some(a => a.county?.toLowerCase().includes(q) || a.deliveryArea?.toLowerCase().includes(q));
            if (!nameMatch && !emailMatch && !phoneMatch && !addrMatch) return false;
          }
          return true;
        });

        return (
          <div className="space-y-6">
            {/* Header with Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                  <span>Users & Team Directory</span>
                  <span className="bg-stone-100 text-stone-700 text-xs px-2.5 py-0.5 rounded-full font-sans font-bold">
                    {totalUsers} Accounts
                  </span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Full directory of retail customers, fleet delivery drivers, store staff, and system administrators.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleInspectSupabaseTable('users')}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-stone-200"
                  title="Inspect live Supabase Users/Profiles table"
                >
                  <Database className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Supabase Users Table</span>
                </button>

                <button
                  onClick={() => setIsCreateUserModalOpen(true)}
                  className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create User Account</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3">
                <div className="p-2.5 bg-stone-100 text-stone-800 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-stone-400">Total Users</p>
                  <p className="text-xl font-bold font-serif text-stone-900">{totalUsers}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-800 rounded-xl">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-stone-400">Retail Buyers</p>
                  <p className="text-xl font-bold font-serif text-amber-950">{totalCustomers}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-stone-400">Fleet Drivers</p>
                  <p className="text-xl font-bold font-serif text-emerald-950">{totalDrivers}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-800 rounded-xl">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-stone-400">Staff & Admin</p>
                  <p className="text-xl font-bold font-serif text-blue-950">{totalStaff + totalAdmins}</p>
                </div>
              </div>
            </div>

            {/* Filter Pills & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: `All (${totalUsers})` },
                  { id: 'customer', label: `Customers (${totalCustomers})` },
                  { id: 'driver', label: `Drivers (${totalDrivers})` },
                  { id: 'staff', label: `Staff (${totalStaff})` },
                  { id: 'admin', label: `Admins (${totalAdmins})` },
                ].map(pill => (
                  <button
                    key={pill.id}
                    onClick={() => setUserFilterRole(pill.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      userFilterRole === pill.id
                        ? 'bg-amber-900 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search name, email, phone, county..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Main Users Table */}
            {filteredUsers.length === 0 ? (
              <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
                <Users className="w-10 h-10 mx-auto text-stone-300" />
                <h4 className="font-serif font-bold text-stone-800">No users found</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  {userSearchQuery ? `No user matches query "${userSearchQuery}".` : 'No users registered under this role filter yet.'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-stone-700">
                    <thead className="bg-stone-50 text-[10px] font-bold uppercase text-stone-500 tracking-wider">
                      <tr>
                        <th className="p-4">User / Name</th>
                        <th className="p-4">Contact Details</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Orders & Lifetime Spend</th>
                        <th className="p-4">Default Address</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredUsers.map((c) => {
                        const initials = (c.name || c.email || 'U')
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase();

                        const defaultAddress = c.addresses?.find(a => a.isDefault) || c.addresses?.[0];

                        return (
                          <tr key={c.id} className="hover:bg-stone-50/60 transition-colors">
                            {/* User Avatar & Name */}
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                  c.role === 'admin'
                                    ? 'bg-red-100 text-red-900 border border-red-200'
                                    : c.role === 'staff'
                                    ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                    : c.role === 'driver'
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                    : 'bg-amber-100 text-amber-900 border border-amber-200'
                                }`}>
                                  {initials}
                                </div>
                                <div>
                                  <p className="font-bold text-stone-900 hover:text-amber-900 cursor-pointer" onClick={() => handleViewCustomerDetails(c.id)}>
                                    {c.name}
                                  </p>
                                  <p className="text-[10px] text-stone-400 font-mono">
                                    ID: {c.id}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Contact Details with Quick Links */}
                            <td className="p-4 space-y-1">
                              <div className="flex items-center gap-1.5 font-mono text-stone-800">
                                <Mail className="w-3 h-3 text-stone-400 shrink-0" />
                                <a href={`mailto:${c.email}`} className="hover:underline hover:text-amber-900">{c.email}</a>
                              </div>
                              {c.phone && (
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center gap-1 text-[11px] text-stone-600 font-mono">
                                    <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                                    {c.phone}
                                  </span>
                                  <a
                                    href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-200 transition"
                                    title="Open WhatsApp chat"
                                  >
                                    WhatsApp
                                  </a>
                                </div>
                              )}
                            </td>

                            {/* Current Role with Instant Dropdown */}
                            <td className="p-4">
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={c.role}
                                  onChange={(e) => handleUpdateUserRole(c.id, e.target.value as any)}
                                  className={`border rounded-xl px-2.5 py-1 text-xs font-bold cursor-pointer uppercase text-[10px] ${
                                    c.role === 'admin'
                                      ? 'bg-red-50 text-red-900 border-red-300'
                                      : c.role === 'staff'
                                      ? 'bg-blue-50 text-blue-900 border-blue-300'
                                      : c.role === 'driver'
                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                      : 'bg-stone-50 text-stone-800 border-stone-300'
                                  }`}
                                  title="Change User Access Role"
                                >
                                  <option value="customer">Customer</option>
                                  <option value="driver">Driver</option>
                                  <option value="staff">Staff</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </div>
                            </td>

                            {/* Orders & Total Spent */}
                            <td className="p-4">
                              <p className="font-bold text-stone-900">
                                {c.totalOrders || 0} {c.totalOrders === 1 ? 'order' : 'orders'}
                              </p>
                              <p className="font-serif font-bold text-amber-900 text-[11px]">
                                KSh {(c.totalSpent || 0).toLocaleString()} spent
                              </p>
                            </td>

                            {/* Default Address */}
                            <td className="p-4 text-stone-600 max-w-xs">
                              {defaultAddress ? (
                                <div>
                                  <p className="font-semibold text-stone-800">{defaultAddress.county || 'Kenya'}</p>
                                  <p className="text-[11px] text-stone-500 truncate">{defaultAddress.deliveryArea || defaultAddress.townCity || 'Primary address'}</p>
                                </div>
                              ) : (
                                <span className="text-stone-400 italic">No saved address</span>
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleViewCustomerDetails(c.id)}
                                  className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-bold text-[11px] px-2.5"
                                  title="View complete user profile and orders history"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Details</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingUser(c);
                                    setIsEditUserModalOpen(true);
                                  }}
                                  className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors cursor-pointer"
                                  title="Edit user profile details"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {c.id !== user?.id ? (
                                  <button
                                    onClick={() => setDeleteTarget({ type: 'customer', id: c.id, name: c.name, subtitle: `${c.email} (${c.role})` })}
                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors cursor-pointer"
                                    title="Delete User Account"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-stone-400 font-semibold px-1">(You)</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB 9: PAYMENTS / MPESA LOGS */}
      {activeTab === 'payments' && (() => {
        const totalPaymentsCount = payments.length;
        const paidCount = payments.filter(p => p.status === 'paid').length;
        const pendingCount = payments.filter(p => p.status !== 'paid' && p.status !== 'failed').length;
        const totalCollected = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);

        const filteredPayments = payments.filter(p => {
          if (paymentFilterStatus === 'paid' && p.status !== 'paid') return false;
          if (paymentFilterStatus === 'pending' && (p.status === 'paid' || p.status === 'failed')) return false;
          if (paymentFilterStatus === 'failed' && p.status !== 'failed') return false;
          if (paymentSearchQuery.trim()) {
            const q = paymentSearchQuery.toLowerCase().trim();
            const orderMatch = (p.orderNumber || p.orderId || '').toLowerCase().includes(q);
            const phoneMatch = (p.phone || '').includes(q);
            const receiptMatch = (p.mpesaReceiptNumber || '').toLowerCase().includes(q);
            const nameMatch = (p.customerName || '').toLowerCase().includes(q);
            if (!orderMatch && !phoneMatch && !receiptMatch && !nameMatch) return false;
          }
          return true;
        });

        return (
          <div className="space-y-6">
            {/* Header & Metrics */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">M-PESA & Gateway Payment Transactions</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Real-time transaction log with automated & manual payment verification and approval controls.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  Total Collected: KSh {totalCollected.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-2xl w-full sm:w-auto overflow-x-auto">
                {[
                  { id: 'all', label: `All (${totalPaymentsCount})` },
                  { id: 'pending', label: `Pending Approval (${pendingCount})` },
                  { id: 'paid', label: `Approved & Paid (${paidCount})` },
                  { id: 'failed', label: 'Failed / Rejected' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setPaymentFilterStatus(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      paymentFilterStatus === tab.id
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={paymentSearchQuery}
                  onChange={(e) => setPaymentSearchQuery(e.target.value)}
                  placeholder="Search order #, phone, receipt..."
                  className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-amber-700"
                />
              </div>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
                <CreditCard className="w-12 h-12 mx-auto text-stone-300" />
                <h3 className="font-serif font-bold text-base text-stone-900">No payment records found</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Customer M-Pesa STK transactions will appear here for verification and approval.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-stone-700">
                    <thead className="bg-stone-50 text-[10px] font-bold uppercase text-stone-500 tracking-wider">
                      <tr>
                        <th className="p-4">Time & Date</th>
                        <th className="p-4">Order Ref</th>
                        <th className="p-4">Customer & Phone</th>
                        <th className="p-4">M-PESA Receipt</th>
                        <th className="p-4">Amount (KSh)</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Approval Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredPayments.map((p) => {
                        const isPaid = p.status === 'paid';
                        const isFailed = p.status === 'failed';
                        return (
                          <tr key={p.id} className="hover:bg-stone-50/50">
                            <td className="p-4 text-[11px] text-stone-500">
                              {new Date(p.createdAt).toLocaleDateString()}
                              <span className="block text-[10px] text-stone-400">{new Date(p.createdAt).toLocaleTimeString()}</span>
                            </td>
                            <td className="p-4">
                              <span className="font-mono font-bold text-stone-900">{p.orderNumber || p.orderId}</span>
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-stone-900">{p.customerName || 'Customer'}</p>
                              <p className="font-mono text-[11px] text-stone-600">{p.phone || 'N/A'}</p>
                            </td>
                            <td className="p-4">
                              {isPaid ? (
                                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  {p.mpesaReceiptNumber || 'VERIFIED'}
                                </span>
                              ) : (
                                <span className="font-mono text-stone-400 italic">
                                  {p.mpesaReceiptNumber || 'Awaiting confirmation'}
                                </span>
                              )}
                            </td>
                            <td className="p-4 font-serif font-bold text-stone-900 text-sm">
                              KSh {(p.amount || 0).toLocaleString()}
                            </td>
                            <td className="p-4">
                              <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : isFailed
                                  ? 'bg-red-50 text-red-800 border border-red-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                                {isPaid ? '✓ Paid' : isFailed ? 'Failed' : 'Pending'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!isPaid ? (
                                  <>
                                    <button
                                      onClick={() => handleQuickApprovePayment(
                                        p.id,
                                        p.orderNumber || p.orderId,
                                        p.amount,
                                        p.customerName,
                                        p.phone,
                                        p.mpesaReceiptNumber
                                      )}
                                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                                      title="Confirm receipt and mark payment as Paid"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve Payment
                                    </button>
                                    <button
                                      onClick={() => handleRejectPayment(p.id)}
                                      className="text-stone-500 hover:text-red-700 font-semibold text-xs px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                                      title="Mark transaction as failed"
                                    >
                                      Reject
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-1 text-emerald-700 font-bold text-xs">
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    <span>Approved</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB 10: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-serif font-bold text-base text-stone-900">Active Discount Coupons</h3>
            <button
              onClick={() => {
                setEditingCoupon({ code: '', discountType: 'percentage', discountValue: 10, minOrderAmount: 20000, active: true, description: '' });
                setIsCouponModalOpen(true);
              }}
              className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Add Coupon
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {coupons.map((c) => (
              <div key={c.id} className="p-5 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-sm text-amber-900 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                    {c.code}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `KSh ${(c.discountValue || 0).toLocaleString()} OFF`}
                  </span>
                </div>
                <p className="text-xs text-stone-600">{c.description}</p>
                <p className="text-[11px] text-stone-400">Min Spend: KSh {(c.minOrderAmount || 0).toLocaleString()}</p>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setDeleteTarget({ type: 'coupon', id: c.id, name: c.code, subtitle: c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `KSh ${(c.discountValue || 0).toLocaleString()} OFF` })}
                    className="text-xs text-red-600 hover:text-red-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete Coupon
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 11: REVIEWS MODERATION */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <h3 className="font-serif font-bold text-base text-stone-900">Customer Product Reviews Moderation</h3>
          {reviews.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
              <Star className="w-12 h-12 mx-auto text-stone-300" />
              <h3 className="font-serif font-bold text-base text-stone-900">No customer reviews yet</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Verified customer reviews submitted after receiving mattresses will be reviewed and moderated here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="p-5 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-xs text-stone-900">{r.customerName}</span>
                      <span className="text-[11px] text-stone-500 ml-2">on {r.productName}</span>
                    </div>
                    <div className="flex items-center text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-current' : 'text-stone-200'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-stone-700">{r.comment}</p>
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={() => handleUpdateReviewStatus(r.id, 'approved')}
                      className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-lg cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ type: 'review', id: r.id, name: r.title || 'Product Review', subtitle: `By ${r.userName || r.customerName} on ${r.productName}` })}
                      className="text-xs text-red-700 font-bold bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 12: NOTIFICATIONS / SMS AUDIT */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <h3 className="font-serif font-bold text-base text-stone-900">Automated SMS & WhatsApp Notification Logs</h3>
          {notifications.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
              <Bell className="w-12 h-12 mx-auto text-stone-300" />
              <h3 className="font-serif font-bold text-base text-stone-900">No notification logs</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Customer dispatch SMS and WhatsApp confirmations will be logged here.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 text-[10px] font-bold uppercase text-stone-500 tracking-wider">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Channel</th>
                    <th className="p-3">Message Snippet</th>
                    <th className="p-3 text-right">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {notifications.map((n) => (
                    <tr key={n.id}>
                      <td className="p-3 text-[11px] text-stone-400">{new Date(n.createdAt).toLocaleTimeString()}</td>
                      <td className="p-3 font-mono font-bold text-stone-800">{n.recipient}</td>
                      <td className="p-3 uppercase font-bold text-[10px]">{n.channel}</td>
                      <td className="p-3 text-stone-600 max-w-sm truncate">{n.message}</td>
                      <td className="p-3 text-right text-emerald-700 font-bold uppercase text-[10px]">
                        ✓ {n.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 13: SETTINGS */}
      {activeTab === 'settings' && settings && (
        <div className="space-y-6 max-w-4xl">
          {/* Supabase Cloud Database Integration Panel */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-base text-stone-900">Supabase Cloud Database</h3>
                    {supabaseStatus?.connected ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3" /> Live & Connected
                      </span>
                    ) : supabaseStatus?.isConfigured ? (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-300">
                        <AlertCircle className="w-3 h-3" /> Credentials Set (Checking...)
                      </span>
                    ) : (
                      <span className="bg-stone-100 text-stone-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-stone-200">
                        Ready for Connection
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Connect PostgreSQL persistence for products, orders, delivery zones, customer accounts, and M-Pesa records.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenSqlSchema}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-stone-200"
                >
                  <Code2 className="w-3.5 h-3.5 text-stone-600" />
                  View SQL Schema
                </button>
                <button
                  type="button"
                  onClick={handleTestSupabaseConnection}
                  disabled={isTestingSupabase}
                  className="bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                  {isTestingSupabase ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </div>

            {/* Supabase Status Summary Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Project Endpoint</span>
                <p className="font-mono font-semibold text-stone-800 truncate" title={supabaseStatus?.url || 'None'}>
                  {supabaseStatus?.url && supabaseStatus.url !== 'Not set' ? supabaseStatus.url : 'Not configured yet'}
                </p>
              </div>
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Auth Key Mode</span>
                <p className="font-semibold text-stone-800 capitalize">
                  {supabaseStatus?.configuredKeyType ? `${supabaseStatus.configuredKeyType.replace('_', ' ')} key` : 'None'}
                </p>
              </div>
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Tables Detected</span>
                <p className="font-semibold text-emerald-800">
                  {supabaseStatus?.tablesDetected?.length ? `${supabaseStatus.tablesDetected.length} active tables` : '0 tables detected'}
                </p>
              </div>
            </div>

            {/* Status Message / Info Box */}
            <div className={`p-4 rounded-2xl text-xs flex items-start gap-3 border ${
              supabaseStatus?.connected 
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-stone-50 border-stone-200 text-stone-700'
            }`}>
              <Database className="w-5 h-5 shrink-0 mt-0.5 text-stone-500" />
              <div className="space-y-1">
                <p className="font-bold">
                  {supabaseStatus?.message || 'Supabase integration ready. Set your environment variables to connect.'}
                </p>
                <p className="text-[11px] text-stone-500">
                  Environment variables required: <code className="bg-stone-200 px-1 py-0.5 rounded text-stone-800 font-mono">SUPABASE_URL</code> and <code className="bg-stone-200 px-1 py-0.5 rounded text-stone-800 font-mono">SUPABASE_ANON_KEY</code> (or <code className="bg-stone-200 px-1 py-0.5 rounded text-stone-800 font-mono">SUPABASE_SERVICE_ROLE_KEY</code>).
                </p>
              </div>
            </div>

            {/* Quick Actions & Sync */}
            <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100">
              <div className="space-y-1">
                <p className="text-xs font-bold text-stone-900">
                  Two-Way Supabase Cloud Synchronization:
                </p>
                <p className="text-[11px] text-stone-500">
                  Push your local catalog, users, orders and payments to Supabase, or pull remote cloud updates down.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleInspectSupabaseTable('users')}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-stone-200"
                >
                  <Table className="w-3.5 h-3.5 text-stone-600" />
                  <span>Live Tables Explorer</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullFromSupabase}
                  disabled={isPullingSupabase}
                  className="bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  title="Pull cloud records from Supabase into application database"
                >
                  <DownloadCloud className={`w-3.5 h-3.5 ${isPullingSupabase ? 'animate-spin' : ''}`} />
                  <span>{isPullingSupabase ? 'Pulling Data...' : 'Pull from Supabase'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncToSupabase}
                  disabled={isSyncingSupabase}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  title="Push local mattress catalog, users, orders, and payments to Supabase"
                >
                  <UploadCloud className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
                  <span>{isSyncingSupabase ? 'Syncing to Supabase...' : 'Sync All to Supabase'}</span>
                </button>
              </div>
            </div>

            {/* Step-by-step Setup Guide */}
            {!supabaseStatus?.connected && (
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl text-xs space-y-3">
                <h4 className="font-serif font-bold text-amber-950 text-sm">How to connect your Supabase project in 3 steps:</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-amber-900 text-xs">
                  <li>
                    Create a free Supabase project at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="font-bold underline">supabase.com</a>.
                  </li>
                  <li>
                    Open your project's <strong>SQL Editor</strong>, click <strong>"View SQL Schema"</strong> above, copy the schema, and click <strong>Run</strong>.
                  </li>
                  <li>
                    Copy your project URL & API key from <strong>Project Settings → API</strong> into your environment variables (<code className="font-mono bg-amber-100 px-1 rounded">SUPABASE_URL</code> & <code className="font-mono bg-amber-100 px-1 rounded">SUPABASE_ANON_KEY</code>).
                  </li>
                </ol>
              </div>
            )}
          </div>

          {/* Store & M-Pesa Settings Form */}
          <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
            <h3 className="font-serif font-bold text-base text-stone-900">Store & M-Pesa Integration Settings</h3>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={settings.businessName}
                  onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 font-semibold"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Support Phone</label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">WhatsApp Consultant Line</label>
                  <input
                    type="text"
                    value={settings.whatsapp}
                    onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Safaricom M-Pesa Shortcode</label>
                <input
                  type="text"
                  value={settings.mpesa.shortcode}
                  onChange={(e) => setSettings({ ...settings, mpesa: { ...settings.mpesa, shortcode: e.target.value } })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 font-mono text-stone-900"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Free Delivery Spend Threshold (KSh)</label>
                <input
                  type="number"
                  value={settings.freeDeliveryDefaultThreshold}
                  onChange={(e) => setSettings({ ...settings, freeDeliveryDefaultThreshold: Number(e.target.value) })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 font-bold text-stone-900"
                />
              </div>
              <div className="pt-3">
                <button
                  type="submit"
                  className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-6 py-3 rounded-xl transition-colors shadow-md cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </form>
        </div>
      )}


      {/* EDIT / CREATE PRODUCT MODAL */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setIsProductModalOpen(false)} className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 z-10 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-serif font-bold text-xl text-stone-900">
                {editingProduct.id ? 'Edit Product Details' : 'Add New Marketplace Product'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-stone-400 hover:text-stone-700 p-2 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Product Title *</label>
                  <input
                    type="text"
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    required
                    placeholder="e.g. Nike Air Max, 5x6 Orthopedic Mattress, Cordless Drill..."
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Department *</label>
                  <select
                    value={editingProduct.department || 'home-bedding'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, department: e.target.value as any })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-semibold text-stone-900"
                  >
                    <option value="home-bedding">🛏️ Mattresses & Bedding</option>
                    <option value="clothing">👕 Clothing & Apparel</option>
                    <option value="shoes">👟 Shoes & Footwear</option>
                    <option value="accessories">🕶️ Watches & Accessories</option>
                    <option value="electronics">📱 Electronics & Phones</option>
                    <option value="beauty">✨ Beauty & Personal Care</option>
                    <option value="home-kitchen">🍳 Home & Kitchen</option>
                    <option value="hardware">🔧 Plumbing & Hardware</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Brand / Manufacturer *</label>
                  <input
                    type="text"
                    value={editingProduct.brand || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    required
                    placeholder="e.g. Haveens Company, Dr. Mattress, Nike, Samsung..."
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Category</label>
                  <select
                    value={editingProduct.categoryId || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-semibold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Base Starting Price (KSh) *</label>
                  <input
                    type="number"
                    value={editingProduct.basePrice || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, basePrice: Number(e.target.value) })}
                    required
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Warranty (Years)</label>
                  <input
                    type="number"
                    value={editingProduct.warrantyYears || 1}
                    onChange={(e) => setEditingProduct({ ...editingProduct, warrantyYears: Number(e.target.value) })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              {/* Dynamic Department-Specific Specifications */}
              {(editingProduct.department === 'home-bedding' || !editingProduct.department) && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Firmness Level</label>
                    <select
                      value={editingProduct.firmness || 'Medium Firm'}
                      onChange={(e) => setEditingProduct({ ...editingProduct, firmness: e.target.value })}
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2"
                    >
                      <option value="Plush Soft">Plush Soft</option>
                      <option value="Medium">Medium</option>
                      <option value="Medium Firm">Medium Firm</option>
                      <option value="Extra Firm (Medical)">Extra Firm (Medical)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Foam Type</label>
                    <input
                      type="text"
                      value={editingProduct.foamType || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, foamType: e.target.value })}
                      placeholder="e.g. High Density Bonded / Pocket Spring"
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="Describe the material, features, benefits, and durability..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Image URL</label>
                <input
                  type="text"
                  value={editingProduct.images?.[0] || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, images: [e.target.value] })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-800 hover:bg-amber-900 text-white font-bold px-6 py-2 rounded-xl transition-colors shadow cursor-pointer"
                >
                  Save Product Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / CREATE CATEGORY MODAL */}
      {isCategoryModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setIsCategoryModalOpen(false)} className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 z-10 space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">
              {editingCategory.id ? 'Edit Category' : 'Add New Category'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={editingCategory.name || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  required
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Slug (URL identifier)</label>
                <input
                  type="text"
                  value={editingCategory.slug || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Image URL</label>
                <input
                  type="text"
                  value={editingCategory.image || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, image: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-mono text-[11px]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-3 py-2 font-bold text-stone-600 cursor-pointer">Cancel</button>
                <button type="submit" className="bg-amber-800 text-white font-bold px-5 py-2 rounded-xl cursor-pointer">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / CREATE SUPPLIER MODAL */}
      {isSupplierModalOpen && editingSupplier && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setIsSupplierModalOpen(false)} className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 z-10 space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">
              {editingSupplier.id ? 'Edit Supplier' : 'Add Factory Supplier'}
            </h3>
            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={editingSupplier.company || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, company: e.target.value })}
                  required
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={editingSupplier.name || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    value={editingSupplier.phone || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    required
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    value={editingSupplier.leadTimeDays || 1}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, leadTimeDays: Number(e.target.value) })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Factory Location</label>
                <input
                  type="text"
                  value={editingSupplier.location || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, location: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="px-3 py-2 font-bold text-stone-600 cursor-pointer">Cancel</button>
                <button type="submit" className="bg-amber-800 text-white font-bold px-5 py-2 rounded-xl cursor-pointer">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / CREATE DRIVER MODAL */}
      {isDriverModalOpen && editingDriver && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setIsDriverModalOpen(false)} className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 z-10 space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">
              {editingDriver.id ? 'Edit Driver' : 'Add Delivery Driver'}
            </h3>
            <form onSubmit={handleSaveDriver} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Driver Name *</label>
                <input
                  type="text"
                  value={editingDriver.name || ''}
                  onChange={(e) => setEditingDriver({ ...editingDriver, name: e.target.value })}
                  required
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  value={editingDriver.phone || ''}
                  onChange={(e) => setEditingDriver({ ...editingDriver, phone: e.target.value })}
                  required
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Vehicle Type</label>
                  <input
                    type="text"
                    value={editingDriver.vehicleType || ''}
                    onChange={(e) => setEditingDriver({ ...editingDriver, vehicleType: e.target.value })}
                    placeholder="Pickup / Van / Truck"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Number Plate</label>
                  <input
                    type="text"
                    value={editingDriver.vehiclePlate || ''}
                    onChange={(e) => setEditingDriver({ ...editingDriver, vehiclePlate: e.target.value })}
                    placeholder="e.g. KDG 482M"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsDriverModalOpen(false)} className="px-3 py-2 font-bold text-stone-600 cursor-pointer">Cancel</button>
                <button type="submit" className="bg-amber-800 text-white font-bold px-5 py-2 rounded-xl cursor-pointer">Save Driver</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / CREATE DELIVERY ZONE MODAL */}
      {isZoneModalOpen && editingZone && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setIsZoneModalOpen(false)} className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 z-10 space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">
              {editingZone.id ? 'Edit Delivery Zone' : 'Add Delivery Zone'}
            </h3>
            <form onSubmit={handleSaveZone} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">County / Region *</label>
                <input
                  type="text"
                  value={editingZone.county || ''}
                  onChange={(e) => setEditingZone({ ...editingZone, county: e.target.value })}
                  required
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Towns Covered (comma separated)</label>
                <input
                  type="text"
                  value={Array.isArray(editingZone.towns) ? editingZone.towns.join(', ') : ''}
                  onChange={(e) => setEditingZone({ ...editingZone, towns: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                  placeholder="e.g. Westlands, Kilimani, Karen"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Base Fee (KSh)</label>
                  <input
                    type="number"
                    value={editingZone.baseFee || 0}
                    onChange={(e) => setEditingZone({ ...editingZone, baseFee: Number(e.target.value) })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Transit Time</label>
                  <input
                    type="text"
                    value={editingZone.estimatedDays || ''}
                    onChange={(e) => setEditingZone({ ...editingZone, estimatedDays: e.target.value })}
                    placeholder="e.g. 24 hrs / 2 days"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsZoneModalOpen(false)} className="px-3 py-2 font-bold text-stone-600 cursor-pointer">Cancel</button>
                <button type="submit" className="bg-amber-800 text-white font-bold px-5 py-2 rounded-xl cursor-pointer">Save Zone</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / CREATE COUPON MODAL */}
      {isCouponModalOpen && editingCoupon && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setIsCouponModalOpen(false)} className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 z-10 space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">
              {editingCoupon.id ? 'Edit Coupon' : 'Create Coupon Code'}
            </h3>
            <form onSubmit={handleSaveCoupon} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  value={editingCoupon.code || ''}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                  required
                  placeholder="e.g. HAVEN10"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-mono font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Discount Type</label>
                  <select
                    value={editingCoupon.discountType || 'percentage'}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, discountType: e.target.value as any })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (KSh)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Discount Value *</label>
                  <input
                    type="number"
                    value={editingCoupon.discountValue || 0}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, discountValue: Number(e.target.value) })}
                    required
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Min Order Amount (KSh)</label>
                <input
                  type="number"
                  value={editingCoupon.minOrderAmount || 0}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, minOrderAmount: Number(e.target.value) })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsCouponModalOpen(false)} className="px-3 py-2 font-bold text-stone-600 cursor-pointer">Cancel</button>
                <button type="submit" className="bg-amber-800 text-white font-bold px-5 py-2 rounded-xl cursor-pointer">Save Coupon</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SQL SCHEMA & SUPABASE MIGRATION MODAL */}
      {showSqlSchemaModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setShowSqlSchemaModal(false)} className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 z-10 max-h-[85vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Supabase PostgreSQL Schema</h3>
                  <p className="text-xs text-stone-500">Run this SQL in your Supabase SQL Editor to set up all tables and security policies.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSqlSchemaModal(false)} 
                className="text-stone-400 hover:text-stone-700 p-2 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-stone-950 rounded-2xl p-4 overflow-y-auto flex-1 font-mono text-[11px] text-emerald-400 border border-stone-800 shadow-inner">
              <pre className="whitespace-pre-wrap">{supabaseSql || '-- Loading SQL schema...'}</pre>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-stone-200">
              <span className="text-xs text-stone-500">
                Includes Users, Products, Variants, Suppliers, Orders, Payments, and RLS policies.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySql}
                  className="bg-amber-900 hover:bg-amber-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Script'}
                </button>
                <button
                  onClick={() => setShowSqlSchemaModal(false)}
                  className="px-4 py-2.5 font-bold text-xs text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UNIFIED IN-APP DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => !isDeleting && setDeleteTarget(null)} className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-stone-200 z-10 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 text-red-700 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  Confirm Delete
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Are you sure you want to permanently remove <span className="font-bold text-stone-900">{deleteTarget.name}</span>?
                </p>
                {deleteTarget.subtitle && (
                  <p className="text-[11px] font-mono text-stone-500 bg-stone-50 p-2 rounded-xl border border-stone-200 mt-2">
                    {deleteTarget.subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-red-50 text-red-900 border border-red-200/80 rounded-2xl p-3 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>This operation cannot be undone. All linked metadata will be deleted.</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl font-bold text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Permanently Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      <InvoiceModal
        order={selectedOrder}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
      />

      {/* USER PROFILE & ORDERS DETAILS MODAL */}
      {selectedCustomerDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setSelectedCustomerDetails(null)} className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 z-10 max-h-[90vh] overflow-y-auto space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-stone-200">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center font-serif font-bold text-lg">
                  {(selectedCustomerDetails.user.name || selectedCustomerDetails.user.email || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-xl text-stone-900">
                      {selectedCustomerDetails.user.name}
                    </h3>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      selectedCustomerDetails.user.role === 'admin'
                        ? 'bg-red-100 text-red-900 border border-red-200'
                        : selectedCustomerDetails.user.role === 'staff'
                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                        : selectedCustomerDetails.user.role === 'driver'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : 'bg-stone-100 text-stone-700'
                    }`}>
                      {selectedCustomerDetails.user.role}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 mt-1">
                    <span className="font-mono">{selectedCustomerDetails.user.email}</span>
                    {selectedCustomerDetails.user.phone && (
                      <span className="font-mono">• {selectedCustomerDetails.user.phone}</span>
                    )}
                    <span>• Joined {new Date(selectedCustomerDetails.user.createdAt || Date.now()).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedCustomerDetails.user.phone && (
                  <a
                    href={`https://wa.me/${selectedCustomerDetails.user.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(selectedCustomerDetails.user.name)},%20greeting%20from%20The%20Mattress%20Haven!`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp User</span>
                  </a>
                )}
                <button 
                  onClick={() => setSelectedCustomerDetails(null)} 
                  className="text-stone-400 hover:text-stone-700 p-2 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-[10px] font-bold uppercase text-stone-400">Total Orders</span>
                <p className="text-xl font-bold font-serif text-stone-900 mt-1">
                  {selectedCustomerDetails.metrics.totalOrders}
                </p>
                <span className="text-[10px] text-stone-500">
                  {selectedCustomerDetails.metrics.paidOrders} completed & paid
                </span>
              </div>

              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200">
                <span className="text-[10px] font-bold uppercase text-amber-800">Lifetime Spend</span>
                <p className="text-xl font-bold font-serif text-amber-950 mt-1">
                  KSh {selectedCustomerDetails.metrics.totalSpent.toLocaleString()}
                </p>
                <span className="text-[10px] text-amber-700">Gross revenue</span>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-[10px] font-bold uppercase text-stone-400">Reviews Authored</span>
                <p className="text-xl font-bold font-serif text-stone-900 mt-1">
                  {selectedCustomerDetails.metrics.reviewsCount}
                </p>
                <span className="text-[10px] text-stone-500">Verified feedback</span>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-[10px] font-bold uppercase text-stone-400">Wishlist Items</span>
                <p className="text-xl font-bold font-serif text-stone-900 mt-1">
                  {selectedCustomerDetails.metrics.wishlistCount}
                </p>
                <span className="text-[10px] text-stone-500">Saved mattresses</span>
              </div>
            </div>

            {/* Saved Delivery Addresses */}
            {selectedCustomerDetails.user.addresses && selectedCustomerDetails.user.addresses.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-serif font-bold text-sm text-stone-900">Saved Delivery Locations</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {selectedCustomerDetails.user.addresses.map((addr, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-stone-800">
                          <span>{addr.county}</span>
                          {addr.isDefault && (
                            <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-sans font-bold uppercase">Default</span>
                          )}
                        </div>
                        <p className="text-stone-600 text-[11px] mt-0.5">{addr.deliveryArea || addr.townCity || addr.estateStreet}</p>
                        {addr.buildingHouse && <p className="text-stone-500 text-[10px]">{addr.buildingHouse}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Orders History Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-800" />
                  <span>Order Purchase History ({selectedCustomerDetails.orders.length})</span>
                </h4>
              </div>

              {selectedCustomerDetails.orders.length === 0 ? (
                <div className="p-6 text-center bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-500">
                  This user has not placed any orders yet.
                </div>
              ) : (
                <div className="border border-stone-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs text-stone-700">
                    <thead className="bg-stone-50 text-[10px] font-bold uppercase text-stone-500 tracking-wider">
                      <tr>
                        <th className="p-3.5">Order #</th>
                        <th className="p-3.5">Date</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Items Purchased</th>
                        <th className="p-3.5">Amount (KSh)</th>
                        <th className="p-3.5 text-right">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {selectedCustomerDetails.orders.map((ord: Order) => {
                        const status = ord.orderStatus || 'pending_payment';
                        const totalCost = ord.total || 0;
                        return (
                          <tr key={ord.id} className="hover:bg-stone-50/50">
                            <td className="p-3.5 font-mono font-bold text-stone-900">
                              {ord.orderNumber || `#${ord.id.slice(-6).toUpperCase()}`}
                            </td>
                            <td className="p-3.5 text-stone-500">
                              {new Date(ord.createdAt).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="p-3.5">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : status === 'out_for_delivery' || status === 'ready_for_delivery'
                                  ? 'bg-blue-100 text-blue-800'
                                  : status === 'order_confirmed' || status === 'processing'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-stone-100 text-stone-700'
                              }`}>
                                {status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-3.5 text-stone-700">
                              <p className="font-semibold text-stone-900">
                                {ord.items?.length || 0} {(ord.items?.length || 0) === 1 ? 'item' : 'items'}
                              </p>
                              <p className="text-[11px] text-stone-500 truncate max-w-xs">
                                {ord.items?.map((it: any) => `${it.productName || 'Mattress'} (${it.sizeLabel || 'Standard'}) x${it.quantity}`).join(', ')}
                              </p>
                            </td>
                            <td className="p-3.5 font-bold font-serif text-amber-950">
                              KSh {totalCost.toLocaleString()}
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => {
                                  setSelectedOrder(ord);
                                  setIsInvoiceOpen(true);
                                }}
                                className="text-amber-900 font-bold hover:underline cursor-pointer text-xs"
                              >
                                View Invoice
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-stone-200">
              <button
                onClick={() => setSelectedCustomerDetails(null)}
                className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW USER ACCOUNT MODAL */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setIsCreateUserModalOpen(false)} className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 z-10 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Create New User Account</h3>
                  <p className="text-xs text-stone-500">Register a customer, fleet driver, staff member, or administrator.</p>
                </div>
              </div>
              <button onClick={() => setIsCreateUserModalOpen(false)} className="text-stone-400 hover:text-stone-700 p-2 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Mwangi"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 font-semibold focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 font-mono focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+254 712 345 678"
                    value={newUserForm.phone}
                    onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 font-mono focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">System Role *</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 font-bold text-stone-900 cursor-pointer"
                  >
                    <option value="customer">Customer (Retail Shopper)</option>
                    <option value="driver">Driver (Delivery Logistics)</option>
                    <option value="staff">Staff (Order Fulfillment)</option>
                    <option value="admin">Admin (Full Control)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Password</label>
                  <input
                    type="text"
                    placeholder="Default: HavenKenya2025!"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 font-mono focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">County & Delivery Address</label>
                <input
                  type="text"
                  placeholder="e.g. Nairobi, Westlands, Rhapta Road"
                  value={newUserForm.address}
                  onChange={(e) => setNewUserForm({ ...newUserForm, address: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:bg-white transition"
                />
              </div>

              {newUserForm.role === 'driver' && (
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
                  <p className="font-bold text-emerald-900 text-xs">Driver Fleet Assignment Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Vehicle Type</label>
                      <input
                        type="text"
                        placeholder="e.g. Isuzu Van"
                        value={newUserForm.vehicleType}
                        onChange={(e) => setNewUserForm({ ...newUserForm, vehicleType: e.target.value })}
                        className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Vehicle Plate</label>
                      <input
                        type="text"
                        placeholder="e.g. KDM 890Y"
                        value={newUserForm.vehiclePlate}
                        onChange={(e) => setNewUserForm({ ...newUserForm, vehiclePlate: e.target.value })}
                        className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="px-4 py-2.5 font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isCreatingUser ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {isEditUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setIsEditUserModalOpen(false)} className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-stone-200 z-10 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-serif font-bold text-lg text-stone-900">Edit User Account</h3>
              <button onClick={() => setIsEditUserModalOpen(false)} className="text-stone-400 hover:text-stone-700 p-2 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Access Role</label>
                <select
                  value={editingUser.role || 'customer'}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 font-bold text-stone-900 cursor-pointer"
                >
                  <option value="customer">Customer</option>
                  <option value="driver">Driver</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="px-4 py-2.5 font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPABASE LIVE TABLES EXPLORER MODAL */}
      {isTableExplorerOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setIsTableExplorerOpen(false)} className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 z-10 max-h-[85vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Supabase Live Database Inspector</h3>
                  <p className="text-xs text-stone-500">Query and inspect records directly from your connected Supabase PostgreSQL tables.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsTableExplorerOpen(false)} 
                className="text-stone-400 hover:text-stone-700 p-2 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Table Selector & Fetch Trigger */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-stone-700">Select Table:</span>
                <select
                  value={selectedSupabaseTable}
                  onChange={(e) => handleInspectSupabaseTable(e.target.value)}
                  className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 font-bold font-mono text-stone-900 cursor-pointer"
                >
                  <option value="users">users / profiles</option>
                  <option value="products">products</option>
                  <option value="orders">orders</option>
                  <option value="delivery_zones">delivery_zones</option>
                  <option value="drivers">drivers</option>
                  <option value="suppliers">suppliers</option>
                  <option value="reviews">reviews</option>
                  <option value="payments">payments</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleInspectSupabaseTable(selectedSupabaseTable)}
                  disabled={isLoadingTableData}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTableData ? 'animate-spin' : ''}`} />
                  <span>Refresh Records</span>
                </button>
                <span className="text-xs font-semibold text-stone-600">
                  {supabaseTableData ? `${supabaseTableData.count} records found` : ''}
                </span>
              </div>
            </div>

            {/* Table Data View */}
            <div className="bg-stone-950 rounded-2xl p-4 overflow-y-auto flex-1 font-mono text-[11px] text-emerald-400 border border-stone-800 shadow-inner">
              {isLoadingTableData ? (
                <div className="flex items-center justify-center py-12 gap-2 text-stone-400">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Querying Supabase {selectedSupabaseTable} table...</span>
                </div>
              ) : supabaseTableData && supabaseTableData.rows.length > 0 ? (
                <pre className="whitespace-pre-wrap">{JSON.stringify(supabaseTableData.rows, null, 2)}</pre>
              ) : (
                <div className="py-12 text-center text-stone-400 space-y-2">
                  <p>No rows returned from table <code className="text-emerald-400 font-bold">{selectedSupabaseTable}</code> or table has not been initialized in Supabase yet.</p>
                  <p className="text-[10px] text-stone-500">Click "Sync All to Supabase" in Settings or run the SQL Schema in your Supabase SQL Editor.</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-stone-200">
              <span className="text-xs text-stone-500">
                Connected endpoint: <code className="font-mono text-stone-800 font-semibold">{supabaseStatus?.url || 'Supabase'}</code>
              </span>
              <button
                onClick={() => setIsTableExplorerOpen(false)}
                className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL / MPESA PAYMENT APPROVAL MODAL */}
      {paymentApproveModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => !isApprovingPayment && setPaymentApproveModal(null)} className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200 z-10 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Approve & Confirm Payment</h3>
                  <p className="text-xs text-stone-500">Verify customer M-Pesa transaction and issue receipt</p>
                </div>
              </div>
              <button
                onClick={() => !isApprovingPayment && setPaymentApproveModal(null)}
                className="text-stone-400 hover:text-stone-700 p-2 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary card */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500 font-semibold">Order Reference:</span>
                <span className="font-mono font-bold text-stone-900">{paymentApproveModal.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-semibold">Customer Name:</span>
                <span className="font-bold text-stone-900">{paymentApproveModal.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-semibold">Customer Phone:</span>
                <span className="font-mono font-bold text-stone-800">{paymentApproveModal.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-stone-200">
                <span className="text-stone-700 font-bold">Total Amount to Confirm:</span>
                <span className="font-serif font-bold text-base text-emerald-800">
                  KSh {paymentApproveModal.amount.toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmApprovePayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  M-PESA Receipt Number / Reference Code *
                </label>
                <input
                  type="text"
                  required
                  value={paymentApproveModal.receiptNumber}
                  onChange={(e) => setPaymentApproveModal({
                    ...paymentApproveModal,
                    receiptNumber: e.target.value.toUpperCase()
                  })}
                  placeholder="e.g. QJH7891234"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 font-mono font-bold uppercase focus:bg-white transition"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  Safaricom M-Pesa 10-character transaction reference code.
                </p>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Audit Notes (Optional)</label>
                <input
                  type="text"
                  value={paymentApproveModal.notes}
                  onChange={(e) => setPaymentApproveModal({
                    ...paymentApproveModal,
                    notes: e.target.value
                  })}
                  placeholder="e.g. Verified by Admin on phone call"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:bg-white transition"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-800">
                  Approving this payment will update order status to <span className="font-bold">Payment Received</span>, notify customer via automated SMS dispatch, and record in financial audit logs.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  disabled={isApprovingPayment}
                  onClick={() => setPaymentApproveModal(null)}
                  className="px-4 py-2.5 font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApprovingPayment}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isApprovingPayment ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Confirming & Approving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Approve Payment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
