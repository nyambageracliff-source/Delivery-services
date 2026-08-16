import React, { useState } from 'react';
import { X, Sparkles, Check, ArrowRight, BedDouble, ShieldAlert, Award, Star, MessageSquare } from 'lucide-react';
import { Product } from '../types';
import { api } from '../lib/api';

interface SleepQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const SleepQuizModal: React.FC<SleepQuizModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct
}) => {
  const [step, setStep] = useState(1);
  const [sleepingPosition, setSleepingPosition] = useState<string>('back');
  const [painArea, setPainArea] = useState<string>('lower_back');
  const [bedSize, setBedSize] = useState<string>('5x6');
  const [feelPreference, setFeelPreference] = useState<string>('firm');
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFinishQuiz = async () => {
    setLoading(true);
    try {
      // Determine recommended categories / firmness based on answers
      let categoryFilter = '';
      if (painArea === 'lower_back' || painArea === 'spine' || feelPreference === 'firm') {
        categoryFilter = 'orthopedic-rebonded';
      } else if (feelPreference === 'plush' || sleepingPosition === 'side') {
        categoryFilter = 'hotel-pocket-spring';
      } else {
        categoryFilter = 'high-density-foam';
      }

      const res = await api.getProducts({ category: categoryFilter });
      if (res.products.length > 0) {
        setRecommendations(res.products.slice(0, 2));
      } else {
        const fallback = await api.getProducts({ isFeatured: true });
        setRecommendations(fallback.products.slice(0, 2));
      }
      setStep(5);
    } catch (err) {
      console.error('Failed to get quiz recommendations', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSleepingPosition('back');
    setPainArea('lower_back');
    setBedSize('5x6');
    setFeelPreference('firm');
    setRecommendations([]);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm transition-opacity"
      />

      <div className="relative bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 z-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-2 rounded-full hover:bg-stone-100"
        >
          <X className="w-5 h-5" />
        </button>

        {step < 5 ? (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>AI Sleep & Posture Advisor</span>
              </div>
              <h3 className="font-serif font-bold text-xl sm:text-2xl text-stone-900">
                Find Your Ideal Mattress in 60 Seconds
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Step {step} of 4 • Tailored for Kenyan body types, spine alignment, and bed sizes.
              </p>

              {/* Progress bar */}
              <div className="w-full bg-stone-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-amber-700 h-full transition-all duration-300"
                  style={{ width: `${(step / 4) * 100}%` }}
                />
              </div>
            </div>

            {/* Step 1: Sleeping Position */}
            {step === 1 && (
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  1. What is your primary sleeping position?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'back', label: 'Back Sleeper', desc: 'Needs lumbar support & spinal neutral curve' },
                    { id: 'side', label: 'Side Sleeper', desc: 'Needs pressure relief on shoulders and hips' },
                    { id: 'stomach', label: 'Stomach / Combo', desc: 'Needs firm surface to avoid spine arching' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSleepingPosition(item.id)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        sleepingPosition === item.id
                          ? 'border-amber-700 bg-amber-50/60 ring-2 ring-amber-700/20'
                          : 'border-stone-200 hover:border-stone-300 bg-stone-50'
                      }`}
                    >
                      <p className="font-bold text-xs text-stone-900">{item.label}</p>
                      <p className="text-[11px] text-stone-500 mt-1 leading-snug">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Back Pain / Pressure Concern */}
            {step === 2 && (
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  2. Do you experience morning back or neck stiffness?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'lower_back', title: 'Severe Lower Back Pain', desc: 'Requires Chiropractor Rebonded Medical Core (9/10 firmness)' },
                    { id: 'mid_spine', title: 'General Morning Stiffness', desc: 'Requires Balanced High-Density Support (7/10 firmness)' },
                    { id: 'shoulder_hips', title: 'Shoulder & Hip Joint Pressure', desc: 'Requires 7-Zone Pocket Spring with Pillow-top (5/10 firmness)' },
                    { id: 'none', title: 'No Pain / Pure Luxury Hotel Feel', desc: 'Comfort Plush Hybrid pocket spring' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setPainArea(item.id)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        painArea === item.id
                          ? 'border-amber-700 bg-amber-50/60 ring-2 ring-amber-700/20'
                          : 'border-stone-200 hover:border-stone-300 bg-stone-50'
                      }`}
                    >
                      <p className="font-bold text-xs text-stone-900">{item.title}</p>
                      <p className="text-[11px] text-stone-500 mt-1 leading-snug">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Bed Frame Size */}
            {step === 3 && (
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  3. What bed size are you shopping for?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: '3x6', label: '3x6 ft', sub: 'Single Bed' },
                    { id: '4x6', label: '4x6 ft', sub: 'Double Bed' },
                    { id: '5x6', label: '5x6 ft', sub: 'Queen Bed' },
                    { id: '6x6', label: '6x6 ft', sub: 'King Bed' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setBedSize(item.id)}
                      className={`p-3.5 rounded-2xl border-2 text-center transition-all ${
                        bedSize === item.id
                          ? 'border-amber-700 bg-amber-50/60 ring-2 ring-amber-700/20'
                          : 'border-stone-200 hover:border-stone-300 bg-stone-50'
                      }`}
                    >
                      <BedDouble className="w-5 h-5 text-amber-800 mx-auto mb-1" />
                      <p className="font-bold text-xs text-stone-900">{item.label}</p>
                      <p className="text-[10px] text-stone-500">{item.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Feel Preference */}
            {step === 4 && (
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  4. What mattress surface feel do you prefer?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'firm', title: 'Orthopedic Firm', desc: 'Solid, no sinking feeling, maximum back stabilization.' },
                    { id: 'medium', title: 'Medium Firm', desc: 'Balanced gentle contouring with resilient support.' },
                    { id: 'plush', title: 'Hotel Cloud Plush', desc: 'Soft pillowtop with zero motion transfer pocket coils.' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setFeelPreference(item.id)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        feelPreference === item.id
                          ? 'border-amber-700 bg-amber-50/60 ring-2 ring-amber-700/20'
                          : 'border-stone-200 hover:border-stone-300 bg-stone-50'
                      }`}
                    >
                      <p className="font-bold text-xs text-stone-900">{item.title}</p>
                      <p className="text-[11px] text-stone-500 mt-1 leading-snug">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step Navigation Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-stone-100">
              {step > 1 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="text-xs font-bold text-stone-600 hover:text-stone-900 px-4 py-2"
                >
                  ← Back
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-6 py-2.5 rounded-full transition-colors flex items-center gap-1.5"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleFinishQuiz}
                  disabled={loading}
                  className="bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs px-6 py-2.5 rounded-full transition-colors shadow-lg shadow-amber-900/20 flex items-center gap-1.5"
                >
                  {loading ? 'Analyzing Sleep Profile...' : 'See Recommended Mattresses →'}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Step 5: Recommendations Result */
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2 font-bold">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-xl text-stone-900">
                Your Custom Mattress Match
              </h3>
              <p className="text-xs text-stone-600 max-w-sm mx-auto">
                Based on your {sleepingPosition} sleeping position and {feelPreference} preference for a {bedSize} bed:
              </p>
            </div>

            <div className="space-y-3">
              {recommendations.map((prod) => (
                <div 
                  key={prod.id}
                  className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-amber-700 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <img 
                      src={prod.images[0]} 
                      alt={prod.name} 
                      className="w-16 h-16 object-cover rounded-xl border border-stone-200 bg-white"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          Top Match (98%)
                        </span>
                        <div className="flex items-center text-amber-500 text-xs font-bold">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{prod.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-stone-900 mt-1">{prod.name}</h4>
                      <p className="text-[11px] text-stone-500">{prod.brand} • {prod.firmness} • High Density</p>
                    </div>
                  </div>

                  <div className="text-right w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-2">
                    <span className="font-serif font-black text-base text-stone-900">
                      From KSh {prod.basePrice.toLocaleString()}
                    </span>
                    <button
                      onClick={() => {
                        onSelectProduct(prod);
                        onClose();
                      }}
                      className="bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow"
                    >
                      View Mattress Details
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* WhatsApp Sleep Advisor CTA */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                  Need Doctor or Custom Size Advice?
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Chat directly with our certified WhatsApp Sleep Advisor (+254 116 822 231)
                </p>
              </div>
              <a
                href="https://wa.me/254116822231?text=Hello%20Haven%20Sleep%20Advisor%2C%20I%20completed%20the%20sleep%20quiz%20and%20would%20like%20specialized%20guidance"
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-xl shrink-0 transition-colors shadow-sm"
              >
                Chat on WhatsApp
              </a>
            </div>

            <div className="pt-2 flex justify-between items-center text-xs">
              <button
                onClick={handleReset}
                className="text-stone-500 hover:text-stone-800 font-semibold"
              >
                ↻ Retake Sleep Quiz
              </button>
              <button
                onClick={onClose}
                className="text-amber-800 hover:underline font-bold"
              >
                Browse All Mattresses →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
