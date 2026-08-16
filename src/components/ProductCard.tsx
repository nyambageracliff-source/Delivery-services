import React, { useState } from 'react';
import { Star, Heart, ShoppingBag, ShieldCheck, Eye, Check } from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    product.variants[0] || {} as ProductVariant
  );
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);

  const inWishlist = isInWishlist(product.id);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(product, selectedVariant, 1);
    setAddedAnimation(true);
    setTimeout(() => {
      setAddedAnimation(false);
      setIsQuickAddOpen(false);
    }, 1200);
  };

  const discountPercent = product.baseOldPrice 
    ? Math.round(((product.baseOldPrice - product.basePrice) / product.baseOldPrice) * 100)
    : 0;

  return (
    <div 
      onClick={() => onSelect(product)}
      className="group relative bg-white rounded-2xl border border-stone-200/80 hover:border-amber-700/40 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
    >
      {/* Product Image Container */}
      <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          {discountPercent > 0 && (
            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              Save {discountPercent}%
            </span>
          )}
          {product.isBestSeller && (
            <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              Best Seller
            </span>
          )}
          {product.isNewArrival && (
            <span className="bg-stone-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              New Arrival
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all duration-200 z-10 ${
            inWishlist 
              ? 'bg-red-50 text-red-600 shadow' 
              : 'bg-white/80 text-stone-600 hover:text-red-600 hover:bg-white'
          }`}
          title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart className={`w-4 h-4 ${inWishlist ? 'fill-current' : ''}`} />
        </button>

        {/* Hover Quick View Overlay */}
        <div className="absolute inset-0 bg-stone-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="bg-white/95 text-stone-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> View Product Details
          </span>
        </div>
      </div>

      {/* Product Content Details */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Brand & Rating / Attribute */}
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="font-semibold text-amber-800 uppercase tracking-wider text-[11px]">
              {product.brand}
            </span>
            {product.reviewCount > 0 ? (
              <div className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{product.rating.toFixed(1)}</span>
                <span className="text-stone-400 font-normal">({product.reviewCount})</span>
              </div>
            ) : (
              <span className="text-[10px] text-stone-400 font-medium">Genuine Direct Sourced</span>
            )}
          </div>

          {/* Product Title */}
          <h3 className="font-serif font-bold text-sm sm:text-base text-stone-900 line-clamp-2 leading-snug group-hover:text-amber-800 transition-colors">
            {product.name}
          </h3>

          {/* Firmness & Features */}
          <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-600">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-600" />
              <span>{product.firmness}</span>
            </div>
            <div className="flex items-center gap-1 text-stone-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Genuine</span>
            </div>
          </div>
        </div>

        {/* Available Sizes List */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-stone-500">
            <span>Select Size:</span>
            <span className="font-semibold text-stone-700">{selectedVariant.sizeLabel}</span>
          </div>
          <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
            {product.variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVariant(v)}
                className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-all ${
                  selectedVariant.id === v.id
                    ? 'bg-amber-700 text-white border-amber-700 shadow-sm'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {v.sizeLabel.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing & Add to Cart Button */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-serif font-black text-stone-900">
                KSh {selectedVariant.price.toLocaleString()}
              </span>
              {selectedVariant.oldPrice && (
                <span className="text-xs text-stone-400 line-through">
                  KSh {selectedVariant.oldPrice.toLocaleString()}
                </span>
              )}
            </div>
            <span className="text-[10px] text-stone-500">
              {product.variants.length > 1 ? 'Price varies by size' : 'Direct factory price'}
            </span>
          </div>

          <button
            onClick={handleQuickAdd}
            className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm ${
              addedAnimation
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-900 hover:bg-amber-700 text-white'
            }`}
            title="Add selected size to cart"
          >
            {addedAnimation ? (
              <span className="flex items-center gap-1 px-1">
                <Check className="w-4 h-4" /> Added
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <ShoppingBag className="w-4 h-4" /> Add
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
