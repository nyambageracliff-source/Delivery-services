import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, ShoppingBag, Heart, User as UserIcon, Menu, X, 
  Phone, Truck, ShieldCheck, ChevronDown, Sparkles, LogOut,
  Package, LayoutDashboard, TruckIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { api } from '../lib/api';
import { Product, Category } from '../types';

interface HeaderProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onSelectProduct: (product: Product) => void;
  onOpenAuth: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  onSelectProduct,
  onOpenAuth,
  searchQuery: externalSearchQuery = '',
  onSearchChange
}) => {
  const { user, logout, isAdmin, isStaff, isDriver } = useAuth();
  const { itemCount, setIsCartDrawerOpen } = useCart();
  const { wishlist } = useWishlist();

  const [categories, setCategories] = useState<Category[]>([]);
  const [internalSearchQuery, setInternalSearchQuery] = useState(externalSearchQuery);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchVisible, setIsMobileSearchVisible] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Sync external search query when updated from ShopPage or elsewhere
  useEffect(() => {
    if (externalSearchQuery !== internalSearchQuery) {
      setInternalSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await api.getCategories();
        setCategories(cats);
      } catch (e) {
        console.error('Failed to load categories', e);
      }
    }
    loadCategories();
  }, []);

  // Live search handler
  useEffect(() => {
    if (!internalSearchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.getProducts({ search: internalSearchQuery.trim() });
        setSearchResults(res.products.slice(0, 6));
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [internalSearchQuery]);

  // Click outside listener for search & account menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (value: string) => {
    setInternalSearchQuery(value);
    setIsSearchOpen(true);
    // If user is currently on Shop page, update live search filter immediately
    if (currentView === 'shop' && onSearchChange) {
      onSearchChange(value);
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onSearchChange) {
      onSearchChange(internalSearchQuery);
    }
    setIsSearchOpen(false);
    setIsMobileSearchVisible(false);
    setIsMobileMenuOpen(false);
    setCurrentView('shop');
  };

  const handleClearSearch = () => {
    setInternalSearchQuery('');
    setSearchResults([]);
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  const handleSearchResultClick = (product: Product) => {
    onSelectProduct(product);
    setIsSearchOpen(false);
    setIsMobileSearchVisible(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      {/* Top Announcement Bar */}
      <div className="bg-stone-900 text-stone-200 text-xs px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
              <Truck className="w-3.5 h-3.5" /> FREE Delivery in Nairobi Metro for orders above KSh 35,000
            </span>
            <span className="hidden md:inline text-stone-500">|</span>
            <span className="hidden md:inline-flex items-center gap-1 text-stone-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Genuine Direct Factory Sourced
            </span>
          </div>

          <div className="flex items-center gap-4 text-stone-300">
            <a 
              href="tel:+254742967083" 
              className="hover:text-amber-400 flex items-center gap-1 transition-colors"
              title="Call sleep consultant"
            >
              <Phone className="w-3 h-3" /> +254 742 967 083
            </a>
            <span className="text-stone-600">|</span>
            <button 
              onClick={() => setCurrentView('track')} 
              className="hover:text-amber-400 font-medium transition-colors cursor-pointer"
            >
              Track Order
            </button>
            {user && (
              <>
                <span className="text-stone-600">|</span>
                <span className="text-[11px] text-amber-300 font-medium bg-stone-800 px-2 py-0.5 rounded">
                  {user.role === 'admin' ? '🛡️ Admin' : user.role === 'buyer' ? '🏢 Wholesale' : user.role === 'driver' ? '🚚 Driver' : '👤 Customer'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 text-stone-700 hover:text-stone-900 rounded-lg hover:bg-stone-100"
              aria-label="Toggle Navigation"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <button
              onClick={() => setCurrentView('home')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-stone-900 via-stone-800 to-amber-700 flex items-center justify-center shadow-md shadow-stone-900/10 group-hover:scale-105 transition-transform">
                <span className="text-white font-serif font-black text-xl tracking-tight">H</span>
              </div>
              <div>
                <span className="font-serif font-bold text-lg sm:text-xl text-stone-900 tracking-tight flex items-center gap-1.5">
                  Haveens Company <span className="text-amber-700 font-sans text-xs font-semibold tracking-normal uppercase bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200/60">KE</span>
                </span>
                <p className="text-[10px] text-stone-500 font-medium tracking-wide uppercase hidden sm:block">
                  Mattresses, Accessories & Furniture
                </p>
              </div>
            </button>
          </div>

          {/* Search Bar with live autocomplete & direct Shop filter */}
          <div ref={searchRef} className="relative flex-1 max-w-lg hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                id="header-search-input"
                type="text"
                value={internalSearchQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Search products by name or description..."
                className="w-full bg-stone-100/90 border border-stone-200 rounded-full pl-11 pr-20 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700 focus:bg-white transition-all shadow-inner"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {internalSearchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="text-stone-400 hover:text-stone-700 text-xs p-1 rounded-full hover:bg-stone-200 transition-colors"
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  className="bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold px-2.5 py-1 rounded-full transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                  title="Search in Shop"
                >
                  <span>Filter</span>
                </button>
              </div>
            </form>

            {/* Search Results Dropdown */}
            {isSearchOpen && internalSearchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50 animate-fadeIn">
                <div className="p-3 bg-stone-50 border-b border-stone-100 flex items-center justify-between text-xs text-stone-600">
                  <span className="font-medium">
                    {isSearching ? 'Searching catalog...' : `${searchResults.length} matching products`}
                  </span>
                  <button 
                    type="button"
                    onClick={handleSearchSubmit}
                    className="text-amber-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    Filter in Shop Page →
                  </button>
                </div>

                {searchResults.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                    {searchResults.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => handleSearchResultClick(prod)}
                        className="p-3 hover:bg-amber-50/50 flex items-center gap-3 cursor-pointer transition-colors group"
                      >
                        <img 
                          src={prod.images[0]} 
                          alt={prod.name} 
                          className="w-12 h-12 object-cover rounded-lg bg-stone-100 border border-stone-200 group-hover:border-amber-400 transition-colors shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-stone-900 truncate group-hover:text-amber-900 transition-colors">
                            {prod.name}
                          </h4>
                          <p className="text-xs text-stone-500 line-clamp-1">
                            {prod.description || `${prod.brand} • ${prod.firmness}`}
                          </p>
                          <span className="inline-block text-[10px] text-amber-800 font-medium bg-amber-50 px-1.5 py-0.2 rounded border border-amber-100 mt-0.5">
                            {prod.brand}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold text-stone-900">
                            KSh {prod.basePrice.toLocaleString()}
                          </span>
                          {prod.baseOldPrice && (
                            <span className="block text-[11px] text-stone-400 line-through">
                              KSh {prod.baseOldPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="p-2.5 bg-stone-50 text-center border-t border-stone-100">
                      <button
                        type="button"
                        onClick={handleSearchSubmit}
                        className="w-full py-1.5 text-xs font-bold text-amber-800 hover:text-amber-900 hover:bg-amber-100/60 rounded-xl transition-colors cursor-pointer"
                      >
                        View all search results in Shop Page
                      </button>
                    </div>
                  </div>
                ) : !isSearching && (
                  <div className="p-6 text-center text-stone-500 text-sm space-y-2">
                    <p>No products found matching "{internalSearchQuery}".</p>
                    <p className="text-xs text-stone-400">Try searching by product name, description keyword, or size (e.g. "orthopedic", "6x6", "pillow").</p>
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="inline-block mt-2 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 hover:bg-amber-100 cursor-pointer"
                    >
                      Search entire Shop catalog anyway
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setIsMobileSearchVisible(!isMobileSearchVisible)}
              className="md:hidden p-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
              title="Search products"
              aria-label="Toggle mobile search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Wishlist Button */}
            <button
              onClick={() => setCurrentView('account')}
              className="relative p-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
              title="Saved Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-amber-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              id="header-cart-btn"
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative p-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors flex items-center gap-2"
              title="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-amber-700 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Account Dropdown */}
            <div ref={accountMenuRef} className="relative">
              {user ? (
                <button
                  onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-all text-xs font-semibold text-stone-800"
                >
                  <div className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[90px] truncate hidden sm:inline">{user.name.split(' ')[0]}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="bg-stone-900 text-white hover:bg-stone-800 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all shadow-sm flex items-center gap-1.5"
                >
                  <UserIcon className="w-3.5 h-3.5" /> Sign In
                </button>
              )}

              {/* User Dropdown Menu */}
              {isAccountDropdownOpen && user && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 text-sm">
                  <div className="px-4 py-2.5 border-b border-stone-100">
                    <p className="font-semibold text-stone-900">{user.name}</p>
                    <p className="text-xs text-stone-500 truncate">{user.email}</p>
                    <span className="inline-block mt-1 bg-amber-100 text-amber-900 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                      {user.role}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => { setCurrentView('account'); setIsAccountDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-stone-50 flex items-center gap-2 text-stone-700"
                    >
                      <UserIcon className="w-4 h-4 text-stone-500" /> My Profile & Orders
                    </button>
                    <button
                      onClick={() => { setCurrentView('track'); setIsAccountDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-stone-50 flex items-center gap-2 text-stone-700"
                    >
                      <Package className="w-4 h-4 text-stone-500" /> Track My Order
                    </button>

                    {(isAdmin || isStaff) && (
                      <button
                        onClick={() => { setCurrentView('admin'); setIsAccountDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 hover:bg-amber-50 flex items-center gap-2 text-amber-900 font-semibold border-t border-b border-stone-100 my-1"
                      >
                        <LayoutDashboard className="w-4 h-4 text-amber-700" /> Admin Workspace
                      </button>
                    )}

                    {isDriver && (
                      <button
                        onClick={() => { setCurrentView('driver'); setIsAccountDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 hover:bg-emerald-50 flex items-center gap-2 text-emerald-900 font-semibold border-t border-b border-stone-100 my-1"
                      >
                        <TruckIcon className="w-4 h-4 text-emerald-700" /> Driver Delivery Portal
                      </button>
                    )}

                    <button
                      onClick={() => { logout(); setIsAccountDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Categories Row */}
        <nav className="hidden lg:flex items-center justify-between pt-3 mt-2 border-t border-stone-100 text-xs font-semibold text-stone-700">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setCurrentView('home')}
              className={`hover:text-amber-800 transition-colors pb-1 ${currentView === 'home' ? 'text-amber-800 border-b-2 border-amber-800 font-bold' : ''}`}
            >
              Home
            </button>
            <button
              onClick={() => setCurrentView('shop')}
              className={`hover:text-amber-800 transition-colors pb-1 ${currentView === 'shop' ? 'text-amber-800 border-b-2 border-amber-800 font-bold' : ''}`}
            >
              All Products
            </button>
            {categories.slice(0, 7).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCurrentView('shop')}
                className="hover:text-amber-800 text-stone-600 transition-colors whitespace-nowrap"
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-stone-500 font-normal">
            <button 
              onClick={() => setCurrentView('track')}
              className="hover:text-stone-900 flex items-center gap-1 font-medium text-stone-700"
            >
              <Package className="w-3.5 h-3.5 text-amber-700" /> Track Delivery
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Search Bar (Collapsible Bar) */}
      {isMobileSearchVisible && (
        <div ref={mobileSearchRef} className="md:hidden bg-stone-50 border-t border-b border-stone-200 px-4 py-2.5 animate-fadeIn">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={internalSearchQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Search products by name or description..."
                className="w-full bg-white border border-stone-300 rounded-full pl-9 pr-8 py-2 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700"
                autoFocus
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              {internalSearchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="bg-amber-800 text-white text-xs font-semibold px-3 py-2 rounded-full whitespace-nowrap shadow-xs"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-stone-200 px-4 py-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative mb-3">
            <input
              type="text"
              value={internalSearchQuery}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Search mattresses, furniture, electronics..."
              className="w-full bg-stone-100 rounded-lg pl-9 pr-14 py-2 text-sm text-stone-800"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 bg-amber-800 text-white text-xs font-semibold rounded-md"
            >
              Filter
            </button>
          </form>

          <div className="grid grid-cols-2 gap-2 text-sm font-medium">
            <button
              onClick={() => { setCurrentView('home'); setIsMobileMenuOpen(false); }}
              className="p-2 text-left bg-stone-50 rounded-lg text-stone-800 hover:bg-stone-100"
            >
              🏠 Home
            </button>
            <button
              onClick={() => { setCurrentView('shop'); setIsMobileMenuOpen(false); }}
              className="p-2 text-left bg-stone-50 rounded-lg text-stone-800 hover:bg-stone-100"
            >
              🛍️ All Products
            </button>
            <button
              onClick={() => { setCurrentView('track'); setIsMobileMenuOpen(false); }}
              className="p-2 text-left bg-stone-50 rounded-lg text-stone-800 hover:bg-stone-100"
            >
              📦 Track Order
            </button>
            <button
              onClick={() => { setCurrentView('account'); setIsMobileMenuOpen(false); }}
              className="p-2 text-left bg-stone-50 rounded-lg text-stone-800 hover:bg-stone-100"
            >
              👤 My Account
            </button>
            {(isAdmin || isStaff) && (
              <button
                onClick={() => { setCurrentView('admin'); setIsMobileMenuOpen(false); }}
                className="col-span-2 p-2 text-left bg-amber-100/70 text-amber-900 rounded-lg font-semibold"
              >
                ⚙️ Admin Dashboard & Sourcing
              </button>
            )}
            {isDriver && (
              <button
                onClick={() => { setCurrentView('driver'); setIsMobileMenuOpen(false); }}
                className="col-span-2 p-2 text-left bg-emerald-100/70 text-emerald-900 rounded-lg font-semibold"
              >
                🚚 Driver Delivery Portal
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
