import React, { useState } from 'react';
import { X, Star, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { saveReviewToSupabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';

interface ReviewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setErrorMsg('Please enter your review feedback');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      // 1. Submit through server API
      await api.submitReview({
        productId: product.id,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
        orderNumber: orderNumber.trim() || undefined
      });

      // 2. Also persist directly to Supabase reviews table for cloud sync
      try {
        await saveReviewToSupabase({
          productId: product.id,
          productName: product.name,
          rating,
          title: title.trim() || undefined,
          comment: comment.trim(),
          userId: user?.id,
          userName: user?.name || 'Verified Kenyan Shopper',
          isVerifiedPurchase: !!(user || orderNumber.trim()),
          status: 'approved',
          createdAt: new Date().toISOString()
        });
      } catch (sbErr) {
        console.warn('Supabase review cloud sync note:', sbErr);
      }

      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm transition-opacity"
      />

      <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 z-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 font-serif">Thank You for Your Feedback!</h3>
            <p className="text-xs text-stone-500">Your review will help other Kenyans find the right mattress.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full w-fit">
                <Sparkles className="w-3 h-3" />
                <span>Verified Buyer Review</span>
              </div>
              <h3 className="text-lg font-bold font-serif text-stone-900">Write a Review</h3>
              <p className="text-xs text-stone-500">{product.name} ({product.brand})</p>
            </div>

            {/* Star selector */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Overall Sleep Rating
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        (hoverRating || rating) >= star
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-stone-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-amber-900 ml-2">
                  {rating === 5 ? '5 Stars (Excellent)' : rating === 4 ? '4 Stars (Very Good)' : `${rating} Stars`}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Headline / Review Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Relieved my lower back pain completely!"
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800 focus:bg-white focus:ring-1 focus:ring-amber-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Order Number (Optional, for verified buyer badge)
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. ORD-2026-000101"
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800 focus:bg-white focus:ring-1 focus:ring-amber-700 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Detailed Sleep Experience *
              </label>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                placeholder="How does the mattress feel? How was the delivery speed in your area?"
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800 focus:bg-white focus:ring-1 focus:ring-amber-700"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Publishing Review...' : 'Publish Review'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
