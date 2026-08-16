import React, { useState, useEffect } from 'react';
import { 
  Sparkles, ArrowRight, ShieldCheck, Truck, Award, CheckCircle2, 
  ChevronRight, Star, Heart, BedDouble, HelpCircle, PhoneCall
} from 'lucide-react';
import { Product, Category } from '../types';
import { api } from '../lib/api';
import { ProductCard } from '../components/ProductCard';

interface HomePageProps {
  onSelectProduct: (product: Product) => void;
  onNavigateShop: (categorySlug?: string) => void;
  onOpenQuiz: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSelectProduct,
  onNavigateShop,
  onOpenQuiz
}) => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeSizeTab, setActiveSizeTab] = useState<'3x6' | '4x6' | '5x6' | '6x6'>('5x6');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [prodRes, catRes] = await Promise.all([
          api.getProducts({ isFeatured: true }),
          api.getCategories()
        ]);
        setFeaturedProducts(prodRes.products);
        setCategories(catRes);
      } catch (err) {
        console.error('Failed to load homepage data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const faqs = [
    {
      q: 'How does your direct factory order sourcing model work?',
      a: 'When you place an order with Haveens Company, we source your specific mattress, bedding accessories, or hardwood furniture directly from authorized master factory partners (Dr. Mattress, Bobmil, Silentnight, Superfoam, and Haveens Signature Woodworks) with fresh materials, conduct a rigorous quality check at our Nakuru hub, and deliver straight to your doorstep.'
    },
    {
      q: 'How fast is delivery within Nairobi and across Kenya?',
      a: 'Nairobi & Kiambu deliveries typically arrive within 24 to 48 hours. Orders to Mombasa, Kisumu, Nakuru, Eldoret, and other counties take 48 to 72 hours via our dedicated logistics fleet and courier partners.'
    },
    {
      q: 'How do I pay with M-PESA?',
      a: 'During checkout, you enter your Safaricom phone number and click "Place Order". An instant STK Push prompt appears on your phone screen asking for your M-PESA PIN. Once entered, your order is instantly confirmed with an official M-Pesa receipt.'
    },
    {
      q: 'Do you sell bedding accessories and bedroom furniture as well?',
      a: 'Yes! Haveens Company provides a comprehensive bedroom catalog including orthopedic memory pillows, waterproof breathable mattress protectors, luxury Egyptian cotton duvet sets, solid mahogany bed frames, and upholstered platform beds.'
    },
    {
      q: 'Can I order custom dimensions for special bed frames?',
      a: 'Yes! We support custom dimensions (e.g. 6x6.5, 7x7, custom foam heights, or bespoke wood stain finishes). Contact our WhatsApp sleep consultant directly to get a custom factory quote.'
    }
  ];

  return (
    <div className="space-y-16 sm:space-y-24 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 text-white pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Background Subtle Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Haveens Company • Kenya Direct-from-Factory Sleep & Living</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-white">
                Premium Mattresses, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100">
                  Accessories & Furniture.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-stone-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Explore medical orthopedic rebonded cores, hotel-grade 7-zone pocket springs, luxury bedding accessories, and solid hardwood bed frames delivered directly to your doorstep across Kenya.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <button
                  onClick={() => onNavigateShop()}
                  className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white font-bold px-7 py-3.5 rounded-full text-sm transition-all shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Explore Complete Catalog</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onOpenQuiz}
                  className="w-full sm:w-auto bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-semibold px-6 py-3.5 rounded-full text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Take 30s Sleep Quiz</span>
                </button>
              </div>

              {/* Trust Metrics Bar */}
              <div className="pt-6 border-t border-stone-800/80 grid grid-cols-3 gap-4 text-stone-300">
                <div>
                  <p className="font-serif font-bold text-xl sm:text-2xl text-white">47</p>
                  <p className="text-[11px] text-stone-400">Counties Served</p>
                </div>
                <div>
                  <p className="font-serif font-bold text-xl sm:text-2xl text-amber-400">100%</p>
                  <p className="text-[11px] text-stone-400">Genuine Factory Direct</p>
                </div>
                <div>
                  <p className="font-serif font-bold text-xl sm:text-2xl text-white">24-48 Hrs</p>
                  <p className="text-[11px] text-stone-400">Nairobi Metro Delivery</p>
                </div>
              </div>
            </div>

            {/* Right Hero Image Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-stone-700/60 bg-stone-800">
                <img
                  src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80"
                  alt="Haven Luxury Mattress in Bedroom"
                  className="w-full h-80 sm:h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/30 to-transparent" />
                
                {/* Floating Product Badge */}
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-stone-900/90 backdrop-blur-md border border-stone-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Orthopedic Collection</span>
                    <h4 className="text-sm font-bold text-white">Haven SpinalCare Orthopedic</h4>
                    <p className="text-stone-300 text-xs mt-0.5">High Density Rebonded Foam • Chiropractic Grade</p>
                  </div>
                  <button
                    onClick={() => onNavigateShop()}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    View Mattress
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mattress Categories Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-3">
          <div>
            <span className="text-xs font-bold uppercase text-amber-800 tracking-wider">
              Explore Our Collections
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-1">
              Shop by Mattress Engineering
            </h2>
          </div>
          <button
            onClick={() => onNavigateShop()}
            className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1"
          >
            <span>View all categories</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => onNavigateShop(cat.slug)}
              className="group bg-white rounded-2xl border border-stone-200/80 p-4 hover:border-amber-700/50 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-stone-100 mb-3">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm text-stone-900 group-hover:text-amber-800 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-stone-500 line-clamp-2 mt-1">
                  {cat.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured & Best Seller Mattresses */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-3">
          <div>
            <span className="text-xs font-bold uppercase text-amber-800 tracking-wider">
              Top Customer Choices
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-1">
              Featured Best Sellers
            </h2>
          </div>
          <button
            onClick={() => onNavigateShop()}
            className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1"
          >
            <span>Browse all in shop</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-96 rounded-2xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="bg-stone-50 rounded-3xl border border-stone-200 p-8 text-center space-y-3">
            <h3 className="font-serif font-bold text-base text-stone-900">No products available yet.</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Mattresses will be listed here once added to the catalog by our team.
            </p>
            <button
              onClick={() => onNavigateShop()}
              className="bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold px-5 py-2.5 rounded-full transition-colors cursor-pointer"
            >
              Explore Shop
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.slice(0, 8).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
              />
            ))}
          </div>
        )}
      </section>

      {/* Interactive Kenya Mattress Size & Firmness Guide */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-2xl relative overflow-hidden">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase text-amber-400 tracking-wider">
              Buyer's Reference Guide
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-1">
              Standard Kenya Mattress Dimensions & Firmness Guide
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 mt-2 leading-relaxed">
              Choosing the right bed size and firmness level prevents spine misalignment and guarantees restful sleep for your lifestyle.
            </p>
          </div>

          {/* Size Tabs */}
          <div className="flex flex-wrap gap-2 mt-8 border-b border-stone-800 pb-4">
            <button
              onClick={() => setActiveSizeTab('3x6')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSizeTab === '3x6'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              3x6 Feet (Single)
            </button>
            <button
              onClick={() => setActiveSizeTab('4x6')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSizeTab === '4x6'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              4x6 Feet (Double)
            </button>
            <button
              onClick={() => setActiveSizeTab('5x6')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSizeTab === '5x6'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              5x6 Feet (Queen / 5x6.5)
            </button>
            <button
              onClick={() => setActiveSizeTab('6x6')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSizeTab === '6x6'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              6x6 Feet (King / 6x6.5)
            </button>
          </div>

          {/* Active Size Details Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-stone-800/80 rounded-2xl p-5 border border-stone-700">
              <h4 className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                Physical Dimensions
              </h4>
              <p className="text-xl font-bold font-serif text-white">
                {activeSizeTab === '3x6' && '36" x 74" (90cm x 190cm)'}
                {activeSizeTab === '4x6' && '48" x 74" (120cm x 190cm)'}
                {activeSizeTab === '5x6' && '60" x 74" (150cm x 190cm)'}
                {activeSizeTab === '6x6' && '72" x 74" (180cm x 190cm)'}
              </p>
              <p className="text-xs text-stone-400 mt-2">
                {activeSizeTab === '3x6' && 'Ideal for children, teenagers, guest rooms, and single sleeper studio apartments.'}
                {activeSizeTab === '4x6' && 'Comfortable for single adults who want room to stretch or compact master bedrooms.'}
                {activeSizeTab === '5x6' && 'The most popular size in Kenya. Perfect for couples in standard sized master bedrooms.'}
                {activeSizeTab === '6x6' && 'Maximum luxury space for couples and families with young children or pets.'}
              </p>
            </div>

            <div className="bg-stone-800/80 rounded-2xl p-5 border border-stone-700">
              <h4 className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                Recommended Thickness
              </h4>
              <p className="text-xl font-bold font-serif text-white">
                {activeSizeTab === '3x6' && '6" to 8" Inches'}
                {activeSizeTab === '4x6' && '8" to 10" Inches'}
                {activeSizeTab === '5x6' && '10" to 12" Inches'}
                {activeSizeTab === '6x6' && '10" to 14" Inches'}
              </p>
              <p className="text-xs text-stone-400 mt-2">
                Denser thickness profiles provide deeper contouring layers, preventing pressure points on shoulders and hips.
              </p>
            </div>

            <div className="bg-stone-800/80 rounded-2xl p-5 border border-stone-700 flex flex-col justify-between">
              <div>
                <h4 className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                  Matching Mattresses
                </h4>
                <p className="text-xs text-stone-300">
                  Ready to be sourced and delivered to your doorstep in 24-48 hours.
                </p>
              </div>
              <button
                onClick={() => onNavigateShop()}
                className="mt-4 bg-white text-stone-900 hover:bg-amber-100 text-xs font-bold py-2.5 px-4 rounded-xl transition-colors"
              >
                Shop {activeSizeTab} Mattresses →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How Direct Factory Fulfillment Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase text-amber-800 tracking-wider">
            Transparent Sourcing Model
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-1">
            How Haven Kenya Delivers Factory-Fresh Quality
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-2">
            We bypass expensive traditional showroom markups to bring you certified master-crafted mattresses at wholesale-direct pricing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm">
              01
            </div>
            <h3 className="font-serif font-bold text-base text-stone-900">Select & Customize</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Choose your ideal firmness, density, and size variant (3x6 to 6x6.5) and securely check out via M-Pesa.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm">
              02
            </div>
            <h3 className="font-serif font-bold text-base text-stone-900">Direct Sourcing</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Our system instantly transmits your exact specifications to the authorized manufacturer (Dr. Mattress, Bobmil, Silentnight).
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm">
              03
            </div>
            <h3 className="font-serif font-bold text-base text-stone-900">Quality Inspection</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              The fresh mattress arrives at our Nakuru hub for 12-point anti-sag and stitching quality assurance.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm">
              04
            </div>
            <h3 className="font-serif font-bold text-base text-stone-900">Doorstep Delivery</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Our delivery driver transports and helps install the mattress in your bedroom with full receipt and setup support.
            </p>
          </div>
        </div>
      </section>

      {/* Customer FAQs Accordion */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase text-amber-800 tracking-wider">
            Common Questions
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-1">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden transition-colors"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-semibold text-sm text-stone-900 hover:text-amber-800"
              >
                <span>{faq.q}</span>
                <span className="text-stone-400 font-bold text-lg">
                  {activeFaq === index ? '−' : '+'}
                </span>
              </button>
              {activeFaq === index && (
                <div className="px-4 sm:px-5 pb-5 text-xs text-stone-600 leading-relaxed border-t border-stone-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
