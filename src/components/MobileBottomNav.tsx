import React from 'react';
import { Home, ShoppingBag, Heart, Package, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

interface MobileBottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenAuth: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenAuth
}) => {
  const { itemCount, setIsCartDrawerOpen } = useCart();
  const { wishlist } = useWishlist();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-stone-200 px-2 py-2 flex items-center justify-around shadow-2xl">
      <button
        onClick={() => onNavigate('home')}
        className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${currentView === 'home' ? 'text-amber-800 font-bold' : 'text-stone-500'}`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px]">Home</span>
      </button>

      <button
        onClick={() => onNavigate('shop')}
        className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${currentView === 'shop' ? 'text-amber-800 font-bold' : 'text-stone-500'}`}
      >
        <ShoppingBag className="w-5 h-5" />
        <span className="text-[10px]">Shop</span>
      </button>

      {/* Center Cart Trigger */}
      <button
        onClick={() => setIsCartDrawerOpen(true)}
        className="relative flex flex-col items-center gap-1 p-1.5 text-stone-700 hover:text-amber-800 transition-colors"
      >
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-amber-700 text-white flex items-center justify-center shadow-lg shadow-amber-900/20">
            <ShoppingBag className="w-4 h-4" />
          </div>
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-stone-900 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
              {itemCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold text-stone-700">Cart</span>
      </button>

      <button
        onClick={() => onNavigate('track')}
        className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${currentView === 'track' ? 'text-amber-800 font-bold' : 'text-stone-500'}`}
      >
        <Package className="w-5 h-5" />
        <span className="text-[10px]">Track</span>
      </button>

      <button
        onClick={() => onNavigate('account')}
        className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${currentView === 'account' ? 'text-amber-800 font-bold' : 'text-stone-500'}`}
      >
        <User className="w-5 h-5" />
        <span className="text-[10px]">Account</span>
      </button>
    </div>
  );
};
