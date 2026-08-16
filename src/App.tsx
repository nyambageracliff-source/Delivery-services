import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { AuthModal } from './components/AuthModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SleepQuizModal } from './components/SleepQuizModal';
import { CheckCircle2, X } from 'lucide-react';

import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { AccountPage } from './pages/AccountPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { DriverPortalPage } from './pages/DriverPortalPage';
import { Product, Order } from './types';

const MainApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [trackingOrderNumber, setTrackingOrderNumber] = useState<string | undefined>(undefined);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSleepQuizOpen, setIsSleepQuizOpen] = useState(false);

  const { setIsCartDrawerOpen } = useCart();
  const { verificationSuccessMsg, clearVerificationMsg } = useAuth();

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView, selectedProduct]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentView('product');
  };

  const handleNavigateShop = (categorySlug?: string) => {
    setSelectedCategorySlug(categorySlug);
    setCurrentView('shop');
  };

  const handleTrackOrder = (orderNumber: string) => {
    setTrackingOrderNumber(orderNumber);
    setCurrentView('track');
  };

  const handleOrderPlaced = (order: Order) => {
    setTrackingOrderNumber(order.orderNumber);
    setCurrentView('track');
  };

  return (
    <div className="min-h-screen bg-stone-100/60 text-stone-900 flex flex-col font-sans selection:bg-amber-900 selection:text-white">
      {/* Global Navigation Header with Integrated Product Search */}
      <Header
        currentView={currentView}
        setCurrentView={(view) => {
          if (view === 'quiz') {
            setIsSleepQuizOpen(true);
          } else {
            setCurrentView(view);
          }
        }}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        onSelectProduct={handleSelectProduct}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Verification / Auth Banner */}
      {verificationSuccessMsg && (
        <div className="bg-emerald-800 text-white px-4 py-3 text-xs font-semibold shadow-md flex items-center justify-between z-30 sticky top-16 transition-all animate-fadeIn">
          <div className="max-w-7xl mx-auto flex items-center gap-2.5 w-full">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="flex-1">{verificationSuccessMsg}</span>
            <button
              onClick={clearVerificationMsg}
              className="p-1 text-emerald-200 hover:text-white rounded-md hover:bg-emerald-700/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Page View Content */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage
            onSelectProduct={handleSelectProduct}
            onNavigateShop={handleNavigateShop}
            onOpenQuiz={() => setIsSleepQuizOpen(true)}
          />
        )}

        {currentView === 'shop' && (
          <ShopPage
            initialCategorySlug={selectedCategorySlug}
            searchQuery={searchQuery}
            onSearchChange={(q) => setSearchQuery(q)}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {currentView === 'product' && selectedProduct && (
          <ProductDetailPage
            product={selectedProduct}
            onBack={() => setCurrentView('shop')}
            onSelectProduct={handleSelectProduct}
            onDirectCheckout={() => setCurrentView('checkout')}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {currentView === 'checkout' && (
          <CheckoutPage
            onBackToCart={() => {
              setCurrentView('shop');
              setIsCartDrawerOpen(true);
            }}
            onOrderPlaced={handleOrderPlaced}
          />
        )}

        {currentView === 'track' && (
          <OrderTrackingPage
            initialOrderNumber={trackingOrderNumber}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {currentView === 'account' && (
          <AccountPage
            onTrackOrder={handleTrackOrder}
            onSelectProduct={handleSelectProduct}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {currentView === 'admin' && (
          <AdminDashboardPage />
        )}

        {currentView === 'driver' && (
          <DriverPortalPage />
        )}
      </main>

      {/* Global Footer */}
      <Footer onNavigate={(view) => {
        if (view === 'quiz') {
          setIsSleepQuizOpen(true);
        } else {
          setCurrentView(view);
        }
      }} />

      {/* Cart Slide-in Drawer */}
      <CartDrawer
        onProceedToCheckout={() => {
          setIsCartDrawerOpen(false);
          setCurrentView('checkout');
        }}
        onExploreShop={() => {
          setIsCartDrawerOpen(false);
          setCurrentView('shop');
        }}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Mattress Sleep Quiz Modal */}
      <SleepQuizModal
        isOpen={isSleepQuizOpen}
        onClose={() => setIsSleepQuizOpen(false)}
        onSelectProduct={handleSelectProduct}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'quiz') {
            setIsSleepQuizOpen(true);
          } else {
            setCurrentView(view);
          }
        }}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <MainApp />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
