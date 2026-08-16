import React, { useState } from 'react';
import { 
  X, Lock, Mail, User as UserIcon, Phone, AlertCircle, 
  CheckCircle2, Send, ArrowLeft, RefreshCw, ShieldCheck, Database,
  ShoppingBag, Building2, Truck, Check, HelpCircle, KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, resendVerification, isSupabaseConnected } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password' | 'verification_pending'>('login');
  
  // Sign up Role selection: 'customer' | 'buyer' | 'driver'
  const [selectedRole, setSelectedRole] = useState<'customer' | 'buyer' | 'driver'>('customer');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Specific role metadata
  const [businessName, setBusinessName] = useState('');
  const [taxPin, setTaxPin] = useState('');
  const [vehicleType, setVehicleType] = useState('Delivery Van');
  const [vehiclePlate, setVehiclePlate] = useState('');
  
  const [county, setCounty] = useState('Nairobi');
  const [townCity, setTownCity] = useState('Nairobi CBD');
  const [deliveryArea, setDeliveryArea] = useState('Westlands');
  
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessInfo('');
    setIsSubmitting(true);

    try {
      if (mode === 'forgot_password') {
        if (!email.trim()) {
          setError('Please enter your email address.');
          setIsSubmitting(false);
          return;
        }
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined,
        });
        if (resetErr) {
          throw resetErr;
        }
        setSuccessInfo(`Password reset link sent to ${email.trim()}. Please check your email inbox.`);
        setIsSubmitting(false);
        return;
      }

      if (mode === 'login') {
        await login(email.trim(), password);
        onClose();
      } else {
        if (!name.trim() || !phone.trim()) {
          setError('Please provide your full name and phone number.');
          setIsSubmitting(false);
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setIsSubmitting(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match. Please re-enter your password.');
          setIsSubmitting(false);
          return;
        }

        if (selectedRole === 'buyer' && !businessName.trim()) {
          setError('Please specify your company, hotel, or business name.');
          setIsSubmitting(false);
          return;
        }

        if (selectedRole === 'driver' && !vehiclePlate.trim()) {
          setError('Please provide your vehicle number plate (e.g. KDM 450X).');
          setIsSubmitting(false);
          return;
        }

        const result = await register({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          role: selectedRole,
          businessName: selectedRole === 'buyer' ? businessName.trim() : undefined,
          vehicleType: selectedRole === 'driver' ? vehicleType : undefined,
          vehiclePlate: selectedRole === 'driver' ? vehiclePlate.trim().toUpperCase() : undefined,
          address: {
            county,
            townCity,
            deliveryArea: selectedRole === 'buyer' ? (businessName.trim() + ' - ' + townCity) : deliveryArea,
            isDefault: true
          }
        });

        if (result.requiresEmailVerification) {
          setPendingEmail(result.email || email.trim());
          setMode('verification_pending');
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      if (err.isEmailUnconfirmed) {
        setPendingEmail(err.unconfirmedEmail || email.trim());
        setMode('verification_pending');
        setError('Your email is not verified yet. Please check your inbox or resend the verification link.');
      } else {
        setError(err.message || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = pendingEmail || email.trim();
    if (!targetEmail) return;

    setIsResending(true);
    setError('');
    setSuccessInfo('');
    try {
      await resendVerification(targetEmail);
      setSuccessInfo(`Verification link successfully resent to ${targetEmail}. Please check your inbox or spam folder.`);
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm transition-opacity"
      />

      <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 z-10 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Supabase Cloud Indicator */}
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full w-fit mb-4">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>Haveens Secure Supabase Authentication</span>
        </div>

        {/* ---------------------------------------------------- */}
        {/* EMAIL VERIFICATION REQUIRED SCREEN */}
        {/* ---------------------------------------------------- */}
        {mode === 'verification_pending' ? (
          <div className="text-center space-y-5 py-2">
            <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto shadow-inner ring-8 ring-amber-50">
              <Mail className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h3 className="font-serif font-bold text-xl text-stone-900">
                Verify Your Email Address
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
                We have sent an official verification link to:
              </p>
              <div className="bg-stone-100 py-1.5 px-3 rounded-lg text-xs font-mono font-bold text-amber-900 inline-block">
                {pendingEmail || email}
              </div>
              <p className="text-[11px] text-stone-500 max-w-xs mx-auto leading-relaxed pt-1">
                Please check your email and click the confirmation link to activate your Haveens Company account.
              </p>
            </div>

            {successInfo && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-start gap-2 text-left">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span className="leading-tight">{successInfo}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResending || resendCooldown > 0}
                className="w-full bg-amber-800 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending email...</span>
                  </>
                ) : resendCooldown > 0 ? (
                  <span>Resend available in {resendCooldown}s</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Resend Verification Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccessInfo('');
                }}
                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          </div>
        ) : mode === 'forgot_password' ? (
          /* ---------------------------------------------------- */
          /* FORGOT PASSWORD SCREEN */
          /* ---------------------------------------------------- */
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <button 
                type="button" 
                onClick={() => { setMode('login'); setError(''); setSuccessInfo(''); }}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">Reset Your Password</h3>
                <p className="text-xs text-stone-500">Enter your registered email address to receive password reset instructions.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@gmail.com"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-stone-800 focus:bg-white focus:ring-1 focus:ring-amber-700"
                  />
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                </div>
              </div>

              {successInfo && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-start gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span className="leading-tight">{successInfo}</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-start gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <span className="leading-tight">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Send Password Reset Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessInfo(''); }}
                className="w-full text-center text-xs text-stone-600 hover:text-stone-900 font-medium py-1"
              >
                Remember your password? Sign In
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Mode Tabs */}
            <div className="flex border-b border-stone-200 mb-5">
              <button
                onClick={() => { setMode('login'); setError(''); setSuccessInfo(''); }}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'border-amber-800 text-amber-900'
                    : 'border-transparent text-stone-400 hover:text-stone-600'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setMode('register'); setError(''); setSuccessInfo(''); }}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'border-amber-800 text-amber-900'
                    : 'border-transparent text-stone-400 hover:text-stone-600'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <>
                  {/* SIGN UP ACCOUNT TYPE SELECTOR */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                      Account Type *
                    </label>
                    <p className="text-[11px] text-stone-500">
                      Select your Haveens Company account profile:
                    </p>
                    
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {/* Customer Option */}
                      <button
                        type="button"
                        onClick={() => setSelectedRole('customer')}
                        className={`p-2.5 rounded-2xl border text-left transition-all relative cursor-pointer ${
                          selectedRole === 'customer'
                            ? 'border-amber-700 bg-amber-50/80 shadow-sm ring-1 ring-amber-700'
                            : 'border-stone-200 bg-stone-50 hover:bg-white hover:border-stone-300'
                        }`}
                      >
                        {selectedRole === 'customer' && (
                          <span className="absolute top-2 right-2 w-4 h-4 bg-amber-700 text-white rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                        <ShoppingBag className={`w-4 h-4 mb-1.5 ${selectedRole === 'customer' ? 'text-amber-800' : 'text-stone-500'}`} />
                        <div className="font-bold text-xs text-stone-900 leading-tight">Customer</div>
                        <div className="text-[10px] text-stone-500 leading-tight mt-0.5">Online shopper</div>
                      </button>

                      {/* Buyer Option */}
                      <button
                        type="button"
                        onClick={() => setSelectedRole('buyer')}
                        className={`p-2.5 rounded-2xl border text-left transition-all relative cursor-pointer ${
                          selectedRole === 'buyer'
                            ? 'border-indigo-700 bg-indigo-50/80 shadow-sm ring-1 ring-indigo-700'
                            : 'border-stone-200 bg-stone-50 hover:bg-white hover:border-stone-300'
                        }`}
                      >
                        {selectedRole === 'buyer' && (
                          <span className="absolute top-2 right-2 w-4 h-4 bg-indigo-700 text-white rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                        <Building2 className={`w-4 h-4 mb-1.5 ${selectedRole === 'buyer' ? 'text-indigo-700' : 'text-stone-500'}`} />
                        <div className="font-bold text-xs text-stone-900 leading-tight">Wholesale Buyer</div>
                        <div className="text-[10px] text-stone-500 leading-tight mt-0.5">B2B & bulk volume</div>
                      </button>

                      {/* Driver Option */}
                      <button
                        type="button"
                        onClick={() => setSelectedRole('driver')}
                        className={`p-2.5 rounded-2xl border text-left transition-all relative cursor-pointer ${
                          selectedRole === 'driver'
                            ? 'border-emerald-700 bg-emerald-50/80 shadow-sm ring-1 ring-emerald-700'
                            : 'border-stone-200 bg-stone-50 hover:bg-white hover:border-stone-300'
                        }`}
                      >
                        {selectedRole === 'driver' && (
                          <span className="absolute top-2 right-2 w-4 h-4 bg-emerald-700 text-white rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                        <Truck className={`w-4 h-4 mb-1.5 ${selectedRole === 'driver' ? 'text-emerald-700' : 'text-stone-500'}`} />
                        <div className="font-bold text-xs text-stone-900 leading-tight">Delivery Driver</div>
                        <div className="text-[10px] text-stone-500 leading-tight mt-0.5">Courier dispatch</div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      {selectedRole === 'buyer' ? 'Representative Full Name *' : 'Full Name *'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="e.g. Samuel Kiprop"
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-800 focus:bg-white focus:ring-1 focus:ring-amber-700"
                      />
                      <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  {/* Buyer Specific Fields */}
                  {selectedRole === 'buyer' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                          Company / Business Name *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            required
                            placeholder="e.g. Sarova Woodlands Hotel"
                            className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-800 focus:bg-white focus:ring-1 focus:ring-amber-700 font-medium"
                          />
                          <Building2 className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                          KRA PIN (Optional)
                        </label>
                        <input
                          type="text"
                          value={taxPin}
                          onChange={(e) => setTaxPin(e.target.value.toUpperCase())}
                          placeholder="e.g. P051234567Z"
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800 focus:bg-white focus:ring-1 focus:ring-amber-700 uppercase font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* Driver Specific Fields */}
                  {selectedRole === 'driver' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                          Vehicle Type *
                        </label>
                        <select
                          value={vehicleType}
                          onChange={(e) => setVehicleType(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800 focus:bg-white focus:ring-1 focus:ring-amber-700 font-medium"
                        >
                          <option value="Delivery Van">Delivery Van (Toyota Hiace)</option>
                          <option value="Pickup Truck">Pickup Truck (Isuzu D-Max)</option>
                          <option value="Box Lorry (3 Ton)">Box Lorry (3 Ton Isuzu NPR)</option>
                          <option value="TukTuk Cargo">TukTuk Cargo</option>
                          <option value="Motorbike (Boda)">Motorbike Courier</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                          Number Plate *
                        </label>
                        <input
                          type="text"
                          value={vehiclePlate}
                          onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                          required
                          placeholder="e.g. KDM 450X"
                          className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800 focus:bg-white focus:ring-1 focus:ring-amber-700 uppercase font-mono font-bold"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Phone Number (M-PESA) *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        placeholder="0712 345 678"
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-800 focus:bg-white focus:ring-1 focus:ring-amber-700 font-semibold"
                      />
                      <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@gmail.com"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-800 focus:bg-white focus:ring-1 focus:ring-amber-700"
                  />
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Password *
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot_password'); setError(''); setSuccessInfo(''); }}
                      className="text-[11px] font-semibold text-amber-800 hover:text-amber-900 cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-800 focus:bg-white focus:ring-1 focus:ring-amber-700"
                  />
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-800 focus:bg-white focus:ring-1 focus:ring-amber-700"
                    />
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Real user session backed by Supabase PostgreSQL.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-tight">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting
                  ? 'Connecting...'
                  : mode === 'login'
                  ? 'Sign In with Supabase'
                  : `Create ${selectedRole === 'buyer' ? 'Wholesale Buyer' : selectedRole === 'driver' ? 'Delivery Driver' : 'Customer'} Account`}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
