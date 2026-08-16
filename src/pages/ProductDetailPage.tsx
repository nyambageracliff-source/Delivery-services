import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Star, Heart, ShieldCheck, Truck, ArrowLeft, Check, 
  ShoppingBag, Zap, Award, Sparkles, MessageSquare, ChevronRight,
  ThumbsUp, Filter, Search, RotateCcw, AlertCircle, CheckCircle2,
  User as UserIcon, Send, BadgeCheck, Lock, ChevronDown
} from 'lucide-react';
import { Product, ProductVariant, Review, Order } from '../types';
import { api } from '../lib/api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { ReviewModal } from '../components/ReviewModal';

interface ProductDetailPageProps {
  product: Product;
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  onDirectCheckout: () => void;
  onOpenAuth?: () => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product: initialProduct,
  onBack,
  onSelectProduct,
  onDirectCheckout,
  onOpenAuth
}) => {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState<Product>(initialProduct);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>(initialProduct.images[0] || '');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    initialProduct.variants[0] || {} as ProductVariant
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [isAddedAnimation, setIsAddedAnimation] = useState<boolean>(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  // User past orders & review verification
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [matchedOrder, setMatchedOrder] = useState<Order | null>(null);

  // Review Filter & Sorting state
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<'recent' | 'highest' | 'lowest' | 'helpful'>('recent');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [votedReviewIds, setVotedReviewIds] = useState<Record<string, boolean>>({});

  // In-page Review Composer state
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);
  const [newRating, setNewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newComment, setNewComment] = useState<string>('');
  const [newSizeBought, setNewSizeBought] = useState<string>('');
  const [newLocation, setNewLocation] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState<boolean>(false);
  const [reviewSubmitError, setReviewSubmitError] = useState<string>('');

  const reviewsSectionRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadDetails() {
      try {
        const res = await api.getProduct(initialProduct.id);
        setProduct(res.product);
        setReviews(res.reviews || []);
        if (res.product.variants.length > 0) {
          setSelectedVariant(res.product.variants[0]);
          setNewSizeBought(res.product.variants[0].sizeLabel || '');
        }
        if (res.product.images.length > 0) {
          setSelectedImage(res.product.images[0]);
        }

        // Fetch related products
        const relRes = await api.getProducts({ category: res.product.categoryId });
        setRelatedProducts(relRes.products.filter(p => p.id !== res.product.id).slice(0, 4));
      } catch (err) {
        console.error('Failed to load product details', err);
      }
    }
    loadDetails();
  }, [initialProduct.id]);

  // Check user orders for verified purchase
  useEffect(() => {
    if (user) {
      api.getMyOrders()
        .then((orders) => {
          if (Array.isArray(orders)) {
            setUserOrders(orders);
            const found = orders.find(o => o.items && o.items.some(i => i.productId === product.id));
            if (found) {
              setMatchedOrder(found);
              const foundItem = found.items.find(i => i.productId === product.id);
              if (foundItem?.sizeLabel) {
                setNewSizeBought(foundItem.sizeLabel);
              }
            }
          }
        })
        .catch(() => {});

      if (user.addresses && user.addresses[0]) {
        setNewLocation(`${user.addresses[0].town}, ${user.addresses[0].county}`);
      }
    }
  }, [user, product.id]);

  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = () => {
    addItem(product, selectedVariant, quantity);
    setIsAddedAnimation(true);
    setTimeout(() => setIsAddedAnimation(false), 1500);
  };

  const handleBuyNow = () => {
    addItem(product, selectedVariant, quantity);
    onDirectCheckout();
  };

  const scrollToReviews = () => {
    reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenComposer = () => {
    setShowReviewForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  // Submit in-page review
  const handleInPageReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      setReviewSubmitError('Please enter your detailed sleep experience or product feedback.');
      return;
    }

    setReviewSubmitError('');
    setIsSubmittingReview(true);

    try {
      const res = await api.submitReview({
        productId: product.id,
        rating: newRating,
        title: newTitle.trim() || undefined,
        comment: newComment.trim(),
        orderNumber: matchedOrder?.orderNumber || undefined,
        sizeBought: newSizeBought || selectedVariant.sizeLabel || undefined,
        userLocation: newLocation.trim() || undefined
      });

      if (res.reviews) {
        setReviews(res.reviews);
      } else if (res.review) {
        setReviews(prev => [res.review, ...prev.filter(r => r.id !== res.review.id)]);
      }

      if (res.product) {
        setProduct(res.product);
      }

      setReviewSubmitSuccess(true);
      setNewComment('');
      setNewTitle('');

      setTimeout(() => {
        setReviewSubmitSuccess(false);
        setShowReviewForm(false);
      }, 2500);
    } catch (err: any) {
      setReviewSubmitError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Vote review helpful
  const handleHelpfulVote = async (reviewId: string) => {
    if (votedReviewIds[reviewId]) return;

    setVotedReviewIds(prev => ({ ...prev, [reviewId]: true }));
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, helpfulVotes: (r.helpfulVotes || 0) + 1 } : r));

    try {
      await api.voteHelpfulReview(reviewId);
    } catch (e) {
      console.warn('Helpful vote sync note:', e);
    }
  };

  // Rating metrics and distribution calculations
  const totalReviewsCount = reviews.length;
  const averageRating = useMemo(() => {
    if (totalReviewsCount === 0) return product.rating || 5.0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    return Number((sum / totalReviewsCount).toFixed(1));
  }, [reviews, totalReviewsCount, product.rating]);

  const ratingDistribution = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const rounded = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      counts[rounded] = (counts[rounded] || 0) + 1;
    });
    return [5, 4, 3, 2, 1].map(stars => ({
      stars,
      count: counts[stars] || 0,
      percentage: totalReviewsCount > 0 ? Math.round(((counts[stars] || 0) / totalReviewsCount) * 100) : 0
    }));
  }, [reviews, totalReviewsCount]);

  const recommendationRate = useMemo(() => {
    if (totalReviewsCount === 0) return 98;
    const positiveCount = reviews.filter(r => r.rating >= 4).length;
    return Math.round((positiveCount / totalReviewsCount) * 100);
  }, [reviews, totalReviewsCount]);

  // Filtered and sorted reviews
  const filteredReviews = useMemo(() => {
    return reviews
      .filter(r => {
        if (selectedStarFilter !== null && Math.round(r.rating) !== selectedStarFilter) {
          return false;
        }
        if (verifiedOnly && !r.verifiedPurchase && !r.isVerifiedPurchase) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchComment = r.comment?.toLowerCase().includes(q);
          const matchTitle = r.title?.toLowerCase().includes(q);
          const matchName = (r.customerName || r.userName || '').toLowerCase().includes(q);
          if (!matchComment && !matchTitle && !matchName) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'recent') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortOption === 'highest') {
          return b.rating - a.rating;
        }
        if (sortOption === 'lowest') {
          return a.rating - b.rating;
        }
        if (sortOption === 'helpful') {
          return (b.helpfulVotes || 0) - (a.helpfulVotes || 0);
        }
        return 0;
      });
  }, [reviews, selectedStarFilter, verifiedOnly, searchQuery, sortOption]);

  const discountPercent = selectedVariant.oldPrice
    ? Math.round(((selectedVariant.oldPrice - selectedVariant.price) / selectedVariant.oldPrice) * 100)
    : 0;

  const ratingDescriptions: Record<number, string> = {
    5: '5 Stars - Exceptional Sleep Quality & Highly Recommended',
    4: '4 Stars - Very Good & Well Constructed',
    3: '3 Stars - Average / Meets Basic Needs',
    2: '2 Stars - Below Expectations',
    1: '1 Star - Poor / Not Satisfied'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <button onClick={onBack} className="hover:text-amber-800 flex items-center gap-1 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Catalog
        </button>
        <span>/</span>
        <span>{product.categoryName}</span>
        <span>/</span>
        <span className="text-stone-800 font-medium truncate max-w-xs">{product.name}</span>
      </div>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Gallery */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Selected Image */}
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-stone-100 border border-stone-200 shadow-md">
            <img
              src={selectedImage}
              alt={product.name}
              className="w-full h-full object-cover transition-all duration-300"
            />
            {discountPercent > 0 && (
              <span className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                Save {discountPercent}%
              </span>
            )}
            <button
              onClick={() => toggleWishlist(product)}
              className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md transition-colors ${
                inWishlist ? 'bg-red-50 text-red-600' : 'bg-white/80 text-stone-600 hover:text-red-600'
              }`}
            >
              <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Thumbnail Strip */}
          {product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${
                    selectedImage === img
                      ? 'border-amber-700 shadow-md scale-105'
                      : 'border-stone-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`${product.name} ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Key Selling Highlights Banner */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-stone-200 text-center">
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <p className="font-bold text-xs text-stone-900">100% Genuine</p>
              <p className="text-[10px] text-stone-500">Certified factory core</p>
            </div>
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
              <Truck className="w-5 h-5 text-amber-700 mx-auto mb-1" />
              <p className="font-bold text-xs text-stone-900">Direct Sourcing</p>
              <p className="text-[10px] text-stone-500">Fresh factory batch</p>
            </div>
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
              <Award className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="font-bold text-xs text-stone-900">Chiropractor Grade</p>
              <p className="text-[10px] text-stone-500">Spine alignment</p>
            </div>
          </div>
        </div>

        {/* Right Column: Details & Variant Selection */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                {product.brand}
              </span>
              
              {/* Top Star Rating with Smooth Scroll to Reviews */}
              <button
                onClick={scrollToReviews}
                className="flex items-center gap-1 text-amber-500 text-xs font-bold hover:underline cursor-pointer group"
              >
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i < Math.round(averageRating) ? 'fill-current' : 'text-stone-300'}`}
                    />
                  ))}
                </div>
                <span className="text-stone-900 ml-0.5">{averageRating.toFixed(1)}</span>
                <span className="text-stone-500 font-normal">({totalReviewsCount} {totalReviewsCount === 1 ? 'review' : 'reviews'})</span>
              </button>
            </div>

            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-stone-900 mt-1 leading-snug">
              {product.name}
            </h1>

            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Pricing Box */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="font-serif font-black text-2xl sm:text-3xl text-stone-900">
                KSh {selectedVariant.price?.toLocaleString() || product.basePrice?.toLocaleString()}
              </span>
              {selectedVariant.oldPrice && (
                <span className="text-sm text-stone-400 line-through">
                  KSh {selectedVariant.oldPrice.toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-[11px] text-emerald-700 font-semibold">
              ✓ Includes standard Kenya factory packaging & VAT receipt
            </p>
          </div>

          {/* Size Variant Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-700 uppercase tracking-wider">
                1. Choose Bed Size
              </span>
              <span className="font-semibold text-amber-800">{selectedVariant.sizeLabel}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedVariant(v);
                    setNewSizeBought(v.sizeLabel || '');
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedVariant.id === v.id
                      ? 'border-amber-700 bg-amber-50/60 ring-2 ring-amber-700/20 shadow-sm'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <p className="text-xs font-bold text-stone-900">{v.sizeLabel}</p>
                  <p className="text-[11px] font-semibold text-amber-800 mt-0.5">
                    KSh {v.price?.toLocaleString()}
                  </p>
                  {v.thicknessInches !== undefined && v.thicknessInches > 0 && (
                    <p className="text-[10px] text-stone-400">{v.thicknessInches}" profile</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Firmness Score Visual Bar */}
          {product.firmnessScore !== undefined && (
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-stone-700 uppercase tracking-wider">Firmness Level:</span>
                <span className="font-bold text-stone-900">{product.firmness} ({product.firmnessScore}/10)</span>
              </div>
              <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-700 rounded-full"
                  style={{ width: `${(product.firmnessScore / 10) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-stone-400 font-medium">
                <span>Plush (1)</span>
                <span>Medium (5)</span>
                <span>Extra Firm (10)</span>
              </div>
            </div>
          )}

          {/* Features Pills */}
          {product.features && product.features.length > 0 && (
            <div className="space-y-2">
              <span className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Craft & Material Specifications
              </span>
              <div className="flex flex-wrap gap-1.5">
                {product.features.map((feat, i) => (
                  <span 
                    key={i} 
                    className="bg-white border border-stone-200 text-stone-700 text-xs px-3 py-1 rounded-full shadow-sm flex items-center gap-1 font-medium"
                  >
                    <Check className="w-3 h-3 text-emerald-600" /> {feat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & CTAs */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-stone-300 rounded-2xl bg-white p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-600 hover:bg-stone-100 font-bold"
                >
                  -
                </button>
                <span className="w-10 text-center text-sm font-bold text-stone-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-600 hover:bg-stone-100 font-bold"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                className={`flex-1 font-bold py-3.5 px-6 rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                  isAddedAnimation
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-900 hover:bg-stone-800 text-white'
                }`}
              >
                {isAddedAnimation ? (
                  <>
                    <Check className="w-4 h-4" /> Added to Cart!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" /> Add to Cart
                  </>
                )}
              </button>
            </div>

            <button
              onClick={handleBuyNow}
              className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold py-3.5 px-6 rounded-2xl text-xs sm:text-sm transition-all shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Instant Buy & Checkout (M-PESA)</span>
            </button>

            {/* WhatsApp Advisor */}
            <a
              href={`https://wa.me/254116822231?text=${encodeURIComponent(`Hello Haven Sleep Advisor, I am inquiring about the ${product.name} (${selectedVariant.sizeLabel || ''} - KSh ${selectedVariant.price?.toLocaleString() || ''}). Could you advise on spine firmness & delivery timeline?`)}`}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold py-2.5 px-4 rounded-2xl text-xs transition-colors flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-emerald-700" />
              <span>Ask Sleep Advisor on WhatsApp (+254 116 822 231)</span>
            </a>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* USER REVIEW & STAR RATING SECTION */}
      {/* ========================================================= */}
      <div ref={reviewsSectionRef} id="customer-reviews-section" className="border-t border-stone-200 pt-12 space-y-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-2xl text-stone-900">
                Customer Reviews & Ratings
              </h2>
              <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {totalReviewsCount} {totalReviewsCount === 1 ? 'Review' : 'Reviews'}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Verified feedback from Kenyan households and hospitality partners who purchased this item.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <button
                onClick={handleOpenComposer}
                className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Write a Review</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Sign In to Review</span>
              </button>
            )}
          </div>
        </div>

        {/* Rating Breakdown & Aggregate Score Panel */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-stone-50 rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm">
          {/* Left: Overall Score Card */}
          <div className="md:col-span-4 flex flex-col justify-center items-center text-center p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2">
            <span className="text-xs uppercase font-bold text-stone-500 tracking-wider">Overall Rating</span>
            <div className="text-5xl font-black font-serif text-stone-900 leading-none">
              {averageRating.toFixed(1)}
            </div>
            
            <div className="flex items-center gap-1 text-amber-500 py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${star <= Math.round(averageRating) ? 'fill-current' : 'text-stone-200'}`}
                />
              ))}
            </div>

            <p className="text-xs font-medium text-stone-600">
              Based on <span className="font-bold text-stone-900">{totalReviewsCount}</span> verified ratings
            </p>
            
            <div className="mt-2 pt-2 border-t border-stone-100 w-full flex items-center justify-center gap-1.5 text-xs text-emerald-700 font-semibold">
              <BadgeCheck className="w-4 h-4 text-emerald-600" />
              <span>{recommendationRate}% of customers recommend</span>
            </div>
          </div>

          {/* Right: Star Rating Distribution Progress Bars */}
          <div className="md:col-span-8 flex flex-col justify-center space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700 mb-1">
              <span>Rating Breakdown</span>
              {selectedStarFilter && (
                <button
                  onClick={() => setSelectedStarFilter(null)}
                  className="text-amber-800 hover:underline text-[11px] font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Clear star filter ({selectedStarFilter}★)
                </button>
              )}
            </div>

            {ratingDistribution.map((item) => {
              const isSelected = selectedStarFilter === item.stars;
              return (
                <button
                  key={item.stars}
                  onClick={() => setSelectedStarFilter(isSelected ? null : item.stars)}
                  className={`w-full flex items-center gap-3 p-1.5 rounded-xl transition-all text-left ${
                    isSelected ? 'bg-amber-100/70 ring-1 ring-amber-700/30' : 'hover:bg-white/80'
                  }`}
                >
                  <div className="flex items-center gap-1 w-14 shrink-0 text-xs font-bold text-stone-700">
                    <span>{item.stars}</span>
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  </div>

                  {/* Progress bar */}
                  <div className="flex-1 h-3 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isSelected
                          ? 'bg-amber-700'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>

                  <div className="w-16 text-right shrink-0 text-xs text-stone-500 font-medium">
                    {item.count} <span className="text-[10px] text-stone-400">({item.percentage}%)</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Logged-In User In-Page Review Composer Card */}
        {showReviewForm && (
          <div ref={formRef} className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-800/30 shadow-xl space-y-6 transition-all animate-fadeIn">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-700" />
                    <span>Verified Buyer Review</span>
                  </span>
                  {matchedOrder && (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Order #{matchedOrder.orderNumber} Verified</span>
                    </span>
                  )}
                </div>
                <h3 className="font-serif font-bold text-xl text-stone-900 mt-2">
                  Share Your Sleep & Quality Feedback
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Your feedback helps fellow shoppers across Kenya make the right choice.
                </p>
              </div>

              <button
                onClick={() => setShowReviewForm(false)}
                className="text-stone-400 hover:text-stone-700 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-stone-100"
              >
                Cancel
              </button>
            </div>

            {reviewSubmitSuccess ? (
              <div className="p-8 text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-serif font-bold text-lg text-stone-900">Thank You for Your Feedback!</h4>
                <p className="text-xs text-stone-600 max-w-md mx-auto">
                  Your review has been published and will help other Kenyan households make informed bedding decisions.
                </p>
              </div>
            ) : (
              <form onSubmit={handleInPageReviewSubmit} className="space-y-5">
                {/* 1. Interactive Star Rating Picker */}
                <div className="space-y-1.5 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Overall Star Rating *
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 focus:outline-none transition-transform hover:scale-125 cursor-pointer"
                        >
                          <Star
                            className={`w-8 h-8 transition-colors ${
                              (hoverRating || newRating) >= star
                                ? 'text-amber-500 fill-amber-500 drop-shadow-sm'
                                : 'text-stone-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-stone-900 bg-white px-3 py-1.5 rounded-full border border-stone-200 shadow-xs">
                      {ratingDescriptions[hoverRating || newRating]}
                    </span>
                  </div>
                </div>

                {/* 2. Review Title & Purchased Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Review Headline / Summary
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Relieved morning lumbar stiffness completely!"
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Size / Variant Purchased
                    </label>
                    <select
                      value={newSizeBought}
                      onChange={(e) => setNewSizeBought(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
                    >
                      {product.variants.map((v) => (
                        <option key={v.id} value={v.sizeLabel}>
                          {v.sizeLabel} {v.price ? `- KSh ${v.price.toLocaleString()}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Detailed Experience Textarea */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Detailed Sleep Experience & Feedback *
                    </label>
                    <span className="text-[11px] text-stone-400">
                      {newComment.length} characters
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    required
                    placeholder="How does the mattress firmness feel for your back? How was the delivery speed and packaging quality in your area?"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3.5 text-xs text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 leading-relaxed"
                  />
                </div>

                {/* 4. Quick Tag Suggestions */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                    Quick Key Highlights (Click to append):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Solid Spine Support',
                      'Cooling & Breathable',
                      'Zero Motion Transfer',
                      'Prompt Kenya Dispatch',
                      'True to Dimensions',
                      'Durable Edge Support'
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (!newComment.includes(tag)) {
                            setNewComment(prev => prev ? `${prev} • ${tag}` : tag);
                          }
                        }}
                        className="bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-stone-200 text-[11px] px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Banner */}
                {reviewSubmitError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{reviewSubmitError}</span>
                  </div>
                )}

                {/* Submit Row */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <UserIcon className="w-4 h-4 text-stone-400" />
                    <span>Posting as <strong className="text-stone-800">{user?.name || 'Verified Buyer'}</strong></span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="text-stone-600 hover:text-stone-900 text-xs font-semibold px-4 py-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReview || !newComment.trim()}
                      className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      {isSubmittingReview ? (
                        <span>Publishing Review...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Publish Review</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Filter and Sorting Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
          {/* Left: Star Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedStarFilter(null)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                selectedStarFilter === null
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-200 border border-stone-200'
              }`}
            >
              All ({totalReviewsCount})
            </button>

            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingDistribution.find(d => d.stars === stars)?.count || 0;
              return (
                <button
                  key={stars}
                  onClick={() => setSelectedStarFilter(selectedStarFilter === stars ? null : stars)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap flex items-center gap-1 transition-colors ${
                    selectedStarFilter === stars
                      ? 'bg-amber-700 text-white'
                      : 'bg-white text-stone-600 hover:bg-stone-200 border border-stone-200'
                  }`}
                >
                  <span>{stars}</span>
                  <Star className={`w-3 h-3 ${selectedStarFilter === stars ? 'fill-white text-white' : 'fill-amber-500 text-amber-500'}`} />
                  <span className="text-[10px] opacity-80">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Right: Search & Sort */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-700"
              />
            </div>

            <select
              value={sortOption}
              onChange={(e: any) => setSortOption(e.target.value)}
              className="bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-700 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-700"
            >
              <option value="recent">Most Recent</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
              <option value="helpful">Most Helpful</option>
            </select>
          </div>
        </div>

        {/* Customer Reviews List */}
        {filteredReviews.length === 0 ? (
          <div className="p-12 bg-stone-50 rounded-3xl border border-stone-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
              <Star className="w-6 h-6" />
            </div>
            <h4 className="font-serif font-bold text-base text-stone-800">
              {reviews.length === 0 ? 'Be the first to review this item!' : 'No reviews match your selected filters'}
            </h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {reviews.length === 0
                ? 'Share how this mattress or bedding feels in your home to guide other Kenyan buyers.'
                : 'Try adjusting your star filter or search keywords to view other customer feedback.'}
            </p>

            {reviews.length > 0 ? (
              <button
                onClick={() => {
                  setSelectedStarFilter(null);
                  setSearchQuery('');
                  setVerifiedOnly(false);
                }}
                className="mt-2 text-xs font-bold text-amber-800 hover:underline inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset all review filters
              </button>
            ) : (
              <button
                onClick={user ? handleOpenComposer : onOpenAuth}
                className="mt-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-5 py-2.5 rounded-full transition-colors inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> Write First Review
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReviews.map((rev) => {
              const reviewerName = rev.userName || rev.customerName || 'Verified Kenyan Shopper';
              const initial = reviewerName.charAt(0).toUpperCase();
              const isVoted = !!votedReviewIds[rev.id];

              return (
                <div 
                  key={rev.id} 
                  className="p-6 bg-white rounded-3xl border border-stone-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header with avatar, stars & verified badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-stone-200 border border-stone-300 flex items-center justify-center font-bold text-amber-900 text-sm shrink-0">
                          {initial}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-stone-900">{reviewerName}</span>
                            {(rev.verifiedPurchase || rev.isVerifiedPurchase) && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <BadgeCheck className="w-3 h-3 text-emerald-600" />
                                <span>Verified Buyer</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-400">
                            {rev.userLocation || 'Kenya'} • {new Date(rev.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-current' : 'text-stone-200'}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Size bought tag */}
                    {rev.sizeBought && (
                      <div className="inline-block bg-stone-100 text-stone-600 text-[10px] font-semibold px-2.5 py-0.5 rounded-md">
                        Size: {rev.sizeBought}
                      </div>
                    )}

                    {/* Headline */}
                    {rev.title && (
                      <h4 className="text-xs font-bold text-stone-900 leading-snug">
                        {rev.title}
                      </h4>
                    )}

                    {/* Comment Body */}
                    <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-line">
                      {rev.comment}
                    </p>
                  </div>

                  {/* Footer with Helpful button */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                    <span className="text-[11px] text-stone-400">Was this feedback helpful?</span>
                    <button
                      onClick={() => handleHelpfulVote(rev.id)}
                      disabled={isVoted}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all text-xs font-semibold cursor-pointer ${
                        isVoted
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-600'
                      }`}
                    >
                      <ThumbsUp className={`w-3 h-3 ${isVoted ? 'fill-current' : ''}`} />
                      <span>Helpful ({rev.helpfulVotes || 0})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-stone-200 pt-12 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-xl text-stone-900">
              Related Bedding & Furniture
            </h3>
            <button
              onClick={onBack}
              className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
            >
              <span>Explore full category</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((rel) => (
              <div
                key={rel.id}
                onClick={() => onSelectProduct(rel)}
                className="group bg-white rounded-2xl border border-stone-200 p-3 hover:shadow-lg transition-all cursor-pointer space-y-2"
              >
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-stone-100 relative">
                  <img
                    src={rel.images[0]}
                    alt={rel.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {rel.rating > 0 && (
                    <span className="absolute bottom-2 left-2 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      <span>{rel.rating.toFixed(1)}</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">{rel.brand}</p>
                <h4 className="text-xs font-bold text-stone-900 truncate">{rel.name}</h4>
                <p className="text-xs font-bold text-stone-900">
                  KSh {rel.basePrice?.toLocaleString() || rel.variants[0]?.price?.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal fallback */}
      <ReviewModal
        product={product}
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSuccess={() => {
          api.getProduct(product.id).then(res => {
            setProduct(res.product);
            setReviews(res.reviews || []);
          });
        }}
      />
    </div>
  );
};
