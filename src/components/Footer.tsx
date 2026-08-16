import React from 'react';
import { ShieldCheck, Truck, Clock, Phone, Mail, MapPin, MessageSquare, Award, CreditCard } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-stone-950 text-stone-300 pt-16 pb-24 md:pb-12 border-t border-stone-800">
      {/* Guarantees Ribbon */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 mb-12 border-b border-stone-800/80">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center sm:text-left">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-950/60 text-amber-400 rounded-2xl border border-amber-800/40">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-stone-100 font-bold text-sm">Express 24-48hr Delivery</h4>
              <p className="text-xs text-stone-400 mt-1">Direct from master factory partners to your bedroom.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-950/60 text-amber-400 rounded-2xl border border-amber-800/40">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-stone-100 font-bold text-sm">100% Genuine Mattresses</h4>
              <p className="text-xs text-stone-400 mt-1">Direct from certified Kenya manufacturing plants.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-950/60 text-amber-400 rounded-2xl border border-amber-800/40">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-stone-100 font-bold text-sm">Orthopedic Certified</h4>
              <p className="text-xs text-stone-400 mt-1">Chiropractor recommended posture alignment cores.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-950/60 text-amber-400 rounded-2xl border border-amber-800/40">
              <CreditCard className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-stone-100 font-bold text-sm">Secure M-PESA & Card</h4>
              <p className="text-xs text-stone-400 mt-1">Verified instant STK Push with Safaricom Daraja.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center font-serif font-black text-white text-lg">
                H
              </div>
              <span className="font-serif font-bold text-xl text-white">Haveens Company</span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
              We connect Kenyan homes with premium medical orthopedic mattresses, luxury bedding accessories, and solid hardwood bedroom furniture freshly crafted from leading manufacturing plants. Direct factory pricing with zero middleman markups.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://wa.me/254116822231?text=Hello%20Haveens%20Company%20Advisor%2C%20I%20would%20like%20guidance%20on%20mattresses%20and%20furniture"
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-full inline-flex items-center gap-2 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Haveens Advisor (+254 116 822 231)
              </a>
            </div>
          </div>

          {/* Mattress Categories */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Our Catalog</h4>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li><button onClick={() => onNavigate('shop')} className="hover:text-amber-400 transition-colors">Medical Orthopedic Mattresses</button></li>
              <li><button onClick={() => onNavigate('shop')} className="hover:text-amber-400 transition-colors">High-Density D32 Mattresses</button></li>
              <li><button onClick={() => onNavigate('shop')} className="hover:text-amber-400 transition-colors">7-Zone Pocket Spring</button></li>
              <li><button onClick={() => onNavigate('shop')} className="hover:text-amber-400 transition-colors">Bedding & Accessories</button></li>
              <li><button onClick={() => onNavigate('shop')} className="hover:text-amber-400 transition-colors">Solid Hardwood Bed Frames</button></li>
              <li><button onClick={() => onNavigate('shop')} className="hover:text-amber-400 transition-colors">Bedroom & Living Furniture</button></li>
            </ul>
          </div>

          {/* Quick Links & Policies */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Customer Care</h4>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li><button onClick={() => onNavigate('track')} className="hover:text-amber-400 transition-colors">Track Your Delivery</button></li>
              <li><button onClick={() => onNavigate('shop')} className="hover:text-amber-400 transition-colors">Mattress & Bed Size Guide</button></li>
              <li><button onClick={() => onNavigate('account')} className="hover:text-amber-400 transition-colors">Customer & Buyer Account</button></li>
              <li><button onClick={() => onNavigate('home')} className="hover:text-amber-400 transition-colors">Kenya Delivery Zones & Rates</button></li>
              <li><button onClick={() => onNavigate('shop')} className="hover:text-amber-400 transition-colors">Firmness Scale & Warranties</button></li>
              <li><button onClick={() => onNavigate('home')} className="hover:text-amber-400 transition-colors">Verified Customer Reviews</button></li>
            </ul>
          </div>

          {/* Contact & Showroom */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Fulfillment Hub</h4>
            <ul className="space-y-3 text-xs text-stone-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Haveens Hub, Nakuru 20100, Kenya</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                <span>+254 742 967 083 / +254 116 822 231</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                <span>orders@haveenscompany.co.ke</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Mon – Sat: 8:00 AM – 7:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Kenya Payment Methods Badge Bar */}
        <div className="mt-12 pt-8 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>© 2026 Haveens Company Kenya. All rights reserved. Direct factory fulfillment engine.</p>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-stone-400">Accepted Payments:</span>
            <span className="bg-emerald-950 text-emerald-300 font-bold px-2.5 py-0.5 rounded border border-emerald-800 text-[10px]">
              🟢 M-PESA STK Push
            </span>
            <span className="bg-stone-800 text-stone-300 font-medium px-2.5 py-0.5 rounded text-[10px]">
              💳 Visa / Mastercard / Debit
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
