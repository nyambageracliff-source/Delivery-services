import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, Package, Heart, MapPin, LogOut, 
  ExternalLink, Clock, CheckCircle2, Truck, Plus, Trash2,
  Phone, Mail, FileText, Star, Sparkles, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { api } from '../lib/api';
import { Order, Product, OrderStatus } from '../types';
import { InvoiceModal } from '../components/InvoiceModal';
import { ReviewModal } from '../components/ReviewModal';

interface AccountPageProps {
  onTrackOrder: (orderNumber: string) => void;
  onSelectProduct: (product: Product) => void;
  onOpenAuth?: () => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({
  onTrackOrder,
  onSelectProduct,
  onOpenAuth
}) => {
  const { user, logout, updateProfile, isAdmin, isStaff, isDriver } = useAuth();
  const { wishlist, toggleWishlist } = useWishlist();
  const { addItem } = useCart();

  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'addresses' | 'profile'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Selected Order for Invoice
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Review modal state
  const [reviewProduct, setReviewProduct] = useState<any>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Address Add Form State
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newCounty, setNewCounty] = useState('Nairobi');
  const [newTown, setNewTown] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newLandmark, setNewLandmark] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await api.getMyOrders();
      setOrders(res);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg('');
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      setProfileSuccessMsg('Profile updated successfully!');
      setTimeout(() => setProfileSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTown.trim() || !newArea.trim()) return;

    const currentAddresses = user?.addresses || [];
    const newAddr = {
      id: 'addr_' + Date.now(),
      name: `${user?.name}'s Delivery Location`,
      phone: user?.phone || '',
      county: newCounty,
      town: newTown.trim(),
      area: newArea.trim(),
      deliveryAddress: `${newArea.trim()}, ${newTown.trim()}`,
      landmark: newLandmark.trim() || undefined,
      isDefault: currentAddresses.length === 0
    };

    try {
      await updateProfile({ addresses: [...currentAddresses, newAddr] });
      setIsAddingAddress(false);
      setNewTown('');
      setNewArea('');
      setNewLandmark('');
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center mx-auto">
          <UserIcon className="w-8 h-8" />
        </div>
        <h2 className="font-serif font-bold text-2xl text-stone-900">Sign in to your account</h2>
        <p className="text-xs text-stone-500 max-w-sm mx-auto">
          Sign in to view your past mattress orders, live delivery tracking, saved wishlist, and addresses.
        </p>
        <div className="pt-2">
          <button
            onClick={() => onOpenAuth && onOpenAuth()}
            className="bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold px-6 py-3 rounded-full transition-colors cursor-pointer"
          >
            Sign In / Register Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Account Hero Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-stone-900 text-white flex items-center justify-center font-serif font-bold text-2xl shadow-md">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-bold text-xl sm:text-2xl text-stone-900">{user.name}</h1>
              <span className="bg-amber-100 text-amber-900 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                {user.role}
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Verified
              </span>
            </div>
            <p className="text-xs text-stone-500 flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {user.email}</span>
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {user.phone}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={logout}
            className="flex-1 sm:flex-none bg-stone-100 hover:bg-red-50 hover:text-red-700 text-stone-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-stone-300 transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-stone-200 gap-2 sm:gap-6 overflow-x-auto text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'orders'
              ? 'border-amber-800 text-amber-900'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>My Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('wishlist')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'wishlist'
              ? 'border-amber-800 text-amber-900'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Saved Wishlist ({wishlist.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('addresses')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'addresses'
              ? 'border-amber-800 text-amber-900'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Delivery Addresses ({user.addresses?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-amber-800 text-amber-900'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Account Settings</span>
        </button>
      </div>

      {/* Tab 1: Orders History */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {loadingOrders ? (
            <div className="p-8 bg-white rounded-3xl border border-stone-200 text-center text-xs text-stone-500">
              Loading your orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-stone-200 text-center space-y-3">
              <Package className="w-10 h-10 text-stone-300 mx-auto" />
              <h3 className="font-serif font-bold text-base text-stone-900">No Orders Placed Yet</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Explore our mattress collection and place an order with instant M-PESA payment.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => (
                <div 
                  key={ord.id}
                  className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4 hover:border-amber-700/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-stone-900">{ord.orderNumber}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          (ord.orderStatus || (ord as any).status) === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : (ord.orderStatus || (ord as any).status) === 'out_for_delivery'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {(ord.orderStatus || (ord as any).status || 'pending').replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Placed on {new Date(ord.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onTrackOrder(ord.orderNumber)}
                        className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" /> Live Track
                      </button>

                      <button
                        onClick={() => {
                          setSelectedInvoiceOrder(ord);
                          setIsInvoiceOpen(true);
                        }}
                        className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold px-3.5 py-2 rounded-xl border border-stone-300 transition-colors flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" /> Invoice
                      </button>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ord.items.map((item) => (
                      <div key={item.id} className="p-3 bg-stone-50 rounded-2xl flex items-center gap-3 border border-stone-200">
                        <img 
                          src={item.productImage} 
                          alt={item.productName} 
                          className="w-12 h-12 object-cover rounded-xl border border-stone-200 bg-white"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-stone-900 truncate">{item.productName}</h4>
                          <p className="text-[10px] text-stone-500">Size: {item.sizeLabel} • Qty: {item.quantity}</p>
                          <p className="text-xs font-bold text-amber-900 mt-0.5">KSh {item.lineTotal.toLocaleString()}</p>
                        </div>
                        {ord.orderStatus === 'delivered' && (
                          <button
                            onClick={() => {
                              setReviewProduct({ id: item.productId, name: item.productName, brand: item.brand });
                              setIsReviewOpen(true);
                            }}
                            className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg text-xs"
                            title="Leave Review"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs text-stone-500">
                    <div>
                      <span>Delivery To: </span>
                      <strong className="text-stone-700">{ord.deliveryAddress || ord.area}, {ord.county}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Total Paid ({ord.paymentMethod}): </span>
                      <strong className="text-stone-900 font-serif text-sm font-black">
                        KSh {ord.total.toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Saved Wishlist */}
      {activeTab === 'wishlist' && (
        <div className="space-y-4">
          {wishlist.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-stone-200 text-center space-y-3">
              <Heart className="w-10 h-10 text-stone-300 mx-auto" />
              <h3 className="font-serif font-bold text-base text-stone-900">Your Wishlist is Empty</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Save your favorite mattresses by clicking the heart icon on any mattress card.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlist.map((prod) => (
                <div 
                  key={prod.id} 
                  className="bg-white rounded-3xl p-4 border border-stone-200 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100">
                    <img 
                      src={prod.images[0]} 
                      alt={prod.name} 
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => onSelectProduct(prod)}
                    />
                    <button
                      onClick={() => toggleWishlist(prod)}
                      className="absolute top-2 right-2 p-2 bg-white/90 rounded-full text-red-600 hover:bg-white shadow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-amber-800">{prod.brand}</span>
                    <h4 
                      onClick={() => onSelectProduct(prod)}
                      className="font-serif font-bold text-sm text-stone-900 hover:text-amber-800 cursor-pointer line-clamp-1"
                    >
                      {prod.name}
                    </h4>
                    <p className="text-xs text-stone-500">{prod.firmness} • High-Density Core</p>
                    <p className="text-sm font-bold text-stone-900 pt-1">
                      From KSh {prod.basePrice.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                    <button
                      onClick={() => {
                        const defVariant = prod.variants[0];
                        if (defVariant) addItem(prod, defVariant, 1);
                      }}
                      className="flex-1 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs py-2.5 rounded-xl transition-colors"
                    >
                      Add to Cart
                    </button>
                    <button
                      onClick={() => onSelectProduct(prod)}
                      className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Delivery Addresses */}
      {activeTab === 'addresses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-stone-900">
              Saved Delivery Locations
            </h3>
            <button
              onClick={() => setIsAddingAddress(!isAddingAddress)}
              className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Address
            </button>
          </div>

          {isAddingAddress && (
            <form onSubmit={handleAddAddress} className="bg-stone-50 rounded-3xl p-6 border border-stone-200 space-y-4">
              <h4 className="font-bold text-xs text-stone-800 uppercase tracking-wider">New Delivery Destination</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">County *</label>
                  <select
                    value={newCounty}
                    onChange={(e) => setNewCounty(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-800 font-semibold"
                  >
                    <option value="Nairobi">Nairobi</option>
                    <option value="Kiambu">Kiambu</option>
                    <option value="Machakos">Machakos</option>
                    <option value="Kajiado">Kajiado</option>
                    <option value="Mombasa">Mombasa</option>
                    <option value="Nakuru">Nakuru</option>
                    <option value="Kisumu">Kisumu</option>
                    <option value="Uasin Gishu (Eldoret)">Uasin Gishu (Eldoret)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Town / Suburb *</label>
                  <input
                    type="text"
                    value={newTown}
                    onChange={(e) => setNewTown(e.target.value)}
                    required
                    placeholder="e.g. Kilimani, Westlands, Ruiru"
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Street / Apartment / House No *</label>
                  <input
                    type="text"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    required
                    placeholder="e.g. Wood Avenue, Green Court, Apt 2B"
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Nearby Landmark (Optional)</label>
                  <input
                    type="text"
                    value={newLandmark}
                    onChange={(e) => setNewLandmark(e.target.value)}
                    placeholder="e.g. Opposite Shell Petrol Station"
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingAddress(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-5 py-2 rounded-xl transition-colors"
                >
                  Save Address
                </button>
              </div>
            </form>
          )}

          {(!user.addresses || user.addresses.length === 0) ? (
            <div className="p-8 bg-white rounded-3xl border border-stone-200 text-center text-xs text-stone-500">
              No saved addresses found. Add an address to speed up checkout.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {user.addresses.map((addr) => (
                <div key={addr.id} className="p-5 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-2 relative">
                  {addr.isDefault && (
                    <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mb-1">
                      Primary Delivery Address
                    </span>
                  )}
                  <p className="font-bold text-xs text-stone-900">{addr.deliveryAddress || addr.area}</p>
                  <p className="text-xs text-stone-600">{addr.town}, {addr.county} County</p>
                  {addr.landmark && <p className="text-[11px] text-stone-400">Landmark: {addr.landmark}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Profile Settings */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm max-w-xl space-y-6">
          <h3 className="font-serif font-bold text-base text-stone-900">
            Edit Account Profile
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name || ''}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Phone Number (for M-PESA Prompts & SMS Tracking)
              </label>
              <input
                type="tel"
                value={phone || ''}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-800 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full bg-stone-100 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-500 cursor-not-allowed"
              />
            </div>

            {profileSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSavingProfile}
              className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Invoice Modal */}
      <InvoiceModal
        order={selectedInvoiceOrder}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
      />

      {/* Review Modal */}
      {reviewProduct && (
        <ReviewModal
          product={reviewProduct}
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
};
